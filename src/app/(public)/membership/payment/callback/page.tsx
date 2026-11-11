import type { Metadata } from "next";
import { LinkButton, Notice, PageHero } from "@/components/ui";
import { settlePayment, type SettleResult } from "@/lib/payments";
import { isAdminClientConfigured } from "@/lib/env";
import { paystackConfigured } from "@/lib/paystack";

export const metadata: Metadata = { title: "Payment result", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const OK: SettleResult[] = ["recorded", "already_recorded"];

/**
 * Landing page after Paystack. It NEVER trusts the redirect: the reference is re-verified with
 * Paystack server-to-server and checked against our own payment row before anything is recorded.
 */
export default async function CallbackPage({ searchParams }: { searchParams: Promise<{ reference?: string | string[]; trxref?: string | string[] }> }) {
  const sp = await searchParams;
  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) ?? "";
  const reference = first(sp.reference) || first(sp.trxref);

  let result: SettleResult = "unknown_reference";
  if (reference && isAdminClientConfigured() && paystackConfigured()) {
    result = await settlePayment(reference);
  }
  const ok = OK.includes(result);

  return (
    <>
      <PageHero eyebrow="Membership" title="Payment result" />
      <section className="section"><div className="container-page max-w-2xl space-y-6">
        {ok ? (
          <Notice tone="success" title="Payment confirmed">Thank you. Your registration payment has been verified and recorded. Transaction reference: <span className="font-mono">{reference}</span>. Your application will now be reviewed.</Notice>
        ) : result === "not_successful" || result === "error" ? (
          <Notice tone="warn" title="We could not confirm your payment yet">Your payment may still be processing. Do not pay again — check your status link in a few minutes. If you were charged and it is not confirmed, contact NDUM quoting reference <span className="font-mono">{reference || "—"}</span>.</Notice>
        ) : result === "duplicate" ? (
          <Notice tone="warn" title="Duplicate payment detected">A payment has already been recorded for this application. NDUM will review and arrange a refund of the duplicate. Reference: <span className="font-mono">{reference}</span>.</Notice>
        ) : result === "failed" ? (
          <Notice tone="error" title="Payment was not completed">No money has been recorded for this attempt. Return to your status link to try again.</Notice>
        ) : (
          <Notice tone="error" title="We could not verify this payment">If you were charged, please contact NDUM quoting reference <span className="font-mono">{reference || "—"}</span>.</Notice>
        )}
        <p className="text-sm text-stone-600">To return to your application, open the private status link you received when you applied.</p>
        <LinkButton href="/membership" variant="outline">Back to Membership</LinkButton>
      </div></section>
    </>
  );
}
