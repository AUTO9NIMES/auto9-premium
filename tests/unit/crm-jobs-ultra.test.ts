import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("CRM Jobs Ultra operational contracts", () => {
  const page = read("app/crm/jobs/page.tsx");
  const detail = read("app/crm/jobs/[jobId]/page.tsx");
  const actions = read("app/crm/jobs/actions.ts");
  const crm = read("app/lib/crm.ts");
  const invariants = read("app/lib/crm-lifecycle-invariants.ts");
  const scheduling = read("supabase/migrations/015_crm_scheduling.sql");
  const start = read("supabase/migrations/016_crm_job_start.sql");
  const payments = read("supabase/migrations/017_payments_financial_close.sql");
  const appointment = read("supabase/migrations/004_appointment_lifecycle.sql");

  it("keeps the Jobs surface protected and tenant-scoped through canonical readers", () => {
    expect(page).toContain("await requireCrmAccess()");
    expect(page).toContain("getJobsList(");
    expect(detail).toContain("await requireCrmAccess()");
    expect(detail).toContain("getJobDetails(");
    expect(crm).toContain("business_id=eq.");
    expect(crm).toContain("&id=eq.");
  });

  it("keeps operational actions behind server authorization and canonical domain helpers", () => {
    expect(actions).toContain("await requireCrmAccess()");
    expect(actions).toContain("scheduleJob({");
    expect(actions).toContain("rescheduleJob({");
    expect(actions).toContain("startJob(normalizedJobId)");
    expect(actions).toContain("recordJobPayment({");
    expect(actions).toContain("requestJobReview({");
    expect(actions).toContain("transitionAppointmentStatus({");
    expect(actions).not.toContain('supabaseRest(');
  });

  it("does not let requested_at masquerade as the operational schedule", () => {
    expect(page).toContain("Planning opérationnel");
    expect(page).toContain("Souhait client");
    expect(detail).toContain("horaire demandé initialement reste inchangé");
    expect(scheduling).toContain("requested_at");
    expect(scheduling).toContain("scheduled_at");
  });

  it("requires the canonical first-confirmation schedule invariant", () => {
    expect(invariants).toContain('appointment.status === "REQUESTED"');
    expect(invariants).toContain('job.status === "SCHEDULED"');
    expect(invariants).toContain("appointment.scheduled_at === job.scheduled_at");
    expect(appointment).toContain("v_job.status <> 'CONFIRMED'");
    expect(appointment).toContain("v_target_status = 'CONFIRMED'");
  });

  it("locks and validates the job before scheduling or starting", () => {
    expect(scheduling).toContain("where business_id = p_business_id");
    expect(scheduling).toContain("and id = p_job_id");
    expect(scheduling).toContain("for update;");
    expect(scheduling).toContain("Job scheduling state is inconsistent");
    expect(start).toContain("for update;");
    expect(start).toContain("v_job.status <> 'CONFIRMED'");
  });

  it("keeps payment settlement terminal and idempotent", () => {
    expect(payments).toContain("unique (business_id, idempotency_key)");
    expect(payments).toContain("if found then");
    expect(payments).toContain("Payment request token belongs to another job");
    expect(payments).toContain("v_job.status <> 'COMPLETED'");
    expect(payments).toContain("set status = 'PAID'");
    expect(invariants).toContain('job.status === "PAID"');
  });

  it("keeps lifecycle RPCs service-role only", () => {
    for (const sql of [scheduling, start, payments, appointment]) {
      expect(sql).toContain("revoke all on function");
      expect(sql).toContain("from public, anon, authenticated");
      expect(sql).toContain("grant execute on function");
      expect(sql).toContain("to service_role");
    }
  });

  it("keeps appointment relationship integrity inside the transition RPC", () => {
    expect(appointment).toContain("Appointment customer does not match the job");
    expect(appointment).toContain("Appointment lead does not match the job");
    expect(appointment).toContain("Appointment quote does not match the job");
    expect(appointment).toContain("Appointment vehicle does not match the job");
    expect(appointment).toContain("Appointment status %s is terminal");
  });

  it("keeps payment and review result validation canonical", () => {
    expect(crm).toContain("hasCanonicalPaidJob");
    expect(crm).toContain("hasCanonicalReviewRequest");
    expect(crm).toContain("Supabase returned an inconsistent payment result.");
    expect(crm).toContain("Supabase returned an inconsistent review request result.");
  });
});
