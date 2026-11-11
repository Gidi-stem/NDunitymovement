import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton, Notice, PageHero } from "@/components/ui";
import { applicationForToken } from "@/lib/applicant";
import { adminClient } from "@/lib/supabase/server";
import { isAdminClientConfigured } from "@/lib/env";
import { getSettingsForPayment } from "@/lib/settings";
import { paystackConfigured } from "@/lib/paystack";
import { formatNaira } from "@/lib/money";
import { STATUS_LABELS, type ApplicationStatus } from "@/lib/auth/rbac";
import { startPayment } from "../apply/actions";

export const metadata: Metadata = { title: "Application Status", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NOTICES: Record<string, [("info" | "warn" | "error" | "success"), string]> = {
  "payments-off": ["info", "Online payment is not active yet. NDUM will announce payment arrangements through its official channels."],
  unavailable: ["warn", "This service is not available right now. Please try again later."],
  declined: ["error", "Payment cannot be made for a declined application."],
  "already-paid": ["success", "Your registration payment has already been received."],
  error: ["error", "We could not start the payment. Please try again."],
};

export default async function StatusPage({ searchParams }: { searchParams: Promise<{ ref?: string; key?: string; notice?: string }> }) {
  const { ref = "", key = "", notice } = await searchParams;
  const app = isAdminClientConfigured() ? await applicationForToken(ref, key) : null;

  if (!app) {
    return (
      <>
        <PageHero eyebrow="Membership" title="Check your application" />
        <section className="section"><div className="container-page max-w-2xl">
          <Notice tone="info" title="Use your private status link">
            Application status is available only through the private link given when you applied (and emailed to you where email is enabled). If you have lost it, please contact NDUM on the Contact page.
          </Notice>
        </div></section>
      </>
    );
  }

  const db = adminClient();
  const [{ data: payments }, settings, cat] = await Promise.all([
    db.from("payments").select("reference, status, amount_kobo, paid_at, created_at").eq("application_id", app.id).order("created_at", { ascending: false }),
    getSettingsForPayment(),
    db.from("membership_categories").select("name").eq("id", app.category_id).maybeSingle(),
  ]);
  const paid = payments?.find((p) => p.status === "success");
  const status = app.status as ApplicationStatus;
  const canPay = settings.paymentsEnabled && paystackConfigured() && !paid && status !== "declined";
  const n = notice ? NOTICES[notice] : undefined;
  const tone = { approved: "success", declined: "error", awaiting_correction: "warn", submitted: "info", pending_review: "info" }[status] as "info";

  return (
    <>
      <PageHero eyebrow="Membership" title="Your application" />
      <section className="section">
        <div className="container-page max-w-3xl space-y-6">
          {n && <Notice tone={n[0]}>{n[1]}</Notice>}
          <div className="border border-stone-300 bg-white p-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Item label="Reference" value={<span className="font-mono">{app.reference}</span>} />
              <Item label="Applicant" value={app.preferred_name || app.full_name} />
              <Item label="Category" value={cat.data?.name ?? "—"} />
              <Item label="Submitted" value={new Date(app.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
              <Item label="Status" value={<strong>{STATUS_LABELS[status]}</strong>} />
              {app.membership_number && <Item label="Membership number" value={<span className="font-mono font-bold">{app.membership_number}</span>} />}
            </dl>
          </div>

          {status === "awaiting_correction" && (
            <Notice tone={tone} title="Please correct your application">
              {app.correction_note ?? "NDUM has asked for corrections."}
              <div className="mt-3"><LinkButton href={`/membership/apply?ref=${encodeURIComponent(ref)}&key=${encodeURIComponent(key)}`} variant="primary" className="btn-sm">Edit and resubmit</LinkButton></div>
            </Notice>
          )}
          {status === "declined" && <Notice tone="error" title="Application declined">{app.review_note ?? "Your application was not approved."} You may contact NDUM for clarification.</Notice>}
          {status === "approved" && <Notice tone="success" title="Welcome to NDUM">Your membership has been approved. Your membership number is shown above.</Notice>}
          {(status === "submitted" || status === "pending_review") && <Notice tone="info">Your application is with NDUM for review. Please check back later using this same link.</Notice>}

          <div className="border border-stone-300 bg-white p-6">
            <h2 className="text-xl font-semibold text-forest-900">Registration fee</h2>
            <p className="mt-2 text-stone-700">
              {formatNaira(settings.registrationFeeKobo)}{settings.feeStatus === "proposed" ? " — proposed, pending formal approval" : ""}
            </p>
            {paid ? (
              <p className="mt-3 font-semibold text-forest-800">✔ Payment received{paid.paid_at ? ` on ${new Date(paid.paid_at).toLocaleDateString("en-GB")}` : ""}. Transaction reference: <span className="font-mono">{paid.reference}</span></p>
            ) : canPay ? (
              <form action={startPayment} className="mt-4">
                <input type="hidden" name="ref" value={ref} /><input type="hidden" name="key" value={key} />
                <button className="btn-gold">Pay {formatNaira(settings.registrationFeeKobo)} securely</button>
                <p className="field-hint mt-2">You will be taken to Paystack. Payment is confirmed by NDUM&apos;s server — not by this page.</p>
              </form>
            ) : (
              <p className="mt-3 text-sm text-stone-600">Online payment is not active yet. Do not pay any individual or personal bank account.</p>
            )}
          </div>
          <p className="text-sm text-stone-500"><Link href="/privacy" className="underline">Privacy notice</Link> · Keep this link private.</p>
        </div>
      </section>
    </>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</dt><dd className="mt-0.5">{value}</dd></div>;
}
