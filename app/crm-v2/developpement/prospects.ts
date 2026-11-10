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

// ---------- Import CSV ----------

export type ProspectImportRow = {
  siret: string | null;
  name: string;
  legal_name: string | null;
  category: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  distance_km: number | null;
  headcount: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  priority: number | null;
  status: ProspectStatus | null;
  next_follow_up_on: string | null;
  notes: string | null;
  source_notes: string | null;
  contact_name: string | null;
};

const STATUS_FROM_LABEL = new Map<string, ProspectStatus>(
  PROSPECT_STATUSES.flatMap((s) => [
    [normalizeKey(STATUS_LABELS[s]), s],
    [normalizeKey(s), s],
  ]),
);
// Anciens libellés de la page (sauvegarde du navigateur).
for (const [label, status] of [["mail envoye", "MAIL_ENVOYE"], ["a rappeler", "A_RELANCER"], ["rdv obtenu", "RDV_OBTENU"], ["essai prevu", "ESSAI_PREVU"]] as const) {
  STATUS_FROM_LABEL.set(label, status);
}

export function normalizeKey(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Découpe une ligne CSV (séparateur « ; » ou « , », guillemets doubles). */
function splitCsvLine(line: string, sep: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

const text = (v: string | undefined, max: number) => {
  const t = (v ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
};

const COLUMN_ALIASES: Record<string, keyof ProspectImportRow | "ignore"> = {
  siret: "siret", nom: "name", garage: "name", raison_sociale: "legal_name", categorie: "category",
  metier: "category", adresse: "address", code_postal: "postal_code", commune: "city", ville: "city",
  distance_km: "distance_km", effectif: "headcount", telephone: "phone", email: "email", site: "website",
  priorite: "priority", statut: "status", relance: "next_follow_up_on", notes: "source_notes",
  contact: "contact_name",
};

export type CsvParseResult = { rows: ProspectImportRow[]; skipped: number; errors: string[] };

/**
 * Lit le fichier CSV de prospects (format de la liste AUTO 9, ou export de
 * l'ancienne page). Les lignes sans nom sont ignorées ; les « notes » du
 * fichier vont dans les notes de recherche, pas dans les notes personnelles.
 */
export function parseProspectCsv(content: string, maxRows = 5000): CsvParseResult {
  const lines = content.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], skipped: 0, errors: ["Fichier vide ou sans ligne de données."] };
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const header = splitCsvLine(lines[0], sep).map((h) => COLUMN_ALIASES[normalizeKey(h).replace(/ /g, "_")]);
  if (!header.includes("name")) return { rows: [], skipped: 0, errors: ["Colonne « nom » introuvable."] };
  if (lines.length - 1 > maxRows) return { rows: [], skipped: 0, errors: [`Fichier trop long (${lines.length - 1} lignes, maximum ${maxRows}).`] };

  const rows: ProspectImportRow[] = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, sep);
    const get = (key: keyof ProspectImportRow) => {
      const i = header.indexOf(key);
      return i >= 0 ? cells[i] : undefined;
    };
    const name = text(get("name"), 160);
    if (!name) { skipped++; continue; }
    const siretDigits = (get("siret") ?? "").replace(/\D/g, "");
    const priority = Number.parseInt(get("priority") ?? "", 10);
    const distance = Number.parseFloat((get("distance_km") ?? "").replace(",", "."));
    const statusRaw = normalizeKey(get("status") ?? "");
    const followUp = (get("next_follow_up_on") ?? "").trim();
    const email = text(get("email"), 200);
    rows.push({
      siret: /^\d{14}$/.test(siretDigits) ? siretDigits : null,
      name,
      legal_name: text(get("legal_name"), 200),
      category: text(get("category"), 80),
      address: text(get("address"), 300),
      postal_code: text(get("postal_code"), 10),
      city: text(get("city"), 120),
      distance_km: Number.isFinite(distance) && distance >= 0 ? Math.round(distance * 10) / 10 : null,
      headcount: text(get("headcount"), 20),
      phone: text(get("phone"), 40),
      email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
      website: text(get("website"), 300),
      priority: Number.isFinite(priority) && priority > 0 ? priority : null,
      status: STATUS_FROM_LABEL.get(statusRaw) ?? null,
      next_follow_up_on: /^\d{4}-\d{2}-\d{2}$/.test(followUp) ? followUp : null,
      notes: null,
      source_notes: text(get("source_notes"), 1000),
      contact_name: text(get("contact_name"), 120),
    });
  }
  return { rows, skipped, errors: [] };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
