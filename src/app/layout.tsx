import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Niger Delta Unity Movement (NDUM) — Unity • Empowerment • Development", template: "%s | NDUM" },
  description:
    "The Niger Delta Unity Movement is a proposed nonprofit, community-focused movement uniting the Niger Delta through education, enterprise, agriculture, sports, skills development and inclusive human empowerment.",
  openGraph: { type: "website", siteName: "Niger Delta Unity Movement", locale: "en_NG" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#123d2c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
