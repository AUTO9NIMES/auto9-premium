"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CrmAccessError,
  requireCrmAccess,
} from "../../lib/auth/dal";
import {
  transitionAppointmentStatus,
  type AppointmentTransitionStatus,
} from "../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validTargetStatuses = new Set<AppointmentTransitionStatus>([
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
]);

function redirectWithError(error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/jobs?error=${error}`);
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
