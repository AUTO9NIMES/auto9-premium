import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/045_crm_subscription_production_reconciliation.sql",
  ),
  "utf8",
).replace(/\s+/g, " ");

describe("CRM subscription production reconciliation", () => {
  it("restores private booking schema", () => {
    expect(sql).toMatch(
      /add column if not exists booking_token uuid not null default gen_random_uuid\(\)/i,
    );
    expect(sql).toMatch(
      /create table if not exists public\.crm_subscription_booking_requests/i,
    );
  });

  it("keeps direct client roles closed and grants service role DML", () => {
    for (const table of [
      "crm_subscriptions",
      "crm_subscription_booking_requests",
    ]) {
      expect(sql).toMatch(
        new RegExp(`revoke all on table public\\.${table} from anon`, "i"),
      );
      expect(sql).toMatch(
        new RegExp(`revoke all on table public\\.${table} from authenticated`, "i"),
      );
      expect(sql).toMatch(
        new RegExp(
          `grant select, insert, update, delete on table public\\.${table} to service_role`,
          "i",
        ),
      );
    }
  });

  it("creates the vehicle photo bucket directly private", () => {
    expect(sql).toMatch(
      /'crm-vehicle-photos', 'crm-vehicle-photos', false, 8388608/i,
    );
    expect(sql).toMatch(/set public = false/i);
    expect(sql).toMatch(/image\/jpeg/i);
    expect(sql).toMatch(/image\/png/i);
    expect(sql).toMatch(/image\/webp/i);
  });

  it("preserves tenant identity hardening", () => {
    expect(sql).toMatch(
      /foreign key \(business_id, customer_id\) references public\.customers \(business_id, id\) on delete cascade/i,
    );
    expect(sql).toMatch(
      /unique \(business_id, customer_id, id\)/i,
    );
    expect(sql).toMatch(
      /foreign key \(business_id, customer_id, subscription_id\) references public\.crm_subscriptions \(business_id, customer_id, id\) on delete cascade/i,
    );
  });

  it("runs identity preflight before constraint reconciliation", () => {
    const preflight = sql.indexOf("045 preflight:");
    const constraints = sql.indexOf("do $constraints$");

    expect(preflight).toBeGreaterThan(-1);
    expect(constraints).toBeGreaterThan(preflight);
  });

  it("makes named constraints idempotent and rejects definition drift", () => {
    for (const name of [
      "fk_crm_subscriptions_customer_tenant",
      "uq_crm_subscriptions_business_customer_id",
      "fk_crm_booking_requests_subscription_identity",
    ]) {
      expect(sql).toContain(`conname = '${name}'`);
      expect(sql).toContain(`045 constraint drift: ${name}`);
    }

    expect(sql).toMatch(/pg_get_constraintdef\(oid\)/i);
  });
});
