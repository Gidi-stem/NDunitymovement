-- NDUM — 0004: private storage buckets (Supabase only).
-- No storage.objects policies are created on purpose: with RLS on and no policy, browsers
-- cannot read or write these buckets. All uploads happen server-side (after permission and
-- file-type/size checks) and are served via short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('member-photos', 'member-photos', false, 2097152,  array['image/jpeg', 'image/png', 'image/webp']),
  ('media',         'media',         false, 12582912, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do nothing;
