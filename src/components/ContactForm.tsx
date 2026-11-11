"use client";
import { useActionState } from "react";
import { submitContact } from "@/app/(public)/contact/actions";
import { initialFormState } from "@/lib/forms";
import { Field, val } from "@/components/Field";
import { Notice } from "@/components/ui";

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initialFormState);
  if (state.ok) return <Notice tone="success" title="Message sent">{state.message}</Notice>;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Notice tone="error">{state.message}</Notice>}
      <Field label="Your name" name="name" state={state} required>
        {(p) => <input {...p} name="name" defaultValue={val(state, "name")} className="field-input" autoComplete="name" />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" name="email" state={state} hint="Email or phone is needed so we can reply.">
          {(p) => <input {...p} name="email" type="email" defaultValue={val(state, "email")} className="field-input" autoComplete="email" />}
        </Field>
        <Field label="Phone" name="phone" state={state}>
          {(p) => <input {...p} name="phone" type="tel" defaultValue={val(state, "phone")} className="field-input" autoComplete="tel" />}
        </Field>
      </div>
      <Field label="Message" name="message" state={state} required>
        {(p) => <textarea {...p} name="message" rows={6} defaultValue={val(state, "message")} className="field-input" />}
      </Field>
      <div className="absolute -left-[9999px]" aria-hidden>
        <label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <button className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
