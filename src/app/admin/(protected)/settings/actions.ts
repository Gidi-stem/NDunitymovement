"use server";
import { revalidatePath } from "next/cache";
import { actorWith } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { flash } from "@/lib/admin/flash";
import { paystackConfigured } from "@/lib/paystack";

const BACK = "/admin/settings";
const nairaToKobo = (v: string): number | null | "bad" => {
  const t = v.replace(/[,\s₦]/g, "");
  if (t === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return "bad";
  const k = Math.round(Number(t) * 100);
  return k > 0 && k <= 100_000_000 ? k : "bad";
};

export async function saveSettings(fd: FormData) {
  if (!(await actorWith("settings.manage"))) flash(BACK, "err", "You do not have permission to do that.");
  const fee = nairaToKobo(String(fd.get("registration_fee") ?? ""));
  const idFee = nairaToKobo(String(fd.get("id_card_fee") ?? ""));
  if (fee === "bad" || fee === null) flash(BACK, "err", "Enter a valid registration fee in naira (e.g. 2000).");
  if (idFee === "bad") flash(BACK, "err", "Enter a valid ID-card fee in naira, or leave it blank until approved.");
  const feeStatus = fd.get("fee_status") === "approved" ? "approved" : "proposed";
  const monthsRaw = String(fd.get("validity") ?? "").trim();
  const months = monthsRaw === "" ? null : Number(monthsRaw);
  if (months !== null && (!Number.isInteger(months) || months < 1 || months > 120)) flash(BACK, "err", "Validity must be a whole number of months (1–120), or blank.");
  const wantPayments = fd.get("payments_enabled") === "on";
  if (wantPayments) {
    if (feeStatus !== "approved") flash(BACK, "err", "Payment collection cannot be activated while the fee is still marked as proposed.");
    if (fd.get("confirm_account") !== "on") flash(BACK, "err", "Confirm that the official NDUM payment account and credentials are in place before activating payments.");
    if (!paystackConfigured()) flash(BACK, "err", "PAYSTACK_SECRET_KEY is not set on the server, so payments cannot be activated yet.");
  }
  const supabase = await sessionClient();
  const entries: [string, unknown][] = [
    ["registration_fee_kobo", fee], ["fee_status", feeStatus], ["id_card_fee_kobo", idFee],
    ["membership_validity_months", months], ["payments_enabled", wantPayments],
  ];
  for (const [key, value] of entries) {
    const { error } = await supabase.from("settings").upsert({ key, value }, { onConflict: "key" });
    if (error) flash(BACK, "err", "Could not save settings (permission denied or database error).");
  }
  revalidatePath("/membership"); revalidatePath(BACK);
  flash(BACK, "msg", "Settings saved.");
}
