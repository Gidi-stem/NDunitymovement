import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { Notice, PageHero } from "@/components/ui";
import { faqs } from "@/lib/content";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Contact Us", description: "Contact the Niger Delta Unity Movement (NDUM)." };

export default function ContactPage() {
  const socials = Object.entries(site.social);
  return (
    <>
      <PageHero eyebrow="Contact Us" title="Get in touch with NDUM" />
      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[2fr_3fr]">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-forest-900">Niger Delta Unity Movement (NDUM)</h2>
              <address className="mt-4 space-y-3 not-italic text-stone-700">
                <p><span className="block text-xs font-semibold uppercase tracking-wider text-stone-500">Address</span>{site.address}</p>
                <p><span className="block text-xs font-semibold uppercase tracking-wider text-stone-500">Phone</span><a className="underline" href={`tel:${site.phone}`}>{site.phone}</a></p>
                <p><span className="block text-xs font-semibold uppercase tracking-wider text-stone-500">Email</span>{site.email ? <a className="underline" href={`mailto:${site.email}`}>{site.email}</a> : "To be added later"}</p>
                <p><span className="block text-xs font-semibold uppercase tracking-wider text-stone-500">Website</span>{site.website ?? "To be added later"}</p>
              </address>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-forest-800">Follow NDUM</h3>
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {socials.map(([name, url]) => (
                  <li key={name}>
                    {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block border border-forest-700 px-3 py-1.5 capitalize text-forest-800 hover:bg-forest-50">{name}</a>
                         : <span className="inline-block border border-dashed border-stone-300 px-3 py-1.5 capitalize text-stone-400">{name}: to be added</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-forest-800">Location</h3>
              {site.mapEmbedUrl ? (
                <iframe title="NDUM location map" src={site.mapEmbedUrl} className="mt-3 aspect-video w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              ) : (
                <div className="mt-3"><Notice tone="info">An interactive map will be added once the exact location is confirmed.</Notice></div>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-forest-900">Send us a message</h2>
            <span className="rule-gold mt-3" />
            <div className="mt-6"><ContactForm /></div>
          </div>
        </div>
      </section>
      <section className="section bg-stone-50" id="faq">
        <div className="container-page max-w-3xl">
          <h2 className="text-3xl font-semibold text-forest-900">Frequently asked questions</h2>
          <span className="rule-gold mt-3" />
          <div className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-forest-900">
                  {f.q}<span aria-hidden className="text-gold-600 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-stone-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
