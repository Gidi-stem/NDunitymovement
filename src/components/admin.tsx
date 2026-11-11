import { Notice } from "@/components/ui";
import { STATUS_LABELS, type ApplicationStatus } from "@/lib/auth/rbac";

export function Flash({ msg, err, denied }: { msg?: string; err?: string; denied?: string }) {
  return (
    <>
      {denied && <div className="mb-4"><Notice tone="error">You do not have permission to open that page.</Notice></div>}
      {err && <div className="mb-4"><Notice tone="error">{err}</Notice></div>}
      {msg && <div className="mb-4"><Notice tone="success">{msg}</Notice></div>}
    </>
  );
}

const BADGE: Record<ApplicationStatus, string> = {
  submitted: "bg-blue-100 text-blue-900",
  pending_review: "bg-amber-100 text-amber-900",
  awaiting_correction: "bg-orange-100 text-orange-900",
  approved: "bg-green-100 text-green-900",
  declined: "bg-red-100 text-red-900",
};
export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`inline-block whitespace-nowrap px-2 py-0.5 text-xs font-semibold ${BADGE[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function AdminTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4">
      <h1 className="text-2xl font-semibold text-forest-900">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }) : "—";
