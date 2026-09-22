"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CrmAccessError,
  requireCrmAccess,
} from "../../../lib/auth/dal";
import { updateCustomerProfile, type UpdateCustomerProfileResult } from "../../../lib/crm";
import { resolveCurrentBusinessContext } from "../../../lib/business";
import { supabaseRest } from "../../../lib/supabase";
import { uploadVehiclePhoto } from "../../../lib/crm-storage";
import { createCustomerVehicle, findCustomerVehicleReplay, type CustomerVehicleResult } from "../../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNSIGNED_DECIMAL_INTEGER_REGEX = /^[0-9]+$/;

function redirectWithError(customerId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/clients/${customerId}?profile_error=${error}`);
}

function redirectWithVehicleError(customerId: string, error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/clients/${customerId}?vehicle_error=${error}`);
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
    });
  } catch {
    redirectWithError(normalizedCustomerId, "unavailable");
  }

  const { businessId } = await resolveCurrentBusinessContext();
  try {
    await supabaseRest(
      "customers",
      "PATCH",
      { birth_date: normalizedBirthDate, updated_at: new Date().toISOString() },
      `business_id=eq.${businessId}&id=eq.${normalizedCustomerId}`,
    );
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
      if (error.code === "FORBIDDEN") redirectWithVehicleError(normalizedCustomerId, "access");
    }
    redirectWithVehicleError(normalizedCustomerId, "unavailable");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  try {
    const rows = await supabaseRest<Array<{ id: string; customer_id: string }>>(
      "vehicles",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${normalizedVehicleId}&select=id,customer_id&limit=1`,
    );
    const vehicle = rows?.[0];

    if (!vehicle || vehicle.customer_id !== normalizedCustomerId) {
      redirectWithVehicleError(normalizedCustomerId, "invalid");
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
    redirectWithVehicleError(normalizedCustomerId, "unavailable");
  }

  revalidatePath(`/crm/clients/${normalizedCustomerId}`);
  revalidatePath("/crm/clients");
  revalidatePath("/crm");
  redirect(`/crm/clients/${normalizedCustomerId}?photo=updated`);
}
