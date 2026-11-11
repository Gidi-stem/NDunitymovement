import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { AdminTitle, fmtDate } from "@/components/admin";

export const metadata: Metadata = { title: "Audit log" };
const PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: p } = await searchParams;
  await requirePermission("audit.view");
  const page = Math.max(1, Number(p) || 1);
  const { data, count } = await (await sessionClient()).from("audit_log").select("*", { count: "exact" }).order("id", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  return (
    <>
      <AdminTitle title="Audit log" />
      <p className="mb-4 text-sm text-stone-600">Append-only record of administrative actions. Personal data is not stored here.</p>
      <div className="overflow-x-auto border border-stone-200 bg-white"><table className="table-admin"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Details</th></tr></thead><tbody>
        {data?.map((r) => (
          <tr key={r.id}><td className="whitespace-nowrap">{fmtDate(r.created_at)}</td><td>{r.actor_label}</td><td className="font-mono text-xs">{r.action}</td><td className="font-mono text-xs">{r.entity_id?.slice(0, 13)}</td><td className="max-w-md break-words font-mono text-[11px] text-stone-600">{JSON.stringify(r.details).slice(0, 300)}</td></tr>
        ))}
      </tbody></table></div>
      <div className="mt-4 flex items-center justify-between text-sm"><span>Page {page} of {pages}</span><span className="flex gap-2">{page > 1 && <Link className="btn-outline btn-sm" href={`?page=${page - 1}`}>Previous</Link>}{page < pages && <Link className="btn-outline btn-sm" href={`?page=${page + 1}`}>Next</Link>}</span></div>
    </>
  );
}
