import type { FormState } from "@/lib/forms";

export function val(state: FormState, name: string): string {
  const v = state.values?.[name];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export function Field({ label, name, state, hint, required, children }: {
  label: string; name: string; state: FormState; hint?: string; required?: boolean; children: (p: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const id = `f-${name}`;
  const err = state.errors?.[name];
  const describedBy = [err ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}{required && <span className="text-red-700" aria-hidden> *</span>}{!required && <span className="font-normal text-stone-500"> (optional)</span>}</label>
      {children({ id, "aria-invalid": !!err, "aria-describedby": describedBy })}
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {err && <p id={`${id}-err`} className="field-error">{err}</p>}
    </div>
  );
}
