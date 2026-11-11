"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";
import { loadProspects } from "./data";
import {
  PROSPECT_EVENT_ACTION,
  PROSPECT_EVENT_ADDED,
  PROSPECT_EVENT_UPDATED,
  PROSPECT_KEY,
  isProspectStatus,
  normalizeName,
  planAction,
  planStatusChange,
  type ActionPlan,
  type ProspectAction,
  type ProspectStatus,
} from "./prospects";

const HOME = "/crm-v2/developpement";

function parisToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Retour vers la page avec ses filtres ; seule une URL de la page est acceptée. */
function backTo(formData: FormData, extra: Record<string, string>) {
  const raw = String(formData.get("back") || HOME);
  const url = new URL(raw.startsWith(HOME) ? raw : HOME, "http://crm.local");
  if (url.pathname !== HOME) url.pathname = HOME;
  for (const k of ["imported", "skipped", "done", "error", "browser", "new"]) url.searchParams.delete(k);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function rethrowRedirect(error: unknown) {
  if (error && typeof error === "object" && "digest" in error) throw error;
}

async function logEvent(businessId: string, eventType: string, eventData: Record<string, unknown>) {
  const created = await supabaseRest<{ id: string }>(
    "activity_log", "POST",
    { business_id: businessId, event_type: eventType, event_data: { ...eventData, source_page: "crm_v2_developpement" } },
    "select=id",
  );
  if (!created || Array.isArray(created) || !created.id) throw new Error("Prospect event not saved");
}

async function applyPlan(businessId: string, key: string, plan: ActionPlan, note: string | null) {
  await logEvent(businessId, PROSPECT_EVENT_ACTION, {
    prospect_key: key,
    event_type: plan.eventType,
    status: plan.status,
    next_follow_up_on: plan.nextFollowUpOn,
    clear_follow_up: plan.clearFollowUp,
    counts_as_contact: plan.countsAsContact,
    note,
  });
}

const ACTIONS: ProspectAction[] = ["MAIL_SENT", "CALLED", "FOLLOWED_UP", "STOP"];

/** Action rapide : mail envoyé, appelé, relancé, STOP. */
export async function prospectQuickAction(formData: FormData) {
  await requireCrmAccess();
  const key = String(formData.get("prospectId") || "");
  const action = String(formData.get("action") || "") as ProspectAction;
  const note = String(formData.get("note") || "").trim().slice(0, 1000) || null;
  if (!PROSPECT_KEY.test(key) || !ACTIONS.includes(action)) redirect(backTo(formData, { error: "invalid" }));
  const { businessId } = await resolveCurrentBusinessContext();
  try {
    const current = (await loadProspects(businessId)).find((p) => p.id === key);
    if (!current) redirect(backTo(formData, { error: "not_found" }));
    await applyPlan(businessId, key, planAction(action, current.status, parisToday()), note);
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
  const key = String(formData.get("prospectId") || "");
  const status = String(formData.get("status") || "");
  if (!PROSPECT_KEY.test(key) || !isProspectStatus(status)) redirect(backTo(formData, { error: "invalid" }));
  const { businessId } = await resolveCurrentBusinessContext();
  try {
    if (!(await loadProspects(businessId)).some((p) => p.id === key)) redirect(backTo(formData, { error: "not_found" }));
    await applyPlan(businessId, key, planStatusChange(status as ProspectStatus), null);
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
  return {
    name: str("name", 160),
    contact_name: str("contact_name", 120),
    phone: str("phone", 40),
    email: str("email", 200),
    website: str("website", 300),
    city: str("city", 120),
    category: str("category", 80),
    next_follow_up_on: /^\d{4}-\d{2}-\d{2}$/.test(followUp) ? followUp : null,
    notes: String(formData.get("notes") || "").trim().slice(0, 4000) || null,
  };
}

/** Modification de la fiche (coordonnées, relance, notes). */
export async function updateProspect(formData: FormData) {
  await requireCrmAccess();
  const key = String(formData.get("prospectId") || "");
  const fields = editableFields(formData);
  if (!PROSPECT_KEY.test(key) || !fields.name) redirect(backTo(formData, { error: "invalid" }));
  const { businessId } = await resolveCurrentBusinessContext();
  try {
    if (!(await loadProspects(businessId)).some((p) => p.id === key)) redirect(backTo(formData, { error: "not_found" }));
    await logEvent(businessId, PROSPECT_EVENT_UPDATED, { prospect_key: key, fields });
  } catch (error) {
    rethrowRedirect(error);
    console.error("CRM prospect update failed", error);
    redirect(backTo(formData, { error: "unavailable" }));
  }
  revalidatePath(HOME);
  redirect(backTo(formData, { done: "EDITED", open: key }));
}

/** Nouveau prospect saisi à la main. */
export async function createProspect(formData: FormData) {
  await requireCrmAccess();
  const fields = editableFields(formData);
  if (!fields.name) redirect(backTo(formData, { error: "invalid" }));
  const { businessId } = await resolveCurrentBusinessContext();
  const key = `m-${crypto.randomUUID()}`;
  try {
    const existing = await loadProspects(businessId);
    if (existing.some((p) => normalizeName(p.name) === normalizeName(fields.name as string))) {
      redirect(backTo(formData, { error: "duplicate" }));
    }
    await logEvent(businessId, PROSPECT_EVENT_ADDED, { prospect_key: key, ...fields, source: "manuel" });
  } catch (error) {
    rethrowRedirect(error);
    console.error("CRM prospect creation failed", error);
    redirect(backTo(formData, { error: "unavailable" }));
  }
  revalidatePath(HOME);
  redirect(backTo(formData, { done: "CREATED", open: key }));
}

type BrowserProspect = { name?: unknown; city?: unknown; phone?: unknown; email?: unknown; contact?: unknown; status?: unknown; nextDate?: unknown; notes?: unknown };

const OLD_STATUS: Record<string, ProspectStatus> = {
  "A contacter": "A_CONTACTER", "Mail envoye": "MAIL_ENVOYE", "A rappeler": "A_RELANCER", "RDV obtenu": "RDV_OBTENU",
  "Essai prevu": "ESSAI_PREVU", "Partenaire": "PARTENAIRE", "Sans suite": "SANS_SUITE",
};

/** Reprise des prospects enregistrés sur le navigateur (ancienne version de la page). */
export async function importBrowserProspects(formData: FormData) {
  await requireCrmAccess();
  let list: BrowserProspect[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("payload") || "[]"));
    list = Array.isArray(parsed) ? parsed.slice(0, 200) : [];
  } catch {
    redirect(backTo(formData, { error: "import_format" }));
  }
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const { businessId } = await resolveCurrentBusinessContext();
  let added = 0;
  let skipped = 0;
  try {
    const known = new Set((await loadProspects(businessId)).map((p) => normalizeName(p.name)));
    for (const p of list) {
      const name = str(p.name, 160);
      if (!name || known.has(normalizeName(name))) { skipped++; continue; }
      const next = str(p.nextDate, 10);
      await logEvent(businessId, PROSPECT_EVENT_ADDED, {
        prospect_key: `m-${crypto.randomUUID()}`, name, city: str(p.city, 120), phone: str(p.phone, 40),
        email: str(p.email, 200), contact_name: str(p.contact, 120), notes: str(p.notes, 4000),
        status: OLD_STATUS[String(p.status)] ?? "A_CONTACTER",
        next_follow_up_on: next && /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : null,
        source: "navigateur",
      });
      known.add(normalizeName(name));
      added++;
    }
  } catch (error) {
    rethrowRedirect(error);
    console.error("CRM browser prospects import failed", error);
    redirect(backTo(formData, { error: "unavailable" }));
  }
  revalidatePath(HOME);
  redirect(backTo(formData, { imported: String(added), skipped: String(skipped), browser: "1" }));
}
