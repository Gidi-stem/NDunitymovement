import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { sessionClient } from "@/lib/supabase/server";
import { AdminTitle, Flash, fmtDate } from "@/components/admin";
import { setHandled } from "./actions";

export const metadata: Metadata = { title: "Contact messages" };

export default async function Messages({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  await requirePermission("inbox.view");
  const { data } = await (await sessionClient()).from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <AdminTitle title="Contact messages" />
      <Flash msg={sp.msg} err={sp.err} />
      <ul className="max-w-3xl space-y-4">
        {data?.map((m) => (
          <li key={m.id} className={`border bg-white p-5 ${m.is_handled ? "border-stone-200 opacity-70" : "border-forest-300"}`}>
            <div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{m.name}</strong><span className="text-stone-500">{fmtDate(m.created_at)}</span></div>
            <p className="text-sm text-stone-600">{[m.email, m.phone].filter(Boolean).join(" · ")}</p>
            <p className="mt-3 whitespace-pre-line">{m.message}</p>
            <form action={setHandled} className="mt-3"><input type="hidden" name="id" value={m.id} /><input type="hidden" name="handled" value={m.is_handled ? "0" : "1"} /><button className="underline text-sm">{m.is_handled ? "Mark as unhandled" : "Mark as handled"}</button></form>
          </li>
        ))}
        {data?.length === 0 && <li className="text-stone-500">No messages yet.</li>}
      </ul>
    </>
  );
}
