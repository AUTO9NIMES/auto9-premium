"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../../lib/business";
import {
  createCustomerVehicle,
  getCustomer360,
  recordJobPayment,
  requestJobReview,
  scheduleJob,
  startJob,
  transitionAppointmentStatus,
  updateCustomerProfile,
  type Payment,
} from "../../../lib/crm";
import { supabaseRest } from "../../../lib/supabase";
import { uploadVehiclePhoto } from "../../../lib/crm-storage";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const paymentMethods = new Set<Payment["method"]>([
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "OTHER",
]);

function customerPath(customerId: string) {
  return `/crm-v2/clients/${customerId}`;
}

function redirectOperationalError(
  customerId: string,
  error: "invalid" | "unavailable",
): never {
  redirect(`${customerPath(customerId)}?operation_error=${error}`);
}

async function requireOwnedOperationalContext(input: {
  customerId: string;
  jobId: string;
  appointmentId?: string;
}) {
  const result = await getCustomer360(input.customerId);
  if (!result) return null;

  const job = result.jobs.find(
    (candidate) =>
      candidate.id === input.jobId &&
      candidate.customer_id === input.customerId,
  );

  if (!job) return null;

  const appointment = input.appointmentId
    ? result.appointments.find(
        (candidate) =>
          candidate.id === input.appointmentId &&
          candidate.job_id === input.jobId &&
          candidate.customer_id === input.customerId,
      ) ?? null
    : null;

  if (input.appointmentId && !appointment) return null;

  return { result, job, appointment };
}

function revalidateOperationalSurfaces(customerId: string, jobId: string) {
  revalidatePath(customerPath(customerId));
  revalidatePath("/crm-v2/clients");
  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/calendar");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/revenue");
  revalidatePath(`/crm/jobs/${jobId}`);
  revalidatePath("/crm/jobs");
  revalidatePath("/crm/calendar");
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm");
}

