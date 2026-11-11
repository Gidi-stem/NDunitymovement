import { beforeAll, describe, expect, it } from "vitest";
import { IDS, asAnon, asService, asUser, createDb, insertApp, type Db } from "./helpers/db";

let db: Db;
let bayelsaYenagoa: string;
let bayelsaBrass: string;
let rivers: string;

beforeAll(async () => {
  db = await createDb();
  bayelsaYenagoa = await insertApp(db, { state: "Bayelsa", lga: "Yenagoa" });
  bayelsaBrass = await insertApp(db, { state: "Bayelsa", lga: "Brass" });
  rivers = await insertApp(db, { state: "Rivers", lga: "Port Harcourt" });
});

const count = async (table: string) =>
  Number((await db.query<{ n: string }>(`select count(*) n from public.${table}`)).rows[0].n);

describe("anonymous access", () => {
  it.each(["applications", "payments", "profiles", "audit_log", "contact_messages"])(
    "cannot read %s",
    async (t) => {
      await asAnon(db, async () => {
        await expect(db.query(`select * from public.${t}`)).rejects.toThrow(/permission denied/);
      });
    },
  );
  it("cannot insert applications directly", async () => {
    await asAnon(db, async () => {
      await expect(db.query("insert into public.applications (reference) values ('x')")).rejects.toThrow(/permission denied/);
    });
  });
  it("can read only the public fee settings", async () => {
    await asAnon(db, async () => {
      const r = await db.query<{ key: string }>("select key from public.settings order by key");
      expect(r.rows.map((x) => x.key)).toEqual(["fee_status", "id_card_fee_kobo", "payments_enabled", "registration_fee_kobo"]);
    });
  });
  it("can read only published posts and gallery items", async () => {
    await db.query("insert into public.posts (title, slug, status, published_at) values ('Draft one','draft-one','draft',null), ('Live one','live-one','published', now() - interval '1 day'), ('Future','future','published', now() + interval '1 day')");
    await asAnon(db, async () => {
      const r = await db.query<{ slug: string }>("select slug from public.posts");
      expect(r.rows.map((x) => x.slug)).toEqual(["live-one"]);
    });
  });
});

