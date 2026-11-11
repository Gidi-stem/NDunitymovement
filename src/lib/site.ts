/**
 * Confirmed organisational details. Anything not yet confirmed is `null` so the UI shows
 * "to be added" instead of an invented value. Edit this file (or move it to the database) as
 * details are confirmed.
 */
export const site = {
  name: "Niger Delta Unity Movement",
  short: "NDUM",
  tagline: "UNITY • EMPOWERMENT • DEVELOPMENT",
  address: "33, Otiotio Off NDC Road",
  phone: "08034615933",
  email: null as string | null,
  website: null as string | null,
  social: {
    facebook: null as string | null,
    instagram: null as string | null,
    x: null as string | null,
    youtube: null as string | null,
    whatsapp: null as string | null,
  },
  /** Set once the exact location is confirmed, e.g. a Google Maps embed URL. */
  mapEmbedUrl: null as string | null,
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About NDUM" },
  { href: "/programmes", label: "Our Programmes" },
  { href: "/membership", label: "Membership" },
  { href: "/news", label: "News & Updates" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact Us" },
] as const;
