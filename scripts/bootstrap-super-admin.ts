/**
 * Creates the first Super Administrator. Run once, from a trusted machine:
 *   npx tsx --env-file=.env.local scripts/bootstrap-super-admin.ts you@example.org "Full Name"
 * Optionally set BOOTSTRAP_PASSWORD; otherwise a strong random password is generated and printed ONCE.
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [email, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(" ").trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !fullName || !url || !key) {
  console.error('Usage: tsx --env-file=.env.local scripts/bootstrap-super-admin.ts <email> "<Full Name>"');
  console.error("Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const password = process.env.BOOTSTRAP_PASSWORD || randomBytes(18).toString("base64url");
const db = createClient(url, key, { auth: { persistSession: false } });

const { data: existing } = await db.from("profiles").select("id").eq("role", "super_admin").limit(1);
if (existing && existing.length && process.env.FORCE !== "1") {
  console.error("A Super Administrator already exists. Set FORCE=1 to add another.");
  process.exit(1);
}
const { data, error } = await db.auth.admin.createUser({ email: email.toLowerCase(), password, email_confirm: true });
if (error || !data.user) { console.error("Could not create auth user:", error?.message); process.exit(1); }
const { error: perr } = await db.from("profiles").insert({ id: data.user.id, full_name: fullName, role: "super_admin" });
if (perr) { await db.auth.admin.deleteUser(data.user.id); console.error("Could not create profile:", perr.message); process.exit(1); }
console.log(`Super Administrator created: ${email}`);
if (!process.env.BOOTSTRAP_PASSWORD) console.log(`Temporary password (shown once): ${password}`);
console.log("Sign in at /admin/login and change this password immediately.");
