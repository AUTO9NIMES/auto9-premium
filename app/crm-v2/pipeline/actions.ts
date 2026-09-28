"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../lib/auth/dal";
import {
  recordJobPayment, transitionLeadStatus,
  updateDraftQuoteAmount, type Payment, type UpdateDraftQuoteAmountResult,
} from "../../lib/crm";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";

const allowedMethods = new Set<Payment["method"]>(["CASH", "CARD", "BANK_TRANSFER"]);

export async function recordV2Payment(formData: FormData) {
  await requireCrmAccess();

  const jobId = String(formData.get("jobId") || "").trim();
  const method = String(formData.get("method") || "").trim() as Payment["method"];

  if (!jobId || !allowedMethods.has(method)) {
    redirect("/crm-v2/pipeline?payment_error=invalid");
  }

  try {
    await recordJobPayment({
      idempotencyKey: crypto.randomUUID(),
      jobId,
      method,
    });
  } catch {
    redirect("/crm-v2/pipeline?payment_error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm/jobs");
  redirect("/crm-v2/pipeline?payment=recorded");
}


export async function recordV2ManualPayment(formData: FormData) {
  await requireCrmAccess();

  const leadId = String(formData.get("leadId") || "").trim();
  const method = String(formData.get("method") || "").trim();

  if (!UUID_REGEX.test(leadId) || !["CASH", "CARD_BANK"].includes(method)) {
    redirect("/crm-v2/pipeline?payment_error=invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  try {
    const rows = await supabaseRest<Array<{ id: string; customer_id: string }>>(
      "leads",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${leadId}&select=id,customer_id&limit=1`,
    );
    const lead = (rows as Array<{ id: string; customer_id: string }> | null)?.[0];

    if (!lead) {
      redirect("/crm-v2/pipeline?payment_error=invalid");
    }

    const serviceRows = await supabaseRest<Array<{ base_price: number | null }>>(
      "lead_services",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=eq.${leadId}&order=created_at.desc&select=base_price&limit=1`,
    );
    const paymentAmount = Number(
      (serviceRows as Array<{ base_price: number | null }> | null)?.[0]?.base_price,
    );

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      redirect("/crm-v2/pipeline?payment_error=amount_missing");
    }

    await supabaseRest(
      "activity_log",
      "POST",
      {
        business_id: businessId,
        customer_id: lead.customer_id,
        lead_id: leadId,
        event_type: "crm_v2.step.completed",
        event_data: {
          step_key: "PAID",
          source: "crm_v2_pipeline",
          payment_method: method,
          payment_amount: paymentAmount,
        },
      },
      "select=id",
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/crm-v2/pipeline?payment_error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/revenue");
  revalidatePath("/crm-v2/pipeline");
  redirect("/crm-v2/pipeline?payment=manual_recorded");
}


const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function cancelV2Lead(formData: FormData) {
  await requireCrmAccess();

  const leadId = String(formData.get("leadId") || "").trim();
  const comment = String(formData.get("comment") || "").trim().slice(0, 1000);

  if (!UUID_REGEX.test(leadId)) {
    redirect("/crm-v2/pipeline?lead_error=invalid");
  }

  let customerId: string;
  try {
    // The canonical helper resolves the business server-side. The RPC owns
    // lifecycle eligibility, related-record protection, replay and activity.
    const result = await transitionLeadStatus({
      leadId,
      targetStatus: "CLOSED_LOST",
      source: "crm_v2",
      comment: comment || null,
    });
    customerId = result.lead.customer_id;
  } catch {
    redirect("/crm-v2/pipeline?lead_error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/clients");
  revalidatePath("/crm-v2/calendar");
  revalidatePath("/crm");
  revalidatePath("/crm/pipeline");
  revalidatePath(`/crm/pipeline/${leadId}`);
  if (customerId) {
    revalidatePath(`/crm/clients/${customerId}`);
    revalidatePath(`/crm-v2/clients/${customerId}`);
  }
  redirect("/crm-v2/pipeline?lead_cancelled=1");
}

export async function deleteV2Lead(formData: FormData) {
  await requireCrmAccess();

  const leadId = String(formData.get("leadId") || "").trim();
  if (!UUID_REGEX.test(leadId)) {
    redirect("/crm-v2/pipeline?lead_error=invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  try {
    const jobs = await supabaseRest<Array<{ id: string }>>(
      "jobs",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=eq.${leadId}&select=id&limit=1`,
    );

    if ((jobs as Array<{ id: string }> | null)?.length) {
      redirect("/crm-v2/pipeline?lead_error=linked");
    }

    await supabaseRest(
      "leads",
      "DELETE",
      null,
      `business_id=eq.${businessId}&id=eq.${leadId}`,
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/crm-v2/pipeline?lead_error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm/pipeline");
  redirect("/crm-v2/pipeline?lead_deleted=1");
}


const MANUAL_STEPS = [
  "CONTACTED",
  "QUOTE_SENT",
  "BOOKED",
  "IN_PROGRESS",
  "COMPLETED",
  "PAID",
  "REVIEW_REQUESTED",
] as const;

type ManualStepKey = (typeof MANUAL_STEPS)[number];

function isManualStepKey(value: string): value is ManualStepKey {
  return MANUAL_STEPS.includes(value as ManualStepKey);
}

export async function toggleV2LeadStep(formData: FormData) {
  await requireCrmAccess();

  const leadId = String(formData.get("leadId") || "").trim();
  const stepKey = String(formData.get("stepKey") || "").trim();
  const nextDone = String(formData.get("nextDone") || "") === "1";

  if (!UUID_REGEX.test(leadId) || !isManualStepKey(stepKey)) {
    redirect("/crm-v2/pipeline?step_error=invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  try {
    const leadRows = await supabaseRest<Array<{ id: string; customer_id: string }>>(
      "leads",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${leadId}&select=id,customer_id&limit=1`,
    );
    const lead = (leadRows as Array<{ id: string; customer_id: string }> | null)?.[0];
    if (!lead) redirect("/crm-v2/pipeline?step_error=invalid");

    const targetIndex = MANUAL_STEPS.indexOf(stepKey);
    const affected = nextDone
      ? MANUAL_STEPS.slice(0, targetIndex + 1)
      : MANUAL_STEPS.slice(targetIndex);

    for (const key of affected) {
      await supabaseRest(
        "activity_log",
        "POST",
        {
          business_id: businessId,
          customer_id: lead.customer_id,
          lead_id: leadId,
          event_type: nextDone ? "crm_v2.step.completed" : "crm_v2.step.reopened",
          event_data: {
            step_key: key,
            source: "crm_v2_pipeline",
          },
        },
        "select=id",
      );
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/crm-v2/pipeline?step_error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  redirect("/crm-v2/pipeline?step_updated=1");
}


function parisLocalDateTimeToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, y, mo, d, h, mi] = match;
  const localAsUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  const probe = new Date(localAsUtc);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(probe);
  const zone = parts.find((part) => part.type === "timeZoneName")?.value || "GMT+0";
  const zoneMatch = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(zone);
  const offsetMinutes = zoneMatch
    ? (zoneMatch[1] === "+" ? 1 : -1) *
      (Number(zoneMatch[2]) * 60 + Number(zoneMatch[3] || 0))
    : 0;

  return new Date(localAsUtc - offsetMinutes * 60_000).toISOString();
}

function parisDateTimeLocalFromIso(value: string): string | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));

  return `${map.get("year")}-${map.get("month")}-${map.get("day")}T${map.get("hour")}:${map.get("minute")}`;
}

function validExpectedTimestamp(value: string): boolean {
  return Boolean(value) &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) &&
    Number.isFinite(Date.parse(value));
}

// All dossier and canonical customer changes execute inside one PostgreSQL RPC.
export async function updateV2LeadDetails(formData: FormData) {
  await requireCrmAccess();

  const leadId = String(formData.get("leadId") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const serviceName = String(formData.get("serviceName") || "").trim();
  const dossierDateTime = String(formData.get("dossierDateTime") || "").trim();
  const note = String(formData.get("note") || "").trim();

  const expectedLeadUpdatedAt = String(formData.get("expectedLeadUpdatedAt") || "").trim();
  const expectedCustomerUpdatedAt = String(formData.get("expectedCustomerUpdatedAt") || "").trim();
  const expectedCreatedAt = String(formData.get("expectedCreatedAt") || "").trim();
  const expectedServiceId = String(formData.get("expectedServiceId") || "").trim();
  const expectedServiceUpdatedAt = String(formData.get("expectedServiceUpdatedAt") || "").trim();
  const expectedServiceNameValue = formData.get("expectedServiceName");
  const expectedServiceName =
    typeof expectedServiceNameValue === "string" ? expectedServiceNameValue : "";

  const parsedCreatedAt = parisLocalDateTimeToIso(dossierDateTime);
  const displayedOriginalDate = parisDateTimeLocalFromIso(expectedCreatedAt);
  const hasExpectedService = expectedServiceId.length > 0;

  if (
    !UUID_REGEX.test(leadId) ||
    !fullName || fullName.length > 200 ||
    (hasExpectedService && !serviceName) || serviceName.length > 200 ||
    note.length > 2000 ||
    !validExpectedTimestamp(expectedLeadUpdatedAt) ||
    !validExpectedTimestamp(expectedCustomerUpdatedAt) ||
    !validExpectedTimestamp(expectedCreatedAt) ||
    !parsedCreatedAt ||
    !displayedOriginalDate ||
    (hasExpectedService && (
      !UUID_REGEX.test(expectedServiceId) ||
      !validExpectedTimestamp(expectedServiceUpdatedAt)
    )) ||
    (!hasExpectedService && (expectedServiceUpdatedAt || expectedServiceName))
  ) {
    redirect("/crm-v2/pipeline?edit_error=invalid");
  }

  // The browser edits minutes, but the database stores seconds and fractions.
  // Preserve the exact original timestamp when the displayed date is unchanged.
  const dossierCreatedAt = dossierDateTime === displayedOriginalDate
    ? expectedCreatedAt
    : parsedCreatedAt;

  // Reject an impossible local time rather than silently shifting the date.
  if (
    dossierDateTime !== displayedOriginalDate &&
    parisDateTimeLocalFromIso(dossierCreatedAt) !== dossierDateTime
  ) {
    redirect("/crm-v2/pipeline?edit_error=invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();
  const nameParts = fullName.split(/\s+/).filter(Boolean);

  let customerId: string | null = null;
  let failure: "invalid" | "not_found" | "conflict" | "blocked" | null = null;

  try {
    const response = await supabaseRest<unknown>(
      "rpc/update_v2_dossier_atomically",
      "POST",
      {
        p_business_id: businessId,
        p_lead_id: leadId,
        p_expected_lead_updated_at: expectedLeadUpdatedAt,
        p_expected_customer_updated_at: expectedCustomerUpdatedAt,
        p_expected_created_at: expectedCreatedAt,
        p_expected_service_id: hasExpectedService ? expectedServiceId : null,
        p_expected_service_updated_at: hasExpectedService ? expectedServiceUpdatedAt : null,
        p_expected_service_name: hasExpectedService ? expectedServiceName : null,
        p_full_name: fullName,
        p_first_name: nameParts[0] || null,
        p_last_name: nameParts.slice(1).join(" ") || null,
        p_email: email || null,
        p_phone: phone || null,
        p_city: city || null,
        p_service_name: serviceName || null,
        p_note: note || null,
        p_created_at: dossierCreatedAt,
      },
    );

    if (!response || typeof response !== "object" || Array.isArray(response)) {
      throw new Error("Invalid atomic dossier RPC response.");
    }

    const result = response as Record<string, unknown>;
    const status = result.status;

    if (status === "updated" || status === "no_op") {
      const lead = result.lead;
      const service = result.service;
      const profile = result.profile;

      if (
        typeof result.customer_id !== "string" ||
        !UUID_REGEX.test(result.customer_id) ||
        !lead || typeof lead !== "object" || Array.isArray(lead) ||
        (service === null && (
          hasExpectedService ||
          Boolean(serviceName) ||
          dossierCreatedAt !== expectedCreatedAt
        )) ||
        (service !== null && (
          typeof service !== "object" || Array.isArray(service)
        )) ||
        !profile || typeof profile !== "object" || Array.isArray(profile)
      ) {
        throw new Error("Incomplete atomic dossier RPC result.");
      }

      const returnedLead = lead as Record<string, unknown>;
      const returnedService = service as Record<string, unknown> | null;
      const returnedProfile = profile as Record<string, unknown>;
      const returnedCustomer = returnedProfile.customer;

      if (
        returnedLead.id !== leadId ||
        returnedLead.business_id !== businessId ||
        returnedLead.customer_id !== result.customer_id ||
        (returnedService !== null && (
          typeof returnedService.id !== "string" ||
          !UUID_REGEX.test(returnedService.id) ||
          returnedService.business_id !== businessId ||
          returnedService.lead_id !== leadId ||
          (hasExpectedService &&
            returnedService.id.toLowerCase() !== expectedServiceId.toLowerCase()) ||
          returnedService.service_name !== serviceName
        )) ||
        !returnedCustomer || typeof returnedCustomer !== "object" ||
        Array.isArray(returnedCustomer) ||
        (returnedCustomer as Record<string, unknown>).id !== result.customer_id ||
        (returnedCustomer as Record<string, unknown>).business_id !== businessId ||
        (status === "no_op" && (
          hasExpectedService
            ? expectedServiceName !== serviceName
            : Boolean(serviceName)
        ))
      ) {
        throw new Error("Inconsistent atomic dossier RPC ownership.");
      }

      customerId = result.customer_id;
    } else if (
      status === "invalid" ||
      status === "not_found" ||
      status === "conflict" ||
      status === "blocked"
    ) {
      failure = status;
    } else {
      throw new Error("Unknown atomic dossier RPC status.");
    }
  } catch {
    redirect("/crm-v2/pipeline?edit_error=unavailable");
  }

  if (failure) redirect(`/crm-v2/pipeline?edit_error=${failure}`);
  if (!customerId) redirect("/crm-v2/pipeline?edit_error=unavailable");

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/clients");
  revalidatePath(`/crm-v2/clients/${customerId}`);
  revalidatePath("/crm");
  revalidatePath("/crm/clients");
  revalidatePath(`/crm/clients/${customerId}`);
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm/pipeline/[leadId]", "page");
  revalidatePath("/crm/jobs");
  revalidatePath("/crm/jobs/[jobId]", "page");

  redirect("/crm-v2/pipeline?edit_updated=1");
}

export async function updateV2DraftPrice(formData: FormData) {
  await requireCrmAccess();

  const quoteId = String(formData.get("quoteId") || "").trim();
  const rawPrice = String(formData.get("price") || "").trim().replace(",", ".");
  const rawExpected = formData.get("expectedPrice");
  const expected = typeof rawExpected === "string" ? rawExpected.trim() : "";
  const totalPrice = Number(rawPrice);
  // Explicit null represents a displayed legacy quote with no amount. Missing
  // expectedPrice must not silently become null and bypass the form contract.
  const expectedTotalPrice = expected === "null" ? null : Number(expected);
  const amountPattern = /^\d+(?:\.\d{1,2})?$/;
  if (
    !UUID_REGEX.test(quoteId) || !amountPattern.test(rawPrice) ||
    !Number.isFinite(totalPrice) || totalPrice <= 0 || totalPrice > 10000000 ||
    (expected !== "null" && (
      !expected || !Number.isFinite(expectedTotalPrice) ||
      expectedTotalPrice === null || expectedTotalPrice < 0 || expectedTotalPrice > 10000000
    ))
  ) {
    redirect("/crm-v2/pipeline?price_error=invalid_amount");
  }

  let result: UpdateDraftQuoteAmountResult;
  try {
    result = await updateDraftQuoteAmount({ quoteId, expectedTotalPrice, totalPrice });
  } catch {
    redirect("/crm-v2/pipeline?price_error=unavailable");
  }
  if (result.status !== "updated" && result.status !== "no_op") {
    redirect(`/crm-v2/pipeline?price_error=${result.status}`);
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/clients");
  revalidatePath("/crm");
  revalidatePath("/crm/pipeline");
  if (result.leadId) revalidatePath(`/crm/pipeline/${result.leadId}`);
  // The RPC returns the lead, not the customer ID. Invalidate the two Customer
  // 360 page patterns without adding a fallible read after a committed mutation.
  revalidatePath("/crm/clients/[customerId]", "page");
  revalidatePath("/crm-v2/clients/[customerId]", "page");
  redirect("/crm-v2/pipeline?price_updated=1");
}
