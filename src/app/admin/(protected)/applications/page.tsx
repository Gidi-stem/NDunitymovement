import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { STATUSES, STATUS_LABELS, can } from "@/lib/auth/rbac";
import { LIST_COLUMNS, safeSearch } from "@/lib/admin/columns";
import { AdminTitle, Flash, StatusBadge, fmtDate } from "@/components/admin";
import { NIGER_DELTA_STATES, OTHER_REGION } from "@/lib/nigeria";

export const metadata: Metadata = { title: "Applications" };
const PAGE = 25;

type SP = { q?: string; status?: string; state?: string; lga?: string; chapter?: string; page?: string; msg?: string; err?: string };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const actor = await requirePermission("applications.view");
  const supabase = await sessionClient();
  const page = Math.max(1, Number(sp.page) || 1);

  let query = supabase.from("applications").select(LIST_COLUMNS, { count: "exact" }).order("submitted_at", { ascending: false });
  if (sp.status && (STATUSES as string[]).includes(sp.status)) query = query.eq("status", sp.status);
  if (sp.state) query = query.eq("scope_state", sp.state);
  if (sp.lga) query = query.ilike("scope_lga", safeSearch(sp.lga).replace(/[%_]/g, ""));
  if (sp.chapter && /^[0-9a-f-]{36}$/i.test(sp.chapter)) query = query.eq("chapter_id", sp.chapter);
  const q = sp.q ? safeSearch(sp.q) : "";
  if (q) query = query.or(["full_name", "email", "phone", "reference", "membership_number"].map((c) => `${c}.ilike.%${q}%`).join(","));
  const { data, count, error } = await query.range((page - 1) * PAGE, page * PAGE - 1);

  const { data: chapters } = await supabase.from("chapters").select("id, name, state").eq("is_active", true).order("state").order("name");
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const params = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...over })) if (v && !["msg", "err"].includes(k)) u.set(k, String(v));
    return `?${u}`;
  };
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && ["q", "status", "state", "lga", "chapter"].includes(k)) as [string, string][]).toString();

  return (
    <>
      <AdminTitle title="Membership applications">
        {can(actor, "records.export") && <>
          <a className="btn-outline btn-sm" href={`/api/admin/export?${exportQs}`}>Export CSV (opens in Excel)</a>
        </>}
      </AdminTitle>
      <Flash msg={sp.msg} err={sp.err} />
      <form className="mb-5 grid gap-3 border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search name, email, phone, ref, number" className="field-input lg:col-span-2" aria-label="Search" />
        <select name="status" defaultValue={sp.status ?? ""} className="field-input" aria-label="Status"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select>
        <select name="state" defaultValue={sp.state ?? ""} className="field-input" aria-label="State"><option value="">All states</option>{[...NIGER_DELTA_STATES, OTHER_REGION].map((s) => <option key={s}>{s}</option>)}</select>
        <input name="lga" defaultValue={sp.lga} placeholder="LGA" className="field-input" aria-label="LGA" />
        <select name="chapter" defaultValue={sp.chapter ?? ""} className="field-input" aria-label="Chapter"><option value="">All chapters</option>{chapters?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6"><button className="btn-primary btn-sm">Filter</button><Link href="/admin/applications" className="btn-outline btn-sm">Reset</Link></div>
      </form>
      {error && <p className="mb-4 text-sm text-red-700">Could not load applications.</p>}
      <div className="overflow-x-auto border border-stone-200 bg-white">
        <table className="table-admin"><thead><tr><th>Applicant</th><th>Contact</th><th>Location</th><th>Status</th><th>Member no.</th><th>Submitted</th></tr></thead><tbody>
          {data?.map((a) => (
            <tr key={a.id}>
              <td><Link className="font-medium underline" href={`/admin/applications/${a.id}`}>{a.full_name}</Link><div className="font-mono text-xs text-stone-500">{a.reference}</div></td>
              <td><div>{a.phone}</div><div className="text-xs text-stone-500">{a.email}</div></td>
              <td>{[a.scope_state, a.scope_lga].filter(Boolean).join(" / ")}</td>
              <td><StatusBadge status={a.status} /></td>
              <td className="font-mono text-xs">{a.membership_number ?? "—"}</td>
              <td>{fmtDate(a.submitted_at)}</td>
            </tr>
          ))}
          {(!data || data.length === 0) && <tr><td colSpan={6} className="py-8 text-center text-stone-500">No applications match.</td></tr>}
        </tbody></table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span>{total} result{total === 1 ? "" : "s"} · page {page} of {pages}</span>
        <span className="flex gap-2">{page > 1 && <Link className="btn-outline btn-sm" href={params({ page: String(page - 1) })}>Previous</Link>}{page < pages && <Link className="btn-outline btn-sm" href={params({ page: String(page + 1) })}>Next</Link>}</span>
      </div>
    </>
  );
}
