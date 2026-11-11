import type { Metadata } from "next";
import { Notice, PageHero } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Notice" };

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Privacy" title="Privacy Notice" />
      <section className="section">
        <div className="container-page max-w-3xl">
          <Notice tone="warn" title="Draft for legal review">
            This notice describes how the website is built to handle personal data. NDUM should have it reviewed by a qualified Nigerian data-protection professional and confirm its data-protection contact and retention periods before relying on it publicly.
          </Notice>
          <div className="prose-ndum mt-8 text-stone-700">
            <h2>Who we are</h2>
            <p>The Niger Delta Unity Movement (NDUM), {site.address}. Phone: {site.phone}. Email: {site.email ?? "to be added"}.</p>
            <h2>What we collect</h2>
            <p>When you apply for membership we collect the details on the application form: your name, contact details, location (state, LGA, ward, community), occupation, chapter preference, areas of interest, optional date of birth, sex (only if formally approved as necessary), address and next-of-kin details, and your declaration and consent. If an ID card is issued we may also hold your photograph. If you contact us we keep your message and contact details.</p>
            <p>We do <strong>not</strong> ask for National Identification Numbers, bank account details or other unnecessary sensitive information during ordinary registration.</p>
            <h2>Why we use it</h2>
            <p>Only for membership administration: reviewing applications, assigning chapters and membership numbers, communicating with members, confirming payments and issuing membership identity cards. We rely on your consent and our legitimate interest in administering the Movement.</p>
            <h2>Who sees it</h2>
            <p>Authorised NDUM administrators, restricted by role and by the chapter or jurisdiction they serve. Payments are processed by our payment provider, which receives your email address and the amount; we do not store card details. We do not sell personal data.</p>
            <h2>Security</h2>
            <p>Data is stored in access-controlled databases with role-based permissions and an audit trail of administrative actions. Access links for applicants are private and unguessable.</p>
            <h2>Retention</h2>
            <p>We keep application records for as long as needed for membership administration and to meet legal obligations, and then delete or anonymise them. NDUM will publish its retention schedule once approved.</p>
            <h2>Your rights</h2>
            <p>Under applicable Nigerian data-protection law you may ask to access, correct or delete your personal data, withdraw consent, or complain to the regulator. Contact us using the details above.</p>
            <h2>Children</h2>
            <p>We take extra care with information and images of children. Photographs of identifiable children are not published without documented guardian consent and safeguarding approval.</p>
          </div>
        </div>
      </section>
    </>
  );
}
