"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actorWith } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { flash } from "@/lib/admin/flash";

const BACK = "/admin/categories";
const guard = async () => { if (!(await actorWith("categories.manage"))) flash(BACK, "err", "You do not have permission to do that."); };

export async function createCategory(fd: FormData) {
  await guard();
  const p = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(300).optional() }).safeParse({ name: fd.get("name"), description: fd.get("description") || undefined });
  if (!p.success) flash(BACK, "err", "Enter a category name (2–80 characters).");
  const { error } = await (await sessionClient()).from("membership_categories").insert({ name: p.data.name, description: p.data.description ?? null });
  if (error) flash(BACK, "err", error.code === "23505" ? "A category with that name already exists." : "Could not save the category.");
  revalidatePath(BACK); flash(BACK, "msg", "Category added.");
}

export async function toggleCategory(fd: FormData) {
  await guard();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) flash(BACK, "err", "Invalid request.");
  const active = fd.get("active") === "1";
  const { error } = await (await sessionClient()).from("membership_categories").update({ is_active: active }).eq("id", id.data);
  if (error) flash(BACK, "err", "Could not update the category.");
  revalidatePath(BACK); flash(BACK, "msg", active ? "Category activated." : "Category deactivated.");
}

export async function createChapter(fd: FormData) {
  await guard();
  const p = z.object({
    name: z.string().trim().min(2).max(120), kind: z.enum(["state", "lga", "ward"]),
    state: z.string().trim().min(2).max(60), lga: z.string().trim().max(80).optional(),
  }).safeParse({ name: fd.get("name"), kind: fd.get("kind"), state: fd.get("state"), lga: fd.get("lga") || undefined });
  if (!p.success) flash(BACK, "err", "Complete the chapter name, type and state.");
  if (p.data.kind !== "state" && !p.data.lga) flash(BACK, "err", "LGA and ward chapters need an LGA.");
  const { error } = await (await sessionClient()).from("chapters").insert({ name: p.data.name, kind: p.data.kind, state: p.data.state, lga: p.data.lga ?? null });
  if (error) flash(BACK, "err", error.code === "23505" ? "That chapter already exists in this state." : "Could not save the chapter.");
  revalidatePath(BACK); flash(BACK, "msg", "Chapter added.");
}

export async function toggleChapter(fd: FormData) {
  await guard();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) flash(BACK, "err", "Invalid request.");
  const { error } = await (await sessionClient()).from("chapters").update({ is_active: fd.get("active") === "1" }).eq("id", id.data);
  if (error) flash(BACK, "err", "Could not update the chapter.");
  revalidatePath(BACK); flash(BACK, "msg", "Chapter updated.");
}
