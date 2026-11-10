"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";
import {
  chunk,
  isProspectStatus,
  parseProspectCsv,
  planAction,
  planStatusChange,
  type ActionPlan,
  type ProspectAction,
  type ProspectImportRow,
  type ProspectStatus,
} from "./prospects";

const HOME = "/crm-v2/developpement";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CSV_BYTES = 2 * 1024 * 1024;

function parisToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Retour vers la page avec ses filtres ; seule une URL de la page est acceptée. */
function backTo(formData: FormData, extra: Record<string, string>) {
  const raw = String(formData.get("back") || HOME);
  const url = new URL(raw.startsWith(HOME) ? raw : HOME, "http://crm.local");
  if (url.pathname !== HOME) url.pathname = HOME;
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  for (const k of ["imported", "skipped", "done", "error"]) if (!(k in extra)) url.searchParams.delete(k);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function rethrowRedirect(error: unknown) {
  if (error && typeof error === "object" && "digest" in error) throw error;
}

async function importRows(businessId: string, rows: ProspectImportRow[], source: string) {
  let inserted = 0;
  for (const part of chunk(rows, 400)) {
    const result = await supabaseRest<number>("rpc/crm_import_prospects", "POST", {
      p_business_id: businessId,
      p_rows: part,
      p_source: source,
    });
    inserted += typeof result === "number" ? result : 0;
  }
  return inserted;
}

/** Import du fichier CSV : ajoute les nouveaux prospects, ne modifie pas les existants. */
export async function importProspectsCsv(formData: FormData) {
  await requireCrmAccess();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_CSV_BYTES) {
    redirect(backTo(formData, { error: "import_file" }));
  }
  const parsed = parseProspectCsv(await file.text());
  if (parsed.errors.length || !parsed.rows.length) redirect(backTo(formData, { error: "import_format" }));
  const { businessId } = await resolveCurrentBusinessContext();
  let inserted = 0;
  try {
    inserted = await importRows(businessId, parsed.rows, "csv");
  } catch (error) {
    rethrowRedirect(error);
    console.error("CRM prospects import failed", error);
    redirect(backTo(formData, { error: "unavailable" }));
  }
  revalidatePath(HOME);
  redirect(backTo(formData, {
    imported: String(inserted),
    skipped: String(parsed.rows.length - inserted + parsed.skipped),
  }));
}

type BrowserProspect = { name?: unknown; city?: unknown; phone?: unknown; email?: unknown; contact?: unknown; status?: unknown; nextDate?: unknown; notes?: unknown };

/** Reprise des prospects enregistrés sur le navigateur (ancienne version de la page). */
export async function importBrowserProspects(formData: FormData) {
  await requireCrmAccess();
  let list: BrowserProspect[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("payload") || "[]"));
    list = Array.isArray(parsed) ? parsed.slice(0, 500) : [];
  } catch {
    redirect(backTo(formData, { error: "import_format" }));
  }
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const oldStatus: Record<string, ProspectStatus> = {
    "A contacter": "A_CONTACTER", "Mail envoye": "MAIL_ENVOYE", "A rappeler": "A_RELANCER", "RDV obtenu": "RDV_OBTENU",
    "Essai prevu": "ESSAI_PREVU", "Partenaire": "PARTENAIRE", "Sans suite": "SANS_SUITE",
  };
  const rows: ProspectImportRow[] = list.flatMap((p) => {
    const name = str(p.name, 160);
    if (!name) return [];
    const next = str(p.nextDate, 10);
    return [{
      siret: null, name, legal_name: null, category: null, address: null, postal_code: null,
      city: str(p.city, 120), distance_km: null, headcount: null, phone: str(p.phone, 40), email: str(p.email, 200),
      website: null, priority: null, status: oldStatus[String(p.status)] ?? null,
      next_follow_up_on: next && /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : null,
      notes: str(p.notes, 4000), source_notes: null, contact_name: str(p.contact, 120),
    }];
  });
  if (!rows.length) redirect(backTo(formData, { error: "import_format" }));
  const { businessId } = await resolveCurrentBusinessContext();
  let inserted = 0;
  try {
    inserted = await importRows(businessId, rows, "navigateur");
  } catch (error) {
    rethrowRedirect(error);
    console.error("CRM browser prospects import failed", error);
    redirect(backTo(formData, { error: "unavailable" }));
  }
  revalidatePath(HOME);
  redirect(backTo(formData, { imported: String(inserted), skipped: String(rows.length - inserted), browser: "1" }));
}

async function applyPlan(businessId: string, prospectId: string, plan: ActionPlan, note: string | null) {
  await supabaseRest("rpc/crm_prospect_apply_action", "POST", {
    p_business_id: businessId,
    p_prospect_id: prospectId,
    p_event_type: plan.eventType,
    p_status: plan.status,
    p_next_follow_up_on: plan.nextFollowUpOn,
    p_clear_follow_up: plan.clearFollowUp,
    p_counts_as_contact: plan.countsAsContact,
    p_note: note,
  });
}

