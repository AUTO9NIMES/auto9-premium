import { Resend } from "resend";
import {
  ackAutomationOutbox,
  claimAutomationOutbox,
  getJobDetails,
  nackAutomationOutbox,
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
  settlementFailures: number;
};

type ReviewDeliveryConfig = {
  reviewUrl: string;
  resendApiKey: string;
  senderEmail: string;
};

type ReviewDelivery = {
  recipientEmail: string;
  customerName: string;
  reviewUrl: string;
};

function requireReviewDeliveryConfig(): ReviewDeliveryConfig {
  const reviewUrl = process.env.AUTO9_REVIEW_URL?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const senderEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!reviewUrl || !resendApiKey || !senderEmail) {
    throw new Error("Review delivery configuration is missing.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(reviewUrl);
  } catch {
    throw new Error("Review delivery configuration is invalid.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Review delivery URL must use HTTPS.");
  }

  return {
    reviewUrl: parsedUrl.toString(),
    resendApiKey,
    senderEmail,
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
  reviewUrl: string,
): Promise<ReviewDelivery> {
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

  return {
    recipientEmail,
    customerName: details.customer.full_name.trim() || "Client AUTO 9",
    reviewUrl,
  };
}

async function deliverReviewRequest(
  event: AutomationOutboxEvent,
  businessId: string,
  config: ReviewDeliveryConfig,
): Promise<void> {
  const delivery = await resolveReviewDelivery(
    event,
    businessId,
    config.reviewUrl,
  );

  const resend = new Resend(config.resendApiKey);

  const { data, error } = await resend.emails.send({
    from: config.senderEmail,
    to: [delivery.recipientEmail],
    subject: "Votre avis compte pour AUTO 9",
    text: [
      `Bonjour ${delivery.customerName},`,
      "",
      "Merci d’avoir fait confiance à AUTO 9.",
      "Si vous avez quelques instants, vous pouvez partager votre expérience sur Google :",
      delivery.reviewUrl,
      "",
      "Merci et à bientôt,",
      "L’équipe AUTO 9",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#111827;">
        <h1 style="font-size:24px;">Merci pour votre confiance</h1>
        <p>Bonjour ${escapeHtml(delivery.customerName)},</p>
        <p>
          Merci d’avoir fait confiance à AUTO 9.
          Si vous avez quelques instants, vous pouvez partager votre expérience sur Google.
        </p>
        <p style="margin:28px 0;">
          <a
            href="${escapeHtml(delivery.reviewUrl)}"
            style="display:inline-block;padding:14px 22px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;"
          >
            Donner mon avis
          </a>
        </p>
        <p>Merci et à bientôt,<br />L’équipe AUTO 9</p>
      </div>
    `,
  }, {
    // Stable outbox identity protects the delivery/ACK crash window.
    // Resend currently retains idempotency keys for a bounded period,
    // so the worker's overall contract remains at-least-once.
    idempotencyKey: `automation-outbox/${event.id}`,
  });

  if (error || !data?.id) {
    throw new Error("Review delivery provider rejected the request.");
  }
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
  config: ReviewDeliveryConfig,
): Promise<void> {
  switch (event.event_type) {
    case "review.requested.v1":
      await deliverReviewRequest(event, businessId, config);
      return;

    default:
      throw new Error(`Unsupported automation event type: ${event.event_type}`);
  }
}

export async function processAutomationOutbox(): Promise<WorkerResult> {
  // Validate the complete external-delivery configuration before CLAIM.
  // A missing provider configuration must never consume a lease or increment
  // attempt_count.
  const config = requireReviewDeliveryConfig();

  const { businessId } = await resolveCurrentBusinessContext();

  const events = await claimAutomationOutbox({
    businessId,
    limit: CLAIM_LIMIT,
    leaseSeconds: LEASE_SECONDS,
  });

  let acknowledged = 0;
  let retried = 0;
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
      await deliverEvent(event, businessId, config);

      try {
        await ackAutomationOutbox({
          businessId,
          outboxId: event.id,
          leaseToken: event.lease_token,
        });

        acknowledged += 1;
      } catch {
        // Delivery may already have happened. Do not NACK here: the lease
        // expires naturally and the event can replay under at-least-once
        // semantics.
        settlementFailures += 1;
      }
    } catch (error) {
      try {
        await nackAutomationOutbox({
          businessId,
          outboxId: event.id,
          leaseToken: event.lease_token,
          retryAfterSeconds: RETRY_AFTER_SECONDS,
          error: safeWorkerError(error),
        });

        retried += 1;
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
    settlementFailures,
  };
}
