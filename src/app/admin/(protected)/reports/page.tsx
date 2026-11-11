import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { can, STATUSES, STATUS_LABELS } from "@/lib/auth/rbac";
import { AdminTitle } from "@/components/admin";
import { formatNaira } from "@/lib/money";
import { PrintButton } from "@/components/PrintButton";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const actor = await requirePermission("reports.view");
  const supabase = await sessionClient();
  const [{ data: apps }, { data: chapters }, { data: cats }, pay] = await Promise.all([
    supabase.from("applications").select("status, scope_state, scope_lga, chapter_id, category_id").limit(50000),
    supabase.from("chapters").select("id, name"),
    supabase.from("membership_categories").select("id, name"),
    can(actor, "payments.view") ? supabase.from("payments").select("status, amount_kobo").limit(50000) : Promise.resolve({ data: null }),
  ]);
  const rows = apps ?? [];
  const tally = (key: (r: (typeof rows)[number]) => string) => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const chName = new Map(chapters?.map((c) => [c.id, c.name]));
  const catName = new Map(cats?.map((c) => [c.id, c.name]));
  const approved = rows.filter((r) => r.status === "approved");
  const paid = pay.data?.filter((p) => p.status === "success") ?? [];

  return (
    <>
      <AdminTitle title="Membership reports"><PrintButton /></AdminTitle>
      <p className="mb-6 text-sm text-stone-600">Figures cover only records within your jurisdiction. {rows.length} application{rows.length === 1 ? "" : "s"} in scope · {approved.length} approved.</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Table title="By status" data={STATUSES.map((s) => [STATUS_LABELS[s], rows.filter((r) => r.status === s).length])} />
        <Table title="Approved members by state" data={(() => { const m = new Map<string, number>(); approved.forEach((r) => m.set(r.scope_state, (m.get(r.scope_state) ?? 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]); })()} />
        <Table title="Applications by state" data={tally((r) => r.scope_state)} />
        <Table title="Applications by LGA" data={tally((r) => `${r.scope_state} / ${r.scope_lga ?? "—"}`).slice(0, 40)} />
        <Table title="Applications by chapter" data={tally((r) => (r.chapter_id ? chName.get(r.chapter_id) ?? "Unknown" : "Not yet assigned"))} />
        <Table title="Applications by category" data={tally((r) => (r.category_id ? catName.get(r.category_id) ?? "Unknown" : "None"))} />
        {pay.data && <section className="border border-stone-200 bg-white p-5"><h2 className="mb-3 font-semibold text-forest-900">Payments</h2>
          <p className="text-sm">Successful payments: <strong>{paid.length}</strong></p><p className="text-sm">Total collected: <strong>{formatNaira(paid.reduce((n, p) => n + p.amount_kobo, 0))}</strong></p>
          <p className="mt-2 text-xs text-stone-500">Totals include only payments verified server-side with the payment gateway.</p></section>}
      </div>
    </>
  );
}

function Table({ title, data }: { title: string; data: [string, number][] }) {
  return (
    <section className="border border-stone-200 bg-white"><h2 className="border-b border-stone-200 p-4 font-semibold text-forest-900">{title}</h2>
      <table className="table-admin"><tbody>{data.length ? data.map(([k, n]) => <tr key={k}><td>{k}</td><td className="w-20 text-right font-mono">{n}</td></tr>) : <tr><td className="text-stone-500">No data</td></tr>}</tbody></table></section>
  );
}