async function currentStatus(businessId: string, prospectId: string) {
  const rows = (await supabaseRest<Array<{ status: string }>>(
    "crm_prospects", "GET", null,
    `business_id=eq.${businessId}&id=eq.${prospectId}&limit=1&select=status`,
  )) as Array<{ status: string }> | null;
  const status = rows?.[0]?.status;
  return isProspectStatus(status) ? status : null;
}

const ACTIONS: ProspectAction[] = ["MAIL_SENT", "CALLED", "FOLLOWED_UP", "STOP"];

/** Action rapide : mail envoyé, appelé, relancé, STOP. */
export async function prospectQuickAction(formData: FormData) {
  await requireCrmAccess();
  const prospectId = String(formData.get("prospectId") || "");
  const action = String(formData.get("action") || "") as ProspectAction;
  const note = String(formData.get("note") || "").trim().slice(0, 1000) || null;
  if (!UUID.test(prospectId) || !ACTIONS.includes(action)) redirect(backTo(formData, { error: "invalid" }));
  const { businessId } = await resolveCurrentBusinessContext();
  try {
    const status = await currentStatus(businessId, prospectId);
    if (!status) redirect(backTo(formData, { error: "not_found" }));
    await applyPlan(businessId, prospectId, planAction(action, status, parisToday()), note);
  } catch (error) {
    rethrowRedirect(error);
    console.error("CRM prospect action failed", error);
    redirect(backTo(formData, { error: "unavailable" }));
  }
  revalidatePath(HOME);
  redirect(backTo(formData, { done: action }));
}

/** Changement de statut manuel. */
export async function setProspectStatus(formData: FormData) {
  await requireCrmAccess();
  const prospectId = String(formData.get("prospectId") || "");
  const status = String(formData.get("status") || "");
  if (!UUID.test(prospectId) || !isProspectStatus(status)) redirect(backTo(formData, { error: "invalid" }));
  const { businessId } = await resolveCurrentBusinessContext();
  try {
    await applyPlan(businessId, prospectId, planStatusChange(status as ProspectStatus), null);
  } catch (error) {
    rethrowRedirect(error);
    console.error("CRM prospect status failed", error);
    redirect(backTo(formData, { error: "unavailable" }));
  }
  revalidatePath(HOME);
  redirect(backTo(formData, { done: "STATUS" }));
}

function editableFields(formData: FormData) {
  const str = (key: string, max: number) => {
    const v = String(formData.get(key) || "").replace(/\s+/g, " ").trim();
    return v ? v.slice(0, max) : null;
  };
  const followUp = String(formData.get("next_follow_up_on") || "").trim();
  const notes = String(formData.get("notes") || "").trim().slice(0, 4000) || null;
  return {
    name: str("name", 160),
    contact_name: str("contact_name", 120),
    phone: str("phone", 40),
    email: str("email", 200),
    website: str("website", 300),
    city: str("city", 120),
    category: str("category", 80),
    next_follow_up_on: /^\d{4}-\d{2}-\d{2}$/.test(followUp) ? followUp : null,
    notes,
  };
}

/** Modification de la fiche (coordonnées, relance, notes). */
export async function updateProspect(formData: FormData) {
  await requireCrmAccess();
  const prospectId = String(formData.get("prospectId") || "");
  const fields = editableFields(formData);
  if (!UUID.test(prospectId) || !fields.name) redirect(backTo(formData, { error: "invalid" }));
  const { businessId } = await resolveCurrentBusinessContext();
  try {
    const updated = await supabaseRest<{ id: string }>(
      "crm_prospects", "PATCH", fields,
      `business_id=eq.${businessId}&id=eq.${prospectId}&select=id`,
    );
    if (!updated || Array.isArray(updated) || !updated.id) redirect(backTo(formData, { error: "not_found" }));
    await supabaseRest("crm_prospect_events", "POST", {
      business_id: businessId, prospect_id: prospectId, event_type: "EDITED",
    }, "select=id");
  } catch (error) {
    rethrowRedirect(error);
    console.error("CRM prospect update failed", error);
    redirect(backTo(formData, { error: "unavailable" }));
  }
  revalidatePath(HOME);
  redirect(backTo(formData, { done: "EDITED" }));
}

/** Nouveau prospect saisi à la main. */
export async function createProspect(formData: FormData) {
  await requireCrmAccess();
  const fields = editableFields(formData);
  if (!fields.name) redirect(backTo(formData, { error: "invalid" }));
  const { businessId } = await resolveCurrentBusinessContext();
  let id = "";
  try {
    const created = await supabaseRest<{ id: string }>(
      "crm_prospects", "POST", { business_id: businessId, ...fields, source: "manuel" }, "select=id",
    );
    if (!created || Array.isArray(created) || !created.id) throw new Error("Prospect not saved");
    id = created.id;
    await supabaseRest("crm_prospect_events", "POST", {
      business_id: businessId, prospect_id: id, event_type: "CREATED",
    }, "select=id");
  } catch (error) {
    rethrowRedirect(error);
    console.error("CRM prospect creation failed", error);
    redirect(backTo(formData, { error: "unavailable" }));
  }
  revalidatePath(HOME);
  redirect(backTo(formData, { done: "CREATED", open: id }));
}
