export interface FormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string | string[]>;
  /** extra payload for success screens */
  data?: Record<string, string>;
}
export const initialFormState: FormState = { ok: false };

/** Echo submitted values back (never passwords) so a failed validation doesn't wipe the form. */
export function echo(fd: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(Array.from(fd.keys()))) {
    if (key.startsWith("$ACTION") || key === "password") continue;
    const all = fd.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = key === "areas_of_interest" ? all : (all[0] ?? "");
  }
  return out;
}
