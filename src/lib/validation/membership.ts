import { z } from "zod";
import { CHAPTER_STATES, RESIDENCE_STATES } from "@/lib/nigeria";

export const AREAS_OF_INTEREST = [
  "Education and Scholarships",
  "Women and Youth Development",
  "Enterprise and Business Support",
  "Agriculture",
  "Sports and Talent Development",
  "Community Service",
  "Technology and Skills Development",
  "Volunteering",
  "Other",
] as const;

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const text = (label: string, min: number, max: number) =>
  z.string({ error: `${label} is required.` }).transform(collapse)
    .pipe(z.string().min(min, `${label} is required.`).max(max, `${label} is too long.`));
const optionalText = (max: number) =>
  z.string().optional().transform((v) => collapse(v ?? "")).pipe(z.string().max(max, "Too long.")).transform((v) => v || null);

export const phoneSchema = (label = "Phone number") =>
  z.string({ error: `${label} is required.` })
    .transform((v) => v.replace(/[\s\-().]/g, ""))
    .pipe(z.string().regex(/^\+?\d{7,15}$/, `Enter a valid ${label.toLowerCase()} (digits only, e.g. 08012345678 or +2348012345678).`));

const tick = (msg: string) => z.preprocess((v) => v === "on" || v === "true" || v === true, z.literal(true, { error: msg }));

export const membershipSchema = z
  .object({
    // Section A
    full_name: text("Full name", 2, 120),
    preferred_name: optionalText(80),
    phone: phoneSchema(),
    email: z.string({ error: "Email address is required." }).transform((v) => v.trim().toLowerCase()).pipe(z.email("Enter a valid email address.").max(254)),
    date_of_birth: z.string().optional().transform((v) => (v ?? "").trim()).pipe(
      z.string().refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && v <= new Date().toISOString().slice(0, 10) && v > "1900-01-01"), "Enter a valid date of birth."),
    ).transform((v) => v || null),
    sex: z.string().optional().transform((v) => (v ?? "").trim()).pipe(z.enum(["", "female", "male"], "Select a valid option.")).transform((v) => v || null),
    state_of_residence: z.enum(RESIDENCE_STATES, "Select your state of residence."),
    lga: text("Local Government Area", 2, 80),
    ward: text("Ward", 1, 80),
    community: text("Community", 2, 120),
    state_of_origin: optionalText(40),
    residential_address: optionalText(300),
    occupation: text("Occupation / profession", 2, 120),
    // Section B
    preferred_chapter_state: z.enum(CHAPTER_STATES, "Select a preferred chapter / state."),
    lga_chapter: optionalText(80),
    ward_unit: optionalText(80),
    category_id: z.string({ error: "Select a membership category." }).pipe(z.uuid("Select a membership category.")),
    areas_of_interest: z.array(z.enum(AREAS_OF_INTEREST)).min(1, "Select at least one area of interest."),
    areas_other: optionalText(200),
    // Section C
    next_of_kin_name: optionalText(120),
    next_of_kin_phone: z.string().optional().transform((v) => (v ?? "").replace(/[\s\-().]/g, "")).pipe(
      z.string().refine((v) => v === "" || /^\+?\d{7,15}$/.test(v), "Enter a valid phone number."),
    ).transform((v) => v || null),
    // Section D
    declaration_accuracy: tick("You must confirm the information is accurate."),
    declaration_constitution: tick("You must confirm you have access to the NDUM Constitution and policies."),
    declaration_rules: tick("You must agree to follow NDUM's lawful rules and policies."),
    declaration_no_guarantee: tick("You must acknowledge that membership does not guarantee benefits."),
    privacy_ack: tick("You must acknowledge the privacy notice."),
    consent_processing: tick("You must consent to processing for membership administration."),
    signature_name: text("Electronic signature", 2, 120),
    // honeypot: real users never fill this in
    website: z.string().optional().transform((v) => v ?? ""),
  })
  .superRefine((v, ctx) => {
    if (v.areas_of_interest.includes("Other") && !v.areas_other) {
      ctx.addIssue({ code: "custom", path: ["areas_other"], message: "Please say what other area interests you." });
    }
    if (v.next_of_kin_phone && !v.next_of_kin_name) {
      ctx.addIssue({ code: "custom", path: ["next_of_kin_name"], message: "Add the next of kin's name or remove the phone number." });
    }
    if (collapse(v.signature_name).toLowerCase() !== collapse(v.full_name).toLowerCase()) {
      ctx.addIssue({ code: "custom", path: ["signature_name"], message: "Type your full name exactly as entered above to sign." });
    }
  });

export type MembershipInput = z.infer<typeof membershipSchema>;
export type FieldErrors = Record<string, string>;

/** Parse a browser FormData into the schema's raw shape (multi-value checkboxes become arrays). */
export function formDataToRaw(fd: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const key of new Set(Array.from(fd.keys()))) {
    if (key.startsWith("$ACTION")) continue;
    const all = fd.getAll(key).filter((v): v is string => typeof v === "string");
    raw[key] = key === "areas_of_interest" ? all : all[0];
  }
  if (!raw.areas_of_interest) raw.areas_of_interest = [];
  return raw;
}

export function zodErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const contactSchema = z.object({
  name: text("Name", 2, 120),
  email: z.string().optional().transform((v) => (v ?? "").trim().toLowerCase()).pipe(z.union([z.literal(""), z.email("Enter a valid email address.")])).transform((v) => v || null),
  phone: z.string().optional().transform((v) => (v ?? "").replace(/[\s\-().]/g, "")).pipe(z.string().refine((v) => v === "" || /^\+?\d{7,15}$/.test(v), "Enter a valid phone number.")).transform((v) => v || null),
  message: text("Message", 10, 4000),
  website: z.string().optional().transform((v) => v ?? ""),
}).superRefine((v, ctx) => {
  if (!v.email && !v.phone) ctx.addIssue({ code: "custom", path: ["email"], message: "Provide an email address or phone number so we can reply." });
});
