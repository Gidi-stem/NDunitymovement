"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actorWith } from "@/lib/auth/session";
import { adminClient, sessionClient } from "@/lib/supabase/server";
import { flash } from "@/lib/admin/flash";
import { logAudit } from "@/lib/admin/audit";
import { ROLES, validateJurisdiction, type Role } from "@/lib/auth/rbac";

const BACK = "/admin/users";
const base = {
  full_name: z.string().trim().min(2).max(120),
  role: z.enum(ROLES),
  state: z.string().trim().max(60).optional(),
  lga: z.string().trim().max(80).optional(),
};

export async function createAdminUser(fd: FormData) {
  const actor = await actorWith("users.manage");
  if (!actor) flash(BACK, "err", "You do not have permission to do that.");
  const p = z.object({ ...base, email: z.email(), password: z.string().min(12, "min").max(100) }).safeParse({
    full_name: fd.get("full_name"), role: fd.get("role"), state: fd.get("state") || undefined, lga: fd.get("lga") || undefined,
    email: String(fd.get("email") ?? "").trim().toLowerCase(), password: fd.get("password"),
  });
  if (!p.success) flash(BACK, "err", "Enter a valid email, name, role and a temporary password of at least 12 characters.");
  const problem = validateJurisdiction(p.data.role as Role, p.data.state ?? null, p.data.lga ?? null);
  if (problem) flash(BACK, "err", problem);

  const db = adminClient();
  const { data: created, error } = await db.auth.admin.createUser({ email: p.data.email, password: p.data.password, email_confirm: true });
  if (error || !created.user) flash(BACK, "err", error?.message?.includes("already") ? "A user with that email already exists." : "Could not create the user.");
  const { error: perr } = await db.from("profiles").insert({ id: created.user!.id, full_name: p.data.full_name, role: p.data.role, state: p.data.state ?? null, lga: p.data.lga ?? null });
  if (perr) { await db.auth.admin.deleteUser(created.user!.id); flash(BACK, "err", "Could not create the administrator profile."); }
  await logAudit(actor, "user.created", "profiles", created.user!.id, { role: p.data.role, state: p.data.state ?? null, lga: p.data.lga ?? null });
  revalidatePath(BACK);
  flash(BACK, "msg", "Administrator created. Share the temporary password securely and ask them to change it.");
}

export async function updateAdminUser(fd: FormData) {
  const actor = await actorWith("users.manage");
  if (!actor) flash(BACK, "err", "You do not have permission to do that.");
  const id = z.uuid().safeParse(fd.get("id"));
  const p = z.object(base).safeParse({ full_name: fd.get("full_name"), role: fd.get("role"), state: fd.get("state") || undefined, lga: fd.get("lga") || undefined });
  if (!id.success || !p.success) flash(BACK, "err", "Invalid request.");
  const active = fd.get("is_active") === "on";
  // Lock-out protection: a Super Administrator cannot demote or deactivate themselves.
  if (id.data === actor.id && (p.data.role !== "super_admin" || !active)) flash(BACK, "err", "You cannot remove your own Super Administrator access.");
  const problem = validateJurisdiction(p.data.role as Role, p.data.state ?? null, p.data.lga ?? null);
  if (problem) flash(BACK, "err", problem);
  const { error } = await (await sessionClient()).from("profiles").update({ full_name: p.data.full_name, role: p.data.role, state: p.data.state ?? null, lga: p.data.lga ?? null, is_active: active }).eq("id", id.data);
  if (error) flash(BACK, "err", "Could not update the administrator.");
  revalidatePath(BACK);
  flash(BACK, "msg", "Administrator updated.");
}
