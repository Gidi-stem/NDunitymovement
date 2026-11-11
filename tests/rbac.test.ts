import { describe, expect, it } from "vitest";
import { availableActions, can, inScope, validateJurisdiction, ROLES, type Actor } from "@/lib/auth/rbac";

const a = (role: Actor["role"], state: string | null = null, lga: string | null = null) => ({ id: "x", fullName: "t", role, state, lga });

describe("permissions", () => {
  it("only the Super Administrator manages users and reads the audit log", () => {
    for (const r of ROLES) {
      expect(can(a(r), "users.manage")).toBe(r === "super_admin");
      expect(can(a(r), "audit.view")).toBe(r === "super_admin");
    }
  });
  it("coordinators cannot approve/decline or issue ID cards or change settings", () => {
    for (const r of ["state_coordinator", "lga_coordinator"] as const) {
      for (const p of ["applications.decide", "idcards.generate", "settings.manage", "categories.manage", "content.manage"] as const) expect(can(a(r), p)).toBe(false);
      expect(can(a(r), "applications.view")).toBe(true);
    }
  });
  it("officers and national admins can decide; null actor can do nothing", () => {
    expect(can(a("membership_officer"), "applications.decide")).toBe(true);
    expect(can(a("national_admin"), "settings.manage")).toBe(true);
    expect(can(null, "applications.view")).toBe(false);
  });
});

describe("jurisdiction", () => {
  it("national roles see everything", () => {
    expect(inScope(a("super_admin"), "Rivers", "X")).toBe(true);
    expect(inScope(a("national_admin"), "Rivers", null)).toBe(true);
  });
  it("state coordinator is limited to their state (case/space insensitive)", () => {
    expect(inScope(a("state_coordinator", "Bayelsa"), " bayelsa ", "Any")).toBe(true);
    expect(inScope(a("state_coordinator", "Bayelsa"), "Rivers", "Any")).toBe(false);
    expect(inScope(a("state_coordinator", null), "Bayelsa", null)).toBe(false);
  });
  it("LGA coordinator needs both state and LGA to match", () => {
    const c = a("lga_coordinator", "Bayelsa", "Yenagoa");
    expect(inScope(c, "Bayelsa", "yenagoa")).toBe(true);
    expect(inScope(c, "Bayelsa", "Brass")).toBe(false);
    expect(inScope(c, "Rivers", "Yenagoa")).toBe(false);
    expect(inScope(a("lga_coordinator", "Bayelsa", null), "Bayelsa", "Yenagoa")).toBe(false);
  });
  it("membership officer is national unless assigned", () => {
    expect(inScope(a("membership_officer"), "Rivers", "X")).toBe(true);
    expect(inScope(a("membership_officer", "Delta"), "Rivers", "X")).toBe(false);
  });
  it("requires jurisdiction fields for coordinators", () => {
    expect(validateJurisdiction("state_coordinator", null, null)).toBeTruthy();
    expect(validateJurisdiction("lga_coordinator", "Delta", null)).toBeTruthy();
    expect(validateJurisdiction("lga_coordinator", "Delta", "Warri")).toBeNull();
  });
});

describe("workflow", () => {
  it("offers sensible actions per status", () => {
    expect(availableActions("submitted")).toContain("start_review");
    expect(availableActions("pending_review")).toContain("approve");
    expect(availableActions("approved")).toEqual([]);
    expect(availableActions("declined")).toEqual([]);
  });
});
