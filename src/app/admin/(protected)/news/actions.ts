"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actorWith } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { flash } from "@/lib/admin/flash";
import { storeUpload } from "@/lib/admin/upload";
import { POST_CATEGORIES } from "@/lib/content";

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80).replace(/^-|-$/g, "");
const schema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().max(80).optional(),
  category: z.enum(Object.keys(POST_CATEGORIES) as [string, ...string[]]),
  excerpt: z.string().trim().max(400).optional(),
  body: z.string().max(50000),
  status: z.enum(["draft", "published", "archived"]),
});

export async function savePost(fd: FormData) {
  const id = String(fd.get("id") ?? "new");
  const back = `/admin/news/${id}`;
  const actor = await actorWith("content.manage");
  if (!actor) flash(back, "err", "You do not have permission to do that.");
  const p = schema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) flash(back, "err", "Check the title (3+ characters), category and status.");
  const slug = slugify(p.data.slug || p.data.title);
  if (!slug) flash(back, "err", "Could not create a web address from the title. Enter a slug.");
  const supabase = await sessionClient();

  let coverPath: string | undefined;
  const cover = fd.get("cover");
  if (cover instanceof File && cover.size > 0) {
    const up = await storeUpload(cover, { bucket: "media", folder: "posts" });
    if (!up.ok) flash(back, "err", up.error);
    coverPath = up.result.path;
  }

  let existing: { status: string; published_at: string | null } | null = null;
  if (id !== "new") {
    if (!z.uuid().safeParse(id).success) flash("/admin/news", "err", "Invalid post.");
    existing = (await supabase.from("posts").select("status, published_at").eq("id", id).maybeSingle()).data;
  }
  const publishedAt = p.data.status === "published" ? (existing?.published_at ?? new Date().toISOString()) : existing?.published_at ?? null;
  const row = { title: p.data.title, slug, category: p.data.category, excerpt: p.data.excerpt || null, body: p.data.body, status: p.data.status, published_at: publishedAt, ...(coverPath ? { cover_path: coverPath } : {}) };

  const res = id === "new"
    ? await supabase.from("posts").insert({ ...row, author_id: actor.id }).select("id").single()
    : await supabase.from("posts").update(row).eq("id", id).select("id").single();
  if (res.error) flash(back, "err", res.error.code === "23505" ? "Another post already uses that web address (slug)." : "Could not save the post.");
  revalidatePath("/news"); revalidatePath(`/news/${slug}`);
  flash(`/admin/news/${res.data!.id}`, "msg", p.data.status === "published" ? "Post saved and published." : "Post saved.");
}

export async function setPostStatus(fd: FormData) {
  if (!(await actorWith("content.manage"))) flash("/admin/news", "err", "You do not have permission to do that.");
  const id = z.uuid().safeParse(fd.get("id"));
  const status = z.enum(["draft", "published", "archived"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) flash("/admin/news", "err", "Invalid request.");
  const supabase = await sessionClient();
  const { data: cur } = await supabase.from("posts").select("published_at").eq("id", id.data).maybeSingle();
  const { error } = await supabase.from("posts").update({ status: status.data, published_at: status.data === "published" ? (cur?.published_at ?? new Date().toISOString()) : cur?.published_at ?? null }).eq("id", id.data);
  if (error) flash("/admin/news", "err", "Could not update the post.");
  revalidatePath("/news");
  flash("/admin/news", "msg", `Post ${status.data}.`);
}
