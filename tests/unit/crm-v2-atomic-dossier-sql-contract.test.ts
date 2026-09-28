import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260926230000_update_v2_dossier_atomically.sql",
  "utf8",
);

describe("CRM V2 atomic dossier SQL contract (static checks)", () => {
  it("uses one transaction and service-role-only invoker privileges", () => {
    expect(sql.trim().startsWith("begin;")).toBe(true);
    expect(sql.trim().endsWith("commit;")).toBe(true);
    expect(sql).toContain("security invoker");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("to service_role");
  });

  it("locks tenant-owned lead, selected service and shared customer", () => {
    expect(sql.match(/for update;/g)).toHaveLength(3);
    for (const table of ["leads", "lead_services", "customers"]) {
      expect(sql).toContain(`from public.${table}`);
    }
    expect(sql).toContain("business_id = p_business_id");
    expect(sql).toContain("lead_id = p_lead_id");
  });

  it("rejects stale lead, customer and service versions before writes", () => {
    expect(sql).toContain(
      "v_lead.updated_at is distinct from p_expected_lead_updated_at",
    );
    expect(sql).toContain(
      "v_lead.created_at is distinct from p_expected_created_at",
    );
    expect(sql).toContain(
      "v_customer.updated_at is distinct from p_expected_customer_updated_at",
    );
    expect(sql).toContain(
      "v_service.updated_at is distinct from p_expected_service_updated_at",
    );
    expect(sql).toContain(
      "v_service.service_name is distinct from p_expected_service_name",
    );
    expect(sql).toContain("(s.created_at, s.id) >");
    expect(sql).toContain("'status', 'conflict'");
  });

  it("blocks CLOSED_LOST before updating the shared customer", () => {
    const guard = sql.indexOf("v_lead.lifecycle_status = 'CLOSED_LOST'");
    const profile = sql.indexOf("v_profile := public.update_customer_profile(");
    expect(guard).toBeGreaterThan(-1);
    expect(profile).toBeGreaterThan(guard);
    expect(sql.slice(guard, profile)).toContain("'status', 'blocked'");
  });

  it("protects service and dossier date after commercial engagement", () => {
    expect(sql).toContain("'NEW', 'QUALIFIED', 'CONTACTED'");
    for (const table of ["quotes", "jobs", "appointments"]) {
      expect(sql).toContain(`from public.${table}`);
    }
    expect(sql).toContain(
      "if v_engaged and (v_service_changed or v_date_changed) then",
    );
    expect(sql).toContain("elsif not v_engaged");
  });

  it("allows engaged legacy dossiers without a service to edit profile or lead notes", () => {
    const engagement = sql.indexOf("  v_engaged :=");
    const change = sql.indexOf("  v_service_changed :=");
    const guard = sql.indexOf("  if v_engaged and (v_service_changed or v_date_changed) then");

    expect(engagement).toBeGreaterThan(-1);
    expect(change).toBeGreaterThan(engagement);
    expect(guard).toBeGreaterThan(change);
    expect(sql.slice(change, guard)).toContain(
      "when p_expected_service_id is null then not v_engaged",
    );
    expect(sql.slice(change, guard)).toContain(
      "else v_service.service_name is distinct from v_service_name",
    );
  });

  it("does not rewrite the service comment during an otherwise no-op save", () => {
    expect(sql).toMatch(
      /elsif not v_engaged\s+and v_note_changed\s+and v_service\.customer_comment is distinct from v_note then/,
    );
    expect(sql).toContain("if v_service_changed or v_note_changed or v_date_changed then");
  });

  it("rejects a submitted service label on engaged dossiers without a service", () => {
    const engagement = sql.indexOf("  v_engaged :=");
    const guard = sql.indexOf("  if p_expected_service_id is null and v_engaged then");
    const profile = sql.indexOf("  v_profile := public.update_customer_profile(");

    expect(guard).toBeGreaterThan(engagement);
    expect(profile).toBeGreaterThan(guard);
    expect(sql.slice(guard, profile)).toContain(
      "if v_service_name is not null then",
    );
    expect(sql.slice(guard, profile)).toContain(
      "return jsonb_build_object('status', 'blocked');",
    );
    expect(sql.slice(guard, profile)).toContain(
      "elsif v_service_name is null then",
    );
    expect(sql.slice(guard, profile)).toContain(
      "return jsonb_build_object('status', 'invalid');",
    );
  });

  it("returns an explicit JSON null when no service row exists", () => {
    expect(sql).toContain(
      "'service', case when v_service.id is null then null else to_jsonb(v_service) end",
    );
    expect(sql).toContain(
      "v_service_name text := nullif(btrim(p_service_name), '');",
    );
  });

  it("reuses canonical profile validation inside the SQL transaction", () => {
    expect(sql).toContain("public.update_customer_profile(");
    expect(sql).toContain("'crm_v2_dossier_ui'");
    expect(sql).toContain("null::date,");
    expect(sql).toContain("false");
    expect(sql).toContain("raise exception");
  });

  it("writes the service, lead and audit events together", () => {
    expect(sql).toContain("insert into public.lead_services");
    expect(sql).toContain("update public.lead_services");
    expect(sql).toContain("update public.leads");
    expect(sql).toContain("insert into public.activity_log");
    for (const event of [
      "lead.service_updated",
      "crm_v2.dossier.date_adjusted",
      "lead.details_updated",
    ]) {
      expect(sql).toContain(`'${event}'`);
    }
    expect(sql).toMatch(/'status',\s*case[\s\S]*?else 'no_op'/);
  });

  it("does not write financial or lifecycle data", () => {
    expect(sql).not.toMatch(/(?:insert\s+into|update|delete\s+from)\s+public\.(?:quotes|jobs|appointments)\b/i);
    expect(sql).not.toMatch(/\b(?:base_price|total_price|lifecycle_status)\s*=\s*(?:p_\w+|v_\w+|\d)/i);
    expect(sql).not.toContain("update public.customer_identifiers");
  });
});
