"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";
import { upsertCustomer } from "../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function createCalendarEvent(formData: FormData) {
  await requireCrmAccess();
  const { businessId } = await resolveCurrentBusinessContext();

  let customerId = String(formData.get("customerId") || "").trim();
  const newClientName = String(formData.get("newClientName") || "").trim();
  const newClientEmail = String(formData.get("newClientEmail") || "").trim();
  const newClientPhone = String(formData.get("newClientPhone") || "").trim();
  const newClientCity = String(formData.get("newClientCity") || "").trim();
  const vehicleId = String(formData.get("vehicleId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const serviceName = String(formData.get("serviceName") || "").trim();
  const eventDate = String(formData.get("eventDate") || "").trim();
  const eventTime = String(formData.get("eventTime") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!title || !validDate(eventDate) || !validTime(eventTime)) {
    redirect("/crm-v2/calendar?event_error=invalid");
  }

  if (customerId && !UUID_REGEX.test(customerId)) {
    redirect("/crm-v2/calendar?event_error=invalid");
  }

  if (!customerId && newClientName) {
    const parts = newClientName.split(/\s+/);
    const created = await upsertCustomer({
      business_id: "",
      full_name: newClientName,
      first_name: parts[0] || null,
      last_name: parts.slice(1).join(" ") || null,
      email: newClientEmail || null,
      phone: newClientPhone || null,
      city: newClientCity || null,
      source: "crm_v2_calendar",
    });

    if (!created?.id) {
      redirect("/crm-v2/calendar?event_error=client_create");
    }

    customerId = created.id;
  }

  if (vehicleId && !UUID_REGEX.test(vehicleId)) {
    redirect("/crm-v2/calendar?event_error=invalid");
  }

  if (customerId) {
    const customers = await supabaseRest<Array<{ id: string }>>(
      "customers",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${customerId}&select=id&limit=1`,
    );
    if (!((customers as Array<{ id: string }> | null)?.length)) {
      redirect("/crm-v2/calendar?event_error=invalid");
    }
  }

  if (vehicleId) {
    const vehicles = await supabaseRest<Array<{ id: string; customer_id: string }>>(
      "vehicles",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${vehicleId}&select=id,customer_id&limit=1`,
    );
    const vehicle = (vehicles as Array<{ id: string; customer_id: string }> | null)?.[0];
    if (!vehicle || (customerId && vehicle.customer_id !== customerId)) {
      redirect("/crm-v2/calendar?event_error=invalid");
    }
  }

  await supabaseRest(
    "crm_calendar_events",
    "POST",
    {
      business_id: businessId,
      customer_id: customerId || null,
      vehicle_id: vehicleId || null,
      title,
      service_name: serviceName || null,
      event_date: eventDate,
      event_time: eventTime,
      notes: notes || null,
      status: "CONFIRMED",
    },
    "select=id",
  );

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/calendar");
  redirect(`/crm-v2/calendar?month=${eventDate.slice(0, 7)}&event_created=1`);
}

export async function updateCalendarEvent(formData: FormData) {
  await requireCrmAccess();
  const { businessId } = await resolveCurrentBusinessContext();

  const eventId = String(formData.get("eventId") || "").trim();
  const customerId = String(formData.get("customerId") || "").trim();
  const vehicleId = String(formData.get("vehicleId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const serviceName = String(formData.get("serviceName") || "").trim();
  const eventDate = String(formData.get("eventDate") || "").trim();
  const eventTime = String(formData.get("eventTime") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!UUID_REGEX.test(eventId) || !title || !validDate(eventDate) || !validTime(eventTime)) {
    redirect("/crm-v2/calendar?event_error=invalid");
  }

  await supabaseRest(
    "crm_calendar_events",
    "PATCH",
    {
      customer_id: customerId && UUID_REGEX.test(customerId) ? customerId : null,
      vehicle_id: vehicleId && UUID_REGEX.test(vehicleId) ? vehicleId : null,
      title,
      service_name: serviceName || null,
      event_date: eventDate,
      event_time: eventTime,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    },
    `business_id=eq.${businessId}&id=eq.${eventId}`,
  );

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/calendar");
  redirect(`/crm-v2/calendar?month=${eventDate.slice(0, 7)}&event_updated=1`);
}

export async function deleteCalendarEvent(formData: FormData) {
  await requireCrmAccess();
  const { businessId } = await resolveCurrentBusinessContext();

  const eventId = String(formData.get("eventId") || "").trim();
  const month = String(formData.get("month") || "").trim();

  if (!UUID_REGEX.test(eventId)) {
    redirect("/crm-v2/calendar?event_error=invalid");
  }

  await supabaseRest(
    "crm_calendar_events",
    "DELETE",
    null,
    `business_id=eq.${businessId}&id=eq.${eventId}`,
  );

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/calendar");
  redirect(`/crm-v2/calendar?month=${/^\d{4}-\d{2}$/.test(month) ? month : ""}&event_deleted=1`);
}
