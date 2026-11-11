/*
 * Prospection (CRM V2 « Développement ») — logique pure, sans accès aux données.
 * Statuts, actions rapides, relances et lecture du fichier CSV d'import.
 */

export const PROSPECT_STATUSES = [
  "A_CONTACTER",
  "MAIL_ENVOYE",
  "A_RELANCER",
  "RDV_OBTENU",
  "ESSAI_PREVU",
  "PARTENAIRE",
  "SANS_SUITE",
  "NE_PAS_CONTACTER",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const STATUS_LABELS: Record<ProspectStatus, string> = {
  A_CONTACTER: "À contacter",
  MAIL_ENVOYE: "Mail envoyé",
  A_RELANCER: "À relancer",
  RDV_OBTENU: "RDV obtenu",
  ESSAI_PREVU: "Essai prévu",
  PARTENAIRE: "Partenaire",
  SANS_SUITE: "Sans suite",
  NE_PAS_CONTACTER: "Ne pas contacter",
};

/** Statuts où le prospect n'est plus à travailler (pas de relance). */
export const CLOSED_STATUSES: ProspectStatus[] = ["PARTENAIRE", "SANS_SUITE", "NE_PAS_CONTACTER"];

export function isProspectStatus(value: unknown): value is ProspectStatus {
  return typeof value === "string" && (PROSPECT_STATUSES as readonly string[]).includes(value);
}

export const FOLLOW_UP_DAYS = 7;

export function addDaysIso(day: string, days: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type ProspectAction = "MAIL_SENT" | "CALLED" | "FOLLOWED_UP" | "STOP";

export const ACTION_LABELS: Record<ProspectAction, string> = {
  MAIL_SENT: "Mail envoyé",
  CALLED: "Appelé",
  FOLLOWED_UP: "Relancé",
  STOP: "STOP",
};

export type ProspectEventType = ProspectAction | "STATUS_CHANGED" | "NOTE" | "EDITED" | "CREATED" | "IMPORTED";

export const EVENT_LABELS: Record<ProspectEventType, string> = {
  ...ACTION_LABELS,
  STOP: "STOP (ne plus contacter)",
  STATUS_CHANGED: "Statut modifié",
  NOTE: "Note",
  EDITED: "Fiche modifiée",
  CREATED: "Ajouté",
  IMPORTED: "Importé",
};

export type ActionPlan = {
  eventType: ProspectEventType;
  status: ProspectStatus | null;
  nextFollowUpOn: string | null;
  clearFollowUp: boolean;
  countsAsContact: boolean;
};

/**
 * Effet d'une action rapide. Une prise de contact programme la relance à J+7
 * et fait avancer un prospect « à contacter » ; elle ne fait jamais reculer
 * un prospect déjà plus loin (RDV, essai, partenaire).
 */
export function planAction(action: ProspectAction, current: ProspectStatus, today: string): ActionPlan {
  const early = current === "A_CONTACTER" || current === "MAIL_ENVOYE" || current === "A_RELANCER";
  const nextFollowUpOn = addDaysIso(today, FOLLOW_UP_DAYS);
  switch (action) {
    case "MAIL_SENT":
      return { eventType: action, status: early ? "MAIL_ENVOYE" : null, nextFollowUpOn, clearFollowUp: false, countsAsContact: true };
    case "CALLED":
    case "FOLLOWED_UP":
      return { eventType: action, status: early ? "A_RELANCER" : null, nextFollowUpOn, clearFollowUp: false, countsAsContact: true };
    case "STOP":
      return { eventType: action, status: "NE_PAS_CONTACTER", nextFollowUpOn: null, clearFollowUp: true, countsAsContact: false };
  }
}

/** Changement de statut manuel : un statut fermé efface la relance. */
export function planStatusChange(status: ProspectStatus): ActionPlan {
  const closed = CLOSED_STATUSES.includes(status);
  return { eventType: "STATUS_CHANGED", status, nextFollowUpOn: null, clearFollowUp: closed, countsAsContact: false };
}

export function isFollowUpDue(p: { status: ProspectStatus; next_follow_up_on: string | null }, today: string) {
  return Boolean(p.next_follow_up_on && p.next_follow_up_on <= today && !CLOSED_STATUSES.includes(p.status));
}

// ---------- Journal d'activité ----------
// Pas de table dédiée : la liste de départ est dans seed.ts, et chaque ajout,
// modification ou action est un événement de activity_log (comme les garages pro).

export const PROSPECT_EVENT_ADDED = "crm_v3.prospect.added";
export const PROSPECT_EVENT_UPDATED = "crm_v3.prospect.updated";
export const PROSPECT_EVENT_ACTION = "crm_v3.prospect.action";
export const PROSPECT_EVENT_TYPES = [PROSPECT_EVENT_ADDED, PROSPECT_EVENT_UPDATED, PROSPECT_EVENT_ACTION] as const;

export const PROSPECT_KEY = /^[a-z]-[a-z0-9-]{3,64}$/;

export type Prospect = {
  id: string;
  siret: string | null;
  name: string;
  legal_name: string | null;
  category: string | null;
  address: string | null;
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
  source: string;
  source_notes: string | null;
  history: ProspectHistoryEntry[];
};

export type ProspectHistoryEntry = {
  id: string;
  event_type: ProspectEventType;
  from_status: ProspectStatus | null;
  to_status: ProspectStatus | null;
  note: string | null;
  created_at: string;
};

export type ProspectLogRow = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
};

export type SeedLike = {
  key: string; name: string; legalName: string | null; category: string; address: string | null; city: string;
  distanceKm: number; headcount: string | null; phone: string | null; email: string | null; priority: number;
  siret: string; researchNotes: string | null;
};

const EDITABLE = ["name", "contact_name", "phone", "email", "website", "city", "category", "notes"] as const;
const ACTION_TYPES: ProspectEventType[] = ["MAIL_SENT", "CALLED", "FOLLOWED_UP", "STOP", "STATUS_CHANGED"];

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

function fromSeed(s: SeedLike): Prospect {
  return {
    id: s.key, siret: s.siret, name: s.name, legal_name: s.legalName, category: s.category, address: s.address,
    city: s.city, distance_km: s.distanceKm, headcount: s.headcount, contact_name: null, phone: s.phone, email: s.email,
    website: null, priority: s.priority, status: "A_CONTACTER", next_follow_up_on: null, last_contacted_at: null,
    contact_count: 0, notes: null, source: "liste", source_notes: s.researchNotes, history: [],
  };
}

/**
 * Rejoue les événements (du plus ancien au plus récent) sur la liste de départ.
 * Les événements mal formés ou visant un prospect inconnu sont ignorés.
 */
export function foldProspects(seed: SeedLike[], rows: ProspectLogRow[]): Prospect[] {
  const byKey = new Map<string, Prospect>(seed.map((s) => [s.key, fromSeed(s)]));
  const ordered = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  for (const row of ordered) {
    const data = row.event_data ?? {};
    const key = typeof data.prospect_key === "string" ? data.prospect_key : "";
    if (!PROSPECT_KEY.test(key)) continue;
    if (row.event_type === PROSPECT_EVENT_ADDED) {
      const name = str(data.name, 160);
      if (!name || byKey.has(key)) continue;
      const status = isProspectStatus(data.status) ? data.status : "A_CONTACTER";
      byKey.set(key, {
        id: key, siret: null, name, legal_name: null, category: str(data.category, 80), address: null,
        city: str(data.city, 120), distance_km: null, headcount: null, contact_name: str(data.contact_name, 120),
        phone: str(data.phone, 40), email: str(data.email, 200), website: null, priority: null, status,
        next_follow_up_on: day(data.next_follow_up_on), last_contacted_at: null, contact_count: 0,
        notes: str(data.notes, 4000), source: str(data.source, 40) ?? "manuel", source_notes: null,
        history: [{ id: row.id, event_type: "CREATED", from_status: null, to_status: status, note: null, created_at: row.created_at }],
      });
      continue;
    }
    const p = byKey.get(key);
    if (!p) continue;
    if (row.event_type === PROSPECT_EVENT_UPDATED) {
      const fields = (data.fields ?? {}) as Record<string, unknown>;
      for (const f of EDITABLE) {
        if (!(f in fields)) continue;
        const v = str(fields[f], f === "notes" ? 4000 : 300);
        if (f === "name") { if (v) p.name = v.slice(0, 160); } else p[f] = v;
      }
      if ("next_follow_up_on" in fields) p.next_follow_up_on = day(fields.next_follow_up_on);
      p.history.push({ id: row.id, event_type: "EDITED", from_status: p.status, to_status: p.status, note: null, created_at: row.created_at });
    } else if (row.event_type === PROSPECT_EVENT_ACTION) {
      const type = data.event_type as ProspectEventType;
      if (!ACTION_TYPES.includes(type)) continue;
      const from = p.status;
      if (isProspectStatus(data.status)) p.status = data.status;
      if (data.clear_follow_up === true) p.next_follow_up_on = null;
      else if (day(data.next_follow_up_on)) p.next_follow_up_on = day(data.next_follow_up_on);
      if (data.counts_as_contact === true) { p.contact_count += 1; p.last_contacted_at = row.created_at; }
      p.history.push({ id: row.id, event_type: type, from_status: from, to_status: p.status, note: str(data.note, 1000), created_at: row.created_at });
    }
  }
  const list = [...byKey.values()];
  for (const p of list) p.history.reverse();
  return list.sort((a, b) => (a.priority ?? 1e9) - (b.priority ?? 1e9) || a.name.localeCompare(b.name, "fr"));
}

export function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type ProspectFilters = { status?: ProspectStatus; category?: string; city?: string; q?: string };

export function filterProspects(list: Prospect[], f: ProspectFilters) {
  const q = f.q ? normalizeName(f.q) : "";
  return list.filter((p) =>
    (!f.status || p.status === f.status) &&
    (!f.category || p.category === f.category) &&
    (!f.city || p.city === f.city) &&
    (!q || normalizeName([p.name, p.legal_name, p.city, p.phone, p.contact_name].filter(Boolean).join(" ")).includes(q)));
}

/** Relances arrivées à échéance, de la plus ancienne à la plus récente. */
export function dueFollowUps(list: Prospect[], today: string) {
  return list.filter((p) => isFollowUpDue(p, today))
    .sort((a, b) => (a.next_follow_up_on ?? "").localeCompare(b.next_follow_up_on ?? "") || (a.priority ?? 1e9) - (b.priority ?? 1e9));
}
