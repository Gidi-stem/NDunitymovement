-- NDUM — 0002: access helpers, workflow RPCs, audit triggers, Row-Level Security, grants.

-- Deny-by-default: nothing is granted implicitly (Supabase normally grants ALL to anon/authenticated).
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- ================================================================ access helpers
create function public.auth_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

-- Jurisdiction check used by RLS and RPCs.
--  super/national: everything · state coordinator: same state · LGA coordinator: same state AND LGA
--  membership officer: national unless a state/LGA has been assigned to them
create function public.can_access_scope(p_state text, p_lga text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case p.role
      when 'super_admin' then true
      when 'national_admin' then true
      when 'state_coordinator' then lower(btrim(p.state)) = lower(btrim(p_state))
      when 'lga_coordinator' then lower(btrim(p.state)) = lower(btrim(p_state))
                              and lower(btrim(p.lga)) = lower(btrim(p_lga))
      when 'membership_officer' then
            (p.state is null or lower(btrim(p.state)) = lower(btrim(p_state)))
        and (p.lga   is null or lower(btrim(p.lga))   = lower(btrim(p_lga)))
      else false
    end
    from public.profiles p where p.id = auth.uid() and p.is_active
  ), false)
$$;

create function public.can_access_application(p_application_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications a
    where a.id = p_application_id and public.can_access_scope(a.scope_state, a.scope_lga)
  )
$$;

create function public.is_content_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() in ('super_admin', 'national_admin'), false)
$$;

create function public.setting_text(p_key text) returns text
language sql stable security definer set search_path = public as $$
  select value #>> '{}' from public.settings where key = p_key
$$;

-- ================================================================ audit triggers
create function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid; v_label text;
  v_old jsonb; v_new jsonb; v_diff jsonb := '{}'::jsonb; v_key text; v_id text; v_action text;
  v_skip text[] := coalesce(tg_argv, '{}');
begin
  select id, full_name into v_actor, v_label from public.profiles where id = auth.uid();
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new); v_id := coalesce(v_new->>'id', v_new->>'key');
    v_diff := v_new - v_skip - 'updated_at' - 'created_at';
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old); v_id := coalesce(v_old->>'id', v_old->>'key');
    v_diff := v_old - v_skip - 'updated_at' - 'created_at';
  else
    v_old := to_jsonb(old); v_new := to_jsonb(new); v_id := coalesce(v_new->>'id', v_new->>'key');
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key <> 'updated_at' and (v_new->v_key) is distinct from (v_old->v_key) then
        v_diff := v_diff || jsonb_build_object(v_key,
          case when v_key = any (v_skip) then jsonb_build_object('changed', true)
               else jsonb_build_object('from', v_old->v_key, 'to', v_new->v_key) end);
      end if;
    end loop;
    if v_diff = '{}'::jsonb then return new; end if;
  end if;
  v_action := tg_table_name || '.' || lower(tg_op);
  insert into public.audit_log (actor_id, actor_label, action, entity, entity_id, details)
  values (v_actor, coalesce(v_label, 'system'), v_action, tg_table_name, v_id, v_diff);
  return coalesce(new, old);
end $$;

create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change();
create trigger audit_categories after insert or update or delete on public.membership_categories
  for each row execute function public.audit_row_change();
create trigger audit_chapters after insert or update or delete on public.chapters
  for each row execute function public.audit_row_change();
create trigger audit_settings after insert or update or delete on public.settings
  for each row execute function public.audit_row_change();
create trigger audit_posts after insert or update or delete on public.posts
  for each row execute function public.audit_row_change('body');
create trigger audit_gallery after insert or update or delete on public.gallery_items
  for each row execute function public.audit_row_change();
create trigger audit_leadership after insert or update or delete on public.leadership_profiles
  for each row execute function public.audit_row_change('bio');

-- Applications: log workflow fields only — never personal data — so the audit log holds no PII.
create function public.audit_application_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid; v_label text; v_diff jsonb := '{}'::jsonb; v_key text;
  v_old jsonb; v_new jsonb;
