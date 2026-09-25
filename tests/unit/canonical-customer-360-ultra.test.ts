import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("canonical Customer 360 birthday contract", () => {
  const actions = read("app/crm/clients/[customerId]/actions.ts");
  const crm = read("app/lib/crm.ts");
  const migration = read("supabase/migrations/20260922000100_customer_profile_birth_date.sql");

  it("passes birthday through the canonical profile RPC", () => {
    expect(actions).toContain("birthDate: normalizedBirthDate");
    expect(crm).toContain("birthDate?: string | null");
    expect(crm).toContain("p_birth_date: input.birthDate ?? null");
  });

  it("does not perform a second direct customer PATCH for birthday", () => {
    expect(actions).not.toContain('supabaseRest(\n      "customers",\n      "PATCH"');
    expect(actions).not.toContain("{ birth_date: normalizedBirthDate");
  });

  it("extends the RPC with birth_date and records it as a changed field", () => {
    expect(migration).toContain("p_birth_date date default null");
    expect(migration).toContain("v_customer.birth_date is distinct from v_birth_date");
    expect(migration).toContain("array_append(v_changed_fields, 'birth_date')");
    expect(migration).toContain("birth_date = v_birth_date");
  });

  it("keeps the customer row locked inside the same RPC transaction", () => {
    const lock = migration.indexOf("for update;");
    const update = migration.indexOf("update public.customers");
    expect(lock).toBeGreaterThan(-1);
    expect(update).toBeGreaterThan(lock);
  });

  it("keeps the expanded RPC service-role only", () => {
    expect(migration).toContain("revoke all on function public.update_customer_profile");
    expect(migration).toContain("from authenticated");
    expect(migration).toContain("grant execute on function public.update_customer_profile");
    expect(migration).toContain("to service_role");
  });
});

describe("canonical Customer 360 vehicle photo contract", () => {
  const actions = read("app/crm/clients/[customerId]/actions.ts");
  const storage = read("app/lib/crm-storage.ts");

  it("requires CRM access and verifies tenant/customer vehicle ownership before upload", () => {
    expect(actions).toContain("await requireCrmAccess()");
    expect(actions).toContain('"vehicles",');
    expect(actions).toContain("business_id=eq.");
    expect(actions).toContain("vehicle.customer_id !== normalizedCustomerId");
    expect(actions).toContain("uploadVehiclePhoto");
  });

  it("limits vehicle photos to supported image types and 8 MiB", () => {
    expect(storage).toContain('"image/jpeg": "jpg"');
    expect(storage).toContain('"image/png": "png"');
    expect(storage).toContain('"image/webp": "webp"');
    expect(storage).toContain("8 * 1024 * 1024");
  });

  it("stores photos under tenant and vehicle scoped paths", () => {
    expect(storage).toContain("input.businessId");
    expect(storage).toContain("input.vehicleId");
  });

  it("uses signed URLs for private vehicle photos", () => {
    expect(storage).toContain("/storage/v1/object/sign/");
    expect(storage).toContain("createVehiclePhotoSignedUrl");
  });
});

describe("canonical Customer 360 intelligence wiring", () => {
  const page = read("app/crm/clients/[customerId]/page.tsx");

  it("wires the five promoted intelligence modules into the canonical customer page", () => {
    expect(page).toContain('from "./finance"');
    expect(page).toContain('from "./planning"');
    expect(page).toContain('from "./retention"');
    expect(page).toContain('from "./timeline"');
    expect(page).toContain('from "./next-action"');
    expect(page).toContain("summarizeCustomerPayments(result.payments)");
    expect(page).toContain("selectCustomerPlanningAppointment(result.appointments, renderedAt)");
    expect(page).toContain("summarizeCustomerRetention(");
    expect(page).toContain('timeZone: "Europe/Paris"');
    expect(page).toContain("parisTodayParts");
    expect(page).toContain("const today = `${parisToday.year}-${parisToday.month}-${parisToday.day}`");
    expect(page).toContain("result.subscriptionBookingRequests,\n    today,");
    expect(page).not.toContain("new Date(renderedAt).toISOString().slice(0, 10)");
    expect(page).toContain("selectCustomerNextAction({");
    expect(page).toContain("reviewRequests: result.reviewRequests");
    expect(page).toContain("leadServiceEvidence: result.leadServiceEvidence");
    expect(page).toContain("formatCustomerActivity(activity)");
    expect(page).toContain("nextActionPresentation.title");
    expect(page).toContain("nextActionPresentation.detail");
    expect(page).toContain('"Encaisser la prestation"');
    expect(page).toContain('"Confirmer le rendez-vous"');
    expect(page).toContain('"Dossier à jour"');
    expect(page).not.toContain('nextAction.kind.replaceAll("_", " ")');
  });

  it("keeps promoted intelligence navigation inside canonical CRM routes", () => {
    expect(page).toContain('href="/crm/revenue"');
    expect(page).toContain('href="/crm/subscriptions"');
    expect(page).not.toContain('href="/crm-v2/');
  });

  it("wires canonical operational actions without leaking V2 actions", () => {
    expect(page).toContain("scheduleCustomerJob");
    expect(page).toContain("confirmCustomerAppointment");
    expect(page).toContain("startCustomerJob");
    expect(page).toContain("completeCustomerJob");
    expect(page).toContain("recordCustomerJobPayment");
    expect(page).toContain("requestCustomerJobReview");

    expect(page).toContain('nextAction.kind === "SCHEDULE_JOB"');
    expect(page).toContain('nextAction.kind === "CONFIRM_APPOINTMENT"');
    expect(page).toContain('nextAction.kind === "START_JOB"');
    expect(page).toContain('nextAction.kind === "COMPLETE_JOB"');
    expect(page).toContain('nextAction.kind === "RECORD_PAYMENT"');
    expect(page).toContain('nextAction.kind === "REQUEST_REVIEW"');

    expect(page).toContain("nextActionJob");
    expect(page).toContain("nextActionAppointment");
    expect(page).toContain("nextActionAppointment.id");
    expect(page).toContain("paymentIdempotencyKey");
    expect(page).toContain("reviewIdempotencyKey");
    expect(page).toContain('type="datetime-local"');
    expect(page).toContain('name="method"');
    expect(page).toContain("randomUUID()");

    expect(page).not.toContain("scheduleV2CustomerJob");
    expect(page).not.toContain("confirmV2CustomerAppointment");
    expect(page).not.toContain("startV2CustomerJob");
    expect(page).not.toContain("completeV2CustomerJob");
    expect(page).not.toContain("recordV2CustomerJobPayment");
    expect(page).not.toContain("requestV2CustomerJobReview");
  });
});
