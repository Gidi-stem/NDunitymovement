import type { Metadata } from "next";
import { Notice, PageHero } from "@/components/ui";
import { tiers } from "@/lib/content";
import { getLeadership } from "@/lib/data";

export const metadata: Metadata = { title: "Organisational Structure", description: "NDUM's proposed organisational structure, from the General Assembly to ward and community units." };
export const revalidate = 300;

export default async function StructurePage() {
  const leaders = await getLeadership();
  return (
    <>
      <PageHero eyebrow="Organisational structure" title="How NDUM is proposed to be organised">
        From the General Assembly to ward and community units.
      </PageHero>
      <section className="section">
        <div className="container-page">
          <Notice tone="warn" title="Proposed structure">
            This structure is proposed and subject to the NDUM Constitution. No appointment is implied unless a named officer is shown below, and positions marked &ldquo;to be filled&rdquo; have not yet been approved.
          </Notice>

          <ol className="mx-auto mt-12 max-w-3xl" aria-label="Organisational tiers, top to bottom">
            {tiers.map((t, i) => {
              const people = leaders.filter((l) => l.tier === t.id);
              return (
                <li key={t.id} className="relative pb-10 last:pb-0">
                  {i < tiers.length - 1 && <span className="absolute left-1/2 top-full z-0 h-10 w-px -translate-x-1/2 bg-forest-300" aria-hidden />}
                  <div className={`relative z-10 border-2 p-6 text-center ${i === 0 ? "border-forest-800 bg-forest-800 text-white" : i < 3 ? "border-forest-700 bg-white" : "border-stone-300 bg-white"}`}>
                    <h2 className={`text-xl font-semibold ${i === 0 ? "text-white" : "text-forest-900"}`}>{t.name}</h2>
                    <p className={`mt-1 text-sm ${i === 0 ? "text-forest-100" : "text-stone-600"}`}>{t.text}</p>
                    <ul className="mt-4 space-y-2 border-t border-current/20 pt-4 text-sm">
                      {people.length === 0 ? (
                        <li className={i === 0 ? "text-forest-200" : "text-stone-500"}>Officers to be announced — positions to be filled</li>
                      ) : people.map((p) => (
                        <li key={p.id}><strong>{p.full_name}</strong> — {p.position}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </>
  );
}
