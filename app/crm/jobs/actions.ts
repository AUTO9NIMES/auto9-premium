"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CrmAccessError,
  requireCrmAccess,
} from "../../lib/auth/dal";
import {
  findJobPaymentReplay,
  recordJobPayment,
  requestJobReview,
  rescheduleJob,
  startJob,
  scheduleJob,
  transitionAppointmentStatus,
  type Payment,
  type AppointmentTransitionStatus,
  type RecordJobPaymentResult,
} from "../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const paymentMethods = new Set<Payment["method"]>([
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "OTHER",
]);

const validTargetStatuses = new Set<AppointmentTransitionStatus>([
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
]);

function redirectWithError(error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/jobs?error=${error}`);
}

function redirectWithScheduleError(jobId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/jobs/${jobId}?schedule_error=${error}`);
}

function redirectWithRescheduleError(jobId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/jobs/${jobId}?reschedule_error=${error}`);
}

function redirectWithStartError(jobId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/jobs/${jobId}?start_error=${error}`);
}

function redirectWithPaymentError(jobId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/jobs/${jobId}?payment_error=${error}`);
}

function redirectWithReviewError(jobId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/jobs/${jobId}?review_error=${error}`);
}

export async function transitionJobAppointment(formData: FormData) {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithError("access");
    }
    redirectWithError("unavailable");
  }

  const appointmentId = formData.get("appointmentId");
  const targetStatus = formData.get("targetStatus");
  const jobId = formData.get("jobId");

  if (
    typeof appointmentId !== "string" ||
    !UUID_REGEX.test(appointmentId.trim()) ||
    typeof targetStatus !== "string" ||
    !validTargetStatuses.has(targetStatus as AppointmentTransitionStatus)
  ) {
    redirectWithError("invalid");
  }

  try {
    await transitionAppointmentStatus({
      appointmentId: appointmentId.trim(),
      targetStatus: targetStatus as AppointmentTransitionStatus,
      source: "crm_jobs_ui",
    });
  } catch {
    redirectWithError("unavailable");
  }

  revalidatePath("/crm/jobs");

  // Return the operator to the invoking job detail page when a valid job id
  // was supplied; otherwise fall back to the jobs list. jobId is validated as
  // a UUID and only ever builds a fixed server-controlled CRM path.
  if (typeof jobId === "string" && UUID_REGEX.test(jobId.trim())) {
    const normalizedJobId = jobId.trim();
    revalidatePath(`/crm/jobs/${normalizedJobId}`);
    redirect(`/crm/jobs/${normalizedJobId}?updated=1`);
  }

  redirect("/crm/jobs?updated=1");
}

export async function scheduleJobAction(formData: FormData) {
  const jobId = formData.get("jobId");
  const scheduledAt = formData.get("scheduledAt");

  if (typeof jobId !== "string" || !UUID_REGEX.test(jobId.trim())) {
    redirect("/crm/jobs");
  }

  const normalizedJobId = jobId.trim();

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithScheduleError(normalizedJobId, "access");
    }
    redirectWithScheduleError(normalizedJobId, "unavailable");
  }

  if (typeof scheduledAt !== "string" || !LOCAL_DATETIME_REGEX.test(scheduledAt)) {
    redirectWithScheduleError(normalizedJobId, "invalid");
  }

  try {
    await scheduleJob({
      jobId: normalizedJobId,
      scheduledAtLocal: scheduledAt,
    });
  } catch {
    redirectWithScheduleError(normalizedJobId, "unavailable");
  }

  revalidatePath(`/crm/jobs/${normalizedJobId}`);
  revalidatePath("/crm/jobs");
  revalidatePath("/crm");
  redirect(`/crm/jobs/${normalizedJobId}?schedule=created`);
}

