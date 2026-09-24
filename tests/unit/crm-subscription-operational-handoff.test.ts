import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const crmPath = "app/lib/crm.ts";

const migrationPath =
  "supabase/migrations/047_crm_subscription_operational_handoff.sql";

function readMigration(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("CRM subscription operational handoff contract", () => {
  it("defines one canonical atomic handoff RPC", () => {
    const sql = readMigration();

    expect(sql).toContain(
      "create or replace function public.confirm_subscription_booking_request",
    );
    expect(sql).toContain("for update");
    expect(sql).toContain("security invoker");
  });

  it("keeps the handoff tenant and subscription identity scoped", () => {
    const sql = readMigration();

    expect(sql).toMatch(
      /crm_subscription_booking_requests[\s\S]*business_id\s*=\s*p_business_id/i,
    );
    expect(sql).toMatch(
      /crm_subscriptions[\s\S]*business_id\s*=\s*p_business_id/i,
    );
    expect(sql).toMatch(
      /customer_id[\s\S]*subscription_id/i,
    );
  });

  it("creates a dedicated canonical manual lead for the booking occurrence", () => {
    const sql = readMigration();

    expect(sql).toContain("public.create_manual_lead(");
    expect(sql).toContain("v_idempotency_key");
    expect(sql).toContain("'BOOKED'");
  });

  it("keeps BOOKED as an explicit special-operation transition", () => {
    const sql = readMigration();

    expect(sql).toMatch(
      /lifecycle_status\s*=\s*'NEW'[\s\S]*set lifecycle_status\s*=\s*'BOOKED'/i,
    );
    expect(sql).not.toContain("public.transition_lead_status(");
  });

  it("creates a quote-less scheduled job for the requested slot", () => {
    const sql = readMigration();

    expect(sql).toContain("insert into public.jobs");
    expect(sql).toContain("'SCHEDULED'");
    expect(sql).toMatch(/quote_id[\s\S]*null/i);
    expect(sql).toContain("scheduled_at");
  });

  it("creates the canonical REQUESTED appointment with the same operational schedule", () => {
    const sql = readMigration();

    expect(sql).toContain("insert into public.appointments");
    expect(sql).toContain("'REQUESTED'");
    expect(sql).toContain("requested_at");
    expect(sql).toContain("scheduled_at");
    expect(sql).toContain("vehicle_id");
    expect(sql).toContain("Europe/Paris");
    expect(sql).toContain("v_candidate_count = 0");
    expect(sql).toContain("v_candidate_count > 1");
  });

  it("persists durable lead, job and appointment links on the booking request", () => {
    const sql = readMigration();

    expect(sql).toMatch(
      /alter table public\.crm_subscription_booking_requests[\s\S]*lead_id/i,
    );
    expect(sql).toMatch(
      /alter table public\.crm_subscription_booking_requests[\s\S]*job_id/i,
    );
    expect(sql).toMatch(
      /alter table public\.crm_subscription_booking_requests[\s\S]*appointment_id/i,
    );
  });

  it("confirms the booking request only as part of the operational handoff", () => {
    const sql = readMigration();

    expect(sql).toMatch(
      /update public\.crm_subscription_booking_requests[\s\S]*status\s*=\s*'CONFIRMED'/i,
    );
  });

  it("is replay-safe instead of creating duplicate operational records", () => {
    const sql = readMigration();

    expect(sql).toContain("'no_op'");
    expect(sql).toContain("true");
    expect(sql).toContain("false");
    expect(sql).toMatch(
      /status\s*=\s*'CONFIRMED'[\s\S]*(lead_id|job_id|appointment_id)/i,
    );
  });

  it("does not manufacture a quote or calendar event", () => {
    const sql = readMigration();

    expect(sql).not.toMatch(/insert into public\.quotes/i);
    expect(sql).not.toMatch(/insert into public\.crm_calendar_events/i);
    expect(sql).not.toContain("accept_quote_and_create_job");
    expect(sql).not.toContain("create_crm_calendar_event_with_lead");
  });

  it("does not advance subscription recurrence during handoff", () => {
    const sql = readMigration();

    expect(sql).not.toMatch(
      /update public\.crm_subscriptions[\s\S]*next_due_on\s*=/i,
    );
  });

  it("does not expose or depend on the public booking token", () => {
    const sql = readMigration();

    expect(sql).not.toContain("booking_token");
  });

  it("keeps the RPC private to service_role", () => {
    const sql = readMigration();

    expect(sql).toMatch(
      /revoke all on function public\.confirm_subscription_booking_request[\s\S]*from public,\s*anon,\s*authenticated/i,
    );
    expect(sql).toMatch(
      /grant execute on function public\.confirm_subscription_booking_request[\s\S]*to service_role/i,
    );
  });
  it("emits the canonical lead status event contract for the booking transition", () => {
    const sql = readMigration();

    expect(sql).toContain("'lead.status_changed'");
    expect(sql).toContain("'source', 'subscription_booking_handoff'");
    expect(sql).toContain("'lead_id', v_lead.id");
    expect(sql).toContain("'previous_status', 'NEW'");
    expect(sql).toContain("'new_status', 'BOOKED'");

    expect(sql).not.toContain("'lead.lifecycle.changed'");
    expect(sql).not.toContain("'from', 'NEW'");
    expect(sql).not.toContain("'to', 'BOOKED'");
  });

  it("keeps the TypeScript helper aligned with the flat RPC response", () => {
    const sql = readMigration();
    const crm = readFileSync(crmPath, "utf8");

    for (const key of [
      "booking_request_id",
      "lead_id",
      "job_id",
      "appointment_id",
      "no_op",
    ]) {
      expect(sql).toContain(`'${key}'`);
    }

    expect(crm).toContain(
      "result.booking_request_id !== normalizedBookingRequestId",
    );
    expect(crm).toContain('typeof result.lead_id !== "string"');
    expect(crm).toContain('typeof result.job_id !== "string"');
    expect(crm).toContain('typeof result.appointment_id !== "string"');
    expect(crm).toContain('typeof result.no_op !== "boolean"');

    expect(crm).not.toContain("result.booking_request)");
    expect(crm).not.toContain("result.lead.id");
    expect(crm).not.toContain("result.job.id");
    expect(crm).not.toContain("result.appointment.id");
  });

});
