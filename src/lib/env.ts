/** Central, lazy access to environment variables. Secrets are read only in server-only modules. */
export const env = {
  get supabaseUrl() { return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""; },
  get supabaseAnonKey() { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""; },
  get serviceRoleKey() { return process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""; },
  get paystackSecret() { return process.env.PAYSTACK_SECRET_KEY ?? ""; },
  get resendKey() { return process.env.RESEND_API_KEY ?? ""; },
  get emailFrom() { return process.env.EMAIL_FROM ?? ""; },
  get siteUrl() { return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""); },
};

export const isSupabaseConfigured = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isAdminClientConfigured = () => isSupabaseConfigured() && Boolean(env.serviceRoleKey);
