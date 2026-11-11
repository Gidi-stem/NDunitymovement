import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { AdminTitle, Flash } from "@/components/admin";
import { Notice } from "@/components/ui";
import { tiers } from "@/lib/content";
import { deleteLeader, saveLeader } from "./actions";

export const metadata: Metadata = { title: "Leadership" };

export default async function LeadershipAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  await requirePermission("content.manage");
  const { data } = await (await sessionClient()).from("leadership_profiles").select("*").order("sort_order").order("created_at");
  const form = (p?: NonNullable<typeof data>[number]) => (
    <form action={saveLeader} className="grid gap-3 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <select name="tier" defaultValue={p?.tier ?? "national_executive_council"} className="field-input" aria-label="Tier">{tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <input name="sort_order" type="number" min={0} defaultValue={p?.sort_order ?? 0} className="field-input" aria-label="Display order" />
      <input name="full_name" required defaultValue={p?.full_name} placeholder="Full name" className="field-input" aria-label="Full name" />
      <input name="position" required defaultValue={p?.position} placeholder="Position" className="field-input" aria-label="Position" />
      <textarea name="bio" rows={4} defaultValue={p?.bio ?? ""} placeholder="Biography (leave blank until supplied)" className="field-input sm:col-span-2" aria-label="Biography" />
      <div className="sm:col-span-2 space-y-2 text-sm"><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" aria-label="Photograph" />
        <label className="flex gap-2"><input type="checkbox" name="photo_consent" className="mt-1" /> This person consented to their photograph being published.</label>
        <label className="flex gap-2"><input type="checkbox" name="is_published" defaultChecked={p ? p.is_published : true} className="mt-1" /> Show on the public website</label></div>
      <button className="btn-primary btn-sm w-fit">Save profile</button>
    </form>
  );
  return (
    <>
      <AdminTitle title="Leadership profiles" />
      <Flash msg={sp.msg} err={sp.err} />
      <div className="mb-6 max-w-3xl"><Notice tone="warn">Only add officers whose appointment has been formally approved. Do not invent biographies — leave the biography blank until it is supplied. Until a profile is saved here, the website shows only Gladys Isaiah Ayibakipreye, President, with no biography.</Notice></div>
      <details className="mb-8 max-w-3xl border border-stone-200 bg-white p-5" open={!data?.length}><summary className="cursor-pointer font-semibold text-forest-900">Add a profile</summary><div className="mt-4">{form()}</div></details>
      <ul className="max-w-3xl space-y-4">
        {data?.map((p) => (
          <li key={p.id} className="border border-stone-200 bg-white p-5"><details><summary className="cursor-pointer"><strong>{p.full_name}</strong> — {p.position} <span className="text-xs text-stone-500">({tiers.find((t) => t.id === p.tier)?.name}{p.is_published ? "" : ", hidden"})</span></summary>
            <div className="mt-4">{form(p)}</div><form action={deleteLeader} className="mt-3"><input type="hidden" name="id" value={p.id} /><button className="text-xs text-red-700 underline">Delete profile</button></form></details></li>
        ))}
      </ul>
    </>
  );
}
