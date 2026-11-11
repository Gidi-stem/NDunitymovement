-- NDUM — 0003: configuration seed. No membership data, statistics, partners or outcomes are seeded.

insert into public.settings (key, value) values
  ('registration_fee_kobo', '200000'::jsonb),      -- ₦2,000 (PROPOSED — see fee_status)
  ('fee_status', '"proposed"'::jsonb),             -- 'proposed' | 'approved'
  ('id_card_fee_kobo', 'null'::jsonb),             -- not approved: never shown as a price
  ('payments_enabled', 'false'::jsonb),            -- kill switch: stays off until credentials + official account confirmed
  ('membership_validity_months', 'null'::jsonb)    -- no approved validity policy yet: ID cards carry no expiry date
on conflict (key) do nothing;

-- A single neutral starter category so the form works on day one. Rename / replace in the dashboard.
insert into public.membership_categories (name, description, sort_order)
values ('General Member', 'Default category. Rename or replace once NDUM approves its membership categories.', 0)
on conflict (name) do nothing;
