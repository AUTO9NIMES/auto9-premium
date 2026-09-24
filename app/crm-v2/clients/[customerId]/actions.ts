"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../../lib/business";
import {
  createCustomerVehicle,
  updateCustomerProfile,
} from "../../../lib/crm";
import { supabaseRest } from "../../../lib/supabase";
import { uploadVehiclePhoto } from "../../../lib/crm-storage";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
