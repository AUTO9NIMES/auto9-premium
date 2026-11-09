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
import { parsePaymentDay } from "../../lib/payment-date";

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
  // Date du paiement (facultative) : sans date, l'heure d'enregistrement fait foi.
  const rawDay = String(formData.get("receivedOn") || "").trim();
  const receivedOn = rawDay ? parsePaymentDay(rawDay) : null;

  if (!UUID_REGEX.test(leadId) || !["CASH", "CARD_BANK"].includes(method)) {
    redirect("/crm-v2/pipeline?payment_error=invalid");
  }
  if (rawDay && !receivedOn) {
    redirect("/crm-v2/pipeline?payment_error=date_invalid");
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
          ...(receivedOn ? { payment_received_on: receivedOn } : {}),
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

type PaidStepEvent = {
  event_type: string;
  customer_id: string | null;
  event_data: Record<string, unknown> | null;
  created_at: string;
};

/*
 * Paiement « Paiement reçu » actif d'un dossier (même règle que le calcul du
 * chiffre d'affaires) : le plus récent paiement avec un mode, sauf si une
 * remise en attente de l'étape est plus récente. Les validations d'étape
 * sans mode (cochage en cascade) sont ignorées.
 */
async function findActiveManualPayment(businessId: string, leadId: string) {
  const rows = await supabaseRest<PaidStepEvent[]>(
    "activity_log",
    "GET",
    null,
    `business_id=eq.${businessId}&lead_id=eq.${leadId}` +
      "&event_type=in.(crm_v2.step.completed,crm_v2.step.reopened)" +
      "&event_data->>step_key=eq.PAID&order=created_at.desc&limit=50" +
      "&select=event_type,customer_id,event_data,created_at",
  );
  for (const row of (rows as PaidStepEvent[] | null) ?? []) {
    if (row.event_type === "crm_v2.step.reopened") return null;
    if (typeof row.event_data?.payment_method === "string") return row;
  }
  return null;
}

/*
 * Corrige la date d'un paiement « Paiement reçu » (pipeline V2).
 * Rien n'est modifié ni supprimé : une nouvelle entrée d'historique reprend
 * le mode et le montant du paiement en vigueur, avec la nouvelle date et la
 * date précédente (traçabilité comptable). Seul le dernier paiement actif du
 * dossier, dans l'entreprise courante, peut être corrigé.
 */
export async function correctV2ManualPaymentDate(formData: FormData) {
  await requireCrmAccess();

  const leadId = String(formData.get("leadId") || "").trim();
  const receivedOn = parsePaymentDay(String(formData.get("receivedOn") || ""));

  if (!UUID_REGEX.test(leadId)) {
    redirect("/crm-v2/pipeline?payment_error=invalid");
  }
  if (!receivedOn) {
    redirect("/crm-v2/pipeline?payment_error=date_invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  try {
    // Uniquement un paiement manuel actif (mode connu), jamais une annulation.
    const latest = await findActiveManualPayment(businessId, leadId);
    const data = latest?.event_data ?? null;
    if (!latest || typeof data?.payment_method !== "string") {
      redirect("/crm-v2/pipeline?payment_error=not_correctable");
    }

    const previous =
      typeof data.payment_received_on === "string" ? data.payment_received_on : latest.created_at;

    await supabaseRest(
      "activity_log",
      "POST",
      {
        business_id: businessId,
        customer_id: latest.customer_id,
        lead_id: leadId,
        event_type: "crm_v2.step.completed",
        event_data: {
          step_key: "PAID",
          source: "crm_v2_payment_date_correction",
          payment_method: data.payment_method,
          ...(data.payment_amount !== undefined ? { payment_amount: data.payment_amount } : {}),
          payment_received_on: receivedOn,
          corrected_from: previous,
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
  revalidatePath("/crm-v2/garages");
  revalidatePath("/crm-v2/pipeline");
  redirect(`/crm-v2/pipeline?payment=date_corrected#dossier-${leadId}`);
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
  const confirmCancelPayment = String(formData.get("confirmCancelPayment") || "") === "1";

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

    // Remettre une étape en attente rouvre aussi les suivantes, dont le
    // paiement : un paiement enregistré n'est jamais annulé sans la
    // confirmation explicite « Annuler le paiement ».
    if (!nextDone && affected.includes("PAID") && !confirmCancelPayment) {
      const activePayment = await findActiveManualPayment(businessId, leadId);
      if (activePayment) {
        redirect(`/crm-v2/pipeline?step_error=payment_locked#dossier-${leadId}`);
      }
    }

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
  const performanceDate = String(formData.get("performanceDate") || "").trim();
  const note = String(formData.get("note") || "").trim();

  const expectedLeadUpdatedAt = String(formData.get("expectedLeadUpdatedAt") || "").trim();
  const expectedCustomerUpdatedAt = String(formData.get("expectedCustomerUpdatedAt") || "").trim();
  const expectedCreatedAt = String(formData.get("expectedCreatedAt") || "").trim();
  const expectedPerformanceDate = String(formData.get("expectedPerformanceDate") || "").trim();
  const expectedServiceId = String(formData.get("expectedServiceId") || "").trim();
  const expectedServiceUpdatedAt = String(formData.get("expectedServiceUpdatedAt") || "").trim();
  const expectedServiceNameValue = formData.get("expectedServiceName");
  const expectedServiceName =
    typeof expectedServiceNameValue === "string" ? expectedServiceNameValue : "";

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const validDate = (value: string) => {
    if (!datePattern.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value;
  };
  const hasExpectedService = expectedServiceId.length > 0;

  if (
    !UUID_REGEX.test(leadId) ||
    !fullName || fullName.length > 200 ||
    (hasExpectedService && !serviceName) || serviceName.length > 200 ||
    note.length > 2000 ||
    !validExpectedTimestamp(expectedLeadUpdatedAt) ||
    !validExpectedTimestamp(expectedCustomerUpdatedAt) ||
    !validExpectedTimestamp(expectedCreatedAt) ||
    (performanceDate !== "" && !validDate(performanceDate)) ||
    (expectedPerformanceDate !== "" && !validDate(expectedPerformanceDate)) ||
    (hasExpectedService && (
      !UUID_REGEX.test(expectedServiceId) ||
      !validExpectedTimestamp(expectedServiceUpdatedAt)
    )) ||
    (!hasExpectedService && (expectedServiceUpdatedAt || expectedServiceName))
  ) {
    redirect("/crm-v2/pipeline?edit_error=invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();
  const nameParts = fullName.split(/\s+/).filter(Boolean);

  let customerId: string | null = null;
  let failure: "invalid" | "not_found" | "conflict" | "blocked" | null = null;

  try {
    const response = await supabaseRest<unknown>(
      "rpc/update_v2_dossier_business_date",
      "POST",
      {
        p_business_id: businessId,
        p_lead_id: leadId,
        p_expected_lead_updated_at: expectedLeadUpdatedAt,
        p_expected_customer_updated_at: expectedCustomerUpdatedAt,
        p_expected_created_at: expectedCreatedAt,
        p_expected_performance_date: expectedPerformanceDate || null,
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
        p_performance_date: performanceDate || null,
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
          performanceDate !== expectedPerformanceDate
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


/**
 * Adjust the operational amount of a manually tracked CRM V2 dossier.
 * The original issued quote remains intact. Paid dossiers and canonical jobs
 * stay locked to prevent retroactive financial changes.
 */
export async function updateV2ServicePrice(formData: FormData) {
  await requireCrmAccess();

  const leadId = String(formData.get("leadId") || "").trim();
  const serviceId = String(formData.get("serviceId") || "").trim();
  const expectedUpdatedAt = String(formData.get("expectedServiceUpdatedAt") || "").trim();
  const expectedRaw = String(formData.get("expectedServicePrice") || "").trim();
  const rawPrice = String(formData.get("servicePrice") || "").trim().replace(",", ".");
  const expectedPrice = expectedRaw === "null" ? null : Number(expectedRaw);
  const nextPrice = Number(rawPrice);
  const decimal = /^\d+(?:\.\d{1,2})?$/;

  if (
    !UUID_REGEX.test(leadId) ||
    !UUID_REGEX.test(serviceId) ||
    !validExpectedTimestamp(expectedUpdatedAt) ||
    !decimal.test(rawPrice) ||
    !Number.isFinite(nextPrice) || nextPrice <= 0 || nextPrice > 10000000 ||
    (expectedRaw !== "null" && (!decimal.test(expectedRaw) ||
      !Number.isFinite(expectedPrice) || expectedPrice === null ||
      expectedPrice < 0 || expectedPrice > 10000000))
  ) {
    redirect("/crm-v2/pipeline?price_error=invalid_amount");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  try {
    const [leads, services, linkedJobs, paidSteps] = await Promise.all([
      supabaseRest<{ id: string; lifecycle_status: string; customer_id: string }>(
        "leads", "GET", null,
        "business_id=eq." + businessId + "&id=eq." + leadId +
          "&select=id,lifecycle_status,customer_id&limit=1",
      ),
      supabaseRest<{ id: string; lead_id: string; base_price: number | null; updated_at: string }>(
        "lead_services", "GET", null,
        "business_id=eq." + businessId + "&lead_id=eq." + leadId +
          "&id=eq." + serviceId + "&select=id,lead_id,base_price,updated_at&limit=1",
      ),
      supabaseRest<{ id: string }>(
        "jobs", "GET", null,
        "business_id=eq." + businessId + "&lead_id=eq." + leadId +
          "&select=id&limit=1",
      ),
      supabaseRest<{ id: string }>(
        "activity_log", "GET", null,
        "business_id=eq." + businessId + "&lead_id=eq." + leadId +
          "&event_type=eq.crm_v2.step.completed&event_data->>step_key=eq.PAID&select=id&limit=1",
      ),
    ]);

    if (!Array.isArray(leads) || !Array.isArray(services) ||
        !Array.isArray(linkedJobs) || !Array.isArray(paidSteps)) {
      throw new Error("Missing operational dossier snapshots.");
    }

    const lead = leads[0];
    const service = services[0];
    if (!lead || !service || service.lead_id !== leadId) {
      redirect("/crm-v2/pipeline?price_error=not_found");
    }

    if (lead.lifecycle_status === "CLOSED_LOST" ||
        linkedJobs.length > 0 || paidSteps.length > 0) {
      redirect("/crm-v2/pipeline?price_error=blocked");
    }

    if (service.updated_at !== expectedUpdatedAt ||
        service.base_price !== expectedPrice) {
      redirect("/crm-v2/pipeline?price_error=conflict");
    }

    if (service.base_price === nextPrice) {
      redirect("/crm-v2/pipeline?price_updated=1");
    }

    // Conditional PATCH prevents overwriting a concurrent edit.
    const query = [
      "business_id=eq." + businessId,
      "lead_id=eq." + leadId,
      "id=eq." + serviceId,
      "updated_at=eq." + encodeURIComponent(expectedUpdatedAt),
      expectedPrice === null ? "base_price=is.null" : "base_price=eq." + expectedPrice,
      "select=id,lead_id,base_price,updated_at",
    ].join("&");

    const changed = await supabaseRest<{
      id: string;
      lead_id: string;
      base_price: number | null;
      updated_at: string;
    }>("lead_services", "PATCH", { base_price: nextPrice }, query);

    if (!changed || Array.isArray(changed) ||
        changed.id !== serviceId || changed.lead_id !== leadId ||
        Number(changed.base_price) !== nextPrice) {
      redirect("/crm-v2/pipeline?price_error=conflict");
    }

    // Keep a trace of the price adjustment without emailing the customer.
    try {
      await supabaseRest(
        "activity_log", "POST",
        {
          business_id: businessId,
          customer_id: lead.customer_id,
          lead_id: leadId,
          event_type: "crm_v2.service_price.updated",
          event_data: {
            service_id: serviceId,
            previous_amount: service.base_price,
            new_amount: nextPrice,
            source: "crm_v2_pipeline",
          },
        },
        "select=id",
      );
    } catch (auditError) {
      console.error("CRM V2 price updated but audit event failed", auditError);
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/crm-v2/pipeline?price_error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/revenue");
  revalidatePath("/crm-v2/clients");
  revalidatePath("/crm/pipeline");
  redirect("/crm-v2/pipeline?price_updated=1");
}


/**
 * Correct a canonical job's final amount prior to payment.
 * Does not alter the historical quote or any recorded payment.
 */
export async function updateV2JobPrice(formData: FormData) {
  await requireCrmAccess();
  const leadId = String(formData.get("leadId") || "").trim();
  const jobId = String(formData.get("jobId") || "").trim();
  const expectedUpdatedAt = String(formData.get("expectedJobUpdatedAt") || "").trim();
  const expectedRaw = String(formData.get("expectedJobPrice") || "").trim();
  const rawPrice = String(formData.get("jobPrice") || "").trim().replace(",", ".");
  const nextPrice = Number(rawPrice);
  const expectedPrice = expectedRaw === "null" ? null : Number(expectedRaw);
  const decimal = /^\d+(?:\.\d{1,2})?$/;

  if (
    !UUID_REGEX.test(leadId) || !UUID_REGEX.test(jobId) ||
    !validExpectedTimestamp(expectedUpdatedAt) ||
    !decimal.test(rawPrice) || !Number.isFinite(nextPrice) ||
    nextPrice <= 0 || nextPrice > 10000000 ||
    (expectedRaw !== "null" && (!decimal.test(expectedRaw) ||
      !Number.isFinite(expectedPrice) || expectedPrice === null ||
      expectedPrice < 0 || expectedPrice > 10000000))
  ) {
    redirect("/crm-v2/pipeline?price_error=invalid_amount");
  }

  const { businessId } = await resolveCurrentBusinessContext();
  try {
    const [jobs, payments, paidSteps, leads] = await Promise.all([
      supabaseRest<{ id: string; lead_id: string; customer_id: string;
        status: string; total_amount: number | null; updated_at: string }>(
        "jobs", "GET", null, "business_id=eq." + businessId +
        "&lead_id=eq." + leadId + "&id=eq." + jobId +
        "&select=id,lead_id,customer_id,status,total_amount,updated_at&limit=1",
      ),
      supabaseRest<{ id: string }>(
        "payments", "GET", null, "business_id=eq." + businessId +
        "&job_id=eq." + jobId + "&select=id&limit=1",
      ),
      supabaseRest<{ id: string }>(
        "activity_log", "GET", null, "business_id=eq." + businessId +
        "&lead_id=eq." + leadId +
        "&event_type=eq.crm_v2.step.completed&event_data->>step_key=eq.PAID&select=id&limit=1",
      ),
      supabaseRest<{ id: string; lifecycle_status: string }>(
        "leads", "GET", null, "business_id=eq." + businessId +
        "&id=eq." + leadId + "&select=id,lifecycle_status&limit=1",
      ),
    ]);
    if (!Array.isArray(jobs) || !Array.isArray(payments) ||
        !Array.isArray(paidSteps) || !Array.isArray(leads)) {
      throw new Error("Invalid job price snapshots");
    }
    const job = jobs[0];
    if (!job || !leads[0] || job.lead_id !== leadId) {
      redirect("/crm-v2/pipeline?price_error=not_found");
    }
    if (["PAID", "CANCELLED"].includes(job.status) || payments.length > 0 ||
        paidSteps.length > 0 || leads[0].lifecycle_status === "CLOSED_LOST") {
      redirect("/crm-v2/pipeline?price_error=blocked");
    }
    if (job.updated_at !== expectedUpdatedAt || job.total_amount !== expectedPrice) {
      redirect("/crm-v2/pipeline?price_error=conflict");
    }
    if (job.total_amount === nextPrice) {
      redirect("/crm-v2/pipeline?price_updated=1");
    }

    const filter = [
      "business_id=eq." + businessId, "lead_id=eq." + leadId,
      "id=eq." + jobId, "status=eq." + job.status,
      "updated_at=eq." + encodeURIComponent(expectedUpdatedAt),
      expectedPrice === null ? "total_amount=is.null" : "total_amount=eq." + expectedPrice,
      "select=id,lead_id,total_amount",
    ].join("&");
    const changed = await supabaseRest<{ id: string; lead_id: string; total_amount: number | null }>(
      "jobs", "PATCH", { total_amount: nextPrice }, filter,
    );
    if (!changed || Array.isArray(changed) || changed.id !== jobId ||
        changed.lead_id !== leadId || Number(changed.total_amount) !== nextPrice) {
      redirect("/crm-v2/pipeline?price_error=conflict");
    }

    try {
      await supabaseRest("activity_log", "POST", {
        business_id: businessId,
        customer_id: job.customer_id,
        lead_id: leadId,
        job_id: jobId,
        event_type: "crm_v2.job_price.updated",
        event_data: {
          previous_amount: job.total_amount,
          new_amount: nextPrice,
          source: "crm_v2_pipeline",
        },
      }, "select=id");
    } catch (error) {
      console.error("Job price saved but audit event failed", error);
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/crm-v2/pipeline?price_error=unavailable");
  }
  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/revenue");
  revalidatePath("/crm/jobs");
  revalidatePath("/crm/jobs/[jobId]", "page");
  redirect("/crm-v2/pipeline?price_updated=1");
}


/**
 * Independent CRM V2 contact editor: never submits the service/date fields.
 * Uses the canonical profile RPC to preserve validation, uniqueness rules,
 * birth date and history across the full customer base.
 */
export async function updateV2ContactOnly(formData: FormData) {
  await requireCrmAccess();
  const leadId = String(formData.get("leadId") || "").trim();
  const expectedUpdatedAt = String(formData.get("expectedCustomerUpdatedAt") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const city = String(formData.get("city") || "").trim();

  if (!UUID_REGEX.test(leadId) || !validExpectedTimestamp(expectedUpdatedAt) ||
      !fullName || fullName.length > 200 || phone.length > 40 ||
      email.length > 254 || city.length > 120) {
    redirect("/crm-v2/pipeline?edit_error=invalid&lead=" + encodeURIComponent(leadId));
  }

  const { businessId } = await resolveCurrentBusinessContext();
  let customerId: string;
  try {
    const leadRows = await supabaseRest<{ id: string; customer_id: string; lifecycle_status: string }>(
      "leads", "GET", null,
      "business_id=eq." + businessId + "&id=eq." + leadId +
        "&select=id,customer_id,lifecycle_status&limit=1",
    );
    if (!Array.isArray(leadRows) || !leadRows[0]) {
      redirect("/crm-v2/pipeline?edit_error=not_found&lead=" + encodeURIComponent(leadId));
    }
    const lead = leadRows[0];
    if (lead.lifecycle_status === "CLOSED_LOST") {
      redirect("/crm-v2/pipeline?edit_error=blocked&lead=" + encodeURIComponent(leadId));
    }
    customerId = lead.customer_id;
    const customerRows = await supabaseRest<{ id: string; updated_at: string }>(
      "customers", "GET", null,
      "business_id=eq." + businessId + "&id=eq." + customerId +
        "&select=id,updated_at&limit=1",
    );
    if (!Array.isArray(customerRows) || !customerRows[0]) {
      redirect("/crm-v2/pipeline?edit_error=not_found&lead=" + encodeURIComponent(leadId));
    }
    if (customerRows[0].updated_at !== expectedUpdatedAt) {
      redirect("/crm-v2/pipeline?edit_error=conflict&lead=" + encodeURIComponent(leadId));
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    const response = await supabaseRest<unknown>(
      "rpc/update_customer_profile", "POST", {
        p_business_id: businessId,
        p_customer_id: customerId,
        p_full_name: fullName,
        p_first_name: parts[0] || null,
        p_last_name: parts.slice(1).join(" ") || null,
        p_phone: phone || null,
        p_email: email || null,
        p_city: city || null,
        p_source: "crm_v2_dossier_contact",
        p_birth_date: null,
        p_birth_date_provided: false,
      },
    );
    if (!response || typeof response !== "object" || Array.isArray(response) ||
        !("customer" in response) ||
        !response.customer || typeof response.customer !== "object" ||
        !("id" in response.customer) || response.customer.id !== customerId) {
      throw new Error("Unexpected canonical customer profile response");
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("CRM V2 contact save failed", error);
    redirect("/crm-v2/pipeline?edit_error=contact_unavailable&lead=" + encodeURIComponent(leadId));
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/clients");
  revalidatePath("/crm/clients");
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm-v2/clients/" + customerId);
  redirect("/crm-v2/pipeline?edit_updated=contact&lead=" + encodeURIComponent(leadId) +
    "#dossier-" + encodeURIComponent(leadId));
}

/**
 * Independent note editor: optimistic update of the lead row only.
 * Changes to a quote, service, date or shared customer profile cannot block it.
 */
export async function updateV2NoteOnly(formData: FormData) {
  await requireCrmAccess();
  const leadId = String(formData.get("leadId") || "").trim();
  const expectedUpdatedAt = String(formData.get("expectedLeadUpdatedAt") || "").trim();
  const note = String(formData.get("note") || "").trim();
  if (!UUID_REGEX.test(leadId) || !validExpectedTimestamp(expectedUpdatedAt) ||
      note.length > 2000) {
    redirect("/crm-v2/pipeline?edit_error=invalid&lead=" + encodeURIComponent(leadId));
  }
  const { businessId } = await resolveCurrentBusinessContext();
  try {
    const rows = await supabaseRest<{ id: string; customer_id: string; updated_at: string;
      lifecycle_status: string; notes: string | null }>(
      "leads", "GET", null,
      "business_id=eq." + businessId + "&id=eq." + leadId +
        "&select=id,customer_id,updated_at,lifecycle_status,notes&limit=1",
    );
    if (!Array.isArray(rows) || !rows[0]) {
      redirect("/crm-v2/pipeline?edit_error=not_found&lead=" + encodeURIComponent(leadId));
    }
    const lead = rows[0];
    if (lead.lifecycle_status === "CLOSED_LOST") {
      redirect("/crm-v2/pipeline?edit_error=blocked&lead=" + encodeURIComponent(leadId));
    }
    if (lead.updated_at !== expectedUpdatedAt) {
      redirect("/crm-v2/pipeline?edit_error=conflict&lead=" + encodeURIComponent(leadId));
    }
    if ((lead.notes || "") === note) {
      redirect("/crm-v2/pipeline?edit_updated=note&lead=" + encodeURIComponent(leadId) +
        "#dossier-" + encodeURIComponent(leadId));
    }

    const update = await supabaseRest<{ id: string; customer_id: string; notes: string | null }>(
      "leads", "PATCH", { notes: note || null },
      "business_id=eq." + businessId + "&id=eq." + leadId +
        "&updated_at=eq." + encodeURIComponent(expectedUpdatedAt) +
        "&lifecycle_status=neq.CLOSED_LOST&select=id,customer_id,notes",
    );
    if (!update || Array.isArray(update) || update.id !== leadId ||
        (update.notes || "") !== note) {
      redirect("/crm-v2/pipeline?edit_error=conflict&lead=" + encodeURIComponent(leadId));
    }
    try {
      await supabaseRest("activity_log", "POST", {
        business_id: businessId,
        lead_id: leadId,
        customer_id: lead.customer_id,
        event_type: "crm_v2.lead_note.updated",
        event_data: { source: "crm_v2_pipeline" },
      }, "select=id");
    } catch (error) {
      console.error("CRM V2 note saved; audit trail unavailable", error);
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("CRM V2 note save failed", error);
    redirect("/crm-v2/pipeline?edit_error=note_unavailable&lead=" + encodeURIComponent(leadId));
  }
  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm/pipeline");
  redirect("/crm-v2/pipeline?edit_updated=note&lead=" + encodeURIComponent(leadId) +
    "#dossier-" + encodeURIComponent(leadId));
}


/**
 * Correct the operational label only. Never mutate a quote or job price.
 * This is a descriptive correction, so a sent quote does not block it.
 */
export async function updateV2ServiceNameOnly(formData: FormData) {
  await requireCrmAccess();
  const leadId = String(formData.get("leadId") || "").trim();
  const serviceId = String(formData.get("expectedServiceId") || "").trim();
  const expectedUpdatedAt = String(formData.get("expectedServiceUpdatedAt") || "").trim();
  const serviceName = String(formData.get("serviceName") || "").trim();
  if (!UUID_REGEX.test(leadId) || !UUID_REGEX.test(serviceId) ||
      !validExpectedTimestamp(expectedUpdatedAt) ||
      !serviceName || serviceName.length > 200) {
    redirect("/crm-v2/pipeline?edit_error=invalid&lead=" + encodeURIComponent(leadId));
  }
  const { businessId } = await resolveCurrentBusinessContext();
  try {
    const [leads, services] = await Promise.all([
      supabaseRest<{ id: string; customer_id: string; lifecycle_status: string }>(
        "leads", "GET", null, "business_id=eq." + businessId +
        "&id=eq." + leadId + "&select=id,customer_id,lifecycle_status&limit=1",
      ),
      supabaseRest<{ id: string; service_name: string; updated_at: string }>(
        "lead_services", "GET", null, "business_id=eq." + businessId +
        "&lead_id=eq." + leadId +
        "&order=created_at.desc,id.desc&select=id,service_name,updated_at&limit=1",
      ),
    ]);
    if (!Array.isArray(leads) || !Array.isArray(services) ||
        !leads[0] || !services[0] || services[0].id !== serviceId) {
      redirect("/crm-v2/pipeline?edit_error=not_found&lead=" + encodeURIComponent(leadId));
    }
    if (leads[0].lifecycle_status === "CLOSED_LOST") {
      redirect("/crm-v2/pipeline?edit_error=blocked&lead=" + encodeURIComponent(leadId));
    }
    if (services[0].updated_at !== expectedUpdatedAt) {
      redirect("/crm-v2/pipeline?edit_error=conflict&lead=" + encodeURIComponent(leadId));
    }
    if (services[0].service_name === serviceName) {
      redirect("/crm-v2/pipeline?edit_updated=service&lead=" + encodeURIComponent(leadId) +
        "#dossier-" + encodeURIComponent(leadId));
    }

    const changed = await supabaseRest<{ id: string; service_name: string }>(
      "lead_services", "PATCH", { service_name: serviceName },
      "business_id=eq." + businessId + "&lead_id=eq." + leadId +
      "&id=eq." + serviceId +
      "&updated_at=eq." + encodeURIComponent(expectedUpdatedAt) +
      "&select=id,service_name",
    );
    if (!changed || Array.isArray(changed) || changed.id !== serviceId ||
        changed.service_name !== serviceName) {
      redirect("/crm-v2/pipeline?edit_error=conflict&lead=" + encodeURIComponent(leadId));
    }
    try {
      await supabaseRest("activity_log", "POST", {
        business_id: businessId,
        customer_id: leads[0].customer_id,
        lead_id: leadId,
        event_type: "crm_v2.service_label.corrected",
        event_data: {
          source: "crm_v2_pipeline",
          service_id: serviceId,
          previous_label: services[0].service_name,
          new_label: serviceName,
        },
      }, "select=id");
    } catch (error) {
      console.error("Service name saved but audit event failed", error);
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("CRM V2 service name update failed", error);
    redirect("/crm-v2/pipeline?edit_error=service_unavailable&lead=" + encodeURIComponent(leadId));
  }
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/clients");
  revalidatePath("/crm/pipeline");
  redirect("/crm-v2/pipeline?edit_updated=service&lead=" + encodeURIComponent(leadId) +
    "#dossier-" + encodeURIComponent(leadId));
}


/**
 * Update the dossier's business date without changing an actual appointment.
 * A date tied to a scheduled job or appointment must be changed in planning.
 */
export async function updateV2PerformanceDateOnly(formData: FormData) {
  await requireCrmAccess();
  const leadId = String(formData.get("leadId") || "").trim();
  const expectedUpdatedAt = String(formData.get("expectedLeadUpdatedAt") || "").trim();
  const nextDate = String(formData.get("performanceDate") || "").trim();
  const dateValid = !nextDate || (
    /^\d{4}-\d{2}-\d{2}$/.test(nextDate) &&
    Number.isFinite(Date.parse(nextDate + "T00:00:00Z")) &&
    new Date(nextDate + "T00:00:00Z").toISOString().slice(0, 10) === nextDate
  );
  if (!UUID_REGEX.test(leadId) || !validExpectedTimestamp(expectedUpdatedAt) || !dateValid) {
    redirect("/crm-v2/pipeline?edit_error=invalid&lead=" + encodeURIComponent(leadId));
  }
  const { businessId } = await resolveCurrentBusinessContext();
  try {
    const [leads, jobs, appointments] = await Promise.all([
      supabaseRest<{ id: string; customer_id: string; lifecycle_status: string;
        updated_at: string; performance_date: string | null }>(
        "leads", "GET", null,
        "business_id=eq." + businessId + "&id=eq." + leadId +
        "&select=id,customer_id,lifecycle_status,updated_at,performance_date&limit=1",
      ),
      supabaseRest<{ id: string }>("jobs", "GET", null,
        "business_id=eq." + businessId + "&lead_id=eq." + leadId + "&select=id&limit=1"),
      supabaseRest<{ id: string }>("appointments", "GET", null,
        "business_id=eq." + businessId + "&lead_id=eq." + leadId + "&select=id&limit=1"),
    ]);
    if (!Array.isArray(leads) || !Array.isArray(jobs) || !Array.isArray(appointments) || !leads[0]) {
      redirect("/crm-v2/pipeline?edit_error=not_found&lead=" + encodeURIComponent(leadId));
    }
    const lead = leads[0];
    if (lead.lifecycle_status === "CLOSED_LOST" || jobs.length > 0 || appointments.length > 0) {
      redirect("/crm-v2/pipeline?edit_error=date_locked&lead=" + encodeURIComponent(leadId));
    }
    if (lead.updated_at !== expectedUpdatedAt) {
      redirect("/crm-v2/pipeline?edit_error=conflict&lead=" + encodeURIComponent(leadId));
    }
    if ((lead.performance_date || "") === nextDate) {
      redirect("/crm-v2/pipeline?edit_updated=date&lead=" + encodeURIComponent(leadId) +
        "#dossier-" + encodeURIComponent(leadId));
    }

    const changed = await supabaseRest<{ id: string; performance_date: string | null }>(
      "leads", "PATCH", { performance_date: nextDate || null },
      "business_id=eq." + businessId + "&id=eq." + leadId +
      "&updated_at=eq." + encodeURIComponent(expectedUpdatedAt) +
      "&lifecycle_status=neq.CLOSED_LOST&select=id,performance_date",
    );
    if (!changed || Array.isArray(changed) || changed.id !== leadId ||
        (changed.performance_date || "") !== nextDate) {
      redirect("/crm-v2/pipeline?edit_error=conflict&lead=" + encodeURIComponent(leadId));
    }
    try {
      await supabaseRest("activity_log", "POST", {
        business_id: businessId,
        customer_id: lead.customer_id,
        lead_id: leadId,
        event_type: "crm_v2.dossier.date_adjusted",
        event_data: {
          source: "crm_v2_pipeline",
          previous_performance_date: lead.performance_date,
          new_performance_date: nextDate || null,
        },
      }, "select=id");
    } catch (error) {
      console.error("Date saved but audit event failed", error);
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("CRM V2 performance date update failed", error);
    redirect("/crm-v2/pipeline?edit_error=date_unavailable&lead=" + encodeURIComponent(leadId));
  }
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/calendar");
  redirect("/crm-v2/pipeline?edit_updated=date&lead=" + encodeURIComponent(leadId) +
    "#dossier-" + encodeURIComponent(leadId));
}
