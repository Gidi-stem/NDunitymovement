import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { AdminTitle, Flash } from "@/components/admin";
import { Notice } from "@/components/ui";
import { paystackConfigured } from "@/lib/paystack";
import { saveSettings } from "./actions";

export const metadata: Metadata = { title: "Fees & settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  await requirePermission("settings.manage");
  const { data } = await (await sessionClient()).from("settings").select("key, value");
  const s = new Map(data?.map((r) => [r.key, r.value]));
  const kobo = (k: string) => (typeof s.get(k) === "number" ? String((s.get(k) as number) / 100) : "");
  return (
    <>
      <AdminTitle title="Fees & payment settings" />
      <Flash msg={sp.msg} err={sp.err} />
      <div className="max-w-2xl space-y-6">
        <Notice tone="warn" title="Payments are OFF until all conditions are met">
          The fee must be marked approved, NDUM&apos;s official payment account and Paystack credentials must be confirmed, and the server must hold the Paystack secret key (currently {paystackConfigured() ? "set" : "NOT set"}).
        </Notice>
        <form action={saveSettings} className="space-y-5 border border-stone-200 bg-white p-6">
          <div><label className="field-label" htmlFor="rf">Registration fee (₦)</label><input id="rf" name="registration_fee" defaultValue={kobo("registration_fee_kobo")} className="field-input" inputMode="decimal" required /><p className="field-hint">Applicants see this before payment. Proposed: ₦2,000.</p></div>
          <div><label className="field-label" htmlFor="fs">Fee status</label><select id="fs" name="fee_status" defaultValue={String(s.get("fee_status") ?? "proposed")} className="field-input"><option value="proposed">Proposed (pending approval)</option><option value="approved">Approved</option></select></div>
          <div><label className="field-label" htmlFor="idf">Identity-card fee (₦)</label><input id="idf" name="id_card_fee" defaultValue={kobo("id_card_fee_kobo")} className="field-input" inputMode="decimal" /><p className="field-hint">Leave blank until formally approved. It is never displayed while blank.</p></div>
          <div><label className="field-label" htmlFor="vm">Membership validity (months)</label><input id="vm" name="validity" defaultValue={s.get("membership_validity_months") == null ? "" : String(s.get("membership_validity_months"))} className="field-input" inputMode="numeric" /><p className="field-hint">Leave blank unless a validity policy is approved. ID cards show an expiry date only when set.</p></div>
          <fieldset className="space-y-3 border-t border-stone-200 pt-5">
            <legend className="font-semibold text-forest-900">Payment collection</legend>
            <label className="flex items-start gap-3"><input type="checkbox" name="payments_enabled" defaultChecked={s.get("payments_enabled") === true} className="mt-1 size-4" /> Activate online registration payments</label>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="confirm_account" className="mt-1 size-4" /> I confirm NDUM has approved its official payment account and Paystack credentials (not a personal bank account).</label>
          </fieldset>
          <button className="btn-primary">Save settings</button>
        </form>
      </div>
    </>
  );
}
