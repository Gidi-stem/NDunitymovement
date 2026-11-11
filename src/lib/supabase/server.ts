import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, isAdminClientConfigured, isSupabaseConfigured } from "@/lib/env";

/** Session-bound client (admin users). Row-Level Security applies as the signed-in user. */
export async function sessionClient() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are refreshed by proxy.ts instead.
        }
      },
    },
  });
}

/** Cookie-less anonymous client for public reads (published content, fee display). Cacheable pages. */
export function publicClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Service-role client — bypasses RLS. Use ONLY in server code for: application intake, payment
 * settlement, signed storage URLs, admin-user creation. Always check permissions BEFORE using it.
 */
export function adminClient() {
  if (!isAdminClientConfigured()) throw new Error("Server is not configured (missing Supabase service credentials).");
  return createClient(env.supabaseUrl, env.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
