import "server-only";
import { adminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { formatNaira } from "@/lib/money";
import { verifyTransaction } from "@/lib/paystack";

export type SettleResult =
  | "recorded" | "already_recorded" | "duplicate" | "mismatch"
  | "not_successful" | "failed" | "unknown_reference" | "error";

/**
 * The single place a payment can become "success". It NEVER trusts its caller (browser redirect or
 * webhook): it re-fetches the transaction from Paystack with our secret key, then the database
 * function re-checks reference, amount and currency against OUR stored payment row.
 */
export async function settlePayment(reference: string): Promise<SettleResult> {
  const db = adminClient();
  const { data: payment } = await db
    .from("payments")
    .select("id, reference, status, amount_kobo, application_id")
    .eq("reference", reference)
    .maybeSingle();
  if (!payment) return "unknown_reference";
  if (payment.status === "success") return "already_recorded";

  let tx;
  try {
    tx = await verifyTransaction(reference);
  } catch {
    return "error";
  }
  if (tx.reference !== reference) return "mismatch";

  if (tx.status === "failed" || tx.status === "abandoned") {
    await db.from("payments").update({ status: tx.status === "failed" ? "failed" : "abandoned" })
      .eq("id", payment.id).eq("status", "pending");
    return "failed";
  }
  if (tx.status !== "success") return "not_successful";

  const { data, error } = await db.rpc("record_payment_success", {
    p_reference: reference,
    p_amount_kobo: tx.amount,
    p_currency: tx.currency,
    p_txn_id: String(tx.id),
    p_channel: tx.channel ?? null,
    p_paid_at: tx.paid_at ?? null,
  });
  if (error) return "error";
  const result = data as SettleResult;

  if (result === "recorded") {
    const { data: app } = await db.from("applications").select("full_name, email, reference").eq("id", payment.application_id).single();
    if (app) {
      await sendEmail({
        to: app.email,
        subject: "NDUM — registration payment received",
        text:
          `Dear ${app.full_name},\n\nWe have received your NDUM registration payment of ${formatNaira(payment.amount_kobo)}.\n` +
          `Transaction reference: ${reference}\nApplication reference: ${app.reference}\n\n` +
          `Your application will now be reviewed. Payment does not guarantee approval of membership.\n\n` +
          `Niger Delta Unity Movement (NDUM)\n${env.siteUrl}`,
      });
    }
  }
  return result;
}
