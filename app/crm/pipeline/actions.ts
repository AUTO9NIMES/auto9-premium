"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CrmAccessError,
  requireCrmAccess,
} from "../../lib/auth/dal";
import {
  acceptQuoteAndCreateJob,
  createManualLead,
  markQuoteAsSent,
  transitionLeadStatus,
  type LeadLifecycleStatus,
  type ManualLeadResult,
} from "../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const manualTargetStatuses = new Set<LeadLifecycleStatus>([
  "QUALIFIED",
  "CONTACTED",
  "QUOTE_SENT",
  "CLOSED_LOST",
]);

function redirectWithError(error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/pipeline?error=${error}`);
}

function redirectWithQuoteError(error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/pipeline?quote_error=${error}`);
}

function redirectWithManualLeadError(error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/pipeline/new?error=${error}`);
}

function redirectWithQuoteSendError(error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/pipeline?quote_send_error=${error}`);
}

export async function transitionPipelineLead(formData: FormData) {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithError("access");
    }
    redirectWithError("unavailable");
  }

  const leadId = formData.get("leadId");
  const targetStatus = formData.get("targetStatus");

  if (
    typeof leadId !== "string" ||
    !UUID_REGEX.test(leadId.trim()) ||
    typeof targetStatus !== "string" ||
    !manualTargetStatuses.has(targetStatus as LeadLifecycleStatus)
  ) {
    redirectWithError("invalid");
  }

  try {
    await transitionLeadStatus({
      leadId: leadId.trim(),
      targetStatus: targetStatus as LeadLifecycleStatus,
      source: "crm_pipeline_ui",
    });
  } catch {
    redirectWithError("unavailable");
  }

  revalidatePath("/crm/pipeline");
  redirect("/crm/pipeline?updated=1");
}

export async function acceptPipelineQuote(formData: FormData) {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithQuoteError("access");
    }
    redirectWithQuoteError("unavailable");
  }

  const quoteId = formData.get("quoteId");

  if (typeof quoteId !== "string" || !UUID_REGEX.test(quoteId.trim())) {
    redirectWithQuoteError("invalid");
  }

  try {
    await acceptQuoteAndCreateJob({
      quoteId: quoteId.trim(),
      source: "crm_pipeline_ui",
    });
  } catch {
    redirectWithQuoteError("unavailable");
  }

  revalidatePath("/crm");
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm/jobs");
  redirect("/crm/pipeline?quote_updated=1");
}

export async function markPipelineQuoteSent(formData: FormData) {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithQuoteSendError("access");
    }
    redirectWithQuoteSendError("unavailable");
  }

  const quoteId = formData.get("quoteId");

  if (typeof quoteId !== "string" || !UUID_REGEX.test(quoteId.trim())) {
    redirectWithQuoteSendError("invalid");
  }

  try {
    await markQuoteAsSent(quoteId.trim());
  } catch {
    redirectWithQuoteSendError("unavailable");
  }

  revalidatePath("/crm");
  revalidatePath("/crm/pipeline");
  redirect("/crm/pipeline?quote_sent=1");
}

export async function createManualLeadAction(formData: FormData) {
  const customerId = formData.get("customerId");
  const idempotencyKey = formData.get("idempotencyKey");

  if (
    typeof customerId !== "string" || !UUID_REGEX.test(customerId.trim()) ||
    typeof idempotencyKey !== "string" || !UUID_REGEX.test(idempotencyKey.trim())
  ) {
    redirectWithManualLeadError("invalid");
  }

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithManualLeadError("access");
    }
    redirectWithManualLeadError("unavailable");
  }

  const vehicleId = formData.get("vehicleId");
  const serviceName = formData.get("serviceName");
  const basePriceValue = formData.get("basePrice");
  const estimatedTime = formData.get("estimatedTime");
  const customerComment = formData.get("customerComment");

  if (
    (vehicleId !== null && (typeof vehicleId !== "string" || (vehicleId.trim() && !UUID_REGEX.test(vehicleId.trim())))) ||
    typeof serviceName !== "string" ||
    typeof estimatedTime !== "string" ||
    typeof customerComment !== "string" ||
    typeof basePriceValue !== "string"
  ) {
    redirectWithManualLeadError("invalid");
  }

  const normalizedServiceName = serviceName.trim();
  const normalizedEstimatedTime = estimatedTime.trim() || null;
  const normalizedComment = customerComment.trim() || null;
  const normalizedVehicleId = typeof vehicleId === "string" ? vehicleId.trim() || null : null;
  const normalizedPrice = basePriceValue.trim() ? Number(basePriceValue) : null;

  if (
    !normalizedServiceName || normalizedServiceName.length > 200 ||
    (normalizedEstimatedTime !== null && normalizedEstimatedTime.length > 100) ||
    (normalizedComment !== null && normalizedComment.length > 2000) ||
    (normalizedPrice !== null && (!Number.isFinite(normalizedPrice) || normalizedPrice < 0 || normalizedPrice > 10000000))
  ) {
    redirectWithManualLeadError("invalid");
  }

  let result: ManualLeadResult;
  try {
    result = await createManualLead({
      idempotencyKey: idempotencyKey.trim(),
      customerId: customerId.trim(),
      vehicleId: normalizedVehicleId,
      serviceName: normalizedServiceName,
      basePrice: normalizedPrice,
      estimatedTime: normalizedEstimatedTime,
      customerComment: normalizedComment,
    });
  } catch {
    redirectWithManualLeadError("unavailable");
  }

  revalidatePath("/crm/pipeline");
  redirect(`/crm/pipeline/${result.leadId}`);
}
