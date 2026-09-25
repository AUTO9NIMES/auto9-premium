import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { Appointment } from "../../app/lib/crm";
import { selectCustomerPlanningAppointment } from "../../app/crm/clients/[customerId]/planning";

const NOW = Date.parse("2026-09-24T10:00:00.000Z");

function appointment(
  id: string,
  status: Appointment["status"],
  scheduledAt: string | null,
): Appointment {
  return {
    id,
    business_id: "11111111-1111-4111-8111-111111111111",
    customer_id: "22222222-2222-4222-8222-222222222222",
    job_id: "33333333-3333-4333-8333-333333333333",
    status,
    requested_at: "2026-09-20T10:00:00.000Z",
    scheduled_at: scheduledAt,
  };
}

describe("CRM V2 Customer 360 planning selection", () => {
  it("selects the earliest future confirmed appointment", () => {
    const later = appointment(
      "later",
      "CONFIRMED",
      "2026-09-26T10:00:00.000Z",
    );
    const earlier = appointment(
      "earlier",
      "CONFIRMED",
      "2026-09-25T10:00:00.000Z",
    );

    const result = selectCustomerPlanningAppointment(
      [later, earlier],
      NOW,
    );

    expect(result.nextAppointment).toBe(earlier);
    expect(result.planningAppointment).toBe(earlier);
  });

  it("ignores future requested and cancelled appointments", () => {
    const requested = appointment(
      "requested",
      "REQUESTED",
      "2026-09-25T10:00:00.000Z",
    );
    const cancelled = appointment(
      "cancelled",
      "CANCELLED",
      "2026-09-25T11:00:00.000Z",
    );

    const result = selectCustomerPlanningAppointment(
      [requested, cancelled],
      NOW,
    );

    expect(result.nextAppointment).toBeNull();
    expect(result.planningAppointment).toBeNull();
  });

  it("ignores invalid or missing scheduled dates", () => {
    const invalid = appointment("invalid", "CONFIRMED", "not-a-date");
    const missing = appointment("missing", "CONFIRMED", null);

    const result = selectCustomerPlanningAppointment(
      [invalid, missing],
      NOW,
    );

    expect(result.nextAppointment).toBeNull();
    expect(result.latestCompletedAppointment).toBeNull();
    expect(result.planningAppointment).toBeNull();
  });

  it("uses the latest past completed appointment as fallback", () => {
    const older = appointment(
      "older",
      "COMPLETED",
      "2026-09-20T10:00:00.000Z",
    );
    const latest = appointment(
      "latest",
      "COMPLETED",
      "2026-09-23T10:00:00.000Z",
    );

    const result = selectCustomerPlanningAppointment(
      [latest, older],
      NOW,
    );

    expect(result.latestCompletedAppointment).toBe(latest);
    expect(result.planningAppointment).toBe(latest);
  });

  it("prefers a future confirmed appointment over completed fallback", () => {
    const completed = appointment(
      "completed",
      "COMPLETED",
      "2026-09-23T10:00:00.000Z",
    );
    const confirmed = appointment(
      "confirmed",
      "CONFIRMED",
      "2026-09-25T10:00:00.000Z",
    );

    const result = selectCustomerPlanningAppointment(
      [completed, confirmed],
      NOW,
    );

    expect(result.nextAppointment).toBe(confirmed);
    expect(result.latestCompletedAppointment).toBe(completed);
    expect(result.planningAppointment).toBe(confirmed);
  });

  it("treats a confirmed appointment exactly at now as upcoming", () => {
    const exact = appointment(
      "exact",
      "CONFIRMED",
      "2026-09-24T10:00:00.000Z",
    );

    expect(
      selectCustomerPlanningAppointment([exact], NOW).planningAppointment,
    ).toBe(exact);
  });

  it("does not mutate the source appointment order", () => {
    const later = appointment(
      "later",
      "CONFIRMED",
      "2026-09-26T10:00:00.000Z",
    );
    const earlier = appointment(
      "earlier",
      "CONFIRMED",
      "2026-09-25T10:00:00.000Z",
    );
    const source = [later, earlier];
    const before = source.map((item) => item.id);

    selectCustomerPlanningAppointment(source, NOW);

    expect(source.map((item) => item.id)).toEqual(before);
  });
});

describe("CRM V2 Customer 360 source contract", () => {
  const root = process.cwd();
  const page = fs.readFileSync(
    path.join(root, "app/crm-v2/clients/[customerId]/page.tsx"),
    "utf8",
  );

  it("keeps canonical authorization and Customer 360 loading", () => {
    const auth = page.indexOf("await requireCrmAccess()");
    const read = page.indexOf("await getCustomer360(id)");

    expect(auth).toBeGreaterThan(-1);
    expect(read).toBeGreaterThan(auth);
  });

  it("uses the canonical WhatsApp helper", () => {
    expect(page).toContain('import { buildWhatsAppLink } from "../../../lib/contact"');
    expect(page).toContain("const whatsapp = buildWhatsAppLink(");
    expect(page).not.toContain("function whatsappHref(");
  });

  it("renders the canonical activity collection as the customer timeline", () => {
    expect(page).toContain("result.activities.length");
    expect(page).toContain("result.activities.map((activity)");
    expect(page).toContain("{activity.event_type}");
  });

  it("deep-links customer leads and jobs to their existing canonical detail routes", () => {
    expect(page).toContain('href={`/crm/pipeline/${lead.id}`}');
    expect(page).toContain('href={`/crm/jobs/${job.id}`}');
    expect(page).toContain("Ouvrir le dossier →");
    expect(page).toContain("Ouvrir la prestation →");

    expect(page).not.toContain('href={`/crm-v2/pipeline/${lead.id}`}');
    expect(page).not.toContain('href={`/crm-v2/jobs/${job.id}`}');
    expect(page).not.toContain('href={`/crm-v2/quotes/${quote.id}`}');
    expect(page).not.toContain(
      'href={`/crm-v2/appointments/${appointment.id}`',
    );
  });

  it("keeps profile and vehicle management actions reachable", () => {
    expect(page).toContain("action={updateV2CustomerProfile}");
    expect(page).toContain("action={createV2Vehicle}");
    expect(page).toContain("action={uploadV2VehiclePhoto}");
  });

  it("does not derive collected revenue from quotes or job totals", () => {
    expect(page).not.toMatch(/\b(?:CA client|chiffre d'affaires|LTV|paid total)\b/i);
    expect(page).not.toMatch(
      /result\.(?:jobs|quotes)\.reduce\([\s\S]*?(?:total_amount|total_price)/,
    );
    expect(page).toContain("summarizeCustomerPayments(result.payments)");
    expect(page).toContain("Montants calculés uniquement à partir des paiements enregistrés.");
  });
});
