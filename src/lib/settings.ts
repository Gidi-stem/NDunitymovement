import "server-only";
import { publicClient, adminClient } from "@/lib/supabase/server";
import { isAdminClientConfigured } from "@/lib/env";

export interface PublicSettings {
  registrationFeeKobo: number;
  feeStatus: "proposed" | "approved";
  idCardFeeKobo: number | null;
  paymentsEnabled: boolean;
}

/** Safe defaults used when the database is unreachable: ₦2,000 shown as PROPOSED, payments OFF. */
export const DEFAULT_SETTINGS: PublicSettings = {
  registrationFeeKobo: 200000,
  feeStatus: "proposed",
  idCardFeeKobo: null,
  paymentsEnabled: false,
};

function parse(rows: { key: string; value: unknown }[]): PublicSettings {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const fee = Number(m.get("registration_fee_kobo"));
  const idc = m.get("id_card_fee_kobo");
  return {
    registrationFeeKobo: Number.isInteger(fee) && fee > 0 ? fee : DEFAULT_SETTINGS.registrationFeeKobo,
    feeStatus: m.get("fee_status") === "approved" ? "approved" : "proposed",
    idCardFeeKobo: typeof idc === "number" && idc > 0 ? idc : null,
    paymentsEnabled: m.get("payments_enabled") === true,
  };
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const db = publicClient();
  if (!db) return DEFAULT_SETTINGS;
  try {
    const { data, error } = await db.from("settings").select("key, value");
    if (error || !data) return DEFAULT_SETTINGS;
    return parse(data);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Authoritative read for payment initialisation (service role: never trust a client-supplied amount). */
export async function getSettingsForPayment(): Promise<PublicSettings> {
  if (!isAdminClientConfigured()) return DEFAULT_SETTINGS;
  const { data } = await adminClient().from("settings").select("key, value");
  return data ? parse(data) : DEFAULT_SETTINGS;
}
