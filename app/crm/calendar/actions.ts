"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { CrmAccessError, requireCrmAccess } from "../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MONTH_REGEX = /^\d{4}-\d{2}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

type CustomerIdentityRow = {
  id: string;
};

type VehicleIdentityRow = {
  id: string;
  customer_id: string;
};

type CalendarEventIdentityRow = {
  id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  lead_id: string | null;
};

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithCalendarError(
  error:
    | "invalid"
    | "access"
    | "unavailable"
    | "client_create"
    | "not_found",
): never {
  redirect(`/crm/calendar?event_error=${error}`);
}

async function requireCalendarAccess(): Promise<void> {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/crm/login");
      }

      if (error.code === "FORBIDDEN") {
        redirectWithCalendarError("access");
      }
    }

    redirectWithCalendarError("unavailable");
  }
}

function parsePrice(value: string): number | null {
  if (!value) return null;

  const normalized = value.replace(",", ".");

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    redirectWithCalendarError("invalid");
  }

  const price = Number(normalized);

  if (!Number.isFinite(price) || price < 0 || price > 10_000_000) {
    redirectWithCalendarError("invalid");
  }

  return price;
}

function validateEventFields(input: {
  title: string;
  serviceName: string;
  eventDate: string;
  eventTime: string;
  notes: string;
}): void {
  if (
    !input.title ||
    input.title.length > 200 ||
    input.serviceName.length > 200 ||
    input.notes.length > 2000 ||
    !DATE_REGEX.test(input.eventDate) ||
    !TIME_REGEX.test(input.eventTime)
  ) {
    redirectWithCalendarError("invalid");
  }

  const date = new Date(`${input.eventDate}T12:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== input.eventDate
  ) {
    redirectWithCalendarError("invalid");
  }
}

async function assertCustomerBelongsToBusiness(
  businessId: string,
  customerId: string,
): Promise<void> {
  if (!UUID_REGEX.test(customerId)) {
    redirectWithCalendarError("invalid");
  }

  let rows: CustomerIdentityRow[];

  try {
    const response = await supabaseRest<CustomerIdentityRow>(
      "customers",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${customerId}&select=id&limit=1`,
    );

    rows = Array.isArray(response)
      ? response
      : response
        ? [response]
        : [];
  } catch {
    redirectWithCalendarError("unavailable");
  }

  if (!Array.isArray(rows) || rows.length !== 1) {
    redirectWithCalendarError("invalid");
  }
}

async function assertVehicleBelongsToSelection(input: {
  businessId: string;
  vehicleId: string;
  customerId: string | null;
}): Promise<void> {
  if (!UUID_REGEX.test(input.vehicleId)) {
    redirectWithCalendarError("invalid");
  }

  let rows: VehicleIdentityRow[];

  try {
    const response = await supabaseRest<VehicleIdentityRow>(
      "vehicles",
      "GET",
      null,
      `business_id=eq.${input.businessId}&id=eq.${input.vehicleId}&select=id,customer_id&limit=1`,
    );

    rows = Array.isArray(response)
      ? response
      : response
        ? [response]
        : [];
  } catch {
    redirectWithCalendarError("unavailable");
  }

  if (!Array.isArray(rows) || rows.length !== 1) {
    redirectWithCalendarError("invalid");
  }

  if (!input.customerId || rows[0].customer_id !== input.customerId) {
    redirectWithCalendarError("invalid");
  }
}

