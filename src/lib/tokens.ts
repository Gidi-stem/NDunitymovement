import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const newAccessToken = () => randomBytes(24).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function tokenMatches(token: string, expectedHash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(expectedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Human-friendly, unambiguous application reference, e.g. NDUM-APP-7K3Q9XF2 */
export function newApplicationReference(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(8);
  return "NDUM-APP-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function newPaymentReference(): string {
  return "NDUMPAY" + Date.now().toString(36).toUpperCase() + randomBytes(5).toString("hex").toUpperCase();
}
