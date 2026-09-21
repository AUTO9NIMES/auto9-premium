import { Resend } from "resend";
import {
  ackAutomationOutbox,
  claimAutomationOutbox,
  getJobDetails,
  nackAutomationOutbox,
  recordAutomationOutboxDeliverySnapshot,
  recordAutomationOutboxProviderAcceptance,
  type AutomationOutboxEvent,
} from "./crm";
import { resolveCurrentBusinessContext } from "./business";
import { supabaseRest } from "./supabase";

const CLAIM_LIMIT = 10;
const LEASE_SECONDS = 300;
const RETRY_AFTER_SECONDS = 300;
const MIN_DELIVERY_LEASE_REMAINING_MS = 30_000;

type WorkerResult = {
  claimed: number;
  acknowledged: number;
  retried: number;
  quarantined: number;
  settlementFailures: number;
};

type EmailDeliveryConfig = {
  reviewUrl: string | null;
  resendApiKey: string;
  senderEmail: string;
  replyTo: string | null;
};

type EmailDelivery = {
  recipientEmail: string;
  customerName: string;
  reviewUrl: string | null;
  senderEmail: string;
  subject: string;
  text: string;
  html: string;
};

function requireEmailDeliveryConfig(): EmailDeliveryConfig {
  const reviewUrl = process.env.AUTO9_REVIEW_URL?.trim() || null;
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const senderEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || null;

  if (!resendApiKey || !senderEmail) {
    throw new Error("Email delivery configuration is missing.");
  }

  let normalizedReviewUrl: string | null = null;

  if (reviewUrl) {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(reviewUrl);
    } catch {
      throw new Error("Review delivery configuration is invalid.");
    }

    if (parsedUrl.protocol !== "https:") {
      throw new Error("Review delivery URL must use HTTPS.");
    }

    normalizedReviewUrl = parsedUrl.toString();
  }

  return {
    reviewUrl: normalizedReviewUrl,
    resendApiKey,
    senderEmail,
    replyTo,
  };
}

function safeWorkerError(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.includes("Unsupported automation event type")
  ) {
    return "unsupported_event_type";
  }

  if (
    error instanceof Error &&
    error.message.includes("Review delivery data is inconsistent")
  ) {
    return "review_delivery_data_inconsistent";
  }

  if (
    error instanceof Error &&
    error.message.includes("Review delivery recipient is missing")
  ) {
    return "review_delivery_recipient_missing";
  }

  if (
    error instanceof Error &&
    error.message.includes("Review delivery provider rejected")
  ) {
    return "review_delivery_provider_rejected";
  }

  return "automation_delivery_failed";
}

