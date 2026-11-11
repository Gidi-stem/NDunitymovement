"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sessionClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { FormState } from "@/lib/forms";

const schema = z.object({ email: z.email(), password: z.string().min(1).max(200) });

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "The system is not configured yet (missing Supabase credentials)." };
  const parsed = schema.safeParse({ email: String(fd.get("email") ?? "").trim(), password: String(fd.get("password") ?? "") });
  const generic = "Invalid email or password, or your account is not active.";
  if (!parsed.success) return { ok: false, message: generic, values: { email: String(fd.get("email") ?? "") } };

  const supabase = await sessionClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { ok: false, message: generic, values: { email: parsed.data.email } };

  // Must be an ACTIVE administrator; otherwise sign straight back out.
  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { ok: false, message: generic, values: { email: parsed.data.email } };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await sessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
