/*
 * Vue « tableau » des dossiers clients (CRM V2) — logique pure, sans accès aux données.
 *
 * Un dossier est rangé dans la colonne de sa dernière étape faite (et non de la
 * première étape manquante), pour rester juste quand des étapes ont été cochées
 * dans le désordre. Les étapes et leurs règles restent celles de la page.
 */

export const BOARD_STEP_KEYS = [
  "NEW",
  "CONTACTED",
  "QUOTE_SENT",
  "BOOKED",
  "IN_PROGRESS",
  "COMPLETED",
  "PAID",
  "REVIEW_REQUESTED",
] as const;

export type BoardStepKey = (typeof BOARD_STEP_KEYS)[number];

export type BoardStage = "NEW" | "QUOTE" | "BOOKED" | "IN_PROGRESS" | "TO_COLLECT" | "PAID";

export const BOARD_COLUMNS: Array<{ key: BoardStage; title: string }> = [
  { key: "NEW", title: "Nouvelles demandes" },
  { key: "QUOTE", title: "Devis envoyé" },
  { key: "BOOKED", title: "Réservé" },
  { key: "IN_PROGRESS", title: "En cours" },
  { key: "TO_COLLECT", title: "À encaisser" },
  { key: "PAID", title: "Payé" },
];

export type BoardFilter = "all" | "particulier" | "pro" | "unpaid";

export function parseBoardFilter(value: unknown): BoardFilter {
  return value === "particulier" || value === "pro" || value === "unpaid" ? value : "all";
}

/** Colonne d'un dossier d'après ses étapes faites (ordre de BOARD_STEP_KEYS). */
export function boardStage(done: Record<BoardStepKey, boolean>): BoardStage {
  if (done.PAID) return "PAID";
  if (done.COMPLETED) return "TO_COLLECT";
  if (done.IN_PROGRESS) return "IN_PROGRESS";
  if (done.BOOKED) return "BOOKED";
  if (done.QUOTE_SENT) return "QUOTE";
  return "NEW";
}

/** Action suivante proposée sur la carte. */
export function nextActionLabel(stage: BoardStage, done: Record<BoardStepKey, boolean>) {
  switch (stage) {
    case "NEW":
      return done.CONTACTED ? "Envoyer le devis" : "Contacter";
    case "QUOTE":
      return "Relancer le devis";
    case "BOOKED":
      return "Démarrer";
    case "IN_PROGRESS":
      return "Terminer";
    case "TO_COLLECT":
      return "Encaisser";
    case "PAID":
      return done.REVIEW_REQUESTED ? "Terminé" : "Demander un avis";
  }
}

type GarageEvent = { lead_id: string | null; event_type: string; event_data: Record<string, unknown> | null };

/**
 * Dossier « garage pro » : réservation pro du site, ou dossier associé à un
 * garage (dernière association non vide, événements du plus récent au plus ancien).
 */
export function isProLead(
  leadId: string | undefined,
  source: string | null | undefined,
  activity: GarageEvent[],
  assignEventType = "crm_v3.garage.lead_assigned",
) {
  if (source === "website_pro_booking") return true;
  if (!leadId) return false;
  const latest = activity.find((row) => row.lead_id === leadId && row.event_type === assignEventType);
  const key = latest?.event_data?.garage_key;
  return typeof key === "string" && key.trim().length > 0;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** En retard : à encaisser, ou devis envoyé depuis plus de 3 jours sans réponse. */
export function isLate(stage: BoardStage, stageDate: string | null, now: number) {
  if (stage === "TO_COLLECT") return true;
  if (stage !== "QUOTE" || !stageDate) return false;
  const time = Date.parse(stageDate);
  return Number.isFinite(time) && now - time > 3 * DAY_MS;
}

export function matchesFilter(filter: BoardFilter, entry: { pro: boolean; stage: BoardStage }) {
  if (filter === "pro") return entry.pro;
  if (filter === "particulier") return !entry.pro;
  if (filter === "unpaid") return entry.stage === "TO_COLLECT";
  return true;
}

/** Heure de rendu de la page (hors du composant, pour garder le rendu pur). */
export async function boardRenderedAt() {
  return Date.now();
}
