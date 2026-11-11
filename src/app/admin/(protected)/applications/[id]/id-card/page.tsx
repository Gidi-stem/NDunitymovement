import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/data";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { Flash } from "@/components/admin";

export const metadata: Metadata = { title: "ID card" };

export default async function IdCardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const { msg } = await searchParams;
  await requirePermission("idcards.generate");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await sessionClient();
  const { data: a } = await supabase.from("applications").select("id, status, full_name, membership_number, scope_state, chapter_id, category_id, member_photo_path, expires_on").eq("id", id).maybeSingle();
  // Never render a card for an unapproved applicant.
  if (!a || a.status !== "approved" || !a.membership_number) notFound();
  const [{ data: chapter }, { data: cat }, photo] = await Promise.all([
    a.chapter_id ? supabase.from("chapters").select("name, state").eq("id", a.chapter_id).maybeSingle() : Promise.resolve({ data: null }),
    a.category_id ? supabase.from("membership_categories").select("name").eq("id", a.category_id).maybeSingle() : Promise.resolve({ data: null }),
    signedUrls("member-photos", [a.member_photo_path], 600),
  ]);
  const photoUrl = a.member_photo_path ? photo.get(a.member_photo_path) : null;

  return (
    <>
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Link href={`/admin/applications/${id}`} className="btn-outline btn-sm">← Back</Link><PrintButton />
        <p className="text-sm text-stone-600">Print at 100% scale on CR80 card stock (85.6 × 54 mm).</p>
      </div>
      <div className="no-print"><Flash msg={msg} /></div>
      <div className="flex flex-wrap gap-6">
        <div className="relative h-[54mm] w-[85.6mm] overflow-hidden border border-stone-400 bg-white text-[10px] leading-tight shadow print:shadow-none" style={{ breakInside: "avoid" }}>
          <div className="flex items-center gap-2 bg-forest-800 px-3 py-2 text-white"><Logo light size={24} /><div><p className="text-[11px] font-bold tracking-wide">NIGER DELTA UNITY MOVEMENT</p><p className="text-[7px] tracking-[0.15em] text-gold-300">UNITY • EMPOWERMENT • DEVELOPMENT</p></div></div>
          <div className="flex gap-3 p-3">
            {photoUrl ? <img src={photoUrl} alt="" className="h-[26mm] w-[20mm] border border-stone-300 object-cover" /> : <div className="flex h-[26mm] w-[20mm] items-center justify-center border border-dashed border-stone-400 text-center text-[7px] text-stone-500">Photo required</div>}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[13px] font-bold leading-tight text-forest-900">{a.full_name}</p>
              <p><span className="text-stone-500">Member No.</span> <span className="font-mono text-[11px] font-bold">{a.membership_number}</span></p>
              <p><span className="text-stone-500">Chapter</span> {chapter?.name ?? "—"}</p>
              <p><span className="text-stone-500">State</span> {chapter?.state ?? a.scope_state}</p>
              <p><span className="text-stone-500">Category</span> {cat?.name ?? "—"}</p>
              {a.expires_on && <p><span className="text-stone-500">Expires</span> {new Date(a.expires_on).toLocaleDateString("en-GB")}</p>}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gold-500" />
        </div>
      </div>
      {!photoUrl && <p className="no-print mt-4 text-sm text-amber-800">A member photograph has not been uploaded. Add one on the application page before printing.</p>}
    </>
  );
}
