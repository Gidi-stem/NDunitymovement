import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { AdminTitle, Flash } from "@/components/admin";
import { CHAPTER_STATES } from "@/lib/nigeria";
import { createCategory, createChapter, toggleCategory, toggleChapter } from "./actions";

export const metadata: Metadata = { title: "Categories & chapters" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  await requirePermission("categories.manage");
  const supabase = await sessionClient();
  const [{ data: cats }, { data: chapters }] = await Promise.all([
    supabase.from("membership_categories").select("id, name, description, is_active").order("sort_order").order("name"),
    supabase.from("chapters").select("id, name, kind, state, lga, is_active").order("state").order("name"),
  ]);
  const toggle = (action: typeof toggleCategory, id: string, active: boolean) => (
    <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="active" value={active ? "0" : "1"} /><button className="underline text-xs">{active ? "Deactivate" : "Activate"}</button></form>
  );
  return (
    <>
      <AdminTitle title="Membership categories & chapters" />
      <Flash msg={sp.msg} err={sp.err} />
      <div className="grid gap-8 xl:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-forest-900">Membership categories</h2>
          <form action={createCategory} className="grid gap-3 border border-stone-200 bg-white p-4"><input name="name" placeholder="Category name" required className="field-input" aria-label="Category name" /><input name="description" placeholder="Description (optional)" className="field-input" aria-label="Description" /><button className="btn-primary btn-sm w-fit">Add category</button></form>
          <table className="table-admin bg-white"><thead><tr><th>Name</th><th>Active</th><th /></tr></thead><tbody>{cats?.map((c) => <tr key={c.id}><td>{c.name}<div className="text-xs text-stone-500">{c.description}</div></td><td>{c.is_active ? "Yes" : "No"}</td><td>{toggle(toggleCategory, c.id, c.is_active)}</td></tr>)}</tbody></table>
        </section>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-forest-900">Chapters & units</h2>
          <form action={createChapter} className="grid gap-3 border border-stone-200 bg-white p-4 sm:grid-cols-2">
            <input name="name" placeholder="Chapter name" required className="field-input sm:col-span-2" aria-label="Chapter name" />
            <select name="kind" className="field-input" aria-label="Type"><option value="state">State chapter</option><option value="lga">LGA chapter</option><option value="ward">Ward / community unit</option></select>
            <select name="state" required className="field-input" aria-label="State">{CHAPTER_STATES.map((s) => <option key={s}>{s}</option>)}</select>
            <input name="lga" placeholder="LGA (for LGA / ward units)" className="field-input sm:col-span-2" aria-label="LGA" />
            <button className="btn-primary btn-sm w-fit">Add chapter</button></form>
          <table className="table-admin bg-white"><thead><tr><th>Name</th><th>Type</th><th>Area</th><th /></tr></thead><tbody>{chapters?.map((c) => <tr key={c.id}><td>{c.name}{!c.is_active && <span className="ml-2 text-xs text-stone-500">(inactive)</span>}</td><td className="capitalize">{c.kind}</td><td>{[c.state, c.lga].filter(Boolean).join(" / ")}</td><td>{toggle(toggleChapter, c.id, c.is_active)}</td></tr>)}{chapters?.length === 0 && <tr><td colSpan={4} className="text-stone-500">No chapters yet.</td></tr>}</tbody></table>
        </section>
      </div>
    </>
  );
}
