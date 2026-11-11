import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { AdminTitle, Flash } from "@/components/admin";
import { POST_CATEGORIES } from "@/lib/content";
import { savePost } from "../actions";

export const metadata: Metadata = { title: "Edit post" };

export default async function PostEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  await requirePermission("content.manage");
  let post: Record<string, string | null> = { title: "", slug: "", category: "announcement", excerpt: "", body: "", status: "draft" };
  if (id !== "new") {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const { data } = await (await sessionClient()).from("posts").select("title, slug, category, excerpt, body, status").eq("id", id).maybeSingle();
    if (!data) notFound();
    post = data;
  }
  return (
    <>
      <AdminTitle title={id === "new" ? "New post" : "Edit post"}><Link href="/admin/news" className="btn-outline btn-sm">← All posts</Link></AdminTitle>
      <Flash msg={sp.msg} err={sp.err} />
      <form action={savePost} className="max-w-3xl space-y-5 border border-stone-200 bg-white p-6">
        <input type="hidden" name="id" value={id} />
        <div><label className="field-label" htmlFor="t">Title</label><input id="t" name="title" defaultValue={post.title ?? ""} required className="field-input" /></div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div><label className="field-label" htmlFor="c">Category</label><select id="c" name="category" defaultValue={post.category ?? "announcement"} className="field-input">{Object.entries(POST_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="field-label" htmlFor="s">Status</label><select id="s" name="status" defaultValue={post.status ?? "draft"} className="field-input"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
          <div><label className="field-label" htmlFor="sl">Web address (slug)</label><input id="sl" name="slug" defaultValue={post.slug ?? ""} placeholder="auto from title" className="field-input" /></div>
        </div>
        <div><label className="field-label" htmlFor="e">Short summary</label><textarea id="e" name="excerpt" rows={2} maxLength={400} defaultValue={post.excerpt ?? ""} className="field-input" /></div>
        <div><label className="field-label" htmlFor="b">Body</label><textarea id="b" name="body" rows={16} defaultValue={post.body ?? ""} className="field-input font-mono text-sm" /><p className="field-hint">Plain text. Blank line = new paragraph. Start a line with “## ” for a heading, or “- ” for a bullet list. HTML is not rendered.</p></div>
        <div><label className="field-label" htmlFor="cv">Cover image (optional, max 5 MB)</label><input id="cv" name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="block text-sm" /><p className="field-hint">Only upload images NDUM has permission to publish. Do not include identifiable children without safeguarding approval.</p></div>
        <button className="btn-primary">Save post</button>
      </form>
    </>
  );
}
