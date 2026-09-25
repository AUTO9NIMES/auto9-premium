"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CrmAccessError,
  requireCrmAccess,
} from "../../../lib/auth/dal";
import {
  createCustomerVehicle,
  findCustomerVehicleReplay,
  getCustomer360,
  recordJobPayment,
  requestJobReview,
  scheduleJob,
  startJob,
  transitionAppointmentStatus,
  updateCustomerProfile,
  type CustomerVehicleResult,
  type Payment,
  type UpdateCustomerProfileResult,
} from "../../../lib/crm";
import { supabaseRest } from "../../../lib/supabase";
import { resolveCurrentBusinessContext } from "../../../lib/business";
import { uploadVehiclePhoto } from "../../../lib/crm-storage";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNSIGNED_DECIMAL_INTEGER_REGEX = /^[0-9]+$/;
const LOCAL_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const paymentMethods = new Set<Payment["method"]>([
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "OTHER",
]);

function redirectWithError(customerId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/clients/${customerId}?profile_error=${error}`);
}

function redirectWithVehicleError(customerId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/clients/${customerId}?vehicle_error=${error}`);
}

function redirectWithPhotoError(customerId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/clients/${customerId}?photo_error=${error}`);
}

export async function updateCustomerProfileAction(formData: FormData) {
  const customerId = formData.get("customerId");

  if (typeof customerId !== "string" || !UUID_REGEX.test(customerId.trim())) {
    redirect("/crm/clients");
  }

  const normalizedCustomerId = customerId.trim();

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithError(normalizedCustomerId, "access");
    }
    redirectWithError(normalizedCustomerId, "unavailable");
  }

  const fullName = formData.get("full_name");
  const firstName = formData.get("first_name");
  const lastName = formData.get("last_name");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const city = formData.get("city");
  const birthDate = formData.get("birth_date");

  if (
    typeof fullName !== "string" ||
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof email !== "string" ||
    typeof phone !== "string" ||
    typeof city !== "string" ||
    typeof birthDate !== "string"
  ) {
    redirectWithError(normalizedCustomerId, "invalid");
  }

  const normalizedFullName = fullName.trim();
  const normalizedFirstName = firstName.trim() || null;
  const normalizedLastName = lastName.trim() || null;
  const normalizedEmail = email.trim().toLowerCase() || null;
  const normalizedPhoneRaw = phone.trim();
  const normalizedPhone = normalizedPhoneRaw.replace(/\D/g, "") || null;
  const normalizedCity = city.trim() || null;
  const normalizedBirthDate = birthDate.trim() || null;

  if (
    !normalizedFullName || normalizedFullName.length > 200 ||
    (normalizedFirstName !== null && normalizedFirstName.length > 100) ||
    (normalizedLastName !== null && normalizedLastName.length > 100) ||
    (normalizedEmail !== null && (normalizedEmail.length > 254 || !EMAIL_REGEX.test(normalizedEmail))) ||
    normalizedPhoneRaw.length > 40 ||
    (normalizedPhoneRaw.length > 0 && (!normalizedPhone || normalizedPhone.length < 7 || normalizedPhone.length > 15)) ||
    (normalizedCity !== null && normalizedCity.length > 120) ||
    (normalizedBirthDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedBirthDate))
  ) {
    redirectWithError(normalizedCustomerId, "invalid");
  }

  let result: UpdateCustomerProfileResult;
  try {
    result = await updateCustomerProfile({
      customerId: normalizedCustomerId,
      fullName: normalizedFullName,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email: normalizedEmail,
      phone: normalizedPhoneRaw || null,
      city: normalizedCity,
      birthDate: normalizedBirthDate,
    });
  } catch {
    redirectWithError(normalizedCustomerId, "unavailable");
  }


  revalidatePath(`/crm/clients/${normalizedCustomerId}`);
  revalidatePath("/crm/clients");
  revalidatePath("/crm");
  redirect(`/crm/clients/${normalizedCustomerId}?profile=${result.noOp ? "unchanged" : "updated"}`);
}

export async function createCustomerVehicleAction(formData: FormData) {
  const customerId = formData.get("customerId");
  const idempotencyKey = formData.get("idempotencyKey");

  if (
    typeof customerId !== "string" || !UUID_REGEX.test(customerId.trim()) ||
    typeof idempotencyKey !== "string" || !UUID_REGEX.test(idempotencyKey.trim())
  ) {
    redirect("/crm/clients");
  }

  const normalizedCustomerId = customerId.trim();
  const normalizedIdempotencyKey = idempotencyKey.trim();

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithVehicleError(normalizedCustomerId, "access");
    }
    redirectWithVehicleError(normalizedCustomerId, "unavailable");
  }

  let replay: CustomerVehicleResult | null = null;
  try {
    replay = await findCustomerVehicleReplay({
      customerId: normalizedCustomerId,
      idempotencyKey: normalizedIdempotencyKey,
    });
  } catch {
    redirectWithVehicleError(normalizedCustomerId, "unavailable");
  }

  if (replay) {
    revalidatePath(`/crm/clients/${normalizedCustomerId}`);
    revalidatePath("/crm/clients");
    redirect(`/crm/clients/${normalizedCustomerId}?vehicle=created`);
  }

  const brand = formData.get("brand");
  const model = formData.get("model");
  const variant = formData.get("variant");
  const year = formData.get("year");
  const color = formData.get("color");
  const plate = formData.get("plate");
  const mileage = formData.get("mileage_km");

  if (
    typeof brand !== "string" ||
    typeof model !== "string" ||
    typeof variant !== "string" ||
    typeof year !== "string" ||
    typeof color !== "string" ||
    typeof plate !== "string" ||
    typeof mileage !== "string"
  ) {
    redirectWithVehicleError(normalizedCustomerId, "invalid");
  }

  const normalizedBrand = brand.trim();
  const normalizedModel = model.trim();
  const normalizedVariant = variant.trim() || null;
  const normalizedYearValue = year.trim();
  const normalizedYear = normalizedYearValue ? Number(normalizedYearValue) : null;
  const normalizedColor = color.trim() || null;
  const normalizedPlate = plate.trim() || null;
  const normalizedMileageValue = mileage.trim();
  const normalizedMileage = normalizedMileageValue ? Number(normalizedMileageValue) : null;

  if (
    !normalizedBrand || normalizedBrand.length > 100 ||
    !normalizedModel || normalizedModel.length > 100 ||
    (normalizedVariant !== null && normalizedVariant.length > 100) ||
    (normalizedColor !== null && normalizedColor.length > 100) ||
    (normalizedPlate !== null && normalizedPlate.length > 32) ||
    (normalizedYearValue !== "" && !UNSIGNED_DECIMAL_INTEGER_REGEX.test(normalizedYearValue)) ||
    (normalizedMileageValue !== "" && !UNSIGNED_DECIMAL_INTEGER_REGEX.test(normalizedMileageValue)) ||
    (normalizedYear !== null && (!Number.isInteger(normalizedYear) || normalizedYear < 1900 || normalizedYear > 2100)) ||
    (normalizedMileage !== null && (!Number.isInteger(normalizedMileage) || normalizedMileage < 0 || normalizedMileage > 2147483647))
  ) {
    redirectWithVehicleError(normalizedCustomerId, "invalid");
  }

  let result: CustomerVehicleResult;
  try {
    result = await createCustomerVehicle({
      idempotencyKey: normalizedIdempotencyKey,
      customerId: normalizedCustomerId,
      brand: normalizedBrand,
      model: normalizedModel,
      variant: normalizedVariant,
      year: normalizedYear,
      color: normalizedColor,
      plate: normalizedPlate,
      mileageKm: normalizedMileage,
    });
  } catch {
    redirectWithVehicleError(normalizedCustomerId, "unavailable");
  }

  revalidatePath(`/crm/clients/${normalizedCustomerId}`);
  revalidatePath("/crm/clients");
  revalidatePath("/crm");
  redirect(`/crm/clients/${normalizedCustomerId}?vehicle=${result.noOp ? "unchanged" : "created"}`);
}


export async function uploadCustomerVehiclePhotoAction(formData: FormData) {
  const customerId = formData.get("customerId");
  const vehicleId = formData.get("vehicleId");
  const file = formData.get("photo");

  if (
    typeof customerId !== "string" ||
    !UUID_REGEX.test(customerId.trim()) ||
    typeof vehicleId !== "string" ||
    !UUID_REGEX.test(vehicleId.trim()) ||
    !(file instanceof File) ||
    !file.size
  ) {
    redirect("/crm/clients");
  }

  const normalizedCustomerId = customerId.trim();
  const normalizedVehicleId = vehicleId.trim();

  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithPhotoError(normalizedCustomerId, "access");
    }
    redirectWithPhotoError(normalizedCustomerId, "unavailable");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  try {
    const rows = await supabaseRest<{ id: string; customer_id: string }>(
      "vehicles",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${normalizedVehicleId}&select=id,customer_id&limit=1`,
    );
    const vehicle = Array.isArray(rows) ? rows[0] : rows;

    if (!vehicle || vehicle.customer_id !== normalizedCustomerId) {
      redirectWithPhotoError(normalizedCustomerId, "invalid");
    }

    const photoPath = await uploadVehiclePhoto({
      businessId,
      vehicleId: normalizedVehicleId,
      file,
    });

    await supabaseRest(
      "vehicles",
      "PATCH",
      {
        photo_path: photoPath,
        updated_at: new Date().toISOString(),
      },
      `business_id=eq.${businessId}&id=eq.${normalizedVehicleId}&customer_id=eq.${normalizedCustomerId}`,
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectWithPhotoError(normalizedCustomerId, "unavailable");
  }

  revalidatePath(`/crm/clients/${normalizedCustomerId}`);
  revalidatePath("/crm/clients");
  revalidatePath("/crm");
  redirect(`/crm/clients/${normalizedCustomerId}?photo=updated`);
}

function customerPath(customerId: string) {
  return `/crm/clients/${customerId}`;
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
  revalidatePath("/crm/clients");
  revalidatePath("/crm");
  revalidatePath("/crm/calendar");
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm/revenue");
  revalidatePath(`/crm/jobs/${jobId}`);
  revalidatePath("/crm/jobs");
}

export async function scheduleCustomerJob(formData: FormData) {
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

export async function confirmCustomerAppointment(formData: FormData) {
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
      source: "crm_customer_360",
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectOperationalError(customerId, "unavailable");
  }

  revalidateOperationalSurfaces(customerId, jobId);
  redirect(`${customerPath(customerId)}?operation=confirmed`);
}

export async function startCustomerJob(formData: FormData) {
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

export async function completeCustomerJob(formData: FormData) {
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
      source: "crm_customer_360",
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectOperationalError(customerId, "unavailable");
  }

  revalidateOperationalSurfaces(customerId, jobId);
  redirect(`${customerPath(customerId)}?operation=completed`);
}

export async function recordCustomerJobPayment(formData: FormData) {
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

export async function requestCustomerJobReview(formData: FormData) {
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
