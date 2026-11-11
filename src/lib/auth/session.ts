import "server-only";
import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { can, type Actor, type Permission, type Role } from "./rbac";

/** Returns the signed-in, active administrator or null. Verifies the JWT with Supabase (not just the cookie). */
export async function getActor(): Promise<Actor | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await sessionClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, state, lga, is_active")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) return null;
  return {
    id: profile.id,
    role: profile.role as Role,
    fullName: profile.full_name,
    state: profile.state,
    lga: profile.lga,
  };
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  return actor;
}

/** Page/server-action guard. Redirects to the dashboard home (with a notice) when not permitted. */
export async function requirePermission(permission: Permission): Promise<Actor> {
  const actor = await requireActor();
  if (!can(actor, permission)) redirect("/admin?denied=1");
  return actor;
}

/** For server actions that must return a result instead of redirecting. */
export async function actorWith(permission: Permission): Promise<Actor | null> {
  const actor = await getActor();
  return actor && can(actor, permission) ? actor : null;
}
