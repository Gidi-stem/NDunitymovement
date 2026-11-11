import { describe, expect, it } from "vitest";
import { membershipSchema, formDataToRaw, zodErrors, contactSchema } from "@/lib/validation/membership";
import { toCsv } from "@/lib/csv";
import { sniff } from "@/lib/admin/upload";
import { hashToken, newAccessToken, newApplicationReference, tokenMatches } from "@/lib/tokens";

const valid = (): Record<string, string | string[]> => ({
  full_name: "Ebi  Tonye", phone: "0803 461 5933", email: "EBI@Example.org", state_of_residence: "Bayelsa", lga: "Yenagoa", ward: "3",
  community: "Otiotio", occupation: "Teacher", preferred_chapter_state: "Bayelsa", category_id: "11111111-1111-4111-8111-111111111111",
  areas_of_interest: ["Agriculture"], declaration_accuracy: "on", declaration_constitution: "on", declaration_rules: "on",
  declaration_no_guarantee: "on", privacy_ack: "on", consent_processing: "on", signature_name: "ebi tonye",
});

describe("membership schema", () => {
  it("accepts a valid application and normalises values", () => {
    const r = membershipSchema.safeParse(valid());
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.email).toBe("ebi@example.org"); expect(r.data.phone).toBe("08034615933"); expect(r.data.full_name).toBe("Ebi Tonye"); expect(r.data.date_of_birth).toBeNull(); }
  });
  it.each(["declaration_accuracy", "declaration_constitution", "declaration_rules", "declaration_no_guarantee", "privacy_ack", "consent_processing"])("rejects when %s is not affirmed", (k) => {
    const v = valid(); delete v[k];
    const r = membershipSchema.safeParse(v);
    expect(r.success).toBe(false);
    if (!r.success) expect(zodErrors(r.error)[k]).toBeTruthy();
  });
  it("requires the signature to match the full name", () => {
    expect(membershipSchema.safeParse({ ...valid(), signature_name: "Someone Else" }).success).toBe(false);
  });
  it("rejects bad phone, email, state and empty interests", () => {
    for (const bad of [{ phone: "abc" }, { email: "nope" }, { state_of_residence: "Atlantis" }, { areas_of_interest: [] }, { category_id: "x" }]) {
      expect(membershipSchema.safeParse({ ...valid(), ...bad }).success).toBe(false);
    }
  });
  it("requires 'Other' text when Other is selected, and future birth dates are rejected", () => {
    expect(membershipSchema.safeParse({ ...valid(), areas_of_interest: ["Other"] }).success).toBe(false);
    expect(membershipSchema.safeParse({ ...valid(), date_of_birth: "2999-01-01" }).success).toBe(false);
  });
  it("does not require NIN or bank details (and has no such fields)", () => {
    const keys = Object.keys(membershipSchema.shape);
    expect(keys.some((k) => /nin|bank|account|bvn/i.test(k))).toBe(false);
  });
  it("maps FormData with repeated checkboxes", () => {
    const fd = new FormData(); fd.append("areas_of_interest", "Agriculture"); fd.append("areas_of_interest", "Volunteering"); fd.append("full_name", "A");
    expect(formDataToRaw(fd).areas_of_interest).toEqual(["Agriculture", "Volunteering"]);
  });
});

describe("contact schema", () => {
  it("needs email or phone", () => {
    expect(contactSchema.safeParse({ name: "Ann", message: "Hello there, please call" }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Ann", message: "Hello there, please call", phone: "08012345678" }).success).toBe(true);
  });
});

describe("csv", () => {
  it("neutralises spreadsheet formulas and escapes quotes/newlines", () => {
    const out = toCsv(["a"], [["=HYPERLINK(\"x\")"], ["+1"], ['say "hi", ok'], [["x", "y"]]]);
    expect(out).toContain("'=HYPERLINK");
    expect(out).toContain("'+1");
    expect(out).toContain('"say ""hi"", ok"');
    expect(out).toContain("x; y");
    expect(out.startsWith("﻿")).toBe(true);
  });
});

describe("upload sniffing", () => {
  it("identifies real types from magic bytes and rejects others", () => {
    expect(sniff(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))?.mime).toBe("image/jpeg");
    expect(sniff(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))?.mime).toBe("image/png");
    expect(sniff(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
    expect(sniff(new TextEncoder().encode("%PDF-1.7 something"))).toBeNull();
  });
});

describe("tokens", () => {
  it("verifies only the matching token", () => {
    const t = newAccessToken();
    expect(tokenMatches(t, hashToken(t))).toBe(true);
    expect(tokenMatches(t + "x", hashToken(t))).toBe(false);
    expect(tokenMatches("", hashToken(t))).toBe(false);
    expect(newApplicationReference()).toMatch(/^NDUM-APP-[A-Z2-9]{8}$/);
  });
});
