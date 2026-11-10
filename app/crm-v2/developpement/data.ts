import "server-only";

import { supabaseRest } from "../../lib/supabase";
import { CLOSED_STATUSES, type ProspectStatus, type ProspectEventType } from "./prospects";

export type ProspectRow = {
  id: string;
  siret: string | null;
  name: string;
  legal_name: string | null;
  category: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  distance_km: number | null;
  headcount: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  priority: number | null;
  status: ProspectStatus;
  next_follow_up_on: string | null;
  last_contacted_at: string | null;
  contact_count: number;
  notes: string | null;
  source: string | null;
  source_notes: string | null;
};

export type ProspectEventRow = {
  id: string;
  event_type: ProspectEventType;
  from_status: ProspectStatus | null;
  to_status: ProspectStatus | null;
  note: string | null;
  created_at: string;
};

export type ProspectFilters = {
  status?: ProspectStatus;
  category?: string;
  city?: string;
  q?: string;
  page: number;
};

export const PAGE_SIZE = 30;
const COLUMNS =
  "id,siret,name,legal_name,category,address,postal_code,city,distance_km,headcount,contact_name,phone,email,website,priority,status,next_follow_up_on,last_contacted_at,contact_count,notes,source,source_notes";

/** Valeur sûre dans un filtre PostgREST (pas de virgule, parenthèse, étoile…). */
function safeFilterValue(value: string) {
  return encodeURIComponent(value.replace(/[,()*:"\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80));
}

export async function listProspects(businessId: string, f: ProspectFilters) {
  const parts = [`business_id=eq.${businessId}`];
  if (f.status) parts.push(`status=eq.${f.status}`);
  if (f.category) parts.push(`category=eq.${safeFilterValue(f.category)}`);
  if (f.city) parts.push(`city=eq.${safeFilterValue(f.city)}`);
  const q = f.q ? safeFilterValue(f.q) : "";
  if (q) parts.push(`or=(name.ilike.*${q}*,legal_name.ilike.*${q}*,city.ilike.*${q}*,phone.ilike.*${q}*,contact_name.ilike.*${q}*)`);
  const offset = (Math.max(1, f.page) - 1) * PAGE_SIZE;
  const rows = (await supabaseRest<ProspectRow[]>(
    "crm_prospects", "GET", null,
    `${parts.join("&")}&order=priority.asc.nullslast,name.asc&limit=${PAGE_SIZE + 1}&offset=${offset}&select=${COLUMNS}`,
  )) as ProspectRow[] | null ?? [];
  return { rows: rows.slice(0, PAGE_SIZE), hasNext: rows.length > PAGE_SIZE };
}

/** Relances arrivées à échéance (prospects encore à travailler). */
export async function listDueFollowUps(businessId: string, today: string) {
  return ((await supabaseRest<ProspectRow[]>(
    "crm_prospects", "GET", null,
    `business_id=eq.${businessId}&next_follow_up_on=lte.${today}&status=not.in.(${CLOSED_STATUSES.join(",")})&order=next_follow_up_on.asc,priority.asc.nullslast&limit=100&select=${COLUMNS}`,
  )) as ProspectRow[] | null) ?? [];
}

/** Meilleurs prospects jamais contactés. */
export async function listToContact(businessId: string, limit = 10) {
  return ((await supabaseRest<ProspectRow[]>(
    "crm_prospects", "GET", null,
    `business_id=eq.${businessId}&status=eq.A_CONTACTER&order=priority.asc.nullslast,name.asc&limit=${limit}&select=${COLUMNS}`,
  )) as ProspectRow[] | null) ?? [];
}

/** Statut, métier et commune de tous les prospects (compteurs et filtres). */
export async function listProspectFacets(businessId: string) {
  const all: Array<{ status: ProspectStatus; category: string | null; city: string | null }> = [];
  for (let offset = 0; offset < 20000; offset += 1000) {
    const page = ((await supabaseRest<typeof all>(
      "crm_prospects", "GET", null,
      `business_id=eq.${businessId}&order=id.asc&limit=1000&offset=${offset}&select=status,category,city`,
    )) as typeof all | null) ?? [];
    all.push(...page);
    if (page.length < 1000) break;
  }
  return all;
}

export async function getProspect(businessId: string, id: string) {
  const rows = (await supabaseRest<ProspectRow[]>(
    "crm_prospects", "GET", null,
    `business_id=eq.${businessId}&id=eq.${id}&limit=1&select=${COLUMNS}`,
  )) as ProspectRow[] | null;
  return rows?.[0] ?? null;
}

export async function listProspectEvents(businessId: string, prospectId: string) {
  return ((await supabaseRest<ProspectEventRow[]>(
    "crm_prospect_events", "GET", null,
    `business_id=eq.${businessId}&prospect_id=eq.${prospectId}&order=created_at.desc&limit=30&select=id,event_type,from_status,to_status,note,created_at`,
  )) as ProspectEventRow[] | null) ?? [];
}
