import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import { getPosts } from "@/lib/data";
import { POST_CATEGORIES as CATEGORY_LABELS } from "@/lib/content";

export const metadata: Metadata = { title: "News & Updates", description: "Announcements, programme updates, events, scholarships and press releases from NDUM." };
export const revalidate = 300;

export default async function NewsPage() {
  const posts = await getPosts();
  return (
    <>
      <PageHero eyebrow="News & Updates" title="What is happening at NDUM" />
      <section className="section">
        <div className="container-page">
          {posts.length === 0 ? (
            <div className="border border-dashed border-stone-300 p-12 text-center">
              <h2 className="text-2xl font-semibold text-forest-900">No updates published yet</h2>
              <p className="mx-auto mt-3 max-w-xl text-stone-600">Announcements, programme updates and press releases will appear here as soon as they are published.</p>
            </div>
          ) : (
            <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <li key={p.id} className="flex flex-col border border-stone-200 bg-white">
                  {p.cover_url && (
                    <img src={p.cover_url} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <p className="eyebrow">{CATEGORY_LABELS[p.category] ?? p.category}</p>
                    <h2 className="mt-2 text-xl font-semibold text-forest-900"><Link href={`/news/${p.slug}`} className="hover:underline">{p.title}</Link></h2>
                    {p.excerpt && <p className="mt-2 flex-1 text-sm text-stone-600">{p.excerpt}</p>}
                    <p className="mt-4 text-xs text-stone-500"><time dateTime={p.published_at}>{new Date(p.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time></p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
