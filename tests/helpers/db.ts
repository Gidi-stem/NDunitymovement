import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS = path.join(process.cwd(), "supabase", "migrations");

export const IDS = {
  super: "00000000-0000-0000-0000-000000000001",
  national: "00000000-0000-0000-0000-000000000002",
  stateBayelsa: "00000000-0000-0000-0000-000000000003",
  lgaYenagoa: "00000000-0000-0000-0000-000000000004",
  officer: "00000000-0000-0000-0000-000000000005",
  stateRivers: "00000000-0000-0000-0000-000000000006",
  inactive: "00000000-0000-0000-0000-000000000007",
} as const;

/** Creates an in-memory Postgres with a minimal Supabase-compatible `auth` schema and runs the real migrations. */
export async function createDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
  for (const f of ["0001_schema.sql", "0002_security.sql", "0003_seed.sql"]) {
    await db.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
  }
  const users: [string, string, string, string | null, string | null, boolean][] = [
    [IDS.super, "Test Super", "super_admin", null, null, true],
    [IDS.national, "Test National", "national_admin", null, null, true],
    [IDS.stateBayelsa, "Test State Bayelsa", "state_coordinator", "Bayelsa", null, true],
    [IDS.lgaYenagoa, "Test LGA Yenagoa", "lga_coordinator", "Bayelsa", "Yenagoa", true],
    [IDS.officer, "Test Officer", "membership_officer", null, null, true],
    [IDS.stateRivers, "Test State Rivers", "state_coordinator", "Rivers", null, true],
    [IDS.inactive, "Test Inactive", "super_admin", null, null, false],
  ];
  for (const [id, name, role, state, lga, active] of users) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@test.local`]);
    await db.query(
      "insert into public.profiles (id, full_name, role, state, lga, is_active) values ($1,$2,$3,$4,$5,$6)",
      [id, name, role, state, lga, active],
    );
  }
  return db;
}
export type Db = Awaited<ReturnType<typeof createDb>>;

/** Run `fn` as an authenticated Supabase user (RLS applies). */
export async function asUser<T>(db: Db, uid: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
export async function asAnon<T>(db: Db, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
}
export async function asService<T>(db: Db, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
}

let counter = 0;
export async function insertApp(
  db: Db,
  o: Partial<{ state: string; lga: string; status: string; name: string }> = {},
) {
  counter += 1;
  const state = o.state ?? "Bayelsa";
  const lga = o.lga ?? "Yenagoa";
  const res = await db.query<{ id: string }>(
    `insert into public.applications
      (reference, status, full_name, phone, email, state_of_residence, lga, ward, community, occupation,
       preferred_chapter_state, declaration_accuracy, declaration_constitution, declaration_rules,
       declaration_no_guarantee, privacy_ack, consent_processing, signature_name, declaration_date,
       access_token_hash)
     values ($1,$2,$3,'08000000000',$4,$5,$6,'Ward 1','Community','Trader',$5,true,true,true,true,true,true,$3,current_date,'hash')
     returning id`,
    [`NDUM-T${counter}`, o.status ?? "submitted", o.name ?? `Applicant ${counter}`, `a${counter}@test.local`, state, lga],
  );
  return res.rows[0].id;
}
