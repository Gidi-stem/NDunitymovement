import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { APPLICATION_COLUMNS } from "@/lib/admin/columns";
import { availableActions, can, type ApplicationStatus, type ReviewAction } from "@/lib/auth/rbac";
import { AdminTitle, Flash, StatusBadge, fmtDate } from "@/components/admin";
import { formatNaira } from "@/lib/money";
import { signedUrls } from "@/lib/data";
import { assignChapter, generateIdCard, reviewApplication, uploadMemberPhoto } from "../actions";

export const metadata: Metadata = { title: "Application" };
const ACTION_LABEL: Record<ReviewAction, string> = { start_review: "Start review", request_correction: "Request correction", approve: "Approve", decline: "Decline" };

export default async function ApplicationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const actor = await requirePermission("applications.view");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await sessionClient();
  // RLS: returns nothing if the application is outside this admin's jurisdiction.
  const { data: a } = await supabase.from("applications").select(APPLICATION_COLUMNS).eq("id", id).maybeSingle();
  if (!a) notFound();
  const status = a.status as ApplicationStatus;

  const [{ data: payments }, { data: chapters }, { data: cat }, photo] = await Promise.all([
    can(actor, "payments.view") ? supabase.from("payments").select("reference, status, amount_kobo, paid_at, created_at").eq("application_id", id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as never[] }),
    supabase.from("chapters").select("id, name, kind, state, lga").eq("is_active", true).order("state").order("name"),
    supabase.from("membership_categories").select("name").eq("id", a.category_id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
    signedUrls("member-photos", [a.member_photo_path]),
  ]);
  const photoUrl = a.member_photo_path ? photo.get(a.member_photo_path) : null;
  const actions = availableActions(status).filter((x) => can(actor, x === "approve" || x === "decline" ? "applications.decide" : "applications.review"));
  const row = (label: string, value: React.ReactNode) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</dt><dd className="mt-0.5 break-words">{value || "—"}</dd></div>;

  return (
    <>
      <AdminTitle title={a.full_name}><Link href="/admin/applications" className="btn-outline btn-sm">← Back to list</Link></AdminTitle>
      <Flash msg={sp.msg} err={sp.err} />
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="border border-stone-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3"><StatusBadge status={status} /><span className="font-mono text-sm">{a.reference}</span>{a.membership_number && <span className="font-mono text-sm font-bold text-forest-800">{a.membership_number}</span>}</div>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {row("Full name", a.full_name)}{row("Preferred name", a.preferred_name)}{row("Phone", a.phone)}{row("Email", a.email)}{row("Date of birth", a.date_of_birth)}{row("Sex", a.sex)}
              {row("State of residence", a.state_of_residence)}{row("LGA", a.lga)}{row("Ward", a.ward)}{row("Community", a.community)}{row("State of origin", a.state_of_origin)}{row("Occupation", a.occupation)}
              <div className="sm:col-span-2 lg:col-span-3">{row("Residential address", a.residential_address)}</div>
            </dl>
          </section>
          <section className="border border-stone-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-forest-900">Membership information</h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {row("Preferred chapter / state", a.preferred_chapter_state)}{row("LGA chapter", a.lga_chapter)}{row("Ward / community unit", a.ward_unit)}{row("Category", cat?.name)}
              {row("Areas of interest", [...(a.areas_of_interest ?? []), a.areas_other ? `(${a.areas_other})` : ""].join(", "))}
              {row("Next of kin", [a.next_of_kin_name, a.next_of_kin_phone].filter(Boolean).join(" — "))}
            </dl>
          </section>
          <section className="border border-stone-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-forest-900">Declaration</h2>
            <p className="text-sm text-stone-700">All six declarations and consents were affirmed. Signed (typed) as <strong>{a.signature_name}</strong> on {a.declaration_date}. Submitted {fmtDate(a.submitted_at)}.</p>
          </section>
          {can(actor, "payments.view") && (
            <section className="border border-stone-200 bg-white p-5">
              <h2 className="mb-3 font-semibold text-forest-900">Payments</h2>
              {payments && payments.length > 0 ? <table className="table-admin"><thead><tr><th>Reference</th><th>Amount</th><th>Status</th><th>Paid</th></tr></thead><tbody>
                {payments.map((p) => <tr key={p.reference}><td className="font-mono text-xs">{p.reference}</td><td>{formatNaira(p.amount_kobo)}</td><td className="capitalize">{p.status}</td><td>{fmtDate(p.paid_at)}</td></tr>)}
              </tbody></table> : <p className="text-sm text-stone-600">No payment attempts recorded.</p>}
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="border border-stone-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-forest-900">Review</h2>
            {a.correction_note && <p className="mb-3 border-l-4 border-gold-500 bg-amber-50 p-3 text-sm"><strong>Correction requested:</strong> {a.correction_note}</p>}
            {a.review_note && <p className="mb-3 border-l-4 border-stone-300 bg-stone-50 p-3 text-sm"><strong>Note:</strong> {a.review_note}</p>}
            {actions.length === 0 ? <p className="text-sm text-stone-600">{status === "approved" ? "Approved." : "No actions available for you at this stage."}</p> : (
              <div className="space-y-4">
                {actions.map((x) => (
                  <form key={x} action={reviewApplication} className="space-y-2 border-t border-stone-200 pt-3 first:border-0 first:pt-0">
                    <input type="hidden" name="id" value={a.id} /><input type="hidden" name="action" value={x} />
                    {(x === "request_correction" || x === "decline") && <textarea name="note" required rows={2} placeholder={x === "decline" ? "Reason for declining (required)" : "What must the applicant correct? (required)"} className="field-input" aria-label="Note" />}
                    {x === "approve" && <input name="note" placeholder="Optional note" className="field-input" aria-label="Note" />}
                    <button className={x === "decline" ? "btn-danger btn-sm" : x === "approve" ? "btn-primary btn-sm" : "btn-outline btn-sm"}>{ACTION_LABEL[x]}</button>
                  </form>
                ))}
              </div>
            )}
          </section>

          {can(actor, "applications.assign_chapter") && (
            <section className="border border-stone-200 bg-white p-5">
              <h2 className="mb-3 font-semibold text-forest-900">Chapter / unit</h2>
              <p className="mb-2 text-xs text-stone-600">Currently: {chapters?.find((c) => c.id === a.chapter_id)?.name ?? "Not assigned"} · Area: {[a.scope_state, a.scope_lga].filter(Boolean).join(" / ")}</p>
              <form action={assignChapter} className="space-y-2"><input type="hidden" name="id" value={a.id} />
                <select name="chapter_id" defaultValue={a.chapter_id ?? ""} className="field-input" aria-label="Chapter"><option value="">Not assigned</option>{chapters?.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.kind}, {c.state}{c.lga ? `/${c.lga}` : ""})</option>)}</select>
                <button className="btn-outline btn-sm">Save chapter</button></form>
              {chapters?.length === 0 && <p className="mt-2 text-xs text-stone-500">No chapters exist yet. A National Administrator can add them under Categories & chapters.</p>}
            </section>
          )}

          {can(actor, "applications.edit_photo") && (
            <section className="border border-stone-200 bg-white p-5">
              <h2 className="mb-3 font-semibold text-forest-900">Member photograph</h2>
              {photoUrl ? <img src={photoUrl} alt="Member" className="mb-3 h-36 w-28 border border-stone-300 object-cover" /> : <p className="mb-3 text-sm text-stone-600">No photograph yet.</p>}
              <form action={uploadMemberPhoto} className="space-y-2"><input type="hidden" name="id" value={a.id} />
                <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required className="block w-full text-sm" aria-label="Photograph" />
                <label className="flex items-start gap-2 text-xs"><input type="checkbox" name="consent" className="mt-0.5" /> The member has consented to their photograph being held and printed on their ID card.</label>
                <button className="btn-outline btn-sm">Upload (max 2 MB)</button></form>
            </section>
          )}

          {can(actor, "idcards.generate") && (
            <section className="border border-stone-200 bg-white p-5">
              <h2 className="mb-3 font-semibold text-forest-900">Membership ID card</h2>
              {status === "approved" ? <form action={generateIdCard}><input type="hidden" name="id" value={a.id} /><button className="btn-primary btn-sm">Generate printable ID card</button></form>
                : <p className="text-sm text-stone-600">ID cards can only be generated after an application is approved.</p>}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
