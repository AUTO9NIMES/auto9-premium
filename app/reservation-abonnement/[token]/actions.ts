"use server";

import { redirect } from "next/navigation";
import { supabaseRest } from "../../../lib/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SubscriptionRow = {
  id: string;
  business_id: string;
  customer_id: string;
  active: boolean;
};

export async function submitSubscriptionBookingRequest(formData: FormData) {
  const token = String(formData.get("token") || "").trim();
  const date = String(formData.get("date") || "").trim();
  const time = String(formData.get("time") || "").trim();

  if (
    !UUID_REGEX.test(token) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  ) {
    redirect("/reservation-abonnement/invalide");
  }

  const rows = await supabaseRest<SubscriptionRow[]>(
    "crm_subscriptions",
    "GET",
    null,
    `booking_token=eq.${token}&active=eq.true&select=id,business_id,customer_id,active&limit=1`,
  );

  const subscription = (rows as SubscriptionRow[] | null)?.[0];
  if (!subscription) {
    redirect("/reservation-abonnement/invalide");
  }

  const existing = await supabaseRest<Array<{ id: string }>>(
    "crm_subscription_booking_requests",
    "GET",
    null,
    `subscription_id=eq.${subscription.id}&status=eq.REQUESTED&requested_date=eq.${date}&requested_time=eq.${encodeURIComponent(time)}&select=id&limit=1`,
  );

  if (!((existing as Array<{ id: string }> | null)?.length)) {
    await supabaseRest(
      "crm_subscription_booking_requests",
      "POST",
      {
        business_id: subscription.business_id,
        subscription_id: subscription.id,
        customer_id: subscription.customer_id,
        requested_date: date,
        requested_time: time,
        status: "REQUESTED",
      },
      "select=id",
    );
  }

  redirect(`/reservation-abonnement/${token}?sent=1`);
}
