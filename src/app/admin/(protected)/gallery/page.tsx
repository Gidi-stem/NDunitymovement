import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { AdminTitle, Flash } from "@/components/admin";
import { Notice } from "@/components/ui";
import { GALLERY_CATEGORIES } from "@/lib/content";
import { signedUrls } from "@/lib/data";
import { deleteGalleryItem, updateGalleryItem, uploadGalleryItem } from "./actions";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  await requirePermission("content.manage");
  const { data } = await (await sessionClient()).from("gallery_items").select("*").order("created_at", { ascending: false });
  const urls = await signedUrls("media", data?.map((d) => d.media_path) ?? []);
  const flags = (d?: { consent_confirmed: boolean; contains_minors: boolean; safeguarding_approved: boolean; is_published: boolean }) => (
    <div className="space-y-1.5 text-sm">
      <label className="flex gap-2"><input type="checkbox" name="consent_confirmed" defaultChecked={d?.consent_confirmed} className="mt-1" /> Consent obtained from identifiable people shown</label>
      <label className="flex gap-2"><input type="checkbox" name="contains_minors" defaultChecked={d?.contains_minors} className="mt-1" /> Contains identifiable children (under 18)</label>
      <label className="flex gap-2"><input type="checkbox" name="safeguarding_approved" defaultChecked={d?.safeguarding_approved} className="mt-1" /> Guardian consent recorded &amp; safeguarding approval given</label>
      <label className="flex gap-2 font-semibold"><input type="checkbox" name="is_published" defaultChecked={d?.is_published} className="mt-1" /> Publish on the public gallery</label>
    </div>
  );
  return (
    <>
      <AdminTitle title="Gallery" />
      <Flash msg={sp.msg} err={sp.err} />
      <div className="mb-6 max-w-3xl"><Notice tone="warn" title="Safeguarding">Never publish identifiable photographs without consent. Images of children additionally require guardian consent and safeguarding approval; the system blocks publication otherwise.</Notice></div>
      <form action={uploadGalleryItem} className="mb-10 grid max-w-3xl gap-4 border border-stone-200 bg-white p-5">
        <h2 className="font-semibold text-forest-900">Upload photo or video</h2>
        <input name="title" required placeholder="Title" className="field-input" aria-label="Title" />
        <input name="caption" placeholder="Caption (optional)" className="field-input" aria-label="Caption" />
        <select name="category" className="field-input" aria-label="Category">{Object.entries(GALLERY_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input type="file" name="file" required accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="text-sm" aria-label="File" />
        <p className="field-hint">Images up to 5 MB · videos (MP4/WebM) up to 10 MB.</p>
        {flags()}
        <button className="btn-primary w-fit">Upload</button>
      </form>
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((d) => (
          <li key={d.id} className="border border-stone-200 bg-white">
            {urls.get(d.media_path) && (d.media_type === "image"
              ? <img src={urls.get(d.media_path)} alt={d.title} className="aspect-video w-full object-cover" />
              : <video src={urls.get(d.media_path)} controls preload="metadata" className="aspect-video w-full bg-black" />)}
            <div className="space-y-3 p-4">
              <p className="font-semibold">{d.title} <span className="text-xs font-normal text-stone-500">· {GALLERY_CATEGORIES[d.category]}</span></p>
              <form action={updateGalleryItem} className="space-y-3"><input type="hidden" name="id" value={d.id} />{flags(d)}<button className="btn-outline btn-sm">Save</button></form>
              <form action={deleteGalleryItem}><input type="hidden" name="id" value={d.id} /><button className="text-xs text-red-700 underline">Delete permanently</button></form>
            </div>
          </li>
        ))}
        {data?.length === 0 && <li className="text-stone-500">Nothing uploaded yet.</li>}
      </ul>
    </>
  );
}
