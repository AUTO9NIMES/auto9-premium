import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260926220000_update_lead_service_details.sql",
  "utf8",
);

describe("Main CRM service edit SQL contract (static checks)", () => {
  it("uses one transaction and invoker privileges", () => {
    expect(sql.trim().startsWith("begin;")).toBe(true);
    expect(sql.trim().endsWith("commit;")).toBe(true);
    expect(sql).toContain("security invoker");
    expect(sql).toContain("to service_role");
    expect(sql).toContain("from public, anon, authenticated");
  });

  it("locks the tenant-owned lead and exact service", () => {
    expect(sql).toContain("from public.leads");
    expect(sql).toContain("from public.lead_services");
    expect(sql.match(/for update;/g)).toHaveLength(2);
    expect(sql).toContain("and lead_id = p_lead_id");
    expect(sql).toContain("and id = p_service_id");
  });

  it("checks the displayed version before mutation", () => {
    expect(sql).toContain(
      "v_service.service_name is distinct from p_expected_service_name",
    );
    expect(sql).toContain(
      "v_service.updated_at is distinct from p_expected_updated_at",
    );
    expect(sql).toContain("'status', 'conflict'");
  });

  it("blocks editing once commercial or operational history exists", () => {
    expect(sql).toContain("'NEW', 'QUALIFIED', 'CONTACTED'");
    for (const table of ["quotes", "jobs", "appointments"]) {
      expect(sql).toContain(`from public.${table}`);
    }
    expect(sql).toContain("'status', 'blocked'");
  });

  it("writes the service and activity in the same SQL function", () => {
    expect(sql).toContain("update public.lead_services");
    expect(sql).toContain("insert into public.activity_log");
    expect(sql).toContain("'lead.service_updated'");
    expect(sql).toContain("'previous_service_name'");
    expect(sql).toContain("'new_service_name'");
    expect(sql).toContain("'status', 'no_op'");
  });
});
