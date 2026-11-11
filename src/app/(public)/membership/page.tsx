import type { Metadata } from "next";
import { LinkButton, Notice, PageHero, SectionHeading } from "@/components/ui";
import { eligibility, membershipBenefits, membershipResponsibilities } from "@/lib/content";
import { getPublicSettings } from "@/lib/settings";
import { formatNaira } from "@/lib/money";

export const metadata: Metadata = { title: "Membership", description: "Why join NDUM, eligibility, benefits, responsibilities and how to apply." };
export const revalidate = 300;

export default async function MembershipPage() {
  const s = await getPublicSettings();
  return (
    <>
      <PageHero eyebrow="Membership" title="Be part of the Movement">
        Join people across the Niger Delta working for unity, empowerment and development.
      </PageHero>

      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Why join NDUM?" title="Unity gives purpose to effort" />
            <div className="prose-ndum text-lg text-stone-700">
              <p>NDUM brings together people who believe the Niger Delta&apos;s future is built by its people. Members help shape local chapters, volunteer on programmes, and contribute ideas for the development of their communities.</p>
              <p>Membership does not guarantee any grant, scholarship, job or appointment. Programmes publish their own criteria and selection processes.</p>
            </div>
          </div>
          <div className="border border-forest-200 bg-forest-50 p-8">
            <p className="eyebrow">Registration fee</p>
            <p className="mt-2 font-display text-5xl text-forest-900">{formatNaira(s.registrationFeeKobo)}</p>
            {s.feeStatus === "proposed" && <p className="mt-2 inline-block bg-gold-400/30 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">Proposed — pending formal approval</p>}
            <p className="mt-4 text-sm text-stone-700">
              {s.paymentsEnabled
                ? "You can pay online by secure card or bank transfer after you submit your application."
                : "Online payment is not yet active. You can submit your application now; NDUM will confirm payment arrangements through its official channels."}
            </p>
            <p className="mt-3 text-sm text-stone-700">An identity-card fee has not yet been approved. Please do not pay any individual or personal bank account — only official NDUM channels published on this website.</p>
          </div>
        </div>
      </section>

      <section className="section bg-stone-50">
        <div className="container-page grid gap-8 md:grid-cols-3">
          <List title="Membership benefits" items={membershipBenefits} />
          <List title="Responsibilities" items={membershipResponsibilities} />
          <List title="Eligibility" items={eligibility} />
        </div>
      </section>

      <section className="section" id="how-to-register">
        <div className="container-page max-w-3xl">
          <SectionHeading eyebrow="How to register" title="Four simple steps" />
          <ol className="space-y-6">
            {[
              ["Complete the online form", "Provide your personal details, chapter preference, areas of interest and emergency contact, and sign the declaration."],
              ["Save your private status link", "You receive a unique link to track your application. Keep it private."],
              ["Pay the registration fee", s.paymentsEnabled ? "Pay securely online through our payment partner." : "Online payment will be activated once NDUM confirms its official payment account. You will be notified."],
              ["Await review", "NDUM reviews applications. You may be asked to correct details. Approved members receive a membership number."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-5">
                <span className="flex size-10 shrink-0 items-center justify-center bg-forest-800 font-display text-lg text-white">{i + 1}</span>
                <div><h3 className="text-lg font-semibold text-forest-900">{t}</h3><p className="text-stone-700">{d}</p></div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <LinkButton href="/membership/apply" variant="gold">Start your application</LinkButton>
            <LinkButton href="/privacy" variant="outline">Privacy notice</LinkButton>
          </div>
          <div className="mt-8"><Notice tone="info" title="Already applied?">Use the private status link you received when you applied. Lost it? Contact NDUM using the details on the Contact page.</Notice></div>
        </div>
      </section>
    </>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-stone-200 bg-white p-7">
      <h2 className="text-xl font-semibold text-forest-900">{title}</h2>
      <span className="rule-gold mt-3" />
      <ul className="mt-5 list-disc space-y-2 pl-5 text-stone-700">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}
