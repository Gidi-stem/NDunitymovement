import { NextResponse } from "next/server";
import { isAdminClientConfigured } from "@/lib/env";
import { paystackConfigured, verifyWebhookSignature } from "@/lib/paystack";
import { settlePayment } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Paystack webhook. Steps: (1) verify the HMAC-SHA512 signature over the RAW body, (2) take only the
 * reference from the event, (3) re-verify the transaction with Paystack, (4) record via the DB
 * function which re-checks reference/amount/currency and is idempotent. Responds 200 for handled
 * events so Paystack stops retrying; non-200 only when we want a retry.
 */
export async function POST(request: Request) {
  if (!paystackConfigured() || !isAdminClientConfigured()) {
    return NextResponse.json({ error: "payments not configured" }, { status: 503 });
  }
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }
  const reference = event.data?.reference;
  if (!reference || (event.event !== "charge.success" && event.event !== "charge.failed")) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  const result = await settlePayment(reference);
  // transient verification problems → 500 so Paystack retries
  if (result === "error") return NextResponse.json({ error: "verification failed" }, { status: 500 });
  return NextResponse.json({ ok: true, result });
}
