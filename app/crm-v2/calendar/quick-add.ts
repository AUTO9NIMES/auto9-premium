/*
 * Ajout rapide de rendez-vous : découpe d'une ligne de texte libre en fiche
 * pré-remplie. Logique pure, sans accès aux données : la fiche est ensuite
 * vérifiée par l'utilisateur puis enregistrée par l'action existante
 * createCalendarEvent, inchangée.
 *
 * Exemple : « jeu 9h Renaud Paul Fédière — 308 phare — 40€ — 07 61 17 28 06 — Nîmes »
 */

export const TIME_TO_DEFINE_NOTE = "Horaire à définir";
/** Heure enregistrée quand l'horaire reste à définir (le champ est obligatoire). */
export const TIME_TO_DEFINE_PLACEHOLDER = "09:00";
export const PERSONAL_TITLE_PREFIX = "Perso · ";

export type QuickEventDraft = {
  date: string | null;
  time: string | null;
  timeToDefine: boolean;
  personal: boolean;
  price: number | null;
  phone: string | null;
  city: string | null;
  clientName: string | null;
  vehicle: string | null;
  title: string;
  serviceName: string | null;
  notes: string | null;
};

export type QuickCustomer = { id: string; full_name: string; phone?: string | null };

const DAYS: Array<[RegExp, number]> = [
  [/^lun(di)?$/, 1], [/^mar(di)?$/, 2], [/^mer(credi)?$/, 3], [/^jeu(di)?$/, 4],
  [/^ven(dredi)?$/, 5], [/^sam(edi)?$/, 6], [/^dim(anche)?$/, 0],
];
const MONTHS: Array<[RegExp, number]> = [
  [/^janv?(ier)?\.?$/, 1], [/^f[ée]v(rier)?\.?$/, 2], [/^mars$/, 3], [/^avr(il)?\.?$/, 4],
  [/^mai$/, 5], [/^juin$/, 6], [/^juil(let)?\.?$/, 7], [/^ao[uû]t$/, 8],
  [/^sept?(embre)?\.?$/, 9], [/^oct(obre)?\.?$/, 10], [/^nov(embre)?\.?$/, 11], [/^d[ée]c(embre)?\.?$/, 12],
];
const CITIES = [
  "Nîmes", "Arles", "Lunel", "Beaucaire", "Tarascon", "Saint-Gilles", "Marguerittes", "Milhaud",
  "Vauvert", "Bernis", "Uzès", "Bouillargues", "Caissargues", "Bellegarde", "Lunel-Viel", "Garons",
  "Sommières", "Marsillargues", "Remoulins", "Vergèze", "Générac", "Calvisson", "Rodilhan",
  "Manduel", "Redessan", "Saint-Gervasy", "Aimargues", "Aigues-Vives", "Langlade", "Caveirac",
  "Clarensac", "Montpellier", "Avignon", "Alès",
];

const BRANDS = [
  "Peugeot", "Renault", "Citroën", "Citroen", "Dacia", "Toyota", "Volkswagen", "VW", "Audi", "BMW",
  "Mercedes", "Ford", "Opel", "Fiat", "Nissan", "Kia", "Hyundai", "Skoda", "Seat", "Cupra", "Mazda",
  "Suzuki", "Volvo", "Tesla", "Jeep", "Alfa Romeo", "DS", "Lexus", "Honda", "Mitsubishi", "Porsche",
  "Mini", "Land Rover", "Range Rover", "Jaguar", "MG", "BYD", "Smart", "Subaru", "Iveco", "Ferrari",
  "Lamborghini", "Maserati", "McLaren", "Aston Martin", "Bentley", "Lotus", "Abarth", "Lancia",
];