async function getOwnedEvent(
  businessId: string,
  eventId: string,
): Promise<CalendarEventIdentityRow> {
  if (!UUID_REGEX.test(eventId)) {
    redirectWithCalendarError("invalid");
  }

  let rows: CalendarEventIdentityRow[];

  try {
    const response = await supabaseRest<CalendarEventIdentityRow>(
      "crm_calendar_events",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${eventId}&select=id,customer_id,vehicle_id,lead_id&limit=1`,
    );

    rows = Array.isArray(response)
      ? response
      : response
        ? [response]
        : [];
  } catch {
    redirectWithCalendarError("unavailable");
  }

  if (!Array.isArray(rows) || rows.length !== 1) {
    redirectWithCalendarError("not_found");
  }

  return rows[0];
}

function revalidateCalendarSurfaces(customerId?: string | null): void {
  revalidatePath("/crm");
  revalidatePath("/crm/calendar");
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm/clients");

  if (customerId && UUID_REGEX.test(customerId)) {
    revalidatePath(`/crm/clients/${customerId}`);
  }
}

export async function createCalendarEvent(formData: FormData) {
  await requireCalendarAccess();

  const customerId = textValue(formData, "customerId").toLowerCase();
  const vehicleId = textValue(formData, "vehicleId").toLowerCase();

  const newClientName = textValue(formData, "newClientName");
  const newClientEmail = textValue(formData, "newClientEmail");
  const newClientPhone = textValue(formData, "newClientPhone");
  const newClientCity = textValue(formData, "newClientCity");

  const title = textValue(formData, "title");
  const serviceName = textValue(formData, "serviceName");
  const eventDate = textValue(formData, "eventDate");
  const eventTime = textValue(formData, "eventTime");
  const notes = textValue(formData, "notes");
  const price = parsePrice(textValue(formData, "price"));

  validateEventFields({
    title,
    serviceName,
    eventDate,
    eventTime,
    notes,
  });

  if (
    newClientName.length > 200 ||
    newClientEmail.length > 320 ||
    newClientPhone.length > 64 ||
    newClientCity.length > 120
  ) {
    redirectWithCalendarError("invalid");
  }

  if (customerId && !UUID_REGEX.test(customerId)) {
    redirectWithCalendarError("invalid");
  }

  if (vehicleId && !UUID_REGEX.test(vehicleId)) {
    redirectWithCalendarError("invalid");
  }

  if (customerId && newClientName) {
    redirectWithCalendarError("invalid");
  }

  if (!customerId && vehicleId) {
    redirectWithCalendarError("invalid");
  }

  const idempotencyKey = textValue(
    formData,
    "idempotencyKey",
  ).toLowerCase();

  if (!UUID_REGEX.test(idempotencyKey)) {
    redirectWithCalendarError("invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  type AtomicCalendarResult = {
    event_id: string;
    customer_id: string | null;
    lead_id: string | null;
    no_op: boolean;
  };

  let result: AtomicCalendarResult;

  try {
    const response = await supabaseRest<AtomicCalendarResult>(
      "rpc/create_crm_calendar_event_with_lead",
      "POST",
      {
        p_business_id: businessId,
        p_idempotency_key: idempotencyKey,
        p_title: title,
        p_service_name: serviceName || null,
        p_event_date: eventDate,
        p_event_time: eventTime,
        p_customer_id: customerId || null,
        p_vehicle_id: vehicleId || null,
        p_price: price,
        p_notes: notes || null,
        p_new_customer_full_name: newClientName || null,
        p_new_customer_first_name: null,
        p_new_customer_last_name: null,
        p_new_customer_email: newClientEmail || null,
        p_new_customer_phone: newClientPhone || null,
        p_new_customer_city: newClientCity || null,
      },
    );

    if (
      !response ||
      Array.isArray(response) ||
      typeof response.event_id !== "string" ||
      !UUID_REGEX.test(response.event_id) ||
      (response.lead_id !== null &&
        (typeof response.lead_id !== "string" ||
          !UUID_REGEX.test(response.lead_id))) ||
      (response.customer_id !== null &&
        (typeof response.customer_id !== "string" ||
          !UUID_REGEX.test(response.customer_id))) ||
      typeof response.no_op !== "boolean"
    ) {
      redirectWithCalendarError("unavailable");
    }

    result = response;
  } catch {
    redirectWithCalendarError("unavailable");
  }

  revalidateCalendarSurfaces(result.customer_id);

  const query = new URLSearchParams({
    month: eventDate.slice(0, 7),
    event_created: "1",
    lead_created:
      !result.no_op && result.lead_id ? "1" : "0",
  });

  redirect(`/crm/calendar?${query.toString()}`);
}

export async function updateCalendarEvent(formData: FormData) {
  await requireCalendarAccess();

  const eventId = textValue(formData, "eventId").toLowerCase();
  const customerId = textValue(formData, "customerId").toLowerCase();
  const vehicleId = textValue(formData, "vehicleId").toLowerCase();

  const title = textValue(formData, "title");
  const serviceName = textValue(formData, "serviceName");
  const eventDate = textValue(formData, "eventDate");
  const eventTime = textValue(formData, "eventTime");
  const notes = textValue(formData, "notes");
  const price = parsePrice(textValue(formData, "price"));

  validateEventFields({
    title,
    serviceName,
    eventDate,
    eventTime,
    notes,
  });

  const { businessId } = await resolveCurrentBusinessContext();
  const existing = await getOwnedEvent(businessId, eventId);

  if (existing.lead_id) {
    const submittedCustomerId = customerId || null;
    const submittedVehicleId = vehicleId || null;

    if (
      submittedCustomerId !== existing.customer_id ||
      submittedVehicleId !== existing.vehicle_id
    ) {
      redirectWithCalendarError("invalid");
    }
  } else {
    if (customerId) {
      await assertCustomerBelongsToBusiness(businessId, customerId);
    }

    if (vehicleId) {
      await assertVehicleBelongsToSelection({
        businessId,
        vehicleId,
        customerId: customerId || null,
      });
    }
  }

  const updatePayload = existing.lead_id
    ? {
        title,
        event_date: eventDate,
        event_time: eventTime,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      }
    : {
        customer_id: customerId || null,
        vehicle_id: vehicleId || null,
        title,
        service_name: serviceName || null,
        price,
        event_date: eventDate,
        event_time: eventTime,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      };

  try {
    await supabaseRest(
      "crm_calendar_events",
      "PATCH",
      updatePayload,
      `business_id=eq.${businessId}&id=eq.${eventId}`,
    );
  } catch {
    redirectWithCalendarError("unavailable");
  }

  revalidateCalendarSurfaces(customerId || existing.customer_id);

  redirect(
    `/crm/calendar?month=${eventDate.slice(0, 7)}&event_updated=1`,
  );
}

export async function deleteCalendarEvent(formData: FormData) {
  await requireCalendarAccess();

  const eventId = textValue(formData, "eventId").toLowerCase();
  const month = textValue(formData, "month");

  const { businessId } = await resolveCurrentBusinessContext();
  const existing = await getOwnedEvent(businessId, eventId);

  try {
    await supabaseRest(
      "crm_calendar_events",
      "DELETE",
      null,
      `business_id=eq.${businessId}&id=eq.${eventId}`,
    );
  } catch {
    redirectWithCalendarError("unavailable");
  }

  revalidateCalendarSurfaces(existing.customer_id);

  const selectedMonth = MONTH_REGEX.test(month) ? month : "";

  redirect(
    `/crm/calendar?month=${selectedMonth}&event_deleted=1`,
  );
}
