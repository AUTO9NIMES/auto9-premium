"use server";

import { requireCrmAccess } from "../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";

export type SameDayEvent = {
  event_time: string;
  title: string;
  customer_id: string | null;
  status: string | null;
};

/**
 * Lecture seule : événements du calendrier déjà enregistrés à une date,
 * pour signaler les doublons avant l'ajout rapide. N'écrit rien.
 */
export async function listCalendarEventsOnDay(date: string): Promise<SameDayEvent[] | null> {
  await requireCrmAccess();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  try {
    const { businessId } = await resolveCurrentBusinessContext();
    const rows = await supabaseRest<SameDayEvent[]>(
      "crm_calendar_events",
      "GET",
      null,
      `business_id=eq.${businessId}&event_date=eq.${date}&order=event_time.asc&select=event_time,title,customer_id,status`,
    );
    return (rows as SameDayEvent[] | null) ?? [];
  } catch {
    // Vérification impossible : l'interface le signale, la création reste possible.
    return null;
  }
}
