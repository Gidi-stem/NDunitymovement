"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actorWith } from "@/lib/auth/session";
import { REVIEW_ACTION_PERMISSION, type ReviewAction } from "@/lib/auth/rbac";
import { adminClient, sessionClient } from "@/lib/supabase/server";
import { flash } from "@/lib/admin/flash";
import { logAudit } from "@/lib/admin/audit";
import { storeUpload } from "@/lib/admin/upload";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";

const id = z.uuid();

/** Status changes. Permission is checked here AND again inside the review_application() SQL function. */
export async function reviewApplication(fd: FormData) {
  const appId = id.safeParse(fd.get("id"));
  const action = String(fd.get("action") ?? "") as ReviewAction;
  if (!appId.success || !(action in REVIEW_ACTION_PERMISSION)) flash("/admin/applications", "err", "Invalid request.");
  const back = `/admin/applications/${appId.data}`;
  const actor = await actorWith(REVIEW_ACTION_PERMISSION[action]);
  if (!actor) flash(back, "err", "You do not have permission to do that.");

  const note = String(fd.get("note") ?? "").slice(0, 1000);
  const supabase = await sessionClient();
  const { data, error } = await supabase.rpc("review_application", { p_id: appId.data, p_action: action, p_note: note });
  if (error) flash(back, "err", error.message.replace(/^.*?: /, ""));

  const app = data as { email: string; full_name: string; membership_number: string | null; correction_note: string | null; review_note: string | null; reference: string } | null;
  if (app) {
    const subjects: Partial<Record<ReviewAction, [string, string]>> = {
      request_correction: ["NDUM — corrections needed on your application", `Please correct the following and resubmit using your private status link:\n\n${app.correction_note}`],
      approve: ["NDUM — your membership is approved", `Your membership has been approved. Your membership number is ${app.membership_number}.`],
      decline: ["NDUM — update on your application", `We are unable to approve your application at this time.\n\n${app.review_note ?? ""}`],
    };
    const m = subjects[action];
    if (m) await sendEmail({ to: app.email, subject: m[0], text: `Dear ${app.full_name},\n\n${m[1]}\n\nApplication reference: ${app.reference}\nYou can check your status with the private link you received when you applied.\n\nNiger Delta Unity Movement\n${env.siteUrl}` });
  }
  revalidatePath("/admin", "layout");
  flash(back, "msg", { start_review: "Moved to pending review.", request_correction: "Correction requested.", approve: "Application approved and membership number assigned.", decline: "Application declined." }[action]);
}

export async function assignChapter(fd: FormData) {
  const appId = id.safeParse(fd.get("id"));
  if (!appId.success) flash("/admin/applications", "err", "Invalid request.");
  const back = `/admin/applications/${appId.data}`;
  if (!(await actorWith("applications.assign_chapter"))) flash(back, "err", "You do not have permission to do that.");
  const raw = String(fd.get("chapter_id") ?? "");
  const chapter = raw ? id.safeParse(raw) : { success: true as const, data: null };
  if (!chapter.success) flash(back, "err", "Invalid chapter.");
  const { error } = await (await sessionClient()).rpc("assign_chapter", { p_id: appId.data, p_chapter_id: chapter.data });
  if (error) flash(back, "err", error.message.replace(/^.*?: /, ""));
  revalidatePath(back);
  flash(back, "msg", "Chapter updated.");
}

export async function uploadMemberPhoto(fd: FormData) {
  const appId = id.safeParse(fd.get("id"));
  if (!appId.success) flash("/admin/applications", "err", "Invalid request.");
  const back = `/admin/applications/${appId.data}`;
  const actor = await actorWith("applications.edit_photo");
  if (!actor) flash(back, "err", "You do not have permission to do that.");
  // Confirm the application is visible to this admin (RLS = jurisdiction) before touching storage.
  const { data: app } = await (await sessionClient()).from("applications").select("id, member_photo_path").eq("id", appId.data).maybeSingle();
  if (!app) flash(back, "err", "Application not found in your jurisdiction.");
  if (fd.get("consent") !== "on") flash(back, "err", "Confirm that the member consented to the use of their photograph.");

  const up = await storeUpload(fd.get("photo") as File | null, { bucket: "member-photos", folder: appId.data });
  if (!up.ok) flash(back, "err", up.error);
  const db = adminClient();
  await db.from("applications").update({ member_photo_path: up.result.path }).eq("id", appId.data);
  if (app.member_photo_path) await db.storage.from("member-photos").remove([app.member_photo_path]);
  revalidatePath(back);
  flash(back, "msg", "Member photograph saved.");
}

/** Records ID-card generation in the audit log, then opens the printable card. Approved members only. */
export async function generateIdCard(fd: FormData) {
  const appId = id.safeParse(fd.get("id"));
  if (!appId.success) flash("/admin/applications", "err", "Invalid request.");
  const back = `/admin/applications/${appId.data}`;
  const actor = await actorWith("idcards.generate");
  if (!actor) flash(back, "err", "You do not have permission to do that.");
  const { data: app } = await (await sessionClient()).from("applications").select("id, status, membership_number").eq("id", appId.data).maybeSingle();
  if (!app || app.status !== "approved" || !app.membership_number) flash(back, "err", "ID cards can only be generated for approved members.");
  await logAudit(actor, "idcard.generated", "applications", app.id, { membership_number: app.membership_number });
  flash(`${back}/id-card`, "msg", "ID card ready to print.");
}
