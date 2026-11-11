import Link from "next/link";
import { LinkButton, SectionHeading, DeltaPattern, ImageSlot } from "@/components/ui";
import { areasOfIntervention, coreValues, mission, vision } from "@/lib/content";
import { publicImage } from "@/lib/assets";

export const revalidate = 3600;

export default function HomePage() {
  const hero = publicImage("hero.jpg");
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-forest-900 text-white">
        {hero ? (
          <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        ) : (
          <DeltaPattern className="absolute inset-0 h-full w-full opacity-[0.09]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-forest-950/90 via-forest-900/70 to-transparent" aria-hidden />
        <div className="container-page relative py-20 sm:py-32 lg:py-40">
          <p className="eyebrow !text-gold-400">Unity • Empowerment • Development</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-6xl">
            UNITING THE NIGER DELTA. EMPOWERING PEOPLE. BUILDING A BETTER FUTURE.
          </h1>
          <span className="rule-gold mt-6" />
          <p className="mt-6 max-w-2xl text-lg text-forest-100 sm:text-xl">
            The Niger Delta Unity Movement is committed to bringing communities together and creating opportunities through education, enterprise, agriculture, sports, skills development and inclusive human empowerment.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/membership/apply" variant="gold">Become a Member</LinkButton>
            <LinkButton href="/about#mission" variant="outline-light">Explore Our Mission</LinkButton>
          </div>
        </div>
      </section>

      {/* Welcome */}
      <section className="section">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Welcome" title="A movement for the people of the Niger Delta" />
            <div className="space-y-4 text-lg text-stone-700">
              <p>
                The Niger Delta Unity Movement (NDUM) is a proposed nonprofit, community-focused movement. We believe the region&apos;s greatest resource is its people — and that unity, education, enterprise and opportunity can turn potential into prosperity.
              </p>
              <p>
                NDUM exists to unite communities, develop human capital, and open practical pathways for women, youth and families across the Niger Delta, without unlawful discrimination.
              </p>
            </div>
            <Link href="/about" className="mt-6 inline-block font-semibold text-forest-700 underline underline-offset-4">Learn more about NDUM →</Link>
          </div>
          <div className="aspect-[4/3] overflow-hidden"><ImageSlot src={publicImage("about.jpg")} alt="Community members in the Niger Delta" label="community life in the Niger Delta" /></div>
        </div>
      </section>

      {/* Vision & mission */}
      <section id="vision-mission" className="bg-forest-50 section">
        <div className="container-page grid gap-8 md:grid-cols-2">
          <article className="border-t-4 border-forest-800 bg-white p-8">
            <p className="eyebrow">Our Vision</p>
            <p className="mt-4 font-display text-2xl leading-snug text-forest-900">{vision}</p>
          </article>
          <article className="border-t-4 border-gold-500 bg-white p-8">
            <p className="eyebrow">Our Mission</p>
            <p className="mt-4 text-lg text-stone-700">{mission}</p>
          </article>
        </div>
      </section>

      {/* Values */}
      <section className="section">
        <div className="container-page">
          <SectionHeading eyebrow="What guides us" title="Our core values" center />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {coreValues.map((v) => (
              <li key={v.name} className="border border-stone-200 border-t-4 border-t-gold-500 bg-white p-6">
                <h3 className="text-xl font-semibold text-forest-900">{v.name}</h3>
                <p className="mt-2 text-sm text-stone-600">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Areas */}
      <section className="section bg-navy-900 text-white">
        <div className="container-page">
          <SectionHeading eyebrow="Where we work" title="Our areas of intervention" light>
            Seven focus areas, shaped around opportunity, capability and community wellbeing.
          </SectionHeading>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {areasOfIntervention.map((a, i) => (
              <li key={a.slug} className="border border-white/15 p-7">
                <span className="font-display text-3xl text-gold-400">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-xl font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm text-blue-100/80">{a.blurb}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10"><LinkButton href="/programmes" variant="outline-light">View our programmes</LinkButton></div>
        </div>
      </section>

      {/* Membership CTA */}
      <section className="section">
        <div className="container-page">
          <div className="grid items-center gap-8 border border-forest-200 bg-forest-50 p-8 sm:p-12 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow">Membership</p>
              <h2 className="mt-2 text-3xl font-semibold text-forest-900">Join the Movement</h2>
              <p className="mt-3 max-w-2xl text-lg text-stone-700">
                If you share our commitment to unity and community development, we invite you to apply for membership. Applications are reviewed by NDUM; membership does not guarantee grants, scholarships, jobs or appointments.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <LinkButton href="/membership/apply" variant="gold">Become a Member</LinkButton>
              <LinkButton href="/membership" variant="outline">Membership information</LinkButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
