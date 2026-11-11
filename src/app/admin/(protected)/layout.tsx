import Link from "next/link";
import { requireActor } from "@/lib/auth/session";
import { can, ROLE_LABELS, type Permission } from "@/lib/auth/rbac";
import { signOut } from "@/app/admin/login/actions";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Administration", template: "%s | NDUM Admin" }, robots: { index: false, follow: false } };

const LINKS: { href: string; label: string; perm: Permission }[] = [
  { href: "/admin", label: "Overview", perm: "applications.view" },
  { href: "/admin/applications", label: "Applications", perm: "applications.view" },
  { href: "/admin/reports", label: "Reports", perm: "reports.view" },
  { href: "/admin/news", label: "News & updates", perm: "content.manage" },
  { href: "/admin/gallery", label: "Gallery", perm: "content.manage" },
  { href: "/admin/leadership", label: "Leadership", perm: "content.manage" },
  { href: "/admin/messages", label: "Contact messages", perm: "inbox.view" },
  { href: "/admin/settings", label: "Fees & settings", perm: "settings.manage" },
  { href: "/admin/categories", label: "Categories & chapters", perm: "categories.manage" },
  { href: "/admin/users", label: "Administrators", perm: "users.manage" },
  { href: "/admin/audit", label: "Audit log", perm: "audit.view" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  const jurisdiction = [actor.state, actor.lga].filter(Boolean).join(" / ");
  return (
    <div className="min-h-screen bg-stone-100 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="no-print bg-forest-950 text-forest-100 lg:min-h-screen">
        <div className="flex items-center gap-3 border-b border-forest-800 p-4"><Logo light size={34} /><span className="font-display text-lg font-bold text-white">NDUM Admin</span></div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-1">
          {LINKS.filter((l) => can(actor, l.perm)).map((l) => (
            <Link key={l.href} href={l.href} className="block whitespace-nowrap px-3 py-2 text-sm hover:bg-forest-800 hover:text-white">{l.label}</Link>
          ))}
        </nav>
        <div className="hidden border-t border-forest-800 p-4 text-xs lg:block">
          <p className="font-semibold text-white">{actor.fullName}</p>
          <p>{ROLE_LABELS[actor.role]}</p>
          {jurisdiction && <p className="text-forest-300">{jurisdiction}</p>}
          <form action={signOut} className="mt-3"><button className="underline hover:text-white">Sign out</button></form>
          <Link href="/" className="mt-2 block underline hover:text-white">View public site</Link>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="no-print flex items-center justify-between border-b border-stone-200 bg-white px-5 py-3 text-sm lg:hidden">
          <span>{actor.fullName} · {ROLE_LABELS[actor.role]}</span>
          <form action={signOut}><button className="underline">Sign out</button></form>
        </div>
        <main className="p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
