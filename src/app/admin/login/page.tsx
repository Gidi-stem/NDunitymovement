import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { getActor } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Administrator sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getActor()) redirect("/admin");
  return (
    <div className="flex min-h-screen items-center justify-center bg-forest-950 px-5">
      <div className="w-full max-w-sm bg-white p-8">
        <div className="mb-6 flex items-center gap-3"><Logo /><div><p className="font-display text-xl font-bold text-forest-900">NDUM</p><p className="text-xs uppercase tracking-wider text-stone-500">Administration</p></div></div>
        <LoginForm />
        <p className="mt-6 text-xs text-stone-500">Authorised administrators only. Activity is logged.</p>
      </div>
    </div>
  );
}
