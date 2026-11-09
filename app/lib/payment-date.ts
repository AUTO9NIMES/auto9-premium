/*
 * Date d'un paiement enregistré depuis le pipeline du CRM V2 (« Paiement reçu »).
 *
 * L'entrée d'historique (activity_log) garde son heure d'enregistrement
 * (created_at) ; la date réelle du paiement, choisie par l'utilisateur, est
 * stockée dans event_data.payment_received_on (AAAA-MM-JJ, jour de Paris).
 * C'est elle qui place le paiement dans le bon mois de chiffre d'affaires.
 */

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const EARLIEST_DAY = "2020-01-01";

function parisDay(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Valide une date saisie (AAAA-MM-JJ) : jour réel, pas dans le futur, pas avant 2020. */
export function parsePaymentDay(value: unknown, now: Date = new Date()): string | null {
  if (typeof value !== "string") return null;
  const day = value.trim();
  const match = day.match(DAY);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, date));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== date
  ) {
    return null;
  }

  if (day < EARLIEST_DAY || day > parisDay(now)) return null;
  return day;
}

/** Instant représentant ce jour (midi UTC, donc le même jour à Paris toute l'année). */
export function paymentDayInstant(day: string) {
  return `${day}T12:00:00.000Z`;
}

/** Date du paiement : date choisie si valide, sinon heure d'enregistrement. */
export function paymentReceivedAt(
  eventData: Record<string, unknown> | null | undefined,
  recordedAt: string,
) {
  const raw = eventData?.payment_received_on;
  const day = typeof raw === "string" && DAY.test(raw) ? raw : null;
  return day ? paymentDayInstant(day) : recordedAt;
}

/** Jour de Paris d'aujourd'hui (valeur par défaut du champ date). */
export function todayParisDay(now: Date = new Date()) {
  return parisDay(now);
}
