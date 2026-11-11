"use server";
import { adminClient } from "@/lib/supabase/server";
import { isAdminClientConfigured } from "@/lib/env";
import { contactSchema, formDataToRaw, zodErrors } from "@/lib/validation/membership";
import { echo, type FormState } from "@/lib/forms";

export async function submitContact(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(formDataToRaw(fd));
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error), values: echo(fd), message: "Please correct the highlighted fields." };
  if (parsed.data.website) return { ok: true, message: "Thank you — your message has been received." }; // honeypot: silently drop bots
  if (!isAdminClientConfigured()) {
    return { ok: false, values: echo(fd), message: "Our message inbox is not available yet. Please call the number on this page." };
  }
  const { error } = await adminClient().from("contact_messages").insert({
    name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone, message: parsed.data.message,
  });
  if (error) return { ok: false, values: echo(fd), message: "We could not send your message. Please try again or call us." };
  return { ok: true, message: "Thank you — your message has been received. We will respond using the contact details you provided." };
}
