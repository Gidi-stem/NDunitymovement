"use server";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/server";
import { env, isAdminClientConfigured } from "@/lib/env";
import { echo, type FormState } from "@/lib/forms";
import { formDataToRaw, membershipSchema, zodErrors } from "@/lib/validation/membership";
import { hashToken, newAccessToken, newApplicationReference, newPaymentReference } from "@/lib/tokens";
import { getSettingsForPayment } from "@/lib/settings";
import { initializeTransaction, paystackConfigured } from "@/lib/paystack";
import { sendEmail } from "@/lib/email";
import { applicationForToken, statusUrl } from "@/lib/applicant";

const lagosToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
export async function submitApplication(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = echo(fd);
  const parsed = membershipSchema.safeParse(formDataToRaw(fd));
  if (!parsed.success) {
    return { ok: false, errors: zodErrors(parsed.error), values, message: "Please correct the highlighted fields and submit again." };
  }
  const v = parsed.data;
  if (v.website) return { ok: true, message: "Application received.", data: { reference: "NDUM-APP-RECEIVED", statusUrl: "" } }; // honeypot
  if (!isAdminClientConfigured()) {
    return { ok: false, values, message: "Online applications are not available yet because the system is still being set up. Please contact NDUM using the details on the Contact page." };
  }
  const db = adminClient();

  const { data: category } = await db.from("membership_categories").select("id").eq("id", v.category_id).eq("is_active", true).maybeSingle();
  if (!category) return { ok: false, values, errors: { category_id: "Select a valid membership category." }, message: "Please correct the highlighted fields." };

  const row = {
    full_name: v.full_name, preferred_name: v.preferred_name, phone: v.phone, email: v.email,
    date_of_birth: v.date_of_birth, sex: v.sex, state_of_residence: v.state_of_residence, lga: v.lga, ward: v.ward,
    community: v.community, state_of_origin: v.state_of_origin, residential_address: v.residential_address, occupation: v.occupation,
    preferred_chapter_state: v.preferred_chapter_state, lga_chapter: v.lga_chapter, ward_unit: v.ward_unit,
    category_id: v.category_id, areas_of_interest: v.areas_of_interest, areas_other: v.areas_other,
    next_of_kin_name: v.next_of_kin_name, next_of_kin_phone: v.next_of_kin_phone,
    declaration_accuracy: true, declaration_constitution: true, declaration_rules: true, declaration_no_guarantee: true,
    privacy_ack: true, consent_processing: true, signature_name: v.signature_name, declaration_date: lagosToday(),
  };

  // ---- Correction / resubmission path (applicant holds the private link) -----------------------
  const editRef = String(fd.get("_ref") ?? "");
  const editKey = String(fd.get("_key") ?? "");
  if (editRef || editKey) {
    const app = await applicationForToken(editRef, editKey);
    if (!app || app.status !== "awaiting_correction") {
      return { ok: false, values, message: "This application can no longer be edited." };
    }
    const { error } = await db.from("applications").update({ ...row, status: "submitted", correction_note: null }).eq("id", app.id).eq("status", "awaiting_correction");
    if (error) return { ok: false, values, message: "We could not save your corrections. Please try again." };
    return { ok: true, message: "Your corrected application has been resubmitted for review.", data: { reference: app.reference, statusUrl: statusUrl(app.reference, editKey), resubmitted: "1" } };
  }

  // ---- New application ----------------------------------------------------------------------------
  const active = ["submitted", "pending_review", "awaiting_correction", "approved"];
  const [byEmail, byPhone] = await Promise.all([
    db.from("applications").select("id").eq("email", v.email).in("status", active).limit(1),
    db.from("applications").select("id").eq("phone", v.phone).in("status", active).limit(1),
  ]);
  if ((byEmail.data?.length ?? 0) + (byPhone.data?.length ?? 0) > 0) {
    return { ok: false, values, message: "An application with this email address or phone number already exists. Please use the private status link given when you applied, or contact NDUM for help." };
  }

  const token = newAccessToken();
  let reference = newApplicationReference();
  let inserted = null as { id: string } | null;
  for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
    const { data, error } = await db.from("applications").insert({ ...row, reference, access_token_hash: hashToken(token) }).select("id").single();
    if (!error) inserted = data;
    else if (error.code === "23505") reference = newApplicationReference(); // reference collision: retry
    else return { ok: false, values, message: "We could not save your application. Please try again shortly." };
  }
  if (!inserted) return { ok: false, values, message: "We could not save your application. Please try again shortly." };

  const link = statusUrl(reference, token);
  await sendEmail({
    to: v.email,
    subject: "NDUM — application received",
    text: `Dear ${v.full_name},\n\nThank you for applying to the Niger Delta Unity Movement. Your application reference is ${reference}.\n\nUse this private link to check your status, respond to any request for correction and (when activated) pay the registration fee:\n${link}\n\nKeep this link private. Membership does not guarantee grants, scholarships, jobs or appointments.\n\nNDUM`,
  });
  return { ok: true, message: "Application received.", data: { reference, statusUrl: link } };
}

/** Starts a Paystack payment. Amount comes from OUR settings table — never from the browser. */
export async function startPayment(fd: FormData) {
  const reference = String(fd.get("ref") ?? "");
  const key = String(fd.get("key") ?? "");
  const back = (code: string) => redirect(`/membership/status?ref=${encodeURIComponent(reference)}&key=${encodeURIComponent(key)}&notice=${code}`);

  if (!isAdminClientConfigured()) return back("unavailable");
  const app = await applicationForToken(reference, key);
  if (!app) redirect("/membership/status");
  if (app.status === "declined") return back("declined");

  const settings = await getSettingsForPayment();
  if (!settings.paymentsEnabled || !paystackConfigured()) return back("payments-off");

  const db = adminClient();
  const { data: paid } = await db.from("payments").select("id").eq("application_id", app.id).eq("status", "success").limit(1);
  if (paid && paid.length) return back("already-paid");

  const payRef = newPaymentReference();
  const { error } = await db.from("payments").insert({ application_id: app.id, reference: payRef, amount_kobo: settings.registrationFeeKobo });
  if (error) return back("error");

  let url: string | null = null;
  try {
    const tx = await initializeTransaction({
      email: app.email, amountKobo: settings.registrationFeeKobo, reference: payRef,
      callbackUrl: `${env.siteUrl}/membership/payment/callback`, applicationRef: app.reference,
    });
    url = tx.authorization_url;
  } catch {
    await db.from("payments").update({ status: "failed" }).eq("reference", payRef).eq("status", "pending");
  }
  if (!url) return back("error");
  redirect(url);
}
