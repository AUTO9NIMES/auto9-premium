import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync(
  "app/crm-v2/clients/[customerId]/actions.ts",
  "utf8",
);
const page = readFileSync(
  "app/crm-v2/clients/[customerId]/page.tsx",
  "utf8",
);

describe("Customer 360 Ultra V8 operational action center", () => {
  it("keeps operational writes on canonical CRM primitives", () => {
    for (const primitive of [
      "scheduleJob",
      "transitionAppointmentStatus",
      "startJob",
      "recordJobPayment",
      "requestJobReview",
    ]) {
      expect(actions).toContain(primitive);
    }

    expect(actions).not.toContain('supabaseRest("jobs", "PATCH"');
    expect(actions).not.toContain('supabaseRest("appointments", "PATCH"');
    expect(actions).not.toContain('supabaseRest("payments", "POST"');
    expect(actions).not.toContain('supabaseRest("review_requests", "POST"');
  });

  it("verifies customer/job/appointment ownership before mutation", () => {
    expect(actions).toContain("requireOwnedOperationalContext");
    expect(actions).toContain("candidate.customer_id === input.customerId");
    expect(actions).toContain("candidate.job_id === input.jobId");
    expect(actions).toContain("candidate.customer_id === input.customerId");
  });

  it("exposes the six V8 operator actions from Customer 360", () => {
    for (const action of [
      "scheduleV2CustomerJob",
      "confirmV2CustomerAppointment",
      "startV2CustomerJob",
      "completeV2CustomerJob",
      "recordV2CustomerJobPayment",
      "requestV2CustomerJobReview",
    ]) {
      expect(page).toContain(action);
    }
  });

  it("keeps schedule and payment as inline input forms", () => {
    expect(page).toContain('type="datetime-local"');
    expect(page).toContain('name="scheduledAt"');
    expect(page).toContain('name="method"');
    expect(page).toContain('<option value="CASH">Espèces</option>');
    expect(page).toContain('<option value="CARD">Carte</option>');
    expect(page).toContain('<option value="BANK_TRANSFER">Virement</option>');
    expect(page).toContain('<option value="OTHER">Autre</option>');
  });

  it("binds appointment actions to the exact appointment selected by the NBA engine", () => {
    const nextAction = readFileSync(
      "app/crm-v2/clients/[customerId]/next-action.ts",
      "utf8",
    );

    expect(nextAction).toContain("appointmentId: string | null");
    expect(nextAction).toContain("completableAppointment.id");
    expect(nextAction).toContain("confirmableAppointment.id");
    expect(nextAction).toContain("appointmentId: selected.appointmentId");

    expect(page).toContain("nextAction.appointmentId && nextActionJob");
    expect(page).toContain("appointment.id === nextAction.appointmentId");
    expect(page).not.toContain(
      "(appointment) => appointment.job_id === nextActionJob.id,",
    );
  });

  it("uses request-scoped UUID idempotency tokens for payment and review", () => {
    expect(page).toContain('import { randomUUID } from "node:crypto"');
    expect(page).toContain('nextAction.kind === "RECORD_PAYMENT" ? randomUUID() : null');
    expect(page).toContain('nextAction.kind === "REQUEST_REVIEW" ? randomUUID() : null');
    expect(page).toContain('name="idempotencyKey"');
  });

  it("returns successful operations to the Customer 360 surface", () => {
    expect(actions).toContain("revalidateOperationalSurfaces");
    expect(actions).toContain('redirect(`${customerPath(customerId)}?operation=scheduled`)');
    expect(actions).toContain('redirect(`${customerPath(customerId)}?operation=confirmed`)');
    expect(actions).toContain('redirect(`${customerPath(customerId)}?operation=started`)');
    expect(actions).toContain('redirect(`${customerPath(customerId)}?operation=completed`)');
    expect(actions).toContain('redirect(`${customerPath(customerId)}?operation=payment`)');
    expect(actions).toContain('redirect(`${customerPath(customerId)}?operation=review`)');
  });

  it("does not change the canonical CRM library or require a migration", () => {
    expect(page).toContain("Prochaine action");
    expect(actions).toContain('source: "crm_v2_customer_360"');
  });
});
