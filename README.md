# NDUM — Niger Delta Unity Movement website

Next.js 16 · TypeScript · Tailwind 4 · Supabase (Postgres, Auth, Storage) · Paystack (off by default).
Read `docs/ARCHITECTURE.md` for the design and `docs/IMPLEMENTATION_REPORT.md` for status.

## Run locally
```bash
npm install
cp .env.example .env.local      # fill in Supabase values
npm run dev
```
Without Supabase credentials the public pages still work; the application form, admin and payments show a clear "not set up yet" state.

## Deploy (Vercel + Supabase)
1. Create a Supabase project. In the SQL editor (or `supabase db push`) run, in order, `supabase/migrations/0001_schema.sql` → `0002_security.sql` → `0003_seed.sql` → `0004_storage.sql`.
2. Copy the project URL, anon key and **service-role key** into the host's environment variables (see `.env.example`). Never prefix the service-role or Paystack keys with `NEXT_PUBLIC_`.
3. Create the first Super Administrator: `npm run bootstrap:admin -- you@example.org "Full Name"` (uses `.env.local`; prints a one-time password).
4. Sign in at `/admin/login`; add categories/chapters, leadership profiles, and other administrators.
5. Deploy, then set `NEXT_PUBLIC_SITE_URL` to the live URL.

### Switching on payments (only when NDUM is ready)
1. NDUM opens a Paystack business account with its **official** settlement account.
2. Add `PAYSTACK_SECRET_KEY` to the server environment.
3. In Paystack dashboard set the webhook URL to `https://<site>/api/paystack/webhook`.
4. In **Admin → Fees & settings**: mark the fee *Approved*, tick the confirmations, and activate payments.

## Quality gates
`npm run check` runs type-check, lint and all tests (database/RLS tests execute the real SQL migrations in an in-process Postgres).

## Content slots
Drop `logo.svg|png`, `hero.jpg`, `about.jpg` into `public/images/` (see the README there).
