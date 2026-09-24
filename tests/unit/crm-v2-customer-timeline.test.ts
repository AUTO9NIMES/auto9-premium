import { describe, expect, it } from "vitest";

import { formatCustomerActivity } from "../../app/crm-v2/clients/[customerId]/timeline";

describe("Customer 360 business timeline", () => {
  it("renders canonical lead status transitions", () => {
    expect(
      formatCustomerActivity({
        event_type: "lead.status_changed",
        event_data: {
          previous_status: "CONTACTED",
          new_status: "QUOTE_SENT",
        },
      }),
    ).toEqual({
      title: "Statut de la demande modifié",
      detail: "Contacté → Devis envoyé",
    });
  });

  it("renders CLOSED_LOST cancellation comments", () => {
    expect(
      formatCustomerActivity({
        event_type: "lead.status_changed",
        event_data: {
          previous_status: "CONTACTED",
          new_status: "CLOSED_LOST",
          comment: "Véhicule vendu",
        },
      }),
    ).toEqual({
      title: "Demande clôturée",
      detail: "Véhicule vendu",
    });
  });

  it("whitelists quote amount payload fields", () => {
    const result = formatCustomerActivity({
      event_type: "quote.amount_updated",
      event_data: {
        old_total_price: 250,
        new_total_price: 320,
        secret: "must-not-render",
      },
    });

    expect(result.title).toBe("Montant du devis modifié");
    expect(result.detail).toContain("250");
    expect(result.detail).toContain("320");
    expect(result.detail).not.toContain("must-not-render");
  });

  it("renders appointment rescheduling safely", () => {
    const result = formatCustomerActivity({
      event_type: "appointment.rescheduled",
      event_data: {
        previous_scheduled_at: "2026-09-24T08:00:00+02:00",
        new_scheduled_at: "2026-09-25T10:30:00+02:00",
        private_note: "never show this",
      },
    });

    expect(result.title).toBe("Rendez-vous replanifié");
    expect(result.detail).toContain("24");
    expect(result.detail).toContain("25");
    expect(result.detail).not.toContain("never show this");
  });

  it("survives malformed event data", () => {
    expect(
      formatCustomerActivity({
        event_type: "quote.amount_updated",
        event_data: {
          old_total_price: "not-a-number",
          new_total_price: { unsafe: true },
        },
      }),
    ).toEqual({
      title: "Montant du devis modifié",
      detail: null,
    });
  });

  it("keeps unknown events traceable without dumping payload data", () => {
    expect(
      formatCustomerActivity({
        event_type: "future.event",
        event_data: {
          token: "sensitive-value",
          note: "must-not-render",
        },
      }),
    ).toEqual({
      title: "future.event",
      detail: null,
    });
  });

  it("only exposes known CRM step labels", () => {
    expect(
      formatCustomerActivity({
        event_type: "crm_v2.step.completed",
        event_data: { step_key: "QUOTE_SENT" },
      }),
    ).toEqual({
      title: "Étape CRM terminée",
      detail: "Devis envoyé",
    });

    expect(
      formatCustomerActivity({
        event_type: "crm_v2.step.reopened",
        event_data: { step_key: "unknown-secret-step" },
      }),
    ).toEqual({
      title: "Étape CRM rouverte",
      detail: null,
    });
  });

  it("rejects array-shaped event data", () => {
    expect(
      formatCustomerActivity({
        event_type: "crm_v2.step.completed",
        event_data: ["QUOTE_SENT"] as unknown as Record<string, unknown>,
      }),
    ).toEqual({
      title: "Étape CRM terminée",
      detail: null,
    });
  });


  it("does not expose arbitrary structural-event payload data", () => {
    expect(
      formatCustomerActivity({
        event_type: "payment.recorded",
        event_data: {
          payment_id: "payment-id",
          secret: "never-render",
        },
      }),
    ).toEqual({
      title: "Paiement enregistré",
      detail: null,
    });
  });
});
