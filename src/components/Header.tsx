"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { nav } from "@/lib/site";

export function Header({ logo }: { logo: React.ReactNode }) {
  // The menu is "open for" a specific path, so navigating elsewhere closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const pathname = usePathname();
  const open = openPath === pathname;

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="no-print sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-gold-500 focus:px-4 focus:py-2">
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
        <Link href="/" className="flex items-center gap-3" aria-label="NDUM home">
          {logo}
          <span className="leading-tight">
            <span className="block font-display text-lg font-bold text-forest-900">NDUM</span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-600 sm:block">Niger Delta Unity Movement</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={`whitespace-nowrap px-2.5 py-2 text-sm font-medium transition-colors hover:text-forest-700 ${active(item.href) ? "border-b-2 border-gold-500 text-forest-900" : "text-stone-700"}`}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/membership/apply" className="btn-gold btn-sm ml-3">Become a Member</Link>
        </nav>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center border border-stone-300 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpenPath(open ? null : pathname)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-stone-200 bg-white lg:hidden">
          <ul className="container-page flex flex-col py-3">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active(item.href) ? "page" : undefined}
                  className={`block border-l-4 px-3 py-3 text-base ${active(item.href) ? "border-gold-500 font-semibold text-forest-900" : "border-transparent text-stone-700"}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="px-3 pt-3">
              <Link href="/membership/apply" className="btn-gold w-full">Become a Member</Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
