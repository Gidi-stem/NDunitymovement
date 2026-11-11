import type { Metadata } from "next";
import { LinkButton, PageHero, SectionHeading, Notice, ImageSlot } from "@/components/ui";
import { coreValues, mission, objectives, vision } from "@/lib/content";
import { getLeadership } from "@/lib/data";
import { publicImage } from "@/lib/assets";

export const metadata: Metadata = { title: "About NDUM", description: "Our story, vision, mission, values, objectives, leadership and commitment to the Niger Delta." };
export const revalidate = 300;

export default async function AboutPage() {
  const leaders = (await getLeadership()).filter((l) => l.tier === "national_executive_council" || l.tier === "board_of_trustees");
  return (
    <>
      <PageHero eyebrow="About NDUM" title="Unity, empowerment and development for the Niger Delta">
        A proposed nonprofit, community-focused movement committed to bringing people together and creating opportunity.
      </PageHero>

      <section className="section" id="story">
        <div className="container-page grid gap-12 lg:grid-cols-[3fr_2fr]">
          <div>
            <SectionHeading eyebrow="Our story" title="Why NDUM exists" />
            <div className="prose-ndum text-lg text-stone-700">
              <p>The Niger Delta Unity Movement is being established as a nonprofit, community-focused movement for the people of the Niger Delta. It was conceived around a simple conviction: that unity of purpose, combined with investment in people, can unlock the region&apos;s potential.</p>
              <p>NDUM focuses on human-capital development — education, skills, enterprise, agriculture, sports and talent — and on practical community service. It is an organisation for communities, not a political party or campaign.</p>
              <p>NDUM seeks to serve communities across the Niger Delta without unlawful discrimination.</p>
            </div>
            <div className="mt-6">
              <Notice tone="info" title="Organisational status">
                NDUM is a proposed organisation. Its formal registration, approvals and partnerships will be announced on this website only once they are confirmed.
              </Notice>
            </div>
          </div>
          <div className="aspect-[4/5] overflow-hidden lg:mt-12"><ImageSlot src={publicImage("about.jpg")} alt="Niger Delta community" label="Niger Delta community" /></div>
        </div>
      </section>

      <section id="mission" className="section bg-forest-50">
        <div className="container-page">
          <SectionHeading eyebrow="Vision & mission" title="Where we are heading, and how" />
          <div className="grid gap-8 md:grid-cols-2">
            <div className="border-t-4 border-forest-800 bg-white p-8"><h3 className="text-xl font-semibold text-forest-900">Vision</h3><p className="mt-3 text-lg text-stone-700">{vision}</p></div>
            <div className="border-t-4 border-gold-500 bg-white p-8"><h3 className="text-xl font-semibold text-forest-900">Mission</h3><p className="mt-3 text-lg text-stone-700">{mission}</p></div>
          </div>
        </div>
      </section>

      <section className="section" id="values">
        <div className="container-page">
          <SectionHeading eyebrow="Core values" title="What we stand for" />
          <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {coreValues.map((v) => (
              <div key={v.name} className="border-l-4 border-gold-500 pl-5">
                <dt className="text-xl font-semibold text-forest-900">{v.name}</dt>
                <dd className="mt-1 text-stone-700">{v.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section bg-stone-50" id="objectives">
        <div className="container-page">
          <SectionHeading eyebrow="Organisational objectives" title="What we aim to achieve" />
          <ol className="grid gap-4 sm:grid-cols-2">
            {objectives.map((o, i) => (
              <li key={o} className="flex gap-4 border border-stone-200 bg-white p-5">
                <span className="font-display text-2xl text-gold-600">{i + 1}</span>
                <span className="text-stone-700">{o}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" id="leadership">
        <div className="container-page">
          <SectionHeading eyebrow="Leadership and governance" title="Our leadership">
            Further officers will be introduced here once their appointments are formally approved. See also our{" "}
            <a href="/structure" className="underline">proposed organisational structure</a>.
          </SectionHeading>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {leaders.map((l) => (
              <li key={l.id} className="border border-stone-200 bg-white">
                <div className="aspect-[4/3]"><ImageSlot src={l.photo_url} alt={`Portrait of ${l.full_name}`} label={`photo of ${l.full_name}`} /></div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-forest-900">{l.full_name}</h3>
                  <p className="mt-1 text-sm font-semibold text-gold-600">{l.position}</p>
                  <p className="mt-3 text-sm text-stone-600">{l.bio ?? "Biography to be provided."}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="prose-ndum mt-12 max-w-3xl text-stone-700">
            <h3 className="font-display">Governance</h3>
            <p>NDUM is being organised on principles of accountability and member participation, under the NDUM Constitution and applicable Nigerian law. Members are expected to follow the Constitution and the Movement&apos;s lawful policies.</p>
          </div>
        </div>
      </section>

      <section className="section bg-navy-900 text-white" id="commitment">
        <div className="container-page max-w-3xl text-center">
          <SectionHeading eyebrow="Our commitment" title="To every community of the Niger Delta" center light />
          <p className="text-lg text-blue-100">We commit to serve with integrity, to include rather than exclude, and to measure ourselves by the opportunities we help create. We will be open about what we do and honest about what we cannot yet do.</p>
          <div className="mt-8"><LinkButton href="/membership/apply" variant="gold">Become a Member</LinkButton></div>
        </div>
      </section>
    </>
  );
}
