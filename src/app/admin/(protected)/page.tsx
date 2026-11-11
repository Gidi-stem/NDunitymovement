import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { STATUSES, STATUS_LABELS, can, type ApplicationStatus } from "@/lib/auth/rbac";
import { AdminTitle, Flash, StatusBadge, fmtDate } from "@/components/admin";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const actor = await requirePermission("applications.view");
  const supabase = await sessionClient();
  // Every query below is automatically restricted to the actor's jurisdiction by Row-Level Security.
  const counts = await Promise.all(STATUSES.map(async (s) => {
    const { count } = await supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", s);
    return [s, count ?? 0] as const;
  }));
  const { data: recent } = await supabase.from("applications").select("id, reference, full_name, status, scope_state, scope_lga, submitted_at").order("submitted_at", { ascending: false }).limit(8);
  const total = counts.reduce((n, [, c]) => n + c, 0);
  const scoped = actor.role !== "super_admin" && actor.role !== "national_admin";

  return (
    <>
      <AdminTitle title="Overview" />
      <Flash denied={denied} />
      {scoped && <p className="mb-4 text-sm text-stone-600">Showing records for your jurisdiction only.</p>}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="All applications" value={total} href="/admin/applications" />
        {counts.map(([s, c]) => <Stat key={s} label={STATUS_LABELS[s as ApplicationStatus]} value={c} href={`/admin/applications?status=${s}`} />)}
      </div>
      <div className="mt-8 border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 p-4"><h2 className="font-semibold text-forest-900">Latest applications</h2><Link className="text-sm underline" href="/admin/applications">View all</Link></div>
        {recent && recent.length > 0 ? (
          <div className="overflow-x-auto"><table className="table-admin"><thead><tr><th>Applicant</th><th>Reference</th><th>Chapter area</th><th>Status</th><th>Submitted</th></tr></thead><tbody>
            {recent.map((a) => (
              <tr key={a.id}><td><Link className="font-medium underline" href={`/admin/applications/${a.id}`}>{a.full_name}</Link></td><td className="font-mono text-xs">{a.reference}</td><td>{[a.scope_state, a.scope_lga].filter(Boolean).join(" / ")}</td><td><StatusBadge status={a.status} /></td><td>{fmtDate(a.submitted_at)}</td></tr>
            ))}
          </tbody></table></div>
        ) : <p className="p-6 text-sm text-stone-600">No applications yet.</p>}
      </div>
      {can(actor, "reports.view") && <p className="mt-6 text-sm"><Link href="/admin/reports" className="underline">Open membership reports →</Link></p>}
    </>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link href={href} className="border border-stone-200 bg-white p-4 hover:border-forest-600"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p><p className="mt-1 font-display text-3xl text-forest-900">{value}</p></Link>;
}
