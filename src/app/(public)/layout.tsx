import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header logo={<Logo />} />
      <main id="main" className="flex-1">{children}</main>
      <Footer logo={<Logo light />} />
    </>
  );
}