export function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoDay(year: number, month: number, day: number) {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function addDays(today: string, days: number) {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Jour/mois sans année : l'occurrence à venir (cette année ou la suivante). */
function upcoming(today: string, month: number, day: number) {
  const year = Number(today.slice(0, 4));
  const thisYear = isoDay(year, month, day);
  if (thisYear && thisYear >= today) return thisYear;
  return isoDay(year + 1, month, day);
}

function cleanPhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "").replace(/^\+33/, "0").replace(/^0033/, "0");
  return /^0\d{9}$/.test(digits) ? digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim() : null;
}

/**
 * Découpe la ligne. `today` est le jour courant à Paris (AAAA-MM-JJ).
 * Les segments séparés par « — », « - », « , », « · » ou « | » servent à
 * distinguer client, prestation et notes ; sans séparateur, tout le texte
 * restant devient le titre.
 */
export function parseQuickEvent(input: string, today: string): QuickEventDraft {
  let text = ` ${input.replace(/\s+/g, " ").trim()} `;
  const take = (re: RegExp) => {
    const m = text.match(re);
    if (m) text = text.replace(m[0], " ");
    return m;
  };

  // Mode personnel.
  const personal = Boolean(take(/\s\(?(perso(nnel(le)?)?)\)?(?=[\s,.;—·|-])/i));

  // Téléphone (avant les nombres, pour ne pas le confondre avec un prix).
  let phone: string | null = null;
  const phoneMatch = take(/\s(\+33\s?[1-9](?:[\s.-]?\d{2}){4}|0[1-9](?:[\s.-]?\d{2}){4})(?=[\s,;—·|]|$)/);
  if (phoneMatch) phone = cleanPhone(phoneMatch[1]);

  // Prix.
  let price: number | null = null;
  const priceMatch = take(/\s(\d{1,5}(?:[.,]\d{1,2})?)\s?(?:€|eur(?:os?)?\b|e\b)/i);
  if (priceMatch) price = Number(priceMatch[1].replace(",", "."));

  // Horaire à définir / heure.
  let time: string | null = null;
  const timeToDefine = Boolean(take(/\s(?:horaire|heure)\s+[àa]\s+d[ée]finir\b|\s[àa]\s+d[ée]finir\b|\sh\s?\?\s/i));
  if (!timeToDefine) {
    const t = take(/\s(?:[àa]\s+)?([01]?\d|2[0-3])\s?(?:h|:)\s?([0-5]\d)?(?=[\s,;—·|]|$)/i);
    if (t) time = `${pad(Number(t[1]))}:${t[2] ?? "00"}`;
  }

  // Date.
  let date: string | null = null;
  const numeric = take(/\s(?:le\s+)?(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?(?=[\s,;—·|]|$)/i);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const yearRaw = numeric[3];
    date = yearRaw
      ? isoDay(yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw), month, day)
      : upcoming(today, month, day);
  }
  if (!date) {
    const words = text.match(/\s(?:le\s+)?(?:(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lun|mar|mer|jeu|ven|sam|dim)\.?\s+)?(\d{1,2})\s+([a-zéèûô.]{3,9})(?:\s+(\d{4}))?(?=[\s,;—·|]|$)/i);
    const month = words ? MONTHS.find(([re]) => re.test(normalizeText(words[3])))?.[1] : undefined;
    if (words && month) {
      text = text.replace(words[0], " ");
      date = words[4] ? isoDay(Number(words[4]), month, Number(words[2])) : upcoming(today, month, Number(words[2]));
    }
  }
  if (!date) {
    if (take(/\s(apr[eè]s[-\s]demain)(?=[\s,;—·|]|$)/i)) date = addDays(today, 2);
    else if (take(/\s(demain)(?=[\s,;—·|]|$)/i)) date = addDays(today, 1);
    else if (take(/\s(aujourd['’]hui|auj)(?=[\s,;—·|]|$)/i)) date = today;
  }
  if (!date) {
    const m = text.match(/\s(?:le\s+)?(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lun|mar|mer|jeu|ven|sam|dim)\.?(?=[\s,;—·|]|$)/i);
    const target = m ? DAYS.find(([re]) => re.test(m[1].toLowerCase()))?.[1] : undefined;
    if (m && target !== undefined) {
      text = text.replace(m[0], " ");
      const current = new Date(`${today}T12:00:00Z`).getUTCDay();
      date = addDays(today, (target - current + 7) % 7);
    }
  }
  // Un jour de semaine restant (ex. « jeudi 12/11 ») n'apporte plus rien.
  text = text.replace(/\s(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?=[\s,;—·|]|$)/gi, " ");

  // Segments restants.
  const segments = text
    .split(/\s[—–-]\s|[,;·|]/)
    .map((s) => s.replace(/\s+/g, " ").replace(/^[\s—–-]+|[\s—–-]+$/g, "").trim())
    .filter(Boolean);

  let city: string | null = null;
  const cityIndex = segments.findIndex((s) => CITIES.some((c) => normalizeText(c) === normalizeText(s.replace(/^[àa]\s+/i, ""))));
  if (cityIndex >= 0) {
    const raw = segments.splice(cityIndex, 1)[0].replace(/^[àa]\s+/i, "");
    city = CITIES.find((c) => normalizeText(c) === normalizeText(raw)) ?? raw;
  }

  let vehicle: string | null = null;
  const vehicleIndex = segments.findIndex((s) =>
    BRANDS.some((b) => new RegExp(`(^|\\s)${normalizeText(b)}(\\s|$)`).test(normalizeText(s))),
  );
  if (vehicleIndex >= 0 && segments.length > 1) vehicle = segments.splice(vehicleIndex, 1)[0];

  if (personal || segments.length < 2) {
    return {
      date, time, timeToDefine, personal, price, phone, city,
      clientName: null,
      vehicle,
      title: segments.join(" · ") || (personal ? "Rendez-vous personnel" : ""),
      serviceName: null,
      notes: null,
    };
  }

  const [clientName, service, ...rest] = segments;
  return {
    date, time, timeToDefine, personal, price, phone, city,
    clientName,
    vehicle,
    title: service,
    serviceName: service,
    notes: rest.length ? rest.join(" · ") : null,
  };
}

/** Client existant correspondant : téléphone identique, sinon nom complet présent dans la ligne. */
export function matchCustomer(draft: QuickEventDraft, rawInput: string, customers: QuickCustomer[]) {
  const digits = (value?: string | null) => (value ?? "").replace(/\D/g, "").replace(/^33/, "0");
  if (draft.phone) {
    const byPhone = customers.find((c) => c.phone && digits(c.phone) === digits(draft.phone));
    if (byPhone) return byPhone;
  }
  const haystack = ` ${normalizeText(rawInput)} `;
  const byName = customers
    .filter((c) => c.full_name && normalizeText(c.full_name).length >= 3 && haystack.includes(` ${normalizeText(c.full_name)}`))
    .sort((a, b) => b.full_name.length - a.full_name.length);
  return byName[0] ?? null;
}

export type CalendarConflict = { kind: "same_time" | "same_customer_day"; label: string };

/** Doublons probables parmi les entrées déjà enregistrées ce jour-là. */
export function findConflicts(
  draft: { date: string; time: string | null; customerId: string | null; title: string },
  sameDay: Array<{ event_time: string; title: string; customer_id: string | null; status?: string | null }>,
): CalendarConflict[] {
  const conflicts: CalendarConflict[] = [];
  for (const row of sameDay) {
    if (row.status === "CANCELLED") continue;
    const hhmm = row.event_time.slice(0, 5);
    if (draft.time && hhmm === draft.time) {
      conflicts.push({ kind: "same_time", label: `Déjà un RDV à ${hhmm} : ${row.title}` });
    } else if (
      (draft.customerId && row.customer_id === draft.customerId) ||
      (draft.title && normalizeText(row.title) === normalizeText(draft.title))
    ) {
      conflicts.push({ kind: "same_customer_day", label: `Même jour à ${hhmm} : ${row.title}` });
    }
  }
  return conflicts;
}
