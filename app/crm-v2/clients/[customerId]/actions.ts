"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../../lib/auth/dal";
import { createCustomerVehicle } from "../../../lib/crm";
import { supabaseRest } from "../../../lib/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function updateCustomerBirthday(formData: FormData) {
  const access = await requireCrmAccess();
  const customerId = String(formData.get("customerId") || "").trim();
  const birthDate = String(formData.get("birthDate") || "").trim();

  if (!UUID_REGEX.test(customerId) || (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate))) {
    redirect(`/crm-v2/clients/${customerId}?profile_error=invalid`);
  }

  await supabaseRest(
    "customers",
    "PATCH",
    { birth_date: birthDate || null, updated_at: new Date().toISOString() },
    `business_id=eq.${access.businessId}&id=eq.${customerId}`,
  );

  revalidatePath(`/crm-v2/clients/${customerId}`);
  redirect(`/crm-v2/clients/${customerId}?birthday_updated=1`);
}

export async function addCustomerVehicle(formData: FormData) {
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

  const year = yearRaw ? Number(yearRaw) : null;
  const mileageKm = mileageRaw ? Number(mileageRaw) : null;

  await createCustomerVehicle({
    idempotencyKey: crypto.randomUUID(),
    customerId,
    brand,
    model,
    variant: variant || null,
    year: Number.isFinite(year) ? year : null,
    color: color || null,
    plate: plate || null,
    mileageKm: Number.isFinite(mileageKm) ? mileageKm : null,
  });

  revalidatePath(`/crm-v2/clients/${customerId}`);
  redirect(`/crm-v2/clients/${customerId}?vehicle_created=1`);
}

export async function updateCustomerVehicle(formData: FormData) {
  const access = await requireCrmAccess();

  const customerId = String(formData.get("customerId") || "").trim();
  const vehicleId = String(formData.get("vehicleId") || "").trim();

  if (!UUID_REGEX.test(customerId) || !UUID_REGEX.test(vehicleId)) {
    redirect(`/crm-v2/clients/${customerId}?vehicle_error=invalid`);
  }

  const payload = {
    brand: String(formData.get("brand") || "").trim() || null,
    model: String(formData.get("model") || "").trim() || null,
    variant: String(formData.get("variant") || "").trim() || null,
    color: String(formData.get("color") || "").trim() || null,
    plate: String(formData.get("plate") || "").trim() || null,
    year: String(formData.get("year") || "").trim()
      ? Number(formData.get("year"))
      : null,
    mileage_km: String(formData.get("mileageKm") || "").trim()
      ? Number(formData.get("mileageKm"))
      : null,
    updated_at: new Date().toISOString(),
  };

  await supabaseRest(
    "vehicles",
    "PATCH",
    payload,
    `business_id=eq.${access.businessId}&customer_id=eq.${customerId}&id=eq.${vehicleId}`,
  );

  revalidatePath(`/crm-v2/clients/${customerId}`);
  redirect(`/crm-v2/clients/${customerId}?vehicle_updated=1`);
}