describe("jurisdiction-scoped reads", () => {
  it("super and national admins see everything", async () => {
    for (const uid of [IDS.super, IDS.national]) {
      await asUser(db, uid, async () => {
        const r = await db.query("select id from public.applications");
        expect(r.rows.length).toBe(3);
      });
    }
  });
  it("state coordinator sees only their state", async () => {
    await asUser(db, IDS.stateBayelsa, async () => {
      const r = await db.query<{ id: string }>("select id from public.applications");
      expect(r.rows.map((x) => x.id).sort()).toEqual([bayelsaBrass, bayelsaYenagoa].sort());
    });
    await asUser(db, IDS.stateRivers, async () => {
      const r = await db.query<{ id: string }>("select id from public.applications");
      expect(r.rows.map((x) => x.id)).toEqual([rivers]);
    });
  });
  it("LGA coordinator sees only their LGA (case-insensitive)", async () => {
    await asUser(db, IDS.lgaYenagoa, async () => {
      const r = await db.query<{ id: string }>("select id from public.applications");
      expect(r.rows.map((x) => x.id)).toEqual([bayelsaYenagoa]);
    });
  });
  it("an inactive admin sees nothing", async () => {
    await asUser(db, IDS.inactive, async () => {
      expect((await db.query("select id from public.applications")).rows.length).toBe(0);
    });
  });
  it("payments follow application scope", async () => {
    await db.query("insert into public.payments (application_id, reference, amount_kobo) values ($1,'PAY-R',200000), ($2,'PAY-B',200000)", [rivers, bayelsaYenagoa]);
    await asUser(db, IDS.stateRivers, async () => {
      const r = await db.query<{ reference: string }>("select reference from public.payments");
      expect(r.rows.map((x) => x.reference)).toEqual(["PAY-R"]);
    });
  });
  it("the access token hash is never readable by admins", async () => {
    await asUser(db, IDS.super, async () => {
      await expect(db.query("select access_token_hash from public.applications")).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from public.applications")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("no direct writes to applications / payments / audit", () => {
  it("authenticated admins cannot UPDATE or DELETE applications directly", async () => {
    await asUser(db, IDS.super, async () => {
      await expect(db.query("update public.applications set status='approved'")).rejects.toThrow(/permission denied/);
      await expect(db.query("delete from public.applications")).rejects.toThrow(/permission denied/);
    });
  });
  it("authenticated admins cannot write payments or audit_log", async () => {
    await asUser(db, IDS.super, async () => {
      await expect(db.query("update public.payments set status='success'")).rejects.toThrow(/permission denied/);
      await expect(db.query("insert into public.audit_log (action, entity) values ('x','y')")).rejects.toThrow(/permission denied/);
      await expect(db.query("delete from public.audit_log")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("review workflow RPC", () => {
  it("state coordinator cannot approve or decline, but can request a correction (with a note)", async () => {
    await asUser(db, IDS.stateBayelsa, async () => {
      await db.query("select public.review_application($1,'start_review')", [bayelsaBrass]);
      await expect(db.query("select public.review_application($1,'approve')", [bayelsaBrass])).rejects.toThrow(/cannot approve/);
      await expect(db.query("select public.review_application($1,'decline','no')", [bayelsaBrass])).rejects.toThrow(/cannot decline/);
      await expect(db.query("select public.review_application($1,'request_correction')", [bayelsaBrass])).rejects.toThrow(/note/);
      const r = await db.query<{ status: string }>("select (public.review_application($1,'request_correction','Add your ward')).status status", [bayelsaBrass]);
      expect(r.rows[0].status).toBe("awaiting_correction");
    });
  });
  it("cannot act outside jurisdiction", async () => {
    await asUser(db, IDS.stateBayelsa, async () => {
      await expect(db.query("select public.review_application($1,'start_review')", [rivers])).rejects.toThrow(/jurisdiction/);
    });
    await asUser(db, IDS.lgaYenagoa, async () => {
      await expect(db.query("select public.review_application($1,'start_review')", [bayelsaBrass])).rejects.toThrow(/jurisdiction/);
    });
  });
  it("anonymous users cannot call the RPC", async () => {
    await asAnon(db, async () => {
      await expect(db.query("select public.review_application($1,'start_review')", [rivers])).rejects.toThrow(/permission denied/);
    });
  });
  it("cannot approve before review; approval assigns a unique membership number", async () => {
    const a = await insertApp(db);
    const b = await insertApp(db);
    await asUser(db, IDS.officer, async () => {
      await expect(db.query("select public.review_application($1,'approve')", [a])).rejects.toThrow(/pending review/);
      for (const id of [a, b]) {
        await db.query("select public.review_application($1,'start_review')", [id]);
        await db.query("select public.review_application($1,'approve','ok')", [id]);
      }
    });
    const r = await db.query<{ membership_number: string; status: string; expires_on: string | null }>(
      "select membership_number, status, expires_on from public.applications where id in ($1,$2) order by membership_number", [a, b]);
    expect(r.rows[0].membership_number).toMatch(/^NDUM-\d{4}-\d{6}$/);
    expect(r.rows[0].membership_number).not.toBe(r.rows[1].membership_number);
    expect(r.rows.every((x) => x.status === "approved")).toBe(true);
    expect(r.rows[0].expires_on).toBeNull(); // no validity policy approved
  });
  it("approved applications cannot be declined; decline requires a reason", async () => {
    const a = await insertApp(db);
    await asUser(db, IDS.national, async () => {
      await expect(db.query("select public.review_application($1,'decline')", [a])).rejects.toThrow(/reason/);
      await db.query("select public.review_application($1,'start_review')", [a]);
      await db.query("select public.review_application($1,'approve')", [a]);
      await expect(db.query("select public.review_application($1,'decline','late')", [a])).rejects.toThrow(/cannot be declined/);
    });
  });
  it("blocks approval without a successful payment once payments are enabled", async () => {
    const a = await insertApp(db);
    await db.query("update public.settings set value='true'::jsonb where key='payments_enabled'");
    try {
      await asUser(db, IDS.national, async () => {
        await db.query("select public.review_application($1,'start_review')", [a]);
        await expect(db.query("select public.review_application($1,'approve')", [a])).rejects.toThrow(/not been paid/);
      });
      await db.query("insert into public.payments (application_id, reference, amount_kobo) values ($1,'PAY-OK',200000)", [a]);
      await asService(db, () => db.query("select public.record_payment_success('PAY-OK',200000,'NGN','txn-1','card',now())"));
      await asUser(db, IDS.national, async () => {
        const r = await db.query<{ status: string }>("select (public.review_application($1,'approve')).status status", [a]);
        expect(r.rows[0].status).toBe("approved");
      });
    } finally {
      await db.query("update public.settings set value='false'::jsonb where key='payments_enabled'");
    }
  });
  it("chapter assignment respects the caller's jurisdiction", async () => {
    const ch = await db.query<{ id: string }>("insert into public.chapters (name, kind, state) values ('Rivers State Chapter','state','Rivers') returning id");
    const own = await db.query<{ id: string }>("insert into public.chapters (name, kind, state) values ('Bayelsa State Chapter','state','Bayelsa') returning id");
    await asUser(db, IDS.stateBayelsa, async () => {
      await expect(db.query("select public.assign_chapter($1,$2)", [bayelsaYenagoa, ch.rows[0].id])).rejects.toThrow(/outside your jurisdiction/);
      await db.query("select public.assign_chapter($1,$2)", [bayelsaYenagoa, own.rows[0].id]);
    });
  });
});

describe("payments", () => {
  it("only the server (service role) may record a payment; browsers cannot", async () => {
    const a = await insertApp(db);
    await db.query("insert into public.payments (application_id, reference, amount_kobo) values ($1,'PAY-X',200000)", [a]);
    await asUser(db, IDS.super, async () => {
      await expect(db.query("select public.record_payment_success('PAY-X',200000,'NGN','t','card',now())")).rejects.toThrow(/permission denied/);
    });
    await asAnon(db, async () => {
      await expect(db.query("select public.record_payment_success('PAY-X',200000,'NGN','t','card',now())")).rejects.toThrow(/permission denied/);
    });
  });
  it("is idempotent, rejects amount mismatches and flags duplicates", async () => {
    const a = await insertApp(db);
    await db.query("insert into public.payments (application_id, reference, amount_kobo) values ($1,'P1',200000), ($1,'P2',200000), ($1,'P3',200000)", [a]);
    const call = (ref: string, amt: number, txn: string) =>
      asService(db, async () => (await db.query<{ r: string }>("select public.record_payment_success($1,$2,'NGN',$3,'card',now()) r", [ref, amt, txn])).rows[0].r);
    expect(await call("P1", 100, "t-a")).toBe("mismatch");
    expect((await db.query<{ status: string }>("select status from public.payments where reference='P1'")).rows[0].status).toBe("pending");
    expect(await call("P1", 200000, "t-a")).toBe("recorded");
    expect(await call("P1", 200000, "t-a")).toBe("already_recorded");
    expect(await call("P2", 200000, "t-b")).toBe("duplicate");
    expect((await db.query<{ status: string }>("select status from public.payments where reference='P2'")).rows[0].status).toBe("duplicate");
    const ok = await db.query("select 1 from public.payments where application_id=$1 and status='success'", [a]);
    expect(ok.rows.length).toBe(1);
    await expect(asService(db, () => db.query("select public.record_payment_success('NOPE',1,'NGN','t','c',now())"))).rejects.toThrow(/unknown payment reference/);
  });
  it("rejects non-positive amounts and duplicate references at the schema level", async () => {
    const a = await insertApp(db);
    await expect(db.query("insert into public.payments (application_id, reference, amount_kobo) values ($1,'Z',0)", [a])).rejects.toThrow();
    await db.query("insert into public.payments (application_id, reference, amount_kobo) values ($1,'DUP',1000)", [a]);
    await expect(db.query("insert into public.payments (application_id, reference, amount_kobo) values ($1,'DUP',1000)", [a])).rejects.toThrow(/unique/);
  });
});

describe("gallery safeguarding", () => {
  const ins = (consent: boolean, minors: boolean, safe: boolean, pub: boolean) =>
    db.query(`insert into public.gallery_items (title, media_path, media_type, consent_confirmed, contains_minors, safeguarding_approved, is_published)
              values ('Test photo','p.jpg','image',$1,$2,$3,$4)`, [consent, minors, safe, pub]);
  it("blocks publishing without consent", async () => {
    await expect(ins(false, false, false, true)).rejects.toThrow(/gallery_publish_requires_consent/);
  });
  it("blocks publishing images of minors without safeguarding approval", async () => {
    await expect(ins(true, true, false, true)).rejects.toThrow(/gallery_publish_requires_consent/);
    await ins(true, true, true, true);
    await ins(true, false, false, true);
    await ins(false, true, false, false); // unpublished drafts are fine
  });
});

describe("privilege escalation and audit", () => {
  it("a coordinator cannot change their own role", async () => {
    await asUser(db, IDS.stateBayelsa, async () => {
      await db.query("update public.profiles set role='super_admin' where id=$1", [IDS.stateBayelsa]);
    });
    const r = await db.query<{ role: string }>("select role from public.profiles where id=$1", [IDS.stateBayelsa]);
    expect(r.rows[0].role).toBe("state_coordinator");
  });
  it("non content-admins cannot change settings or categories", async () => {
    await asUser(db, IDS.officer, async () => {
      const r = await db.query("update public.settings set value='300000'::jsonb where key='registration_fee_kobo' returning key");
      expect(r.rows.length).toBe(0);
      await expect(db.query("insert into public.membership_categories (name) values ('Sneaky')")).rejects.toThrow(/row-level security/);
    });
    expect(Number((await db.query<{ v: string }>("select value #>> '{}' v from public.settings where key='registration_fee_kobo'")).rows[0].v)).toBe(200000);
  });
  it("national admin can change the fee; the change is audited with the actor", async () => {
    await asUser(db, IDS.national, async () => {
      await db.query("update public.settings set value='250000'::jsonb where key='registration_fee_kobo'");
    });
    await db.query("update public.settings set value='200000'::jsonb where key='registration_fee_kobo'");
    const a = await db.query<{ actor_label: string; details: { value: { to: number } } }>(
      "select actor_label, details from public.audit_log where action='settings.update' and entity_id='registration_fee_kobo' order by id limit 1");
    expect(a.rows[0].actor_label).toBe("Test National");
    expect(a.rows[0].details.value.to).toBe(250000);
  });
  it("only a super admin can read the audit log", async () => {
    await asUser(db, IDS.super, async () => {
      expect((await db.query("select 1 from public.audit_log")).rows.length).toBeGreaterThan(0);
    });
    for (const uid of [IDS.national, IDS.stateBayelsa, IDS.officer]) {
      await asUser(db, uid, async () => {
        expect((await db.query("select 1 from public.audit_log")).rows.length).toBe(0);
      });
    }
  });
  it("application audit rows contain workflow data but no personal data", async () => {
    const r = await db.query<{ details: Record<string, unknown> }>("select details from public.audit_log where action='application.updated' limit 20");
    expect(r.rows.length).toBeGreaterThan(0);
    const blob = JSON.stringify(r.rows);
    expect(blob).not.toMatch(/08000000000|@test\.local|Applicant \d/);
    expect(await count("audit_log")).toBeGreaterThan(5);
  });
});
