import "server-only";
import { adminClient, publicClient } from "@/lib/supabase/server";
import { isAdminClientConfigured } from "@/lib/env";
import { defaultLeadership, type LeaderProfile, type TierId } from "@/lib/content";

/** Short-lived signed URLs for private storage objects (only called for rows already visible to the public). */
export async function signedUrls(bucket: "media" | "member-photos", paths: (string | null)[], seconds = 3600): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const list = [...new Set(paths.filter((p): p is string => !!p))];
  if (!list.length || !isAdminClientConfigured()) return out;
  const { data } = await adminClient().storage.from(bucket).createSignedUrls(list, seconds);
  data?.forEach((d) => d.path && d.signedUrl && out.set(d.path, d.signedUrl));
  return out;
}

export async function getLeadership(): Promise<LeaderProfile[]> {
  const db = publicClient();
  if (!db) return defaultLeadership;
  const { data, error } = await db
    .from("leadership_profiles")
    .select("id, tier, full_name, position, bio, photo_path, sort_order")
    .eq("is_published", true)
    .order("sort_order")
    .order("created_at");
  if (error || !data || data.length === 0) return defaultLeadership;
  const urls = await signedUrls("media", data.map((d) => d.photo_path));
  return data.map((d) => ({
    id: d.id, tier: d.tier as TierId, full_name: d.full_name, position: d.position, bio: d.bio,
    photo_url: d.photo_path ? urls.get(d.photo_path) ?? null : null,
  }));
}

export interface PostSummary {
  id: string; slug: string; title: string; category: string; excerpt: string | null; published_at: string; cover_url: string | null;
}

export async function getPosts(limit = 30): Promise<PostSummary[]> {
  const db = publicClient();
  if (!db) return [];
  const { data } = await db
    .from("posts")
    .select("id, slug, title, category, excerpt, published_at, cover_path")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(limit);
  if (!data) return [];
  const urls = await signedUrls("media", data.map((d) => d.cover_path));
  return data.map((d) => ({ ...d, published_at: d.published_at as string, cover_url: d.cover_path ? urls.get(d.cover_path) ?? null : null }));
}

export async function getPost(slug: string) {
  const db = publicClient();
  if (!db) return null;
  const { data } = await db
    .from("posts")
    .select("id, slug, title, category, excerpt, body, published_at, cover_path")
    .eq("slug", slug).eq("status", "published").lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return null;
  const urls = await signedUrls("media", [data.cover_path]);
  return { ...data, cover_url: data.cover_path ? urls.get(data.cover_path) ?? null : null };
}

export interface GalleryEntry {
  id: string; title: string; caption: string | null; category: string; media_type: "image" | "video"; url: string;
}

export async function getGallery(): Promise<GalleryEntry[]> {
  const db = publicClient();
  if (!db) return [];
  // RLS + CHECK constraint guarantee published items have consent (and safeguarding sign-off for minors).
  const { data } = await db
    .from("gallery_items")
    .select("id, title, caption, category, media_type, media_path")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (!data) return [];
  const urls = await signedUrls("media", data.map((d) => d.media_path));
  return data.flatMap((d) => {
    const url = urls.get(d.media_path);
    return url ? [{ id: d.id, title: d.title, caption: d.caption, category: d.category, media_type: d.media_type as "image" | "video", url }] : [];
  });
}

export async function getActiveCategories() {
  const db = publicClient();
  if (!db) return [];
  const { data } = await db.from("membership_categories").select("id, name, description").eq("is_active", true).order("sort_order").order("name");
  return data ?? [];
}

export async function getActiveChapters() {
  const db = publicClient();
  if (!db) return [];
  const { data } = await db.from("chapters").select("id, name, kind, state, lga").eq("is_active", true).order("state").order("name");
  return data ?? [];
}