export async function scheduleV2CustomerJob(formData: FormData) {
  await requireCrmAccess();

  const customerId = String(formData.get("customerId") || "").trim();
  const jobId = String(formData.get("jobId") || "").trim();
  const scheduledAt = String(formData.get("scheduledAt") || "").trim();

  if (
    !UUID_REGEX.test(customerId) ||
    !UUID_REGEX.test(jobId) ||
    !LOCAL_DATETIME_REGEX.test(scheduledAt)
  ) {
    redirectOperationalError(customerId, "invalid");
  }

  try {
    const context = await requireOwnedOperationalContext({ customerId, jobId });
    if (!context) redirectOperationalError(customerId, "invalid");

    await scheduleJob({
      jobId,
      scheduledAtLocal: scheduledAt,
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectOperationalError(customerId, "unavailable");
  }

  revalidateOperationalSurfaces(customerId, jobId);
  redirect(`${customerPath(customerId)}?operation=scheduled`);
}

export async function confirmV2CustomerAppointment(formData: FormData) {
  await requireCrmAccess();

  const customerId = String(formData.get("customerId") || "").trim();
  const jobId = String(formData.get("jobId") || "").trim();
  const appointmentId = String(formData.get("appointmentId") || "").trim();

  if (
    !UUID_REGEX.test(customerId) ||
    !UUID_REGEX.test(jobId) ||
    !UUID_REGEX.test(appointmentId)
  ) {
    redirectOperationalError(customerId, "invalid");
  }

  try {
    const context = await requireOwnedOperationalContext({
      customerId,
      jobId,
      appointmentId,
    });
    if (!context) redirectOperationalError(customerId, "invalid");

    await transitionAppointmentStatus({
      appointmentId,
      targetStatus: "CONFIRMED",
      source: "crm_v2_customer_360",
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectOperationalError(customerId, "unavailable");
  }

  revalidateOperationalSurfaces(customerId, jobId);
  redirect(`${customerPath(customerId)}?operation=confirmed`);
}

export async function startV2CustomerJob(formData: FormData) {
  await requireCrmAccess();

  const customerId = String(formData.get("customerId") || "").trim();
  const jobId = String(formData.get("jobId") || "").trim();

  if (!UUID_REGEX.test(customerId) || !UUID_REGEX.test(jobId)) {
    redirectOperationalError(customerId, "invalid");
  }

  try {
    const context = await requireOwnedOperationalContext({ customerId, jobId });
    if (!context) redirectOperationalError(customerId, "invalid");

    await startJob(jobId);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectOperationalError(customerId, "unavailable");
  }

  revalidateOperationalSurfaces(customerId, jobId);
  redirect(`${customerPath(customerId)}?operation=started`);
}

export async function completeV2CustomerJob(formData: FormData) {
  await requireCrmAccess();

  const customerId = String(formData.get("customerId") || "").trim();
  const jobId = String(formData.get("jobId") || "").trim();
  const appointmentId = String(formData.get("appointmentId") || "").trim();

  if (
    !UUID_REGEX.test(customerId) ||
    !UUID_REGEX.test(jobId) ||
    !UUID_REGEX.test(appointmentId)
  ) {
    redirectOperationalError(customerId, "invalid");
  }

  try {
    const context = await requireOwnedOperationalContext({
      customerId,
      jobId,
      appointmentId,
    });
    if (!context) redirectOperationalError(customerId, "invalid");

    await transitionAppointmentStatus({
      appointmentId,
      targetStatus: "COMPLETED",
      source: "crm_v2_customer_360",
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectOperationalError(customerId, "unavailable");
  }

  revalidateOperationalSurfaces(customerId, jobId);
  redirect(`${customerPath(customerId)}?operation=completed`);
}

export async function recordV2CustomerJobPayment(formData: FormData) {
  await requireCrmAccess();

  const customerId = String(formData.get("customerId") || "").trim();
  const jobId = String(formData.get("jobId") || "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") || "").trim();
  const method = String(formData.get("method") || "").trim();

  if (
    !UUID_REGEX.test(customerId) ||
    !UUID_REGEX.test(jobId) ||
    !UUID_REGEX.test(idempotencyKey) ||
    !paymentMethods.has(method as Payment["method"])
  ) {
    redirectOperationalError(customerId, "invalid");
  }

  try {
    const context = await requireOwnedOperationalContext({ customerId, jobId });
    if (!context) redirectOperationalError(customerId, "invalid");

    await recordJobPayment({
      idempotencyKey,
      jobId,
      method: method as Payment["method"],
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectOperationalError(customerId, "unavailable");
  }

  revalidateOperationalSurfaces(customerId, jobId);
  redirect(`${customerPath(customerId)}?operation=payment`);
}

export async function requestV2CustomerJobReview(formData: FormData) {
  await requireCrmAccess();

  const customerId = String(formData.get("customerId") || "").trim();
  const jobId = String(formData.get("jobId") || "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") || "").trim();

  if (
    !UUID_REGEX.test(customerId) ||
    !UUID_REGEX.test(jobId) ||
    !UUID_REGEX.test(idempotencyKey)
  ) {
    redirectOperationalError(customerId, "invalid");
  }

  try {
    const context = await requireOwnedOperationalContext({ customerId, jobId });
    if (!context) redirectOperationalError(customerId, "invalid");

    await requestJobReview({
      idempotencyKey,
      jobId,
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectOperationalError(customerId, "unavailable");
  }

  revalidateOperationalSurfaces(customerId, jobId);
  redirect(`${customerPath(customerId)}?operation=review`);
}

export async function updateV2CustomerProfile(formData: FormData) {
  await requireCrmAccess();

  const customerId = String(formData.get("customerId") || "").trim();
  if (!UUID_REGEX.test(customerId)) {
    redirect("/crm-v2/clients?error=invalid");
  }

  const fullName = String(formData.get("fullName") || "").trim();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const birthDate = String(formData.get("birthDate") || "").trim();

  if (!fullName) {
    redirect(`/crm-v2/clients/${customerId}?error=name`);
  }

  const normalizedBirthDate =
    birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : null;

  try {
    await updateCustomerProfile({
      customerId,
      fullName,
      firstName: firstName || null,
      lastName: lastName || null,
      email: email || null,
      phone: phone || null,
      city: city || null,
      birthDate: normalizedBirthDate,
    });
  } catch {
    redirect(`/crm-v2/clients/${customerId}?error=update`);
  }

  revalidatePath("/crm-v2/clients");
  revalidatePath(`/crm-v2/clients/${customerId}`);
  redirect(`/crm-v2/clients/${customerId}?updated=1`);
}

export async function createV2Vehicle(formData: FormData) {
  await requireCrmAccess();

  const customerId = String(formData.get("customerId") || "").trim();
  const brand = String(formData.get("brand") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const variant = String(formData.get("variant") || "").trim();
  const color = String(formData.get("color") || "").trim();
  const plate = String(formData.get("plate") || "").trim();
  const yearRaw = String(formData.get("year") || "").trim();
  const mileageRaw = String(formData.get("mileageKm") || "").trim();

  if (!UUID_REGEX.test(customerId) || !brand || !model) {
    redirect(`/crm-v2/clients/${customerId}?vehicle_error=invalid`);
  }

  try {
    const result = await createCustomerVehicle({
      idempotencyKey: crypto.randomUUID(),
      customerId,
      brand,
      model,
      variant: variant || null,
      year: yearRaw ? Number(yearRaw) : null,
      color: color || null,
      plate: plate || null,
      mileageKm: mileageRaw ? Number(mileageRaw) : null,
    });

    revalidatePath(`/crm-v2/clients/${customerId}`);
    redirect(`/crm-v2/clients/${customerId}?vehicle_created=${result.vehicleId}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/crm-v2/clients/${customerId}?vehicle_error=unavailable`);
  }
}

export async function uploadV2VehiclePhoto(formData: FormData) {
  await requireCrmAccess();

  const customerId = String(formData.get("customerId") || "").trim();
  const vehicleId = String(formData.get("vehicleId") || "").trim();
  const file = formData.get("photo");

  if (
    !UUID_REGEX.test(customerId) ||
    !UUID_REGEX.test(vehicleId) ||
    !(file instanceof File) ||
    !file.size
  ) {
    redirect(`/crm-v2/clients/${customerId}?photo_error=invalid`);
  }

  const { businessId } = await resolveCurrentBusinessContext();

  try {
    const rows = await supabaseRest<Array<{ id: string; customer_id: string }>>(
      "vehicles",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${vehicleId}&select=id,customer_id&limit=1`,
    );
    const vehicle = (rows as Array<{ id: string; customer_id: string }> | null)?.[0];

    if (!vehicle || vehicle.customer_id !== customerId) {
      redirect(`/crm-v2/clients/${customerId}?photo_error=invalid`);
    }

    const photoPath = await uploadVehiclePhoto({
      businessId,
      vehicleId,
      file,
    });

    await supabaseRest(
      "vehicles",
      "PATCH",
      {
        photo_path: photoPath,
        updated_at: new Date().toISOString(),
      },
      `business_id=eq.${businessId}&id=eq.${vehicleId}`,
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/crm-v2/clients/${customerId}?photo_error=upload`);
  }

  revalidatePath(`/crm-v2/clients/${customerId}`);
  redirect(`/crm-v2/clients/${customerId}?photo_updated=1`);
}
