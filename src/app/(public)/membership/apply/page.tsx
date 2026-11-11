import type { Metadata } from "next";
import { ApplicationForm } from "@/components/ApplicationForm";
import { Notice, PageHero } from "@/components/ui";
import { getActiveCategories } from "@/lib/data";
import { getPublicSettings } from "@/lib/settings";
import { formatNaira } from "@/lib/money";
import { applicationForToken } from "@/lib/applicant";
import { isAdminClientConfigured, isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Membership Application", robots: { index: false } };
// Always render at request time: reads the applicant's private link and live settings.
export const dynamic = "force-dynamic";

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ ref?: string; key?: string }> }) {
  const { ref, key } = await searchParams;
  const [categories, settings] = await Promise.all([getActiveCategories(), getPublicSettings()]);
  const today = new Date().toLocaleDateString("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "long", year: "numeric" });

  let edit: { reference: string; key: string; note: string | null } | undefined;
  let defaults: Record<string, string | string[]> | undefined;
  if (ref && key && isAdminClientConfigured()) {
    const app = await applicationForToken(ref, key);
    if (app && app.status === "awaiting_correction") {
      edit = { reference: app.reference, key, note: app.correction_note };
      defaults = {};
      for (const f of ["full_name","preferred_name","phone","email","date_of_birth","sex","state_of_residence","lga","ward","community","state_of_origin","residential_address","occupation","preferred_chapter_state","lga_chapter","ward_unit","category_id","areas_other","next_of_kin_name","next_of_kin_phone"]) defaults[f] = app[f] ?? "";
      defaults.areas_of_interest = app.areas_of_interest ?? [];
    }
  }

  const notReady = !isSupabaseConfigured() || categories.length === 0;
  return (
    <>
      <PageHero eyebrow="Membership" title={edit ? "Correct your application" : "Membership application"}>
        Complete all required fields (marked *). It takes about five minutes.
      </PageHero>
      <section className="section">
        <div className="container-page max-w-3xl">
          {notReady ? (
            <Notice tone="warn" title="Applications are not open yet">
              The online application system is still being set up. Please check back soon or contact NDUM using the details on the Contact page.
            </Notice>
          ) : (
            <ApplicationForm
              categories={categories}
              feeText={`Registration fee: ${formatNaira(settings.registrationFeeKobo)}`}
              feeProposed={settings.feeStatus === "proposed"}
              defaults={defaults}
              edit={edit}
              today={today}
            />
          )}
        </div>
      </section>
    </>
  );
}
