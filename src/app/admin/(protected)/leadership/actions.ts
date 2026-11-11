"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actorWith } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { flash } from "@/lib/admin/flash";
import { storeUpload } from "@/lib/admin/upload";
import { tiers } from "@/lib/content";

const BACK = "/admin/leadership";
const schema = z.object({
  tier: z.enum(tiers.map((t) => t.id) as [string, ...string[]]),
  full_name: z.string().trim().min(2).max(120), position: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(3000).optional(), sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveLeader(fd: FormData) {
  if (!(await actorWith("content.manage"))) flash(BACK, "err", "You do not have permission to do that.");
  const p = schema.safeParse({ tier: fd.get("tier"), full_name: fd.get("full_name"), position: fd.get("position"), bio: fd.get("bio") || undefined, sort_order: fd.get("sort_order") || 0 });
  if (!p.success) flash(BACK, "err", "Complete the tier, name and position.");
  const id = String(fd.get("id") ?? "");
  const photo = fd.get("photo");
  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    if (fd.get("photo_consent") !== "on") flash(BACK, "err", "Confirm the person consented to their photograph being published.");
    const up = await storeUpload(photo, { bucket: "media", folder: "leadership" });
    if (!up.ok) flash(BACK, "err", up.error);
    photoPath = up.result.path;
  }
  const row = { ...p.data, bio: p.data.bio ?? null, is_published: fd.get("is_published") === "on", ...(photoPath ? { photo_path: photoPath } : {}) };
  const supabase = await sessionClient();
  const { error } = id ? await supabase.from("leadership_profiles").update(row).eq("id", z.uuid().parse(id)) : await supabase.from("leadership_profiles").insert(row);
  if (error) flash(BACK, "err", "Could not save the profile.");
  revalidatePath("/about"); revalidatePath("/structure");
  flash(BACK, "msg", "Profile saved.");
}

export async function deleteLeader(fd: FormData) {
  if (!(await actorWith("content.manage"))) flash(BACK, "err", "You do not have permission to do that.");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) flash(BACK, "err", "Invalid request.");
  const { error } = await (await sessionClient()).from("leadership_profiles").delete().eq("id", id.data);
  if (error) flash(BACK, "err", "Could not delete the profile.");
  revalidatePath("/about"); revalidatePath("/structure");
  flash(BACK, "msg", "Profile deleted.");
}