begin
  select id, full_name into v_actor, v_label from public.profiles where id = auth.uid();
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor_id, actor_label, action, entity, entity_id, details)
    values (v_actor, coalesce(v_label, 'applicant'), 'application.submitted', 'applications', new.id::text,
            jsonb_build_object('reference', new.reference));
    return new;
  end if;
  v_old := to_jsonb(old); v_new := to_jsonb(new);
  foreach v_key in array array['status', 'chapter_id', 'membership_number', 'member_photo_path', 'category_id'] loop
    if (v_new->v_key) is distinct from (v_old->v_key) then
      v_diff := v_diff || jsonb_build_object(v_key,
        jsonb_build_object('from', v_old->v_key, 'to', v_new->v_key));
    end if;
  end loop;
  if v_diff = '{}'::jsonb then return new; end if;
  insert into public.audit_log (actor_id, actor_label, action, entity, entity_id, details)
  values (v_actor, coalesce(v_label, 'system'), 'application.updated', 'applications', new.id::text,
          v_diff || jsonb_build_object('reference', new.reference, 'note', new.review_note));
  return new;
end $$;
create trigger audit_applications after insert or update on public.applications
  for each row execute function public.audit_application_change();

create function public.audit_payment_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.audit_log (actor_label, action, entity, entity_id, details)
    values ('system', 'payment.' || new.status::text, 'payments', new.id::text,
            jsonb_build_object('reference', new.reference, 'amount_kobo', new.amount_kobo,
                               'application_id', new.application_id));
  end if;
  return new;
end $$;
create trigger audit_payments after insert or update on public.payments
  for each row execute function public.audit_payment_change();

-- ================================================================ workflow RPCs
-- The ONLY path by which an application's status changes through an admin session.
create function public.review_application(p_id uuid, p_action text, p_note text default null)
returns public.applications
language plpgsql security definer set search_path = public as $$
declare
  v_role public.app_role := public.auth_role();
  v_app public.applications;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_months int;
  v_paid boolean;
begin
  if v_role is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into v_app from public.applications where id = p_id for update;
  if not found or not public.can_access_scope(v_app.scope_state, v_app.scope_lga) then
    raise exception 'application not found or outside your jurisdiction' using errcode = '42501';
  end if;

  if p_action = 'start_review' then
    if v_app.status <> 'submitted' then
      raise exception 'only submitted applications can be moved to pending review';
    end if;
    update public.applications set status = 'pending_review', reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_id returning * into v_app;

  elsif p_action = 'request_correction' then
    if v_app.status not in ('submitted', 'pending_review') then
      raise exception 'corrections can only be requested on submitted or pending applications';
    end if;
    if v_note is null then raise exception 'a note explaining the correction is required'; end if;
    update public.applications
      set status = 'awaiting_correction', correction_note = v_note, reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_id returning * into v_app;

  elsif p_action = 'approve' then
    if v_role not in ('super_admin', 'national_admin', 'membership_officer') then
      raise exception 'your role cannot approve applications' using errcode = '42501';
    end if;
    if v_app.status <> 'pending_review' then
      raise exception 'only applications pending review can be approved';
    end if;
    if coalesce(public.setting_text('payments_enabled'), 'false')::boolean then
      select exists (select 1 from public.payments where application_id = p_id and status = 'success') into v_paid;
      if not v_paid then raise exception 'registration fee has not been paid'; end if;
    end if;
    v_months := nullif(public.setting_text('membership_validity_months'), '')::int;
    update public.applications set
      status = 'approved',
      membership_number = 'NDUM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.membership_number_seq')::text, 6, '0'),
      approved_at = now(),
      expires_on = case when v_months is null then null else (current_date + make_interval(months => v_months))::date end,
      review_note = v_note, reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_id returning * into v_app;

  elsif p_action = 'decline' then
    if v_role not in ('super_admin', 'national_admin', 'membership_officer') then
      raise exception 'your role cannot decline applications' using errcode = '42501';
    end if;
    if v_app.status = 'approved' then raise exception 'approved applications cannot be declined'; end if;
    if v_note is null then raise exception 'a reason is required to decline an application'; end if;
    update public.applications
      set status = 'declined', review_note = v_note, reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_id returning * into v_app;

  else
    raise exception 'unknown action %', p_action;
  end if;
  return v_app;
