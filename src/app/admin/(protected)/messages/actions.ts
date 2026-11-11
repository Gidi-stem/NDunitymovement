"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actorWith } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { flash } from "@/lib/admin/flash";

export async function setHandled(fd: FormData) {
  if (!(await actorWith("inbox.view"))) flash("/admin/messages", "err", "You do not have permission to do that.");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) flash("/admin/messages", "err", "Invalid request.");
  await (await sessionClient()).from("contact_messages").update({ is_handled: fd.get("handled") === "1" }).eq("id", id.data);
  revalidatePath("/admin/messages");
  flash("/admin/messages", "msg", "Updated.");
}
