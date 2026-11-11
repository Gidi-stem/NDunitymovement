# NDUM Website — Architecture

## 1. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript, React 19 |
| Styling | Tailwind CSS 4, system font stack (no third-party font fetch) |
| Database / Auth / Storage | Supabase (PostgreSQL, Supabase Auth, private Storage buckets) |
| Validation | Zod (shared client + server schemas; server is authoritative) |
| Payments | Paystack (server-side initialize + verify + signed webhook), **disabled by default** |
| Email | Resend REST API (optional; no-op until configured) |
| Tests | Vitest (unit) + PGlite (runs the real SQL migrations in-process to test RLS and RPCs) |

Rendering model: the conventional dynamic model (Cache Components turned off). Public marketing pages are static; anything that reads cookies or the database for a user is dynamic.

## 2. Request flow and trust boundaries

```
Browser ──► Next.js server (Server Components / Server Actions / Route Handlers)
             │
             ├─ anon/session Supabase client  (user's JWT → Row-Level Security applies)
             └─ service-role Supabase client  (server-only, `import "server-only"`; used ONLY for:
                  public application intake, payment webhook, signed storage URLs,
                  admin user creation)
```

* The service-role key and Paystack secret are only read in server-only modules. Neither is ever prefixed `NEXT_PUBLIC_`.
* Public visitors have **no** direct table access except `SELECT` on published posts, published gallery items, published leadership profiles and active categories/chapters. Applications are inserted through a server action that validates with Zod, then uses the service role.
* The browser can never mark a payment successful. Only (a) the signature-verified Paystack webhook or (b) the server-side `verify` call made by the callback page can do it, and both re-check the amount, currency and reference against our own `payments` row.

## 3. Database (see `supabase/migrations/`)

| Table | Purpose | Key columns / constraints |
|---|---|---|
| `profiles` | Admin users (1:1 with `auth.users`) | `role` enum, `state`, `lga` (jurisdiction), `is_active` |
| `membership_categories` | Configurable categories | `name` unique, `is_active`, `sort_order` |
| `chapters` | State / LGA / Ward-community units | `kind`, `state`, `lga`, `parent_id` |
| `applications` | Membership applications | `status` enum, `reference` unique, `membership_number` unique, `access_token_hash`, declaration + consent columns, `category_id → membership_categories`, `chapter_id → chapters` |
| `payments` | Payment attempts | `reference` unique, `gateway_transaction_id` unique (nullable), **partial unique index: one `success` per application**, `amount_kobo`, `status` |
| `settings` | Key/value config | `registration_fee_kobo`, `fee_status` (proposed/approved), `id_card_fee_kobo` (null until approved), `payments_enabled`, `membership_validity_months` (null until policy approved) |
| `posts` | News & updates CMS | `slug` unique, `status` (draft/published/archived) |
| `gallery_items` | Photos/videos | `consent_confirmed`, `contains_minors`, `safeguarding_approved`; **CHECK** blocks publishing without consent / safeguarding sign-off |
| `leadership_profiles` | Editable officer profiles | `tier`, `position`, `bio` nullable, `photo_path` nullable |
| `contact_messages` | Contact form inbox | admin-read only |
| `audit_log` | Append-only admin action log | no UPDATE/DELETE grants; written inside the same transaction as the action |

Relationships: `applications.category_id → membership_categories.id`, `applications.chapter_id → chapters.id`, `chapters.parent_id → chapters.id`, `payments.application_id → applications.id`, `profiles.id → auth.users.id`, `posts.author_id → profiles.id`, `audit_log.actor_id → profiles.id`.

Atomic, security-definer RPCs (the only way to change application status):
`review_application(id, action, note)`, `assign_chapter(id, chapter_id)`, `generate_membership_number` (internal). Each checks role + jurisdiction, writes the audit row, and runs in one transaction.

## 4. Authentication and authorization

