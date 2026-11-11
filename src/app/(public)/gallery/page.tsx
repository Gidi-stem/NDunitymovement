import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import { getGallery } from "@/lib/data";

export const metadata: Metadata = { title: "Gallery", description: "Photographs and videos of NDUM community activities, programmes, sports, empowerment initiatives and events." };
export const revalidate = 300;

const CATS: Record<string, string> = { community: "Community activities", education: "Educational programmes", sports: "Sports activities", empowerment: "Empowerment initiatives", events: "Meetings and events" };

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const all = await getGallery();
  const items = c && CATS[c] ? all.filter((i) => i.category === c) : all;
  return (
    <>
      <PageHero eyebrow="Gallery" title="NDUM in action">Published only with the consent of the people shown, and with safeguarding approval for images of children.</PageHero>
      <section className="section">
        <div className="container-page">
          <ul className="mb-10 flex flex-wrap gap-2 text-sm" aria-label="Filter gallery">
            <li><Link href="/gallery" className={`inline-block border px-3 py-1.5 ${!c ? "border-forest-800 bg-forest-800 text-white" : "border-stone-300"}`}>All</Link></li>
            {Object.entries(CATS).map(([k, label]) => (
              <li key={k}><Link href={`/gallery?c=${k}`} className={`inline-block border px-3 py-1.5 ${c === k ? "border-forest-800 bg-forest-800 text-white" : "border-stone-300"}`}>{label}</Link></li>
            ))}
          </ul>
          {items.length === 0 ? (
            <div className="border border-dashed border-stone-300 p-12 text-center">
              <h2 className="text-2xl font-semibold text-forest-900">Photographs and videos coming soon</h2>
              <p className="mx-auto mt-3 max-w-xl text-stone-600">Our gallery will be populated as NDUM activities take place.</p>
            </div>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((i) => (
                <li key={i.id} className="border border-stone-200 bg-white">
                  {i.media_type === "image" ? (
                    <img src={i.url} alt={i.caption ?? i.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  ) : (
                    <video src={i.url} controls preload="metadata" className="aspect-[4/3] w-full bg-black" aria-label={i.title} />
                  )}
                  <div className="p-4"><h2 className="font-semibold text-forest-900">{i.title}</h2>{i.caption && <p className="mt-1 text-sm text-stone-600">{i.caption}</p>}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
