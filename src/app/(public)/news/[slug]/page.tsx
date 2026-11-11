import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostBody } from "@/components/PostBody";
import { getPost } from "@/lib/data";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return post ? { title: post.title, description: post.excerpt ?? undefined } : { title: "Not found" };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  return (
    <article className="section">
      <div className="container-page max-w-3xl">
        <Link href="/news" className="text-sm font-semibold text-forest-700 underline underline-offset-4">← All news & updates</Link>
        <h1 className="mt-6 text-4xl font-semibold leading-tight text-forest-900">{post.title}</h1>
        <p className="mt-3 text-sm text-stone-500"><time dateTime={post.published_at!}>{new Date(post.published_at!).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time></p>
        <span className="rule-gold mt-5" />
        {post.cover_url && (
          <img src={post.cover_url} alt="" className="mt-8 w-full" />
        )}
        <div className="mt-8"><PostBody body={post.body} /></div>
      </div>
    </article>
  );
}
