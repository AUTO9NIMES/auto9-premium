import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("CRM Calendar Ultra architecture", () => {
  const actions = read("app/crm/calendar/actions.ts");
  const page = read("app/crm/calendar/page.tsx");
  const calendarMigration = read(
    "supabase/migrations/043_crm_calendar_atomic_intake.sql",
  );
  const pipelineLinkMigration = read(
    "supabase/migrations/041_crm_v2_calendar_event_pipeline_link.sql",
  );

  it("authorizes the canonical calendar page before CRM reads", () => {
    expect(page).toContain("await requireCrmAccess()");

    const component = page.slice(
      page.indexOf("export default async function CrmCalendar"),
    );

    const authIndex = component.indexOf("await requireCrmAccess()");
    const calendarReadIndex = component.indexOf("await getCalendarMonth(");

    expect(authIndex).toBeGreaterThan(-1);
    expect(calendarReadIndex).toBeGreaterThan(authIndex);
  });

  it("derives business ownership on the server instead of accepting business_id from the form", () => {
    expect(actions).toContain(
      "const { businessId } = await resolveCurrentBusinessContext()",
    );

    expect(actions).not.toMatch(
      /formData\.get\(["']business(?:Id|_id)?["']\)/,
    );

    expect(actions).not.toMatch(
      /textValue\(formData,\s*["']business(?:Id|_id)?["']\)/,
    );
  });

  it("tenant-scopes customer, vehicle and event ownership checks", () => {
    expect(actions).toContain("assertCustomerBelongsToBusiness");
    expect(actions).toContain("assertVehicleBelongsToSelection");
    expect(actions).toContain("getOwnedEvent");

    expect(actions).toContain("business_id=eq.${businessId}");
    expect(actions).toContain(
      "rows[0].customer_id !== input.customerId",
    );
  });

  it("routes Calendar intake through the atomic canonical RPC", () => {
    expect(actions).toContain(
      '"rpc/create_crm_calendar_event_with_lead"',
    );
    expect(actions).toContain("p_business_id: businessId");
    expect(actions).toContain(
      "p_idempotency_key: idempotencyKey",
    );

    expect(actions).not.toContain("createManualLead(");
    expect(actions).not.toContain(
      "createManualLeadWithCustomer(",
    );

    expect(calendarMigration).toContain(
      "public.create_manual_lead(",
    );
    expect(calendarMigration).toContain(
      "public.create_manual_lead_with_customer(",
    );
  });

  it("requires a UUID idempotency key before invoking atomic Calendar intake", () => {
    const keyIndex = actions.indexOf(
      'const idempotencyKey = textValue(',
    );
    const guardIndex = actions.indexOf(
      "if (!UUID_REGEX.test(idempotencyKey))",
    );
    const rpcIndex = actions.indexOf(
      '"rpc/create_crm_calendar_event_with_lead"',
    );

    expect(keyIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(keyIndex);
    expect(rpcIndex).toBeGreaterThan(guardIndex);
  });

  it("allows standalone planning events without inventing a customer or lead", () => {
    expect(actions).not.toContain(
      'if (!customerId && !newClientName)',
    );
    expect(actions).toContain(
      'response.lead_id !== null',
    );
    expect(actions).toContain(
      'response.customer_id !== null',
    );
    expect(actions).toContain(
      '!result.no_op && result.lead_id ? "1" : "0"',
    );
  });

  it("keeps application and database note limits aligned", () => {
    expect(actions).toContain(
      "input.notes.length > 2000",
    );
    expect(actions).not.toContain(
      "input.notes.length > 5000",
    );
    expect(calendarMigration).toContain(
      "length(v_notes) > 2000",
    );
  });

  it("rejects divergent replay on both replay paths", () => {
    expect(
      calendarMigration.match(
        /Idempotency key already belongs to a different calendar event/g,
      ),
    ).toHaveLength(2);
  });

  it("keeps operational appointments read-only from Calendar Ultra", () => {
    expect(actions).not.toMatch(
      /supabaseRest[\s\S]{0,200}["']appointments["'][\s\S]{0,80}["'](?:POST|PATCH|DELETE)["']/,
    );

    expect(actions).not.toMatch(
      /supabaseRest[\s\S]{0,200}["']jobs["'][\s\S]{0,80}["'](?:POST|PATCH|DELETE)["']/,
    );

    for (const primitive of [
      "scheduleJob(",
      "rescheduleJob(",
      "transitionAppointmentStatus(",
      "acceptQuoteAndCreateJob(",
    ]) {
      expect(actions).not.toContain(primitive);
    }
  });

  it("keeps operational appointments visibly distinct and linked to canonical jobs", () => {
    expect(page).toContain("Opérationnel");
    expect(page).toContain("/crm/jobs/");
  });

  it("keeps planning events visibly distinct from operational appointments", () => {
    expect(page).toContain("Planning");
    expect(page).toContain("crm_calendar_events");
  });

  it("links Calendar Ultra back to Customer 360 and Pipeline", () => {
    expect(page).toContain("/crm/clients/");
    expect(page).toContain("/crm/pipeline/");
  });

  it("locks commercial identity once a planning event is linked to a lead", () => {
    const update = actions.slice(
      actions.indexOf("export async function updateCalendarEvent"),
      actions.indexOf("export async function deleteCalendarEvent"),
    );

    expect(update).toContain("if (existing.lead_id)");
    expect(update).toContain(
      "submittedCustomerId !== existing.customer_id",
    );
    expect(update).toContain(
      "submittedVehicleId !== existing.vehicle_id",
    );

    expect(update).toContain(
      "const updatePayload = existing.lead_id",
    );

    const linkedPayload = update.slice(
      update.indexOf("const updatePayload = existing.lead_id"),
      update.indexOf(": {", update.indexOf("const updatePayload = existing.lead_id")),
    );

    expect(linkedPayload).toContain("title");
    expect(linkedPayload).toContain("event_date");
    expect(linkedPayload).toContain("event_time");
    expect(linkedPayload).toContain("notes");

    expect(linkedPayload).not.toContain("customer_id:");
    expect(linkedPayload).not.toContain("vehicle_id:");
    expect(linkedPayload).not.toContain("service_name:");
    expect(linkedPayload).not.toContain("price:");
  });

  it("mirrors the linked-lead lock in the editing UI", () => {
    expect(page).toContain(
      "disabled={Boolean(formEvent?.lead_id)}",
    );
    expect(page).toContain(
      "readOnly={Boolean(formEvent?.lead_id)}",
    );

    expect(page).toContain(
      "Client, véhicule, prestation et prix sont verrouillés ici",
    );
  });

  it("deletes only the planning event and explicitly preserves its Pipeline lead", () => {
    const deletion = actions.slice(
      actions.indexOf("export async function deleteCalendarEvent"),
    );

    expect(deletion).toContain('"crm_calendar_events"');
    expect(deletion).toContain('"DELETE"');

    expect(deletion).not.toContain('"leads"');
    expect(deletion).not.toContain('"jobs"');
    expect(deletion).not.toContain('"appointments"');

    expect(page).toContain(
      "Le lead Pipeline associé ne sera pas supprimé.",
    );
  });

  it("creates Lead and Calendar Event inside one database RPC contract", () => {
    const existingLeadIndex = calendarMigration.indexOf(
      "public.create_manual_lead(",
    );
    const newLeadIndex = calendarMigration.indexOf(
      "public.create_manual_lead_with_customer(",
    );
    const eventIndex = calendarMigration.indexOf(
      "insert into public.crm_calendar_events",
    );

    expect(existingLeadIndex).toBeGreaterThan(-1);
    expect(newLeadIndex).toBeGreaterThan(-1);
    expect(eventIndex).toBeGreaterThan(existingLeadIndex);
    expect(eventIndex).toBeGreaterThan(newLeadIndex);

    expect(actions).toContain(
      '"rpc/create_crm_calendar_event_with_lead"',
    );
    expect(actions).not.toContain(
      'supabaseRest("crm_calendar_events"',
    );
  });

  it("enforces Calendar Event idempotency and rejects divergent replay", () => {
    expect(calendarMigration).toContain(
      "idempotency_key uuid",
    );
    expect(calendarMigration).toContain(
      "ux_crm_calendar_events_business_idempotency",
    );
    expect(calendarMigration).toContain(
      "on conflict (business_id, idempotency_key)",
    );
    expect(calendarMigration).toContain(
      "Idempotency key already belongs to a different calendar event",
    );
    expect(calendarMigration).toContain(
      "v_existing_event.title is distinct from v_title",
    );
    expect(calendarMigration).toContain(
      "v_existing_event.event_date is distinct from p_event_date",
    );
    expect(calendarMigration).toContain(
      "v_existing_event.event_time is distinct from p_event_time",
    );
  });

  it("contains no CRM V2 route residue in the canonical Calendar implementation", () => {
    expect(actions).not.toContain("/crm-v2");
    expect(page).not.toContain("/crm-v2");
    expect(page).not.toContain("CrmV2");
  });
});