end $$;

create function public.assign_chapter(p_id uuid, p_chapter_id uuid) returns public.applications
language plpgsql security definer set search_path = public as $$
declare
  v_role public.app_role := public.auth_role();
  v_app public.applications;
  v_ch public.chapters;
begin
  if v_role is null then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into v_app from public.applications where id = p_id for update;
  if not found or not public.can_access_scope(v_app.scope_state, v_app.scope_lga) then
    raise exception 'application not found or outside your jurisdiction' using errcode = '42501';
  end if;
  if p_chapter_id is not null then
    select * into v_ch from public.chapters where id = p_chapter_id and is_active;
    if not found then raise exception 'chapter not found'; end if;
    if not public.can_access_scope(v_ch.state, v_ch.lga) then
      raise exception 'chapter is outside your jurisdiction' using errcode = '42501';
    end if;
  end if;
  update public.applications set chapter_id = p_chapter_id where id = p_id returning * into v_app;
  return v_app;
end $$;

-- Idempotent payment confirmation. Callable ONLY by the server (service_role) after it has
-- verified the transaction with the gateway. Never reachable from a browser session.
create function public.record_payment_success(
  p_reference text, p_amount_kobo integer, p_currency text,
  p_txn_id text, p_channel text, p_paid_at timestamptz
) returns text
language plpgsql security definer set search_path = public as $$
declare v_pay public.payments;
begin
  select * into v_pay from public.payments where reference = p_reference for update;
  if not found then raise exception 'unknown payment reference'; end if;
  if v_pay.status = 'success' then return 'already_recorded'; end if;
  if v_pay.amount_kobo <> p_amount_kobo or v_pay.currency <> upper(p_currency) then
    insert into public.audit_log (actor_label, action, entity, entity_id, details)
    values ('system', 'payment.mismatch', 'payments', v_pay.id::text,
            jsonb_build_object('reference', p_reference, 'expected_kobo', v_pay.amount_kobo,
                               'received_kobo', p_amount_kobo, 'currency', p_currency));
    return 'mismatch';
  end if;
  begin
    update public.payments set status = 'success', gateway_transaction_id = p_txn_id,
      channel = p_channel, paid_at = coalesce(p_paid_at, now())
      where id = v_pay.id;
  exception when unique_violation then
    -- a second successful payment for the same application (or a reused gateway id): flag for refund
    update public.payments set status = 'duplicate', channel = p_channel where id = v_pay.id;
    return 'duplicate';
  end;
  return 'recorded';
end $$;

-- ================================================================ function privileges
revoke all on function public.record_payment_success(text, integer, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.review_application(uuid, text, text) from public, anon;
revoke all on function public.assign_chapter(uuid, uuid) from public, anon;
revoke all on function public.audit_row_change() from public, anon, authenticated;
revoke all on function public.audit_application_change() from public, anon, authenticated;
revoke all on function public.audit_payment_change() from public, anon, authenticated;
revoke all on function public.applications_set_scope() from public, anon, authenticated;
revoke all on function public.setting_text(text) from public, anon, authenticated;
grant execute on function public.review_application(uuid, text, text) to authenticated;
grant execute on function public.assign_chapter(uuid, uuid) to authenticated;
grant execute on function public.auth_role() to anon, authenticated;
grant execute on function public.can_access_scope(text, text) to anon, authenticated;
grant execute on function public.can_access_application(uuid) to anon, authenticated;
grant execute on function public.is_content_admin() to anon, authenticated;

-- ================================================================ Row-Level Security
alter table public.profiles enable row level security;
alter table public.membership_categories enable row level security;
alter table public.chapters enable row level security;
alter table public.applications enable row level security;
alter table public.payments enable row level security;
alter table public.settings enable row level security;
alter table public.posts enable row level security;
alter table public.gallery_items enable row level security;
alter table public.leadership_profiles enable row level security;
alter table public.contact_messages enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.auth_role() = 'super_admin');
create policy profiles_write on public.profiles for all to authenticated
  using (public.auth_role() = 'super_admin') with check (public.auth_role() = 'super_admin');

