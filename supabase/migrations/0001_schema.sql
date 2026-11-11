-- NDUM — 0001: core schema (types, tables, constraints, triggers)
-- Runs on Supabase Postgres. Relies on the Supabase `auth` schema (auth.users, auth.uid()).

create type public.app_role as enum (
  'super_admin', 'national_admin', 'state_coordinator', 'lga_coordinator', 'membership_officer'
);
create type public.application_status as enum (
  'submitted', 'pending_review', 'awaiting_correction', 'approved', 'declined'
);
create type public.payment_status as enum ('pending', 'success', 'failed', 'abandoned', 'duplicate');
create type public.post_status as enum ('draft', 'published', 'archived');
create type public.chapter_kind as enum ('state', 'lga', 'ward');

-- ---------------------------------------------------------------- helpers
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles (admin users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  role public.app_role not null,
  state text,
  lga text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- jurisdiction must be supplied for coordinator roles
  constraint profiles_state_coord_has_state check (role <> 'state_coordinator' or state is not null),
  constraint profiles_lga_coord_has_scope check (role <> 'lga_coordinator' or (state is not null and lga is not null))
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- reference data
create table public.membership_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 2 and 80),
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger membership_categories_touch before update on public.membership_categories
  for each row execute function public.touch_updated_at();

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  kind public.chapter_kind not null,
  state text not null,
  lga text,
  parent_id uuid references public.chapters (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapters_lga_required check (kind = 'state' or lga is not null),
  unique (name, state)
);
create trigger chapters_touch before update on public.chapters
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- applications
create sequence public.membership_number_seq start 1;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  status public.application_status not null default 'submitted',

  -- Section A: personal information
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  preferred_name text check (char_length(preferred_name) <= 80),
  phone text not null check (char_length(phone) between 7 and 20),
  email text not null check (char_length(email) between 5 and 254),
  date_of_birth date check (date_of_birth is null or (date_of_birth <= current_date and date_of_birth > date '1900-01-01')),
  sex text check (sex is null or sex in ('female', 'male')),
  state_of_residence text not null,
  lga text not null,
  ward text not null,
  community text not null,
  state_of_origin text,
  residential_address text check (char_length(residential_address) <= 300),
  occupation text not null check (char_length(occupation) <= 120),

  -- Section B: membership information
  preferred_chapter_state text not null,
  lga_chapter text,
  ward_unit text,
  category_id uuid references public.membership_categories (id) on delete restrict,
  areas_of_interest text[] not null default '{}',
  areas_other text check (char_length(areas_other) <= 200),

  -- Section C: emergency contact
  next_of_kin_name text check (char_length(next_of_kin_name) <= 120),
  next_of_kin_phone text check (char_length(next_of_kin_phone) <= 20),

  -- Section D: declaration (all must be affirmed to submit)
  declaration_accuracy boolean not null,
  declaration_constitution boolean not null,
  declaration_rules boolean not null,
  declaration_no_guarantee boolean not null,
  privacy_ack boolean not null,
  consent_processing boolean not null,
  signature_name text not null check (char_length(btrim(signature_name)) between 2 and 120),
  declaration_date date not null,

  -- administration
  chapter_id uuid references public.chapters (id) on delete set null,
  scope_state text not null,   -- maintained by trigger: drives jurisdiction access
  scope_lga text,
  membership_number text unique,
  member_photo_path text,
  access_token_hash text not null,
  correction_note text,
  review_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  approved_at timestamptz,
  expires_on date,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint applications_declarations_affirmed check (
    declaration_accuracy and declaration_constitution and declaration_rules
    and declaration_no_guarantee and privacy_ack and consent_processing
  ),
  constraint applications_approved_has_number check (status <> 'approved' or membership_number is not null)
);
create index applications_status_idx on public.applications (status);
create index applications_scope_idx on public.applications (scope_state, scope_lga);
create index applications_submitted_idx on public.applications (submitted_at desc);
create index applications_email_idx on public.applications (lower(email));

create function public.applications_set_scope() returns trigger
language plpgsql security definer set search_path = public as $$
declare ch public.chapters;
begin
  if new.chapter_id is not null then
    select * into ch from public.chapters where id = new.chapter_id;
  end if;
  new.scope_state := coalesce(ch.state, nullif(btrim(new.preferred_chapter_state), ''), new.state_of_residence);
  new.scope_lga   := coalesce(ch.lga, nullif(btrim(new.lga_chapter), ''), new.lga);
  return new;
end $$;
create trigger applications_scope before insert or update on public.applications
  for each row execute function public.applications_set_scope();
create trigger applications_touch before update on public.applications
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete restrict,
  reference text not null unique,
  purpose text not null default 'registration' check (purpose in ('registration')),
  amount_kobo integer not null check (amount_kobo > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  status public.payment_status not null default 'pending',
  gateway text not null default 'paystack',
  gateway_transaction_id text unique,
  channel text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_application_idx on public.payments (application_id);
-- at most one successful registration payment per application
create unique index payments_one_success_per_application
  on public.payments (application_id) where status = 'success' and purpose = 'registration';
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- settings
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- content
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null default 'announcement'
    check (category in ('announcement', 'programme', 'community', 'event', 'scholarship', 'empowerment', 'press')),
  excerpt text check (char_length(excerpt) <= 400),
  body text not null default '',
  cover_path text,
  status public.post_status not null default 'draft',
  published_at timestamptz,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_published_idx on public.posts (status, published_at desc);
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 160),
  caption text check (char_length(caption) <= 500),
  category text not null default 'community'
    check (category in ('community', 'education', 'sports', 'empowerment', 'events')),
  media_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  consent_confirmed boolean not null default false,
  contains_minors boolean not null default false,
  safeguarding_approved boolean not null default false,
  is_published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- safeguarding: nothing identifiable goes public without consent; images of children need explicit sign-off
  constraint gallery_publish_requires_consent check (
    not is_published or (consent_confirmed and (not contains_minors or safeguarding_approved))
  )
);
create trigger gallery_touch before update on public.gallery_items
  for each row execute function public.touch_updated_at();

create table public.leadership_profiles (
  id uuid primary key default gen_random_uuid(),
  tier text not null check (tier in (
    'general_assembly', 'board_of_trustees', 'national_executive_council',
    'state_chapters', 'lga_chapters', 'ward_units', 'standing_committees'
  )),
  full_name text not null,
  position text not null,
  bio text,
  photo_path text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger leadership_touch before update on public.leadership_profiles
  for each row execute function public.touch_updated_at();

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 20),
  message text not null check (char_length(message) between 10 and 4000),
  is_handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- audit log (append-only)
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_label text not null default 'system',
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);
