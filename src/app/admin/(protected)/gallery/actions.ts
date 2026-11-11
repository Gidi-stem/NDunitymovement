"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actorWith } from "@/lib/auth/session";
import { adminClient, sessionClient } from "@/lib/supabase/server";
import { flash } from "@/lib/admin/flash";
import { storeUpload } from "@/lib/admin/upload";
import { GALLERY_CATEGORIES } from "@/lib/content";

const BACK = "/admin/gallery";
const on = (fd: FormData, k: string) => fd.get(k) === "on";

/** Safeguarding rule, enforced here AND by a CHECK constraint in the database. */
function publishAllowed(consent: boolean, minors: boolean, safeguarding: boolean) {
  if (!consent) return "Publishing requires confirmation that consent has been obtained from identifiable people shown.";
  if (minors && !safeguarding) return "Images of children need safeguarding approval and guardian consent before publishing.";
  return null;
}

export async function uploadGalleryItem(fd: FormData) {
  const actor = await actorWith("content.manage");
  if (!actor) flash(BACK, "err", "You do not have permission to do that.");
  const p = z.object({ title: z.string().trim().min(2).max(160), caption: z.string().trim().max(500).optional(), category: z.enum(Object.keys(GALLERY_CATEGORIES) as [string, ...string[]]) })
    .safeParse({ title: fd.get("title"), caption: fd.get("caption") || undefined, category: fd.get("category") });
  if (!p.success) flash(BACK, "err", "Enter a title and choose a category.");
  const consent = on(fd, "consent_confirmed"), minors = on(fd, "contains_minors"), safe = on(fd, "safeguarding_approved"), publish = on(fd, "is_published");
  if (publish) { const why = publishAllowed(consent, minors, safe); if (why) flash(BACK, "err", why); }
  const up = await storeUpload(fd.get("file") as File | null, { bucket: "media", folder: "gallery", allowVideo: true });
  if (!up.ok) flash(BACK, "err", up.error);
  const { error } = await (await sessionClient()).from("gallery_items").insert({
    title: p.data.title, caption: p.data.caption ?? null, category: p.data.category, media_path: up.result.path, media_type: up.result.mediaType,
    consent_confirmed: consent, contains_minors: minors, safeguarding_approved: safe, is_published: publish, created_by: actor.id,
  });
  if (error) { await adminClient().storage.from("media").remove([up.result.path]); flash(BACK, "err", "Could not save the item."); }
  revalidatePath("/gallery"); flash(BACK, "msg", publish ? "Uploaded and published." : "Uploaded (not published).");
}

export async function updateGalleryItem(fd: FormData) {
  if (!(await actorWith("content.manage"))) flash(BACK, "err", "You do not have permission to do that.");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) flash(BACK, "err", "Invalid request.");
  const consent = on(fd, "consent_confirmed"), minors = on(fd, "contains_minors"), safe = on(fd, "safeguarding_approved"), publish = on(fd, "is_published");
  if (publish) { const why = publishAllowed(consent, minors, safe); if (why) flash(BACK, "err", why); }
  const { error } = await (await sessionClient()).from("gallery_items").update({ consent_confirmed: consent, contains_minors: minors, safeguarding_approved: safe, is_published: publish }).eq("id", id.data);
  if (error) flash(BACK, "err", "Could not update the item.");
  revalidatePath("/gallery"); flash(BACK, "msg", "Item updated.");
}

export async function deleteGalleryItem(fd: FormData) {
  if (!(await actorWith("content.manage"))) flash(BACK, "err", "You do not have permission to do that.");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) flash(BACK, "err", "Invalid request.");
  const supabase = await sessionClient();
  const { data: item } = await supabase.from("gallery_items").select("media_path").eq("id", id.data).maybeSingle();
  const { error } = await supabase.from("gallery_items").delete().eq("id", id.data);
  if (error) flash(BACK, "err", "Could not delete the item.");
  if (item?.media_path) await adminClient().storage.from("media").remove([item.media_path]);
  revalidatePath("/gallery"); flash(BACK, "msg", "Item deleted.");
}