export async function rescheduleJobAction(formData: FormData) {
  const jobId = formData.get("jobId");
  const expectedScheduledAt = formData.get("expectedScheduledAt");
  const scheduledAt = formData.get("scheduledAt");

  if (typeof jobId !== "string" || !UUID_REGEX.test(jobId.trim())) {
    redirect("/crm/jobs");
  }

  const normalizedJobId = jobId.trim();

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") {
        redirectWithRescheduleError(normalizedJobId, "access");
      }
    }

    redirectWithRescheduleError(normalizedJobId, "unavailable");
  }

  if (
    typeof expectedScheduledAt !== "string" ||
    expectedScheduledAt.length > 64 ||
    !Number.isFinite(Date.parse(expectedScheduledAt)) ||
    typeof scheduledAt !== "string" ||
    !LOCAL_DATETIME_REGEX.test(scheduledAt)
  ) {
    redirectWithRescheduleError(normalizedJobId, "invalid");
  }

  try {
    await rescheduleJob({
      jobId: normalizedJobId,
      expectedScheduledAt,
      scheduledAtLocal: scheduledAt,
    });
  } catch {
    redirectWithRescheduleError(normalizedJobId, "unavailable");
  }

  revalidatePath(`/crm/jobs/${normalizedJobId}`);
  revalidatePath("/crm/jobs");
  revalidatePath("/crm/calendar");
  revalidatePath("/crm");
  redirect(`/crm/jobs/${normalizedJobId}?schedule=rescheduled`);
}

export async function startJobAction(formData: FormData) {
  const jobId = formData.get("jobId");

  if (typeof jobId !== "string" || !UUID_REGEX.test(jobId.trim())) {
    redirect("/crm/jobs");
  }

  const normalizedJobId = jobId.trim();

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithStartError(normalizedJobId, "access");
    }
    redirectWithStartError(normalizedJobId, "unavailable");
  }

  try {
    await startJob(normalizedJobId);
  } catch {
    redirectWithStartError(normalizedJobId, "unavailable");
  }

  revalidatePath(`/crm/jobs/${normalizedJobId}`);
  revalidatePath("/crm/jobs");
  revalidatePath("/crm");
  redirect(`/crm/jobs/${normalizedJobId}?started=1`);
}

export async function recordJobPaymentAction(formData: FormData) {
  const jobId = formData.get("jobId");
  const idempotencyKey = formData.get("idempotencyKey");

  if (
    typeof jobId !== "string" || !UUID_REGEX.test(jobId.trim()) ||
    typeof idempotencyKey !== "string" || !UUID_REGEX.test(idempotencyKey.trim())
  ) {
    redirect("/crm/jobs");
  }

  const normalizedJobId = jobId.trim();
  const normalizedIdempotencyKey = idempotencyKey.trim();

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithPaymentError(normalizedJobId, "access");
    }
    redirectWithPaymentError(normalizedJobId, "unavailable");
  }

  let replay: RecordJobPaymentResult | null = null;
  try {
    replay = await findJobPaymentReplay({
      idempotencyKey: normalizedIdempotencyKey,
      jobId: normalizedJobId,
    });
  } catch {
    redirectWithPaymentError(normalizedJobId, "unavailable");
  }

  if (replay) {
    revalidatePath(`/crm/jobs/${normalizedJobId}`);
    revalidatePath("/crm/jobs");
    revalidatePath("/crm");
    redirect(`/crm/jobs/${normalizedJobId}?payment=recorded`);
  }

  const method = formData.get("method");
  if (typeof method !== "string" || !paymentMethods.has(method as Payment["method"])) {
    redirectWithPaymentError(normalizedJobId, "invalid");
  }

  try {
    await recordJobPayment({
      idempotencyKey: normalizedIdempotencyKey,
      jobId: normalizedJobId,
      method: method as Payment["method"],
    });
  } catch {
    redirectWithPaymentError(normalizedJobId, "unavailable");
  }

  revalidatePath(`/crm/jobs/${normalizedJobId}`);
  revalidatePath("/crm/jobs");
  revalidatePath("/crm");
  redirect(`/crm/jobs/${normalizedJobId}?payment=recorded`);
}

export async function requestJobReviewAction(formData: FormData) {
  const jobId = formData.get("jobId");
  const idempotencyKey = formData.get("idempotencyKey");

  if (
    typeof jobId !== "string" || !UUID_REGEX.test(jobId.trim()) ||
    typeof idempotencyKey !== "string" || !UUID_REGEX.test(idempotencyKey.trim())
  ) {
    redirect("/crm/jobs");
  }

  const normalizedJobId = jobId.trim();

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithReviewError(normalizedJobId, "access");
    }
    redirectWithReviewError(normalizedJobId, "unavailable");
  }

  try {
    await requestJobReview({
      idempotencyKey: idempotencyKey.trim(),
      jobId: normalizedJobId,
    });
  } catch {
    redirectWithReviewError(normalizedJobId, "unavailable");
  }

  revalidatePath(`/crm/jobs/${normalizedJobId}`);
  revalidatePath("/crm/jobs");
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm");
  redirect(`/crm/jobs/${normalizedJobId}?review=requested`);
}
