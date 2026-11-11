import Link from "next/link";
import { nav, site } from "@/lib/site";

export function Footer({ logo }: { logo: React.ReactNode }) {
  const socials = Object.entries(site.social).filter(([, url]) => !!url) as [string, string][];
  return (
    <footer className="no-print bg-forest-950 text-forest-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            {logo}
            <span className="font-display text-xl font-bold text-white">NDUM</span>
          </div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-gold-400">{site.tagline}</p>
          <p className="mt-4 max-w-xs text-sm text-forest-200">
            Niger Delta Unity Movement is a proposed nonprofit, community-focused movement. It is not a political party or campaign.
          </p>
        </div>
        <nav aria-label="Footer">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Explore</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {nav.map((n) => (
              <li key={n.href}><Link href={n.href} className="hover:text-white">{n.label}</Link></li>
            ))}
            <li><Link href="/structure" className="hover:text-white">Organisational Structure</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy Notice</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Contact</h2>
          <address className="mt-4 space-y-2 text-sm not-italic">
            <p>{site.address}</p>
            <p><a href={`tel:${site.phone}`} className="hover:text-white">{site.phone}</a></p>
            <p>{site.email ? <a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a> : <span className="text-forest-300">Email: to be added</span>}</p>
          </address>
          {socials.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3 text-sm">
              {socials.map(([k, url]) => (
                <li key={k}><a href={url} rel="noopener noreferrer" target="_blank" className="capitalize underline hover:text-white">{k}</a></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-forest-800">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-forest-300 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Niger Delta Unity Movement (NDUM). All rights reserved.</p>
          <p>NDUM is being established as a nonprofit organisation. Registration and approvals will be announced when completed.</p>
        </div>
      </div>
    </footer>
  );
}
