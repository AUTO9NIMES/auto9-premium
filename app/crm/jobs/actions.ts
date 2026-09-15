"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CrmAccessError,
  requireCrmAccess,
} from "../../lib/auth/dal";
import {
  startJob,
  scheduleJob,
  transitionAppointmentStatus,
  type AppointmentTransitionStatus,
} from "../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

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

function redirectWithStartError(jobId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/jobs/${jobId}?start_error=${error}`);
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
