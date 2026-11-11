import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "sk_test_secret";
process.env.PAYSTACK_SECRET_KEY = SECRET;
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service";

const rpc = vi.fn();
const payment = { id: "p1", reference: "REF1", status: "pending", amount_kobo: 200000, application_id: "a1" };
const updates: unknown[] = [];
const builder = (data: unknown) => {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) b[m] = () => b;
  b.maybeSingle = async () => ({ data });
  b.single = async () => ({ data: { full_name: "A", email: "a@b.co", reference: "NDUM-APP-X" } });
  b.update = (v: unknown) => { updates.push(v); return b; };
  return b;
};
vi.mock("@/lib/supabase/server", () => ({
  adminClient: () => ({ from: (t: string) => builder(t === "payments" ? payment : null), rpc }),
}));

let paystackReply: Record<string, unknown>;
beforeEach(() => {
  rpc.mockReset(); updates.length = 0;
  rpc.mockResolvedValue({ data: "recorded", error: null });
  paystackReply = { id: 99, reference: "REF1", status: "success", amount: 200000, currency: "NGN", channel: "card", paid_at: "2026-01-01T00:00:00Z" };
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: true, data: paystackReply }), { status: 200 })));
});

const sign = (body: string) => createHmac("sha512", SECRET).update(body).digest("hex");
const post = async (body: string, sig: string | null) => {
  const { POST } = await import("@/app/api/paystack/webhook/route");
  return POST(new Request("http://x/api/paystack/webhook", { method: "POST", body, headers: sig ? { "x-paystack-signature": sig } : {} }));
};
const evt = JSON.stringify({ event: "charge.success", data: { reference: "REF1", amount: 999999999 } });

describe("paystack webhook", () => {
  it("rejects missing and forged signatures without touching the database", async () => {
    expect((await post(evt, null)).status).toBe(401);
    expect((await post(evt, "deadbeef")).status).toBe(401);
    expect((await post(evt, sign(evt + " "))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("records a genuinely verified payment using Paystack's amount, not the webhook's", async () => {
    const res = await post(evt, sign(evt));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_reference: "REF1", p_amount_kobo: 200000, p_currency: "NGN", p_txn_id: "99" });
  });
  it("does NOT record when a signed event claims success but Paystack says otherwise", async () => {
    for (const status of ["failed", "abandoned", "pending", "ongoing"]) {
      paystackReply.status = status; rpc.mockClear();
      await post(evt, sign(evt));
      expect(rpc).not.toHaveBeenCalled();
    }
  });
  it("does NOT record when Paystack returns a different reference", async () => {
    paystackReply.reference = "OTHER";
    await post(evt, sign(evt));
    expect(rpc).not.toHaveBeenCalled();
  });
  it("ignores unrelated events and malformed bodies", async () => {
    const other = JSON.stringify({ event: "transfer.success", data: { reference: "REF1" } });
    expect((await post(other, sign(other))).status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
    expect((await post("not json", sign("not json"))).status).toBe(400);
  });
  it("asks Paystack to retry (500) when verification itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 502 })));
    expect((await post(evt, sign(evt))).status).toBe(500);
    expect(rpc).not.toHaveBeenCalled();
  });
});
