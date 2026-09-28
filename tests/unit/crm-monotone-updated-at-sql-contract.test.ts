import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const directory = resolve(process.cwd(), "supabase/migrations");
const migration = "20260928024642_monotone_updated_at.sql";
const sql = readFileSync(resolve(directory, migration), "utf8");

describe("monotone updated_at architecture contract (runtime evidence is separate)", () => {
  it("is the effective additive trigger definition after both preserved staged migrations", () => {
    const definitions = readdirSync(directory).filter(name => name.endsWith(".sql"))
      .sort().filter(name => /create or replace function public\.set_updated_at\(\)/i.test(readFileSync(resolve(directory, name), "utf8")));
    expect(definitions.at(-1)).toBe(migration);
    expect(migration > "20260926230000_update_v2_dossier_atomically.sql").toBe(true);
    expect(migration > "20260928013000_manual_intake_replay_ownership.sql").toBe(true);
  });

  it("advances the locked row version even when clocks are equal or move backwards", () => {
    expect(sql).toMatch(/new\.updated_at := greatest\(\s*clock_timestamp\(\), old\.updated_at \+ interval '1 microsecond'\s*\)/);
    expect(sql).not.toMatch(/new\.updated_at\s*:?=\s*(now|transaction_timestamp)\(/);
  });

  it("fails closed for unsupported precision, trigger bindings and nonfinite old versions", () => {
    expect(sql).toContain("a.atttypmod not in (-1, 6)");
    expect(sql).toContain("t.tgtype <> 19");
    expect(sql).toContain("tg_op <> 'UPDATE'");
    expect(sql).toContain("old.updated_at is null");
    expect(sql).toContain("not isfinite(old.updated_at)");
    expect(sql).toContain("errcode = '22008'");
  });

  it("does not elevate privileges, rewrite data, change RPCs or recreate triggers", () => {
    expect(sql).toContain("security invoker");
    expect(sql).toContain("set search_path = pg_catalog");
    expect(sql).not.toMatch(/security definer|create trigger|drop trigger|update public\.|delete from|alter table|grant /i);
    expect(sql.match(/create or replace function/g)).toHaveLength(1);
    expect(sql.trim()).toMatch(/^begin;[\s\S]*commit;$/);
  });
});
