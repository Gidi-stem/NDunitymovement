"use client";
import { useActionState } from "react";
import Link from "next/link";
import { submitApplication } from "@/app/(public)/membership/apply/actions";
import { initialFormState, type FormState } from "@/lib/forms";
import { Field, val } from "@/components/Field";
import { Notice } from "@/components/ui";
import { AREAS_OF_INTEREST } from "@/lib/validation/membership";
import { CHAPTER_STATES, RESIDENCE_STATES } from "@/lib/nigeria";

export interface Category { id: string; name: string; description: string | null }

export function ApplicationForm({ categories, feeText, feeProposed, defaults, edit, today }: {
  categories: Category[];
  feeText: string;
  feeProposed: boolean;
  defaults?: Record<string, string | string[]>;
  edit?: { reference: string; key: string; note: string | null };
  today: string;
}) {
  const [state, action, pending] = useActionState(submitApplication, { ...initialFormState, values: defaults } as FormState);

  if (state.ok && state.data) {
    return (
      <div className="space-y-6" aria-live="polite">
        <Notice tone="success" title={state.data.resubmitted ? "Corrections submitted" : "Application received"}>
          {state.data.resubmitted ? "Your corrected application has been resubmitted for review." : "Thank you for applying to the Niger Delta Unity Movement."}
        </Notice>
        <div className="border border-stone-300 bg-white p-6">
          <p className="text-sm text-stone-600">Your application reference</p>
          <p className="mt-1 font-mono text-2xl font-bold text-forest-900">{state.data.reference}</p>
          {state.data.statusUrl && (
            <>
              <p className="mt-5 text-sm text-stone-700">
                <strong>Save your private status link now.</strong> It is the only way to check your application, respond to any request for correction and (once activated) pay the registration fee. If email is configured we have also sent it to your email address. Do not share it.
              </p>
              <p className="mt-3 break-all border border-stone-200 bg-stone-50 p-3 font-mono text-xs">{state.data.statusUrl}</p>
              <Link href={state.data.statusUrl.replace(/^https?:\/\/[^/]+/, "")} className="btn-primary mt-5">Open my status page</Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const area = new Set(state.values?.areas_of_interest ?? []);
  const v = (n: string) => val(state, n);

  return (
    <form action={action} noValidate className="space-y-12">
      {edit && <><input type="hidden" name="_ref" value={edit.reference} /><input type="hidden" name="_key" value={edit.key} /></>}
      {edit?.note && <Notice tone="warn" title="Correction requested">{edit.note}</Notice>}
      {state.message && !state.ok && <Notice tone="error" title="We could not submit your application">{state.message}</Notice>}

      <Notice tone="info" title="Registration fee">
        {feeText}{feeProposed ? " (proposed — pending formal approval; online payment is not yet active)." : "."} Do not pay any person or personal account in connection with this application.
      </Notice>

      <fieldset className="space-y-5">
        <legend className="mb-2 border-b-2 border-gold-500 pb-2 font-display text-2xl font-semibold text-forest-900">Section A — Personal information</legend>
        <Field label="Full name" name="full_name" state={state} required>{(p) => <input {...p} name="full_name" defaultValue={v("full_name")} className="field-input" autoComplete="name" />}</Field>
        <Field label="Preferred name" name="preferred_name" state={state}>{(p) => <input {...p} name="preferred_name" defaultValue={v("preferred_name")} className="field-input" />}</Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone number" name="phone" state={state} required hint="e.g. 08012345678">{(p) => <input {...p} name="phone" type="tel" defaultValue={v("phone")} className="field-input" autoComplete="tel" inputMode="tel" />}</Field>
          <Field label="Email address" name="email" state={state} required>{(p) => <input {...p} name="email" type="email" defaultValue={v("email")} className="field-input" autoComplete="email" />}</Field>
          <Field label="Date of birth" name="date_of_birth" state={state}>{(p) => <input {...p} name="date_of_birth" type="date" defaultValue={v("date_of_birth")} className="field-input" autoComplete="bday" />}</Field>
          <Field label="Sex" name="sex" state={state} hint="Collected only if formally approved as necessary by NDUM.">
            {(p) => <select {...p} name="sex" defaultValue={v("sex")} className="field-input"><option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option></select>}
          </Field>
          <Field label="State of residence" name="state_of_residence" state={state} required>
            {(p) => <select {...p} name="state_of_residence" defaultValue={v("state_of_residence")} className="field-input"><option value="">Select…</option>{RESIDENCE_STATES.map((s) => <option key={s}>{s}</option>)}</select>}
          </Field>
          <Field label="Local Government Area" name="lga" state={state} required>{(p) => <input {...p} name="lga" defaultValue={v("lga")} className="field-input" />}</Field>
          <Field label="Ward" name="ward" state={state} required>{(p) => <input {...p} name="ward" defaultValue={v("ward")} className="field-input" />}</Field>
          <Field label="Community" name="community" state={state} required>{(p) => <input {...p} name="community" defaultValue={v("community")} className="field-input" />}</Field>
          <Field label="State of origin" name="state_of_origin" state={state}>{(p) => <input {...p} name="state_of_origin" defaultValue={v("state_of_origin")} className="field-input" />}</Field>
          <Field label="Occupation / profession" name="occupation" state={state} required>{(p) => <input {...p} name="occupation" defaultValue={v("occupation")} className="field-input" />}</Field>
        </div>
        <Field label="Residential address" name="residential_address" state={state}>{(p) => <textarea {...p} name="residential_address" rows={2} defaultValue={v("residential_address")} className="field-input" autoComplete="street-address" />}</Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-2 border-b-2 border-gold-500 pb-2 font-display text-2xl font-semibold text-forest-900">Section B — Membership information</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Preferred chapter / state" name="preferred_chapter_state" state={state} required>
            {(p) => <select {...p} name="preferred_chapter_state" defaultValue={v("preferred_chapter_state")} className="field-input"><option value="">Select…</option>{CHAPTER_STATES.map((s) => <option key={s}>{s}</option>)}</select>}
          </Field>
          <Field label="LGA chapter" name="lga_chapter" state={state} hint="Leave blank if the same as your LGA.">{(p) => <input {...p} name="lga_chapter" defaultValue={v("lga_chapter")} className="field-input" />}</Field>
          <Field label="Ward / community unit" name="ward_unit" state={state}>{(p) => <input {...p} name="ward_unit" defaultValue={v("ward_unit")} className="field-input" />}</Field>
          <Field label="Membership category" name="category_id" state={state} required>
            {(p) => <select {...p} name="category_id" defaultValue={v("category_id")} className="field-input"><option value="">Select…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
          </Field>
        </div>
        <div>
          <p className="field-label" id="aoi-label">Areas of interest <span className="text-red-700" aria-hidden>*</span></p>
          <div role="group" aria-labelledby="aoi-label" className="grid gap-2 sm:grid-cols-2">
            {AREAS_OF_INTEREST.map((a) => (
              <label key={a} className="flex min-h-11 items-center gap-3 border border-stone-300 px-3 py-2 has-[:checked]:border-forest-700 has-[:checked]:bg-forest-50">
                <input type="checkbox" name="areas_of_interest" value={a} defaultChecked={area.has(a)} className="size-4 accent-forest-800" />{a}
              </label>
            ))}
          </div>
          {state.errors?.areas_of_interest && <p className="field-error">{state.errors.areas_of_interest}</p>}
        </div>
        <Field label="If Other, please specify" name="areas_other" state={state}>{(p) => <input {...p} name="areas_other" defaultValue={v("areas_other")} className="field-input" />}</Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-2 border-b-2 border-gold-500 pb-2 font-display text-2xl font-semibold text-forest-900">Section C — Emergency contact</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Next of kin name" name="next_of_kin_name" state={state}>{(p) => <input {...p} name="next_of_kin_name" defaultValue={v("next_of_kin_name")} className="field-input" />}</Field>
          <Field label="Next of kin phone number" name="next_of_kin_phone" state={state}>{(p) => <input {...p} name="next_of_kin_phone" type="tel" defaultValue={v("next_of_kin_phone")} className="field-input" />}</Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 border-b-2 border-gold-500 pb-2 font-display text-2xl font-semibold text-forest-900">Section D — Declaration</legend>
        <p className="text-sm text-stone-600">Please read and tick each statement. We do not collect National Identification Numbers or bank details.</p>
        {([
          ["declaration_accuracy", "I confirm that the information I have provided is accurate."],
          ["declaration_constitution", "I confirm that I have access to the NDUM Constitution and applicable policies."],
          ["declaration_rules", "I agree to follow the organisation's lawful rules and policies."],
          ["declaration_no_guarantee", "I understand that membership does not guarantee grants, scholarships, jobs or appointments."],
          ["privacy_ack", "I acknowledge the NDUM Privacy Notice."],
          ["consent_processing", "I consent to the processing of my personal information for membership administration."],
        ] as const).map(([name, label]) => (
          <div key={name}>
            <label className="flex items-start gap-3">
              <input type="checkbox" name={name} defaultChecked={!!state.values?.[name]} aria-invalid={!!state.errors?.[name]} className="mt-1 size-5 shrink-0 accent-forest-800" />
              <span>{label}{name === "privacy_ack" && <> (<Link href="/privacy" target="_blank" className="underline">read the notice</Link>)</>}</span>
            </label>
            {state.errors?.[name] && <p className="field-error ml-8">{state.errors[name]}</p>}
          </div>
        ))}
        <div className="grid gap-5 pt-2 sm:grid-cols-2">
          <Field label="Electronic signature" name="signature_name" state={state} required hint="Type your full name exactly as entered above.">{(p) => <input {...p} name="signature_name" defaultValue={v("signature_name")} className="field-input" autoComplete="off" />}</Field>
          <div><span className="field-label">Date</span><p className="field-input flex items-center bg-stone-50 text-stone-700">{today}</p><p className="field-hint">Recorded automatically on submission.</p></div>
        </div>
      </fieldset>

      <div className="absolute -left-[9999px]" aria-hidden><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <button className="btn-gold w-full sm:w-auto" disabled={pending}>{pending ? "Submitting…" : edit ? "Resubmit corrected application" : "Submit application"}</button>
    </form>
  );
}