async function resolveReviewDelivery(
  event: AutomationOutboxEvent,
  businessId: string,
  config: EmailDeliveryConfig,
): Promise<EmailDelivery> {
  if (!event.review_request_id) {
    throw new Error("Review delivery data is inconsistent.");
  }

  const reviewRequestRows = await supabaseRest<{
    id: string;
    business_id: string;
    job_id: string;
  }>(
    "review_requests",
    "GET",
    null,
    `business_id=eq.${encodeURIComponent(
      businessId,
    )}&id=eq.${encodeURIComponent(
      event.review_request_id,
    )}&limit=1&select=id,business_id,job_id`,
  );

  const reviewRequest = Array.isArray(reviewRequestRows)
    ? reviewRequestRows[0]
    : reviewRequestRows;

  if (
    !reviewRequest ||
    reviewRequest.id !== event.review_request_id ||
    reviewRequest.business_id !== businessId
  ) {
    throw new Error("Review delivery data is inconsistent.");
  }

  const details = await getJobDetails(reviewRequest.job_id);

  if (
    !details ||
    details.job.business_id !== businessId ||
    details.reviewRequest?.id !== event.review_request_id
  ) {
    throw new Error("Review delivery data is inconsistent.");
  }

  const recipientEmail = details.customer.email?.trim();

  if (!recipientEmail) {
    throw new Error("Review delivery recipient is missing.");
  }

  const customerName =
    details.customer.full_name.trim() || "Client AUTO 9";
  const reviewUrl = config.reviewUrl;

  if (!reviewUrl) {
    throw new Error("Review delivery configuration is missing.");
  }

  return {
    recipientEmail,
    customerName,
    reviewUrl,
    senderEmail: config.senderEmail,
    subject: "Votre avis compte pour AUTO 9",
    text: [
      `Bonjour ${customerName},`,
      "",
      "Merci d’avoir fait confiance à AUTO 9.",
      "Si vous avez quelques instants, vous pouvez partager votre expérience sur Google :",
      reviewUrl,
      "",
      "Merci et à bientôt,",
      "L’équipe AUTO 9",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#111827;">
        <h1 style="font-size:24px;">Merci pour votre confiance</h1>
        <p>Bonjour ${escapeHtml(customerName)},</p>
        <p>
          Merci d’avoir fait confiance à AUTO 9.
          Si vous avez quelques instants, vous pouvez partager votre expérience sur Google.
        </p>
        <p style="margin:28px 0;">
          <a
            href="${escapeHtml(reviewUrl)}"
            style="display:inline-block;padding:14px 22px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;"
          >
            Donner mon avis
          </a>
        </p>
        <p>Merci et à bientôt,<br />L’équipe AUTO 9</p>
      </div>
    `,
  };
}


async function resolveAppointmentConfirmationDelivery(
  event: AutomationOutboxEvent,
  businessId: string,
  config: EmailDeliveryConfig,
): Promise<EmailDelivery> {
  if (!event.appointment_id) {
    throw new Error("Appointment confirmation event is missing appointment_id.");
  }

  const appointmentRows = await supabaseRest<{
    id: string;
    business_id: string;
    customer_id: string;
    job_id: string;
    vehicle_id: string | null;
    status: string;
    scheduled_at: string | null;
  }>(
    "appointments",
    "GET",
    null,
    `business_id=eq.${encodeURIComponent(
      businessId,
    )}&id=eq.${encodeURIComponent(
      event.appointment_id,
    )}&limit=1&select=id,business_id,customer_id,job_id,vehicle_id,status,scheduled_at`,
  );

  const appointment = Array.isArray(appointmentRows)
    ? appointmentRows[0]
    : null;

  if (
    !appointment ||
    appointment.id !== event.appointment_id ||
    appointment.business_id !== businessId ||
    appointment.status !== "CONFIRMED" ||
    !appointment.scheduled_at
  ) {
    throw new Error("Appointment confirmation delivery data is inconsistent.");
  }

  const [customerRows, jobRows] = await Promise.all([
    supabaseRest<{
      id: string;
      business_id: string;
      full_name: string;
      email: string | null;
    }>(
      "customers",
      "GET",
      null,
      `business_id=eq.${encodeURIComponent(
        businessId,
      )}&id=eq.${encodeURIComponent(
        appointment.customer_id,
      )}&limit=1&select=id,business_id,full_name,email`,
    ),

    supabaseRest<{
      id: string;
      business_id: string;
      status: string;
      scheduled_at: string | null;
      vehicle_id: string | null;
    }>(
      "jobs",
      "GET",
      null,
      `business_id=eq.${encodeURIComponent(
        businessId,
      )}&id=eq.${encodeURIComponent(
        appointment.job_id,
      )}&limit=1&select=id,business_id,status,scheduled_at,vehicle_id`,
    ),
  ]);

  const customer = Array.isArray(customerRows)
    ? customerRows[0]
    : null;

  const job = Array.isArray(jobRows)
    ? jobRows[0]
    : null;

  if (
    !customer ||
    customer.business_id !== businessId ||
    !job ||
    job.business_id !== businessId ||
    job.status !== "CONFIRMED" ||
    job.scheduled_at !== appointment.scheduled_at
  ) {
    throw new Error("Appointment confirmation delivery data is inconsistent.");
  }

  const vehicleId = appointment.vehicle_id || job.vehicle_id;

  if (!vehicleId) {
    throw new Error("Appointment confirmation vehicle is missing.");
  }

  const vehicleRows = await supabaseRest<{
    id: string;
    business_id: string;
    brand: string;
    model: string;
    plate: string | null;
  }>(
    "vehicles",
    "GET",
    null,
    `business_id=eq.${encodeURIComponent(
      businessId,
    )}&id=eq.${encodeURIComponent(
      vehicleId,
    )}&limit=1&select=id,business_id,brand,model,plate`,
  );

  const vehicle = Array.isArray(vehicleRows)
    ? vehicleRows[0]
    : null;

  if (
    !vehicle ||
    vehicle.id !== vehicleId ||
    vehicle.business_id !== businessId
  ) {
    throw new Error("Appointment confirmation delivery data is inconsistent.");
  }

  const recipientEmail = customer.email?.trim();
  const customerName = customer.full_name.trim() || "Client AUTO 9";

  if (!recipientEmail) {
    throw new Error("Appointment confirmation recipient is missing.");
  }

  const date = new Date(appointment.scheduled_at);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Appointment confirmation scheduled_at is invalid.");
  }

  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  const timeLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  const vehicleLabel = [vehicle.brand.trim(), vehicle.model.trim()]
    .filter(Boolean)
    .join(" ");

  const plate = vehicle.plate?.trim() || "";

  const subject =
    `Confirmation de votre rendez-vous AUTO9 – ${dateLabel} à ${timeLabel}`;

  const text = [
    `Bonjour ${customerName},`,
    "",
    "Votre rendez-vous AUTO9 est confirmé.",
    "",
    `Date : ${dateLabel}`,
    `Heure : ${timeLabel}`,
    vehicleLabel ? `Véhicule : ${vehicleLabel}` : null,
    plate ? `Immatriculation : ${plate}` : null,
    "",
    "À bientôt,",
    "AUTO9",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const html = [
    `<p>Bonjour ${escapeHtml(customerName)},</p>`,
    "<p>Votre rendez-vous AUTO9 est <strong>confirmé</strong>.</p>",
    "<p>",
    `<strong>Date :</strong> ${escapeHtml(dateLabel)}<br>`,
    `<strong>Heure :</strong> ${escapeHtml(timeLabel)}`,
    vehicleLabel
      ? `<br><strong>Véhicule :</strong> ${escapeHtml(vehicleLabel)}`
      : "",
    plate
      ? `<br><strong>Immatriculation :</strong> ${escapeHtml(plate)}`
      : "",
    "</p>",
    "<p>À bientôt,<br>AUTO9</p>",
  ].join("");

  return {
    recipientEmail,
    customerName,
    reviewUrl: null,
    senderEmail: config.senderEmail,
    subject,
    text,
    html,
  };
}

async function deliverAppointmentConfirmation(
  event: AutomationOutboxEvent,
  businessId: string,
  config: EmailDeliveryConfig,
): Promise<string> {
  let delivery: EmailDelivery;

  if (event.delivery_recipient_email) {
    if (
      !event.delivery_customer_name ||
      event.delivery_review_url !== null ||
      !event.delivery_sender_email ||
      !event.delivery_subject ||
      !event.delivery_text ||
      !event.delivery_html
    ) {
      throw new Error("Appointment confirmation delivery snapshot is incomplete.");
    }

    delivery = {
      recipientEmail: event.delivery_recipient_email,
      customerName: event.delivery_customer_name,
      reviewUrl: null,
      senderEmail: event.delivery_sender_email,
      subject: event.delivery_subject,
      text: event.delivery_text,
      html: event.delivery_html,
    };
  } else {
    const resolved = await resolveAppointmentConfirmationDelivery(
      event,
      businessId,
      config,
    );

    const snapshotted = await recordAutomationOutboxDeliverySnapshot({
      businessId,
      outboxId: event.id,
      leaseToken: event.lease_token!,
      recipientEmail: resolved.recipientEmail,
      customerName: resolved.customerName,
      reviewUrl: null,
      senderEmail: resolved.senderEmail,
      subject: resolved.subject,
      text: resolved.text,
      html: resolved.html,
    });

    if (
      !snapshotted.delivery_recipient_email ||
      !snapshotted.delivery_customer_name ||
      snapshotted.delivery_review_url !== null ||
      !snapshotted.delivery_sender_email ||
      !snapshotted.delivery_subject ||
      !snapshotted.delivery_text ||
      !snapshotted.delivery_html
    ) {
      throw new Error("Appointment confirmation delivery snapshot is incomplete.");
    }

    delivery = {
      recipientEmail: snapshotted.delivery_recipient_email,
      customerName: snapshotted.delivery_customer_name,
      reviewUrl: null,
      senderEmail: snapshotted.delivery_sender_email,
      subject: snapshotted.delivery_subject,
      text: snapshotted.delivery_text,
      html: snapshotted.delivery_html,
    };
  }

  const resend = new Resend(config.resendApiKey);

  const { data, error } = await resend.emails.send({
    from: delivery.senderEmail,
    to: [delivery.recipientEmail],
    ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    subject: delivery.subject,
    text: delivery.text,
    html: delivery.html,
  }, {
    idempotencyKey: `automation-outbox/${event.id}`,
  });

  if (error || !data?.id) {
    throw new Error("Appointment confirmation provider rejected the request.");
  }

  return data.id;
}

async function deliverReviewRequest(
  event: AutomationOutboxEvent,
  businessId: string,
  config: EmailDeliveryConfig,
): Promise<string> {
  let delivery: EmailDelivery;

  if (
    event.delivery_recipient_email &&
    event.delivery_customer_name &&
    event.delivery_review_url &&
    event.delivery_sender_email &&
    event.delivery_subject &&
    event.delivery_text &&
    event.delivery_html
  ) {
    delivery = {
      recipientEmail: event.delivery_recipient_email,
      customerName: event.delivery_customer_name,
      reviewUrl: event.delivery_review_url,
      senderEmail: event.delivery_sender_email,
      subject: event.delivery_subject,
      text: event.delivery_text,
      html: event.delivery_html,
    };
  } else {
    const resolved = await resolveReviewDelivery(event, businessId, config);

    const snapshotted = await recordAutomationOutboxDeliverySnapshot({
      businessId,
      outboxId: event.id,
      leaseToken: event.lease_token!,
      recipientEmail: resolved.recipientEmail,
      customerName: resolved.customerName,
      reviewUrl: resolved.reviewUrl,
      senderEmail: resolved.senderEmail,
      subject: resolved.subject,
      text: resolved.text,
      html: resolved.html,
    });

    if (
      !snapshotted.delivery_recipient_email ||
      !snapshotted.delivery_customer_name ||
      !snapshotted.delivery_review_url ||
      !snapshotted.delivery_sender_email ||
      !snapshotted.delivery_subject ||
      !snapshotted.delivery_text ||
      !snapshotted.delivery_html
    ) {
      throw new Error("Delivery snapshot is incomplete.");
    }

    delivery = {
      recipientEmail: snapshotted.delivery_recipient_email,
      customerName: snapshotted.delivery_customer_name,
      reviewUrl: snapshotted.delivery_review_url,
      senderEmail: snapshotted.delivery_sender_email,
      subject: snapshotted.delivery_subject,
      text: snapshotted.delivery_text,
      html: snapshotted.delivery_html,
    };
  }

  const resend = new Resend(config.resendApiKey);

  const { data, error } = await resend.emails.send({
    from: delivery.senderEmail,
    to: [delivery.recipientEmail],
    ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    subject: delivery.subject,
    text: delivery.text,
    html: delivery.html,
  }, {
    // Stable outbox identity protects the delivery/ACK crash window.
    // Resend currently retains idempotency keys for a bounded period,
    // so the worker's overall contract remains at-least-once.
    idempotencyKey: `automation-outbox/${event.id}`,
  });

  if (error || !data?.id) {
    throw new Error("Review delivery provider rejected the request.");
  }

  return data.id;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function deliverEvent(
  event: AutomationOutboxEvent,
  businessId: string,
  config: EmailDeliveryConfig,
): Promise<string> {
  switch (event.event_type) {
    case "review.requested.v1":
      return deliverReviewRequest(event, businessId, config);

    case "appointment.confirmed.v1":
      return deliverAppointmentConfirmation(event, businessId, config);

    default:
      throw new Error(`Unsupported automation event type: ${event.event_type}`);
  }
}

export async function processAutomationOutbox(): Promise<WorkerResult> {
  // Validate the complete external-delivery configuration before CLAIM.
  // A missing provider configuration must never consume a lease or increment
  // attempt_count.
  const config = requireEmailDeliveryConfig();

  const { businessId } = await resolveCurrentBusinessContext();

  const events = await claimAutomationOutbox({
    businessId,
    limit: CLAIM_LIMIT,
    leaseSeconds: LEASE_SECONDS,
  });

  let acknowledged = 0;
  let retried = 0;
  let quarantined = 0;
  let settlementFailures = 0;

  for (const event of events) {
    if (!event.lease_token || !event.leased_until) {
      settlementFailures += 1;
      continue;
    }

    const leasedUntilMs = Date.parse(event.leased_until);
    const leaseRemainingMs = leasedUntilMs - Date.now();

    if (
      !Number.isFinite(leasedUntilMs) ||
      leaseRemainingMs < MIN_DELIVERY_LEASE_REMAINING_MS
    ) {
      settlementFailures += 1;
      continue;
    }

    try {
      if (!event.provider_accepted_at || !event.provider_message_id) {
        const providerMessageId = await deliverEvent(event, businessId, config);

        try {
          await recordAutomationOutboxProviderAcceptance({
            businessId,
            outboxId: event.id,
            leaseToken: event.lease_token,
            providerMessageId,
          });
        } catch {
          // The provider may already have accepted the delivery. Do not NACK:
          // the lease expires naturally and the stable provider idempotency key
          // remains the fallback for this unresolved acceptance window.
          settlementFailures += 1;
          continue;
        }
      }

      try {
        await ackAutomationOutbox({
          businessId,
          outboxId: event.id,
          leaseToken: event.lease_token,
        });

        acknowledged += 1;
      } catch {
        // A durable provider acceptance may already exist. Do not NACK here:
        // the lease expires naturally, then replay skips provider delivery and
        // retries only the ACK under at-least-once semantics.
        settlementFailures += 1;
      }
    } catch (error) {
      try {
        const settled = await nackAutomationOutbox({
          businessId,
          outboxId: event.id,
          leaseToken: event.lease_token,
          retryAfterSeconds: RETRY_AFTER_SECONDS,
          error: safeWorkerError(error),
        });

        if (settled.quarantined_at) {
          quarantined += 1;
        } else {
          retried += 1;
        }
      } catch {
        // Keep processing the rest of the claimed batch. This event remains
        // leased until expiry and can then be reclaimed safely.
        settlementFailures += 1;
      }
    }
  }

  return {
    claimed: events.length,
    acknowledged,
    retried,
    quarantined,
    settlementFailures,
  };
}