-- reference data: public can read active rows; content admins manage
create policy categories_select on public.membership_categories for select to anon, authenticated
  using (is_active or public.auth_role() is not null);
create policy categories_write on public.membership_categories for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy chapters_select on public.chapters for select to anon, authenticated
  using (is_active or public.auth_role() is not null);
create policy chapters_write on public.chapters for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

-- applications & payments: read-only for admins within jurisdiction. No insert/update/delete policy:
-- intake and payment confirmation happen server-side (service role); status changes go through RPCs.
create policy applications_select on public.applications for select to authenticated
  using (public.auth_role() is not null and public.can_access_scope(scope_state, scope_lga));
create policy payments_select on public.payments for select to authenticated
  using (public.auth_role() is not null and public.can_access_application(application_id));

-- settings: the public may read only the fee/payment display keys
create policy settings_select on public.settings for select to anon, authenticated
  using (key in ('registration_fee_kobo', 'fee_status', 'id_card_fee_kobo', 'payments_enabled')
         or public.auth_role() is not null);
create policy settings_write on public.settings for insert to authenticated
  with check (public.is_content_admin());
create policy settings_update on public.settings for update to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

-- content
create policy posts_select on public.posts for select to anon, authenticated
  using ((status = 'published' and published_at <= now()) or public.is_content_admin());
create policy posts_write on public.posts for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy gallery_select on public.gallery_items for select to anon, authenticated
  using (is_published or public.is_content_admin());
create policy gallery_write on public.gallery_items for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy leadership_select on public.leadership_profiles for select to anon, authenticated
  using (is_published or public.is_content_admin());
create policy leadership_write on public.leadership_profiles for all to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());

-- inbox + audit
create policy contact_select on public.contact_messages for select to authenticated
  using (public.is_content_admin());
create policy contact_update on public.contact_messages for update to authenticated
  using (public.is_content_admin()) with check (public.is_content_admin());
create policy audit_select on public.audit_log for select to authenticated
  using (public.auth_role() = 'super_admin');

-- ================================================================ table privileges (explicit)
grant select on public.membership_categories, public.chapters, public.settings,
  public.posts, public.gallery_items, public.leadership_profiles to anon;

grant select on public.profiles, public.membership_categories, public.chapters, public.payments,
  public.settings, public.posts, public.gallery_items, public.leadership_profiles,
  public.contact_messages, public.audit_log to authenticated;
-- applications: every column EXCEPT access_token_hash
grant select (
  id, reference, status, full_name, preferred_name, phone, email, date_of_birth, sex,
  state_of_residence, lga, ward, community, state_of_origin, residential_address, occupation,
  preferred_chapter_state, lga_chapter, ward_unit, category_id, areas_of_interest, areas_other,
  next_of_kin_name, next_of_kin_phone,
  declaration_accuracy, declaration_constitution, declaration_rules, declaration_no_guarantee,
  privacy_ack, consent_processing, signature_name, declaration_date,
  chapter_id, scope_state, scope_lga, membership_number, member_photo_path,
  correction_note, review_note, reviewed_by, reviewed_at, approved_at, expires_on,
  submitted_at, updated_at
) on public.applications to authenticated;

grant insert, update, delete on public.profiles, public.membership_categories, public.chapters,
  public.posts, public.gallery_items, public.leadership_profiles to authenticated;
grant insert, update on public.settings to authenticated;
grant update on public.contact_messages to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
