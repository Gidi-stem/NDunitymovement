import Link from "next/link";

export function SectionHeading({ eyebrow, title, children, center = false, light = false }: {
  eyebrow?: string; title: string; children?: React.ReactNode; center?: boolean; light?: boolean;
}) {
  return (
    <div className={`mb-10 max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className={`eyebrow ${light ? "!text-gold-400" : ""}`}>{eyebrow}</p>}
      <h2 className={`mt-2 text-3xl font-semibold leading-tight sm:text-4xl ${light ? "text-white" : "text-forest-900"}`}>{title}</h2>
      <span className={`rule-gold mt-4 ${center ? "mx-auto" : ""}`} />
      {children && <div className={`mt-5 text-lg ${light ? "text-forest-100" : "text-stone-700"}`}>{children}</div>}
    </div>
  );
}

export function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-forest-900 text-white">
      <DeltaPattern className="absolute inset-0 h-full w-full opacity-[0.07]" />
      <div className="container-page relative py-16 sm:py-24">
        {eyebrow && <p className="eyebrow !text-gold-400">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
        <span className="rule-gold mt-5" />
        {children && <div className="mt-5 max-w-2xl text-lg text-forest-100">{children}</div>}
      </div>
    </section>
  );
}

/** Abstract distributary-channel motif referencing the Niger Delta's waterways. Decorative only. */
export function DeltaPattern({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <g stroke="#fff">
        <path d="M400 -10 C 400 90, 395 140, 380 200 S 300 300, 250 380 S 190 470, 160 520" />
        <path d="M380 200 C 400 260, 430 300, 480 350 S 560 440, 590 520" />
        <path d="M400 -10 C 410 80, 470 120, 540 170 S 660 240, 720 330 S 780 440, 800 500" />
        <path d="M540 170 C 520 230, 500 280, 480 350" />
        <path d="M250 380 C 300 410, 340 440, 360 520" />
        <path d="M400 -10 C 390 70, 330 100, 270 150 S 150 230, 90 300 S 20 420, 0 470" />
        <path d="M270 150 C 300 200, 330 230, 380 200" />
        <path d="M90 300 C 140 340, 190 380, 250 380" />
        <path d="M720 330 C 690 380, 650 420, 590 470" />
      </g>
    </svg>
  );
}

export function LinkButton(props: React.ComponentProps<typeof Link> & { variant?: "primary" | "gold" | "outline" | "outline-light" }) {
  const { variant = "primary", className = "", ...rest } = props;
  return <Link {...rest} className={`btn-${variant} ${className}`} />;
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warn" | "success" | "error"; title?: string; children: React.ReactNode }) {
  const tones = {
    info: "border-navy-700 bg-blue-50 text-navy-900",
    warn: "border-gold-500 bg-amber-50 text-amber-950",
    success: "border-forest-600 bg-forest-50 text-forest-900",
    error: "border-red-600 bg-red-50 text-red-900",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "note"} className={`border-l-4 p-4 text-sm ${tones[tone]}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

/** Photograph slot: real image if supplied, else a quiet on-brand placeholder. */
export function ImageSlot({ src, alt, label, className = "" }: { src: string | null; alt: string; label: string; className?: string }) {
  if (src) {
    return <img src={src} alt={alt} className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`relative flex h-full min-h-48 w-full items-end bg-forest-800 ${className}`} role="img" aria-label={`${label} (photograph to be supplied)`}>
      <DeltaPattern className="absolute inset-0 h-full w-full text-white opacity-10" />
      <span className="relative m-3 bg-forest-950/70 px-2 py-1 text-xs text-forest-200">Photograph to be supplied — {label}</span>
    </div>
  );
}
