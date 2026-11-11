import type { Metadata } from "next";
import { LinkButton, Notice, PageHero } from "@/components/ui";
import { programmes } from "@/lib/content";

export const metadata: Metadata = { title: "Our Programmes", description: "NDUM programmes in education, empowerment, agriculture, sports, technology and humanitarian service." };

export default function ProgrammesPage() {
  return (
    <>
      <PageHero eyebrow="Our Programmes" title="Practical opportunity, community by community">
        Six programme areas that put NDUM&apos;s mission into practice.
      </PageHero>
      <div className="container-page pt-10">
        <Notice tone="warn" title="Please note">
          Programmes are being developed and will be announced as they open. Participation is subject to each programme&apos;s published eligibility criteria, selection process and available resources. Grants, scholarships and other benefits are not guaranteed to members or applicants.
        </Notice>
      </div>
      <nav aria-label="Programme index" className="container-page pt-8">
        <ul className="flex flex-wrap gap-2 text-sm">
          {programmes.map((p) => (
            <li key={p.slug}><a href={`#${p.slug}`} className="inline-block border border-stone-300 px-3 py-1.5 hover:border-forest-700 hover:text-forest-800">{p.title}</a></li>
          ))}
        </ul>
      </nav>
      {programmes.map((p, i) => (
        <section key={p.slug} id={p.slug} className={`section scroll-mt-20 ${i % 2 ? "bg-stone-50" : ""}`}>
          <div className="container-page grid gap-10 lg:grid-cols-[2fr_3fr]">
            <div>
              <p className="eyebrow">Programme {String(i + 1).padStart(2, "0")}</p>
              <h2 className="mt-2 text-3xl font-semibold text-forest-900">{p.title}</h2>
              <span className="rule-gold mt-4" />
              <p className="mt-5 text-lg text-stone-700">{p.summary}</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Block title="Objectives" items={p.objectives} />
              <Block title="Target beneficiaries" items={p.beneficiaries} />
              <Block title="Programme activities" items={p.activities} />
              <div className="border border-forest-200 bg-forest-50 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-forest-800">How to take part</h3>
                <p className="mt-3 text-sm text-stone-700">{p.participation}</p>
                <LinkButton href="/membership" variant="outline" className="btn-sm mt-4">About membership</LinkButton>
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-stone-200 bg-white p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-forest-800">{title}</h3>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-stone-700">
        {items.map((it) => <li key={it}>{it}</li>)}
      </ul>
    </div>
  );
}
