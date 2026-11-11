import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const API = "https://api.paystack.co";

export const paystackConfigured = () => Boolean(env.paystackSecret);

/** Paystack signs the raw request body with HMAC-SHA512 using the secret key. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret = env.paystackSecret): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export interface PaystackTransaction {
  id: number | string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  channel?: string | null;
  paid_at?: string | null;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${env.paystackSecret}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !json?.status || !json.data) throw new Error(json?.message ?? `Paystack request failed (${res.status})`);
  return json.data;
}

export function initializeTransaction(p: { email: string; amountKobo: number; reference: string; callbackUrl: string; applicationRef: string }) {
  return call<{ authorization_url: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: p.email,
      amount: p.amountKobo,
      currency: "NGN",
      reference: p.reference,
      callback_url: p.callbackUrl,
      metadata: { application_reference: p.applicationRef, purpose: "registration" },
    }),
  });
}

export const verifyTransaction = (reference: string) =>
  call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
