import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("appointment confirmation email architecture", () => {
  const migration = read(
    "supabase/migrations/036_appointment_confirmation_outbox.sql",
  );

  const worker = read("app/lib/automation-outbox-worker.ts");
  const crm = read("app/lib/crm.ts");
  const route = read(
    "app/api/internal/automation-outbox/process/route.ts",
  );

  it("creates the appointment confirmation event only on first REQUESTED -> CONFIRMED", () => {
    expect(migration).toContain(
      "v_previous_status = 'REQUESTED'",
    );
    expect(migration).toContain(
      "v_target_status = 'CONFIRMED'",
    );
    expect(migration).toContain(
      "'appointment.confirmed.v1'",
    );
    expect(migration).toContain(
      "on conflict (business_id, event_type, appointment_id)",
    );
  });

  it("uses an appointment-specific outbox reference", () => {
    expect(migration).toContain(
      "add column appointment_id uuid",
    );
    expect(migration).toContain(
      "foreign key (business_id, appointment_id)",
    );
    expect(migration).toContain(
      "references public.appointments (business_id, id)",
    );
  });

  it("keeps review and appointment event references mutually exclusive", () => {
    expect(migration).toContain(
      "event_type = 'review.requested.v1'",
    );
    expect(migration).toContain(
      "event_type = 'appointment.confirmed.v1'",
    );
    expect(migration).toContain(
      "and review_request_id is null",
    );
    expect(migration).toContain(
      "and appointment_id is null",
    );
  });

  it("does not require a review URL for appointment confirmation snapshots", () => {
    expect(migration).toContain(
      "event_type = 'appointment.confirmed.v1'",
    );
    expect(migration).toContain(
      "delivery_review_url is null",
    );

    expect(worker).toContain(
      "reviewUrl: string | null",
    );
  });

  it("uses a stable outbox idempotency key for Resend", () => {
    expect(worker).toContain(
      "idempotencyKey: `automation-outbox/${event.id}`",
    );
  });

  it("supports the configured reply-to address without hard-coding a secret", () => {
    expect(worker).toContain(
      "process.env.RESEND_REPLY_TO",
    );
    expect(worker).toContain(
      "replyTo: config.replyTo",
    );
    expect(worker).not.toContain(
      "contact.nicolas.auto9@gmail.com",
    );
  });

  it("keeps Resend credentials server-side", () => {
    expect(worker).toContain(
      "process.env.RESEND_API_KEY",
    );
    expect(worker).toContain(
      "process.env.RESEND_FROM_EMAIL",
    );

    expect(worker).not.toContain(
      "NEXT_PUBLIC_RESEND",
    );
  });

  it("dispatches appointment confirmations through the existing worker", () => {
    expect(worker).toContain(
      'case "appointment.confirmed.v1"',
    );
    expect(worker).toContain(
      "deliverAppointmentConfirmation(event, businessId, config)",
    );
  });

  it("tracks provider acceptance separately from final processing", () => {
    expect(worker).toContain(
      "recordAutomationOutboxProviderAcceptance",
    );
    expect(worker).toContain(
      "provider_accepted_at",
    );
  });

  it("keeps the CRM snapshot API nullable for non-review delivery URLs", () => {
    expect(crm).toContain(
      "reviewUrl: string | null",
    );
  });

  it("protects the outbox processor with CRON_SECRET", () => {
    expect(route).toContain(
      "process.env.CRON_SECRET",
    );
    expect(route).toContain(
      'request.headers.get("authorization") === `Bearer ${secret}`',
    );
  });
});
