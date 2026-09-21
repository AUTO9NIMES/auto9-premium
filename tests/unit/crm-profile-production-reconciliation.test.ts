import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/046_crm_profile_production_reconciliation.sql",
  "utf8",
);

describe("046 CRM profile production reconciliation", () => {
  it("adds the runtime customer birthday field idempotently", () => {
    expect(sql).toMatch(
      /alter table public\.customers\s+add column if not exists birth_date date;/i,
    );
  });

  it("adds the canonical private vehicle photo path idempotently", () => {
    expect(sql).toMatch(
      /alter table public\.vehicles\s+add column if not exists photo_path text;/i,
    );
  });

  it("does not perpetuate the obsolete photo_url contract", () => {
    expect(sql).not.toMatch(/add column if not exists photo_url/i);
  });

  it("requires the vehicle photo bucket to remain private", () => {
    expect(sql).toMatch(
      /where id = 'crm-vehicle-photos'\s+and public = false/i,
    );
  });

  it("does not open storage access or mutate business rows", () => {
    expect(sql).not.toMatch(/\b(public\s*=\s*true|create policy|grant\s+.+\s+to\s+(anon|authenticated))\b/i);
    expect(sql).not.toMatch(/\b(insert|update|delete)\s+(into\s+|from\s+)?public\.(customers|vehicles)\b/i);
  });
});
