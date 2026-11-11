import "server-only";

import { supabaseRest } from "../../lib/supabase";
import { PROSPECT_EVENT_TYPES, foldProspects, type ProspectLogRow } from "./prospects";
import { SEED_PROSPECTS } from "./seed";

/**
 * État courant de la prospection : liste de départ + événements du journal
 * d'activité (crm_v3.prospect.*), rejoués dans l'ordre.
 */
export async function loadProspects(businessId: string) {
  const rows = ((await supabaseRest<ProspectLogRow[]>(
    "activity_log", "GET", null,
    `business_id=eq.${businessId}&event_type=in.(${PROSPECT_EVENT_TYPES.join(",")})&order=created_at.asc,id.asc&limit=5000&select=id,event_type,event_data,created_at`,
  )) as ProspectLogRow[] | null) ?? [];
  return foldProspects(SEED_PROSPECTS, rows);
}
