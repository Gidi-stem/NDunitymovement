import "server-only";
import { adminClient } from "@/lib/supabase/server";
import type { Actor } from "@/lib/auth/rbac";

/** For actions the DB triggers can't see (exports, ID-card generation). Written with the service role. */
export async function logAudit(actor: Actor, action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) {
  await adminClient().from("audit_log").insert({
    actor_id: actor.id, actor_label: actor.fullName, action, entity, entity_id: entityId, details,
  });
}
