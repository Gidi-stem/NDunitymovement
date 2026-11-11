import "server-only";
import { env } from "@/lib/env";

/** Sends via Resend when configured; otherwise skips quietly (never throws into the caller's flow). */
export async function sendEmail(p: { to: string; subject: string; text: string }): Promise<boolean> {
  if (!env.resendKey || !env.emailFrom) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom, to: [p.to], subject: p.subject, text: p.text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
