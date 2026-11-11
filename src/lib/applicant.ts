import "server-only";
import { adminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { tokenMatches } from "@/lib/tokens";

export const statusUrl = (reference: string, token: string) =>
  `${env.siteUrl}/membership/status?ref=${encodeURIComponent(reference)}&key=${encodeURIComponent(token)}`;

/** Loads an application for an applicant ONLY if the private access token matches (constant-time). */
export async function applicationForToken(reference: string, token: string) {
  if (!reference || !token) return null;
  const { data } = await adminClient().from("applications").select("*").eq("reference", reference).maybeSingle();
  return data && tokenMatches(token, data.access_token_hash) ? data : null;
}