* **Authentication:** Supabase Auth (email + password) for administrators only. There is no public sign-up. The first Super Administrator is created with `scripts/bootstrap-super-admin.ts`; further admins are created by a Super Administrator from the dashboard. Applicants do not have accounts; they get a high-entropy status link (token stored only as a SHA-256 hash).
* **Authorization — three layers:**
  1. `proxy.ts` — optimistic redirect of unauthenticated `/admin/*` requests (UX only).
  2. Server code — every admin page, server action and route handler calls `requirePermission()` from `src/lib/auth/rbac.ts` (pure, unit-tested).
  3. **Row-Level Security** — the database enforces the same matrix and jurisdiction scope, so a bug in layer 2 cannot leak data.

| Permission | Super Admin | National Admin | State Coord. | LGA Coord. | Membership Officer |
|---|:-:|:-:|:-:|:-:|:-:|
| View applications (in scope) | ✔ | ✔ | ✔ | ✔ | ✔ |
| Mark pending review / request correction | ✔ | ✔ | ✔ | ✔ | ✔ |
| Approve / decline | ✔ | ✔ | — | — | ✔ |
| Assign chapter / unit | ✔ | ✔ | ✔ (in scope) | ✔ (in scope) | ✔ |
| View payments | ✔ | ✔ | ✔ | ✔ | ✔ |
| Export CSV / reports | ✔ | ✔ | ✔ (in scope) | ✔ (in scope) | ✔ |
| Generate ID card | ✔ | ✔ | — | — | ✔ |
| Manage categories, fee settings | ✔ | ✔ | — | — | — |
| Manage news / gallery / leadership | ✔ | ✔ | — | — | — |
| Manage users, view audit log | ✔ | — | — | — | — |

Jurisdiction: Super/National = all records. State Coordinator = `state_of_residence` equals assigned state. LGA Coordinator = state **and** LGA equal. Membership Officer = national unless a state/LGA is assigned. **The matrix is a proposal for NDUM to ratify** (it is one config object plus one SQL function to change).

## 5. Payments

1. Applicant submits form → `applications` row (`Submitted`) + a `payments` row is created lazily when they click *Pay*.
2. `initialize` (server): reads fee from `settings` (never from the client), generates our own reference, stores `pending` payment, calls Paystack.
3. Paystack redirects to `/membership/payment/callback` and also POSTs `/api/paystack/webhook`.
4. Webhook: verify `x-paystack-signature` (HMAC-SHA512 of the raw body with the secret key, timing-safe compare) → look up our payment by reference → call Paystack `verify` → confirm `status=success`, `amount`, `currency` → mark `success` in one idempotent SQL function (`record_payment_success`) → send confirmation email.
5. Duplicate protection: unique `reference`, unique `gateway_transaction_id`, one successful payment per application (partial unique index), idempotent webhook.
6. **Kill switch:** collection stays off until `payments_enabled = true` **and** `PAYSTACK_SECRET_KEY` is set. The ₦2,000 fee is stored with `fee_status = 'proposed'` and displayed as *proposed*. The ID-card fee is `NULL` and is never displayed as a price.

## 6. Environment variables

| Variable | Scope | Required for |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | Canonical URLs, payment callback |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Everything dynamic |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Everything dynamic |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Intake, webhook, signed URLs, admin creation |
| `PAYSTACK_SECRET_KEY` | **server only** | Payments (leave unset to keep payments off) |
| `RESEND_API_KEY`, `EMAIL_FROM` | **server only** | Confirmation emails (optional) |

## 7. Features that need external credentials / decisions

* Supabase project (URL, anon key, service role key) — **required** to run the dynamic features.
* Paystack business account + live secret key + official NDUM settlement account — **required to take payments**.
* Sending domain / Resend account (needs an official NDUM email/website, which are "to be added later").
* Official logo, leadership photographs, authentic Niger Delta photography.
* Governance decisions: approval roles, ID-card fee, membership validity period, whether *sex* is collected, official LGA/ward lists, data-retention period, privacy officer contact.
