import { NextResponse, type NextRequest } from "next/server";
import { getActor } from "@/lib/auth/session";
import { can, STATUSES } from "@/lib/auth/rbac";
import { sessionClient } from "@/lib/supabase/server";
import { APPLICATION_COLUMNS, safeSearch } from "@/lib/admin/columns";
import { toCsv } from "@/lib/csv";
import { logAudit } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";
const MAX_ROWS = 20000;

const HEADERS = ["Membership number", "Reference", "Status", "Full name", "Preferred name", "Phone", "Email", "Date of birth", "Sex", "State of residence", "LGA", "Ward", "Community", "State of origin", "Occupation", "Preferred chapter state", "LGA chapter", "Ward unit", "Chapter", "Category", "Areas of interest", "Next of kin", "Next of kin phone", "Submitted", "Approved", "Expires"];

export async function GET(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return new NextResponse("Unauthorized", { status: 401 });
  if (!can(actor, "records.export")) return new NextResponse("Forbidden", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const supabase = await sessionClient(); // RLS limits rows to the actor's jurisdiction
  let q = supabase.from("applications").select(APPLICATION_COLUMNS).order("submitted_at", { ascending: false }).limit(MAX_ROWS);
  // Default export = approved membership records, per the requirement; other statuses must be asked for explicitly.
  const status = sp.get("status") ?? "approved";
  if ((STATUSES as string[]).includes(status)) q = q.eq("status", status);
  if (sp.get("state")) q = q.eq("scope_state", sp.get("state")!);
  if (sp.get("lga")) q = q.ilike("scope_lga", safeSearch(sp.get("lga")!).replace(/[%_]/g, ""));
  const chapter = sp.get("chapter");
  if (chapter && /^[0-9a-f-]{36}$/i.test(chapter)) q = q.eq("chapter_id", chapter);
  const text = safeSearch(sp.get("q") ?? "");
  if (text) q = q.or(["full_name", "email", "phone", "reference", "membership_number"].map((c) => `${c}.ilike.%${text}%`).join(","));

  const [{ data, error }, { data: chapters }, { data: cats }] = await Promise.all([
    q,
    supabase.from("chapters").select("id, name"),
    supabase.from("membership_categories").select("id, name"),
  ]);
  if (error) return new NextResponse("Export failed", { status: 500 });
  const chName = new Map(chapters?.map((c) => [c.id, c.name]));
  const catName = new Map(cats?.map((c) => [c.id, c.name]));

  const rows = (data ?? []).map((a) => [
    a.membership_number, a.reference, a.status, a.full_name, a.preferred_name, a.phone, a.email, a.date_of_birth, a.sex,
    a.state_of_residence, a.lga, a.ward, a.community, a.state_of_origin, a.occupation, a.preferred_chapter_state, a.lga_chapter, a.ward_unit,
    a.chapter_id ? chName.get(a.chapter_id) : "", a.category_id ? catName.get(a.category_id) : "",
    [...(a.areas_of_interest ?? []), a.areas_other].filter(Boolean), a.next_of_kin_name, a.next_of_kin_phone,
    a.submitted_at, a.approved_at, a.expires_on,
  ]);
  await logAudit(actor, "records.export", "applications", null, { rows: rows.length, status, filters: Object.fromEntries(sp.entries()) });

  // UTF-8 CSV with a BOM: Excel opens it natively, so no separate (fragile) XLS writer is needed.
  const file = `ndum-members-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(toCsv(HEADERS, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
