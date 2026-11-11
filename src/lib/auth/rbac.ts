/**
 * Role-based access control — pure and unit-tested. The same matrix and jurisdiction rules are
 * enforced again by Postgres Row-Level Security (supabase/migrations/0002_security.sql), so a bug
 * here cannot by itself leak data. Keep the two in sync.
 */
export const ROLES = ["super_admin", "national_admin", "state_coordinator", "lga_coordinator", "membership_officer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Administrator",
  national_admin: "National Administrator",
  state_coordinator: "State Coordinator",
  lga_coordinator: "LGA Coordinator",
  membership_officer: "Membership Officer",
};

export const PERMISSIONS = [
  "applications.view",
  "applications.review", // start review / request correction
  "applications.decide", // approve / decline (issues membership numbers)
  "applications.assign_chapter",
  "applications.edit_photo",
  "payments.view",
  "records.export",
  "reports.view",
  "idcards.generate",
  "categories.manage",
  "chapters.manage",
  "settings.manage",
  "content.manage", // news, gallery, leadership
  "inbox.view",
  "users.manage",
  "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const COORDINATOR: Permission[] = [
  "applications.view", "applications.review", "applications.assign_chapter",
  "payments.view", "records.export", "reports.view",
];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  super_admin: new Set(PERMISSIONS),
  national_admin: new Set(PERMISSIONS.filter((p) => p !== "users.manage" && p !== "audit.view")),
  state_coordinator: new Set(COORDINATOR),
  lga_coordinator: new Set(COORDINATOR),
  membership_officer: new Set<Permission>([
    ...COORDINATOR, "applications.decide", "applications.edit_photo", "idcards.generate",
  ]),
};

export interface Actor {
  id: string;
  role: Role;
  fullName: string;
  state: string | null;
  lga: string | null;
}

export const can = (actor: Pick<Actor, "role"> | null | undefined, permission: Permission): boolean =>
  !!actor && ROLE_PERMISSIONS[actor.role]?.has(permission) === true;

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

/** Jurisdiction check — mirrors public.can_access_scope(). */
export function inScope(actor: Pick<Actor, "role" | "state" | "lga">, state: string | null, lga: string | null): boolean {
  switch (actor.role) {
    case "super_admin":
    case "national_admin":
      return true;
    case "state_coordinator":
      return !!actor.state && norm(actor.state) === norm(state);
    case "lga_coordinator":
      return !!actor.state && !!actor.lga && norm(actor.state) === norm(state) && norm(actor.lga) === norm(lga);
    case "membership_officer":
      return (!actor.state || norm(actor.state) === norm(state)) && (!actor.lga || norm(actor.lga) === norm(lga));
    default:
      return false;
  }
}

/** Valid jurisdiction fields for a role (used when creating admin users). */
export function validateJurisdiction(role: Role, state: string | null, lga: string | null): string | null {
  if (role === "state_coordinator" && !state) return "A state is required for State Coordinators.";
  if (role === "lga_coordinator" && (!state || !lga)) return "State and LGA are required for LGA Coordinators.";
  return null;
}

export type ReviewAction = "start_review" | "request_correction" | "approve" | "decline";
export const REVIEW_ACTION_PERMISSION: Record<ReviewAction, Permission> = {
  start_review: "applications.review",
  request_correction: "applications.review",
  approve: "applications.decide",
  decline: "applications.decide",
};

export const STATUS_LABELS = {
  submitted: "Submitted",
  pending_review: "Pending Review",
  awaiting_correction: "Awaiting Correction",
  approved: "Approved",
  declined: "Declined",
} as const;
export type ApplicationStatus = keyof typeof STATUS_LABELS;
export const STATUSES = Object.keys(STATUS_LABELS) as ApplicationStatus[];

/** Which review actions are meaningful from a given status. */
export function availableActions(status: ApplicationStatus): ReviewAction[] {
  switch (status) {
    case "submitted": return ["start_review", "request_correction", "decline"];
    case "pending_review": return ["approve", "request_correction", "decline"];
    case "awaiting_correction": return ["decline"];
    default: return [];
  }
}
