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
  createManualLeadWithCustomer,
  createCrmQuote,
  findManualLeadWithCustomerReplay,
  findCrmQuoteReplay,
  markQuoteAsSent,
  transitionLeadStatus,
  updateDraftQuoteAmount,
  type LeadLifecycleStatus,
  type CrmQuoteResult,
  type ManualLeadResult,
  type UpdateDraftQuoteAmountResult,
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

function redirectWithCrmQuoteError(leadId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/pipeline/${leadId}?quote_error=${error}`);
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
  const intakeMode = formData.get("intakeMode");
  const customerId = formData.get("customerId");
  const idempotencyKey = formData.get("idempotencyKey");

  if (
    (intakeMode !== "existing" && intakeMode !== "new") ||
    (intakeMode !== "new" && (typeof customerId !== "string" || !UUID_REGEX.test(customerId.trim()))) ||
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

  if (intakeMode === "new") {
    let replay: ManualLeadResult | null = null;
    try {
      replay = await findManualLeadWithCustomerReplay(idempotencyKey.trim());
    } catch {
      redirectWithManualLeadError("unavailable");
    }

    if (replay) {
      revalidatePath("/crm/pipeline");
      redirect(`/crm/pipeline/${replay.leadId}`);
    }
  }

  const vehicleId = formData.get("vehicleId");
  const fullName = formData.get("fullName");
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const city = formData.get("city");
  const serviceName = formData.get("serviceName");
  const basePriceValue = formData.get("basePrice");
  const estimatedTime = formData.get("estimatedTime");
  const customerComment = formData.get("customerComment");

  if (
    (intakeMode !== "new" && vehicleId !== null && (typeof vehicleId !== "string" || (vehicleId.trim() && !UUID_REGEX.test(vehicleId.trim())))) ||
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
  const normalizedCustomerId = typeof customerId === "string" ? customerId.trim() : null;
  const normalizedPrice = basePriceValue.trim() ? Number(basePriceValue) : null;
  const normalizedFullName = typeof fullName === "string" ? fullName.trim() : "";
  const normalizedFirstName = typeof firstName === "string" ? firstName.trim() || null : null;
  const normalizedLastName = typeof lastName === "string" ? lastName.trim() || null : null;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() || null : null;
  const rawPhone = typeof phone === "string" ? phone.trim() : "";
  const normalizedPhone = typeof phone === "string" ? phone.replace(/\D/g, "") || null : null;
  const normalizedCity = typeof city === "string" ? city.trim() || null : null;

  if (
    !normalizedServiceName || normalizedServiceName.length > 200 ||
    (normalizedEstimatedTime !== null && normalizedEstimatedTime.length > 100) ||
    (normalizedComment !== null && normalizedComment.length > 2000) ||
    (normalizedPrice !== null && (!Number.isFinite(normalizedPrice) || normalizedPrice < 0 || normalizedPrice > 10000000)) ||
    (intakeMode === "new" && (
      !normalizedFullName || normalizedFullName.length > 200 ||
      (normalizedFirstName !== null && normalizedFirstName.length > 100) ||
      (normalizedLastName !== null && normalizedLastName.length > 100) ||
      (normalizedEmail !== null && (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))) ||
      (rawPhone.length > 40) ||
      (normalizedPhone !== null && (normalizedPhone.length < 7 || normalizedPhone.length > 15)) ||
      (normalizedCity !== null && normalizedCity.length > 120) ||
      (!normalizedEmail && !normalizedPhone)
    ))
  ) {
    redirectWithManualLeadError("invalid");
  }

  let result: ManualLeadResult;
  try {
    if (intakeMode === "new") {
      result = await createManualLeadWithCustomer({
        idempotencyKey: idempotencyKey.trim(),
        fullName: normalizedFullName,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        phone: normalizedPhone,
        city: normalizedCity,
        serviceName: normalizedServiceName,
        basePrice: normalizedPrice,
        estimatedTime: normalizedEstimatedTime,
        customerComment: normalizedComment,
      });
    } else {
      result = await createManualLead({
        idempotencyKey: idempotencyKey.trim(),
        customerId: normalizedCustomerId as string,
        vehicleId: normalizedVehicleId,
        serviceName: normalizedServiceName,
        basePrice: normalizedPrice,
        estimatedTime: normalizedEstimatedTime,
        customerComment: normalizedComment,
      });
    }
  } catch {
    redirectWithManualLeadError("unavailable");
  }

  revalidatePath("/crm/pipeline");
  redirect(`/crm/pipeline/${result.leadId}`);
}

export async function createCrmQuoteAction(formData: FormData) {
  const leadId = formData.get("leadId");
  const idempotencyKey = formData.get("idempotencyKey");

  if (
    typeof leadId !== "string" || !UUID_REGEX.test(leadId.trim()) ||
    typeof idempotencyKey !== "string" || !UUID_REGEX.test(idempotencyKey.trim())
  ) {
    redirect("/crm/pipeline");
  }

  const normalizedLeadId = leadId.trim();
  const normalizedIdempotencyKey = idempotencyKey.trim();

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithCrmQuoteError(normalizedLeadId, "access");
    }
    redirectWithCrmQuoteError(normalizedLeadId, "unavailable");
  }

  let replay: CrmQuoteResult | null = null;
  try {
    replay = await findCrmQuoteReplay(normalizedIdempotencyKey);
  } catch {
    redirectWithCrmQuoteError(normalizedLeadId, "unavailable");
  }

  if (replay) {
    revalidatePath(`/crm/pipeline/${replay.leadId}`);
    revalidatePath("/crm/pipeline");
    redirect(`/crm/pipeline/${replay.leadId}`);
  }

  const totalPriceValue = formData.get("totalPrice");
  const estimatedTimeValue = formData.get("estimatedTime");

  if (typeof totalPriceValue !== "string" || typeof estimatedTimeValue !== "string") {
    redirectWithCrmQuoteError(normalizedLeadId, "invalid");
  }

  const normalizedTotalPriceValue = totalPriceValue.trim();
  const normalizedEstimatedTime = estimatedTimeValue.trim() || null;
  const totalPrice = Number(normalizedTotalPriceValue);

  if (
    !/^\d+(?:\.\d{1,2})?$/.test(normalizedTotalPriceValue) ||
    !Number.isFinite(totalPrice) ||
    totalPrice < 0 ||
    totalPrice > 10000000 ||
    (normalizedEstimatedTime !== null && normalizedEstimatedTime.length > 100)
  ) {
    redirectWithCrmQuoteError(normalizedLeadId, "invalid");
  }

  let result: CrmQuoteResult;
  try {
    result = await createCrmQuote({
      idempotencyKey: normalizedIdempotencyKey,
      leadId: normalizedLeadId,
      totalPrice,
      estimatedTime: normalizedEstimatedTime,
    });
  } catch {
    redirectWithCrmQuoteError(normalizedLeadId, "unavailable");
  }

  revalidatePath(`/crm/pipeline/${result.leadId}`);
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm");
  redirect(`/crm/pipeline/${result.leadId}`);
}

const DECIMAL_AMOUNT_REGEX = /^\d+(?:\.\d{1,2})?$/;

function redirectWithQuoteAmountError(
  leadId: string,
  error: "invalid" | "conflict" | "not_found" | "lifecycle" | "access" | "unavailable",
): never {
  redirect(`/crm/pipeline/${leadId}?quote_amount_error=${error}`);
}

export async function updateDraftQuoteAmountAction(formData: FormData) {
  const leadId = formData.get("leadId");
  const quoteId = formData.get("quoteId");
  const expectedTotalPriceValue = formData.get("expectedTotalPrice");
  const totalPriceValue = formData.get("totalPrice");

  if (
    typeof leadId !== "string" || !UUID_REGEX.test(leadId.trim()) ||
    typeof quoteId !== "string" || !UUID_REGEX.test(quoteId.trim()) ||
    typeof expectedTotalPriceValue !== "string" ||
    typeof totalPriceValue !== "string"
  ) {
    redirect("/crm/pipeline");
  }

  const normalizedLeadId = leadId.trim();
  const normalizedQuoteId = quoteId.trim();

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithQuoteAmountError(normalizedLeadId, "access");
    }
    redirectWithQuoteAmountError(normalizedLeadId, "unavailable");
  }

  const trimmedExpectedTotalPrice = expectedTotalPriceValue.trim();
  const trimmedTotalPrice = totalPriceValue.trim();

  // Historical DRAFT quotes may legitimately carry zero or null totals; the
  // expected amount only mirrors what the operator saw when the form loaded.
  const expectedTotalPrice = trimmedExpectedTotalPrice === ""
    ? null
    : Number(trimmedExpectedTotalPrice);
  const totalPrice = Number(trimmedTotalPrice);

  if (
    (trimmedExpectedTotalPrice !== "" && (
      !DECIMAL_AMOUNT_REGEX.test(trimmedExpectedTotalPrice) ||
      !Number.isFinite(expectedTotalPrice as number) ||
      (expectedTotalPrice as number) < 0 ||
      (expectedTotalPrice as number) > 10000000
    )) ||
    !DECIMAL_AMOUNT_REGEX.test(trimmedTotalPrice) ||
    !Number.isFinite(totalPrice) ||
    totalPrice <= 0 ||
    totalPrice > 10000000
  ) {
    redirectWithQuoteAmountError(normalizedLeadId, "invalid");
  }

  let result: UpdateDraftQuoteAmountResult;
  try {
    result = await updateDraftQuoteAmount({
      quoteId: normalizedQuoteId,
      expectedTotalPrice,
      totalPrice,
    });
  } catch {
    redirectWithQuoteAmountError(normalizedLeadId, "unavailable");
  }

  revalidatePath(`/crm/pipeline/${result.leadId ?? normalizedLeadId}`);
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm");

  if (result.status === "updated") {
    redirect(`/crm/pipeline/${normalizedLeadId}?quote_amount=updated`);
  }

  if (result.status === "no_op") {
    redirect(`/crm/pipeline/${normalizedLeadId}?quote_amount=noop`);
  }

  if (result.status === "conflict") {
    redirectWithQuoteAmountError(normalizedLeadId, "conflict");
  }

  if (result.status === "not_found") {
    redirectWithQuoteAmountError(normalizedLeadId, "not_found");
  }

  if (result.status === "invalid_lifecycle") {
    redirectWithQuoteAmountError(normalizedLeadId, "lifecycle");
  }

  redirectWithQuoteAmountError(normalizedLeadId, "invalid");
}
