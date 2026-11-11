import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { AdminTitle, Flash, fmtDate } from "@/components/admin";
import { POST_CATEGORIES } from "@/lib/content";
import { setPostStatus } from "./actions";

export const metadata: Metadata = { title: "News & updates" };

export default async function NewsAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  await requirePermission("content.manage");
  const { data } = await (await sessionClient()).from("posts").select("id, title, category, status, published_at, updated_at").order("updated_at", { ascending: false });
  return (
    <>
      <AdminTitle title="News & updates"><Link href="/admin/news/new" className="btn-primary btn-sm">New post</Link></AdminTitle>
      <Flash msg={sp.msg} err={sp.err} />
      <div className="overflow-x-auto border border-stone-200 bg-white"><table className="table-admin"><thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Published</th><th /></tr></thead><tbody>
        {data?.map((p) => (
          <tr key={p.id}><td><Link href={`/admin/news/${p.id}`} className="font-medium underline">{p.title}</Link></td><td>{POST_CATEGORIES[p.category]}</td><td className="capitalize">{p.status}</td><td>{fmtDate(p.published_at)}</td>
            <td><form action={setPostStatus} className="flex gap-3 text-xs"><input type="hidden" name="id" value={p.id} />
              {p.status !== "published" && <button name="status" value="published" className="underline">Publish</button>}
              {p.status === "published" && <button name="status" value="draft" className="underline">Unpublish</button>}
              {p.status !== "archived" && <button name="status" value="archived" className="underline">Archive</button>}</form></td></tr>
        ))}
        {data?.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-stone-500">No posts yet.</td></tr>}
      </tbody></table></div>
    </>
  );
}
