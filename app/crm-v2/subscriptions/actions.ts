"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { confirmSubscriptionBookingRequest } from "../../lib/crm";
import { supabaseRest } from "../../lib/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function createSubscription(formData: FormData) {
  await requireCrmAccess();
  const customerId = textValue(formData, "customerId").toLowerCase();
  const serviceName = textValue(formData, "serviceName");
  const priceRaw = textValue(formData, "price");
  const frequencyRaw = textValue(formData, "frequencyMonths");
  const nextDueOn = textValue(formData, "nextDueOn");
  const notes = textValue(formData, "notes");
  const price = priceRaw ? Number(priceRaw.replace(",", ".")) : null;
  const frequencyMonths = Number(frequencyRaw || "1");

  if (!UUID_REGEX.test(customerId) || !serviceName || !/^\d{4}-\d{2}-\d{2}$/.test(nextDueOn) || !Number.isInteger(frequencyMonths) || frequencyMonths < 1) {
    redirect("/crm-v2/subscriptions?new=1&error=invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();
  let customer: { id: string } | undefined;

  try {
    const rows = await supabaseRest<{ id: string }>(
      "customers",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${customerId}&select=id&limit=1`,
    );
    if (!Array.isArray(rows)) {
      throw new Error("Customer lookup unavailable.");
    }
    customer = rows[0];
  } catch {
    redirect("/crm-v2/subscriptions?new=1&error=storage");
  }

  // Keep this redirect outside the lookup catch: redirects throw in Next.js.
  if (!customer || customer.id !== customerId) {
    redirect("/crm-v2/subscriptions?new=1&error=invalid");
  }

  try {
    await supabaseRest("crm_subscriptions", "POST", {
      business_id: businessId,
      customer_id: customerId,
      service_name: serviceName,
      price: Number.isFinite(price as number) ? price : null,
      frequency_months: frequencyMonths,
      next_due_on: nextDueOn,
      active: true,
      notes: notes || null,
    }, "select=*");
  } catch {
    redirect("/crm-v2/subscriptions?new=1&error=storage");
  }

  revalidatePath("/crm-v2/subscriptions");
  redirect("/crm-v2/subscriptions?created=1");
}

export async function advanceSubscription(formData: FormData) {
  await requireCrmAccess();
  const id = textValue(formData, "subscriptionId");
  const currentDue = textValue(formData, "currentDue");
  const frequencyMonths = Number(textValue(formData, "frequencyMonths") || "1");

  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(currentDue) || !Number.isInteger(frequencyMonths) || frequencyMonths < 1) {
    redirect("/crm-v2/subscriptions?error=invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();
  const d = new Date(currentDue + "T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + frequencyMonths);
  const next = d.toISOString().slice(0, 10);

  try {
    await supabaseRest("crm_subscriptions", "PATCH", {
      next_due_on: next,
      updated_at: new Date().toISOString(),
    }, `business_id=eq.${businessId}&id=eq.${id}&select=*`);
  } catch {
    redirect("/crm-v2/subscriptions?error=storage");
  }

  revalidatePath("/crm-v2/subscriptions");
  redirect("/crm-v2/subscriptions?updated=1");
}

export async function toggleSubscription(formData: FormData) {
  await requireCrmAccess();
  const id = textValue(formData, "subscriptionId");
  const active = textValue(formData, "active") === "true";

  if (!id) redirect("/crm-v2/subscriptions?error=invalid");

  const { businessId } = await resolveCurrentBusinessContext();
  try {
    await supabaseRest("crm_subscriptions", "PATCH", {
      active: !active,
      updated_at: new Date().toISOString(),
    }, `business_id=eq.${businessId}&id=eq.${id}&select=*`);
  } catch {
    redirect("/crm-v2/subscriptions?error=storage");
  }

  revalidatePath("/crm-v2/subscriptions");
  redirect("/crm-v2/subscriptions?updated=1");
}


export async function confirmSubscriptionBookingRequestAction(
  formData: FormData,
) {
  await requireCrmAccess();

  const bookingRequestId = textValue(formData, "bookingRequestId").toLowerCase();

  if (!UUID_REGEX.test(bookingRequestId)) {
    redirect("/crm-v2/subscriptions?error=invalid");
  }

  try {
    await confirmSubscriptionBookingRequest(bookingRequestId);
  } catch {
    redirect("/crm-v2/subscriptions?error=handoff");
  }

  revalidatePath("/crm-v2/subscriptions");
  revalidatePath("/crm-v2/clients");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm/jobs");
  redirect("/crm-v2/subscriptions?confirmed=1");
}
