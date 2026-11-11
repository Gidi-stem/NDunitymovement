import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { AdminTitle, Flash } from "@/components/admin";
import { ROLES, ROLE_LABELS } from "@/lib/auth/rbac";
import { NIGER_DELTA_STATES } from "@/lib/nigeria";
import { createAdminUser, updateAdminUser } from "./actions";

export const metadata: Metadata = { title: "Administrators" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  await requirePermission("users.manage");
  const { data } = await (await sessionClient()).from("profiles").select("id, full_name, role, state, lga, is_active").order("created_at");
  const roleSelect = (v?: string) => <select name="role" defaultValue={v ?? "membership_officer"} className="field-input" aria-label="Role">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>;
  const jur = (s?: string | null, l?: string | null) => (<><select name="state" defaultValue={s ?? ""} className="field-input" aria-label="State jurisdiction"><option value="">No state (national)</option>{NIGER_DELTA_STATES.map((x) => <option key={x}>{x}</option>)}</select><input name="lga" defaultValue={l ?? ""} placeholder="LGA (LGA coordinators)" className="field-input" aria-label="LGA jurisdiction" /></>);
  return (
    <>
      <AdminTitle title="Administrators" />
      <Flash msg={sp.msg} err={sp.err} />
      <form action={createAdminUser} className="mb-8 grid max-w-3xl gap-3 border border-stone-200 bg-white p-5 sm:grid-cols-2">
        <h2 className="font-semibold text-forest-900 sm:col-span-2">Add an administrator</h2>
        <input name="full_name" required placeholder="Full name" className="field-input" aria-label="Full name" />
        <input name="email" type="email" required placeholder="Email" className="field-input" aria-label="Email" />
        {roleSelect()}
        <input name="password" type="text" required minLength={12} placeholder="Temporary password (12+ chars)" className="field-input" autoComplete="off" aria-label="Temporary password" />
        {jur()}
        <p className="field-hint sm:col-span-2">State Coordinators need a state; LGA Coordinators need a state and LGA. Membership Officers are national unless a state/LGA is set.</p>
        <button className="btn-primary btn-sm w-fit">Create administrator</button>
      </form>
      <ul className="max-w-3xl space-y-3">
        {data?.map((u) => (
          <li key={u.id} className="border border-stone-200 bg-white p-4"><details><summary className="cursor-pointer"><strong>{u.full_name}</strong> — {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}{[u.state, u.lga].filter(Boolean).length ? ` (${[u.state, u.lga].filter(Boolean).join(" / ")})` : ""}{!u.is_active && <span className="ml-2 text-xs text-red-700">inactive</span>}</summary>
            <form action={updateAdminUser} className="mt-4 grid gap-3 sm:grid-cols-2"><input type="hidden" name="id" value={u.id} />
              <input name="full_name" defaultValue={u.full_name} className="field-input" aria-label="Full name" />{roleSelect(u.role)}{jur(u.state, u.lga)}
              <label className="flex gap-2 text-sm sm:col-span-2"><input type="checkbox" name="is_active" defaultChecked={u.is_active} className="mt-1" /> Account active</label>
              <button className="btn-outline btn-sm w-fit">Save</button></form></details></li>
        ))}
      </ul>
    </>
  );
}
