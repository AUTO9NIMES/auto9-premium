import Link from "next/link";
import { ensureCrmV2Access } from "./access";
import { readRequestClock } from "../lib/request-clock";
import { parisDateKey } from "../lib/paris-business-calendar";
import { getCalendarMonth, getCrmDashboardMetrics, type CalendarAppointmentItem, type Payment } from "../lib/crm";
import { resolveCurrentBusinessContext } from "../lib/business";
import { supabaseRest } from "../lib/supabase";
import { getManualRevenueEntries } from "../lib/manual-revenue";
import { getHistoricalCalendarEntries } from "../lib/historical-calendar";

export const dynamic = "force-dynamic";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const day = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "short",
  day: "2-digit",
});

const hour = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function nextMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parisMonthKey(value: string | Date) {
  return parisDateKey(value).slice(0, 7);
}

type DashboardLeadRow = {
  id: string;
  lifecycle_status: string;
  customer_id: string;
};

type DashboardJobRow = {
  id: string;
  lead_id: string | null;
  title: string | null;
  total_amount: number | null;
  status: string;
};

type DashboardServiceRow = {
  lead_id: string;
  base_price: number | null;
};

function manualStepDone(leadId: string, step: string, activity: DashboardStepActivity[]) {
  const last = activity.find((entry) =>
    entry.lead_id === leadId && entry.event_data?.step_key === step &&
    (entry.event_type === "crm_v2.step.completed" || entry.event_type === "crm_v2.step.reopened"),
  );
  return last ? last.event_type === "crm_v2.step.completed" : null;
}

type DashboardStepActivity = {
  lead_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
};

type DashboardCustomEvent = {
  id: string;
  event_date: string;
  event_time: string;
  status: string;
  title: string;
};

function hasBookedStep(lead: DashboardLeadRow, activity: DashboardStepActivity[]) {
  const latestOverride = activity.find(
    (row) =>
      row.lead_id === lead.id &&
      (row.event_type === "crm_v2.step.completed" ||
        row.event_type === "crm_v2.step.reopened") &&
      row.event_data?.step_key === "BOOKED",
  );

  if (latestOverride) {
    return latestOverride.event_type === "crm_v2.step.completed";
  }

  return ["BOOKED", "IN_PROGRESS", "COMPLETED", "REVIEW_REQUESTED"].includes(
    lead.lifecycle_status,
  );
}

const longDate = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const monthName = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "long" });
const parisHour = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" });

function previousMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function greetingFor(date: Date) {
  const hourOfDay = Number(parisHour.formatToParts(date).find((part) => part.type === "hour")?.value ?? 12);
  return hourOfDay < 12 ? "Bonjour" : hourOfDay < 18 ? "Bon après-midi" : "Bonsoir";
}

/* Courbe : valeurs cumulées, tracées à l'échelle (min 0 → max). */
function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = 100 / (values.length - 1);
  const points = values.map((value, index) => `${(index * step).toFixed(2)},${(28 - (value / max) * 24).toFixed(2)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" className="h-8 w-full overflow-visible">
      <polygon points={`0,30 ${points} 100,30`} fill={stroke} opacity="0.12" />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last * step} cy={28 - (values[last] / max) * 24} r="2.6" fill={stroke} />
    </svg>
  );
}

function ProgressRing({ percent, label }: { percent: number | null; label: string }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const shown = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  return (
    <div className="relative grid h-[132px] w-[132px] shrink-0 place-items-center" role="img" aria-label={percent === null ? label : `${Math.round(shown)} % — ${label}`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="10" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--crm-ring)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(shown / 100) * circumference} ${circumference}`} />
      </svg>
      <div className="text-center">
        <p className="crm-display crm-num text-[26px] leading-none">{percent === null ? "—" : `${Math.round(percent)} %`}</p>
        <p className="crm-on-dark-muted mt-1 max-w-[86px] text-[10.5px] leading-tight">{label}</p>
      </div>
    </div>
  );
}

function NextEvent({ item }: { item: CalendarAppointmentItem }) {
  const when = new Date(item.appointment.scheduledAt);
  return (
    <Link href="/crm-v2/calendar" className="crm-lift flex items-center gap-3 rounded-2xl border p-3" style={{ background: "var(--crm-glass-strong)", borderColor: "var(--crm-glass-border)" }}>
      <div className="w-14 shrink-0 text-center">
        <p className="crm-eyebrow !text-[9.5px] !tracking-[0.12em]">{day.format(when)}</p>
        <time className="crm-num crm-accent-text mt-1 block text-[13px] font-bold">{hour.format(when)}</time>
      </div>
      <div className="min-w-0 border-l pl-3" style={{ borderColor: "var(--crm-line)" }}>
        <p className="truncate text-sm font-semibold">{item.customer.fullName}</p>
        <p className="crm-muted mt-0.5 truncate text-xs">{item.job.title || item.job.jobNumber || "Prestation AUTO 9"}</p>
      </div>
    </Link>
  );
}

const ICON = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const kpiIcons = {
  calendar: <svg viewBox="0 0 24 24" {...ICON} className="h-4 w-4" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>,
  euro: <svg viewBox="0 0 24 24" {...ICON} className="h-4 w-4" aria-hidden="true"><path d="M17 6.5A7 7 0 1 0 17 17.5" /><path d="M4 10h9M4 14h9" /></svg>,
  inbox: <svg viewBox="0 0 24 24" {...ICON} className="h-4 w-4" aria-hidden="true"><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5 5h14l2 8v6H3v-6Z" /></svg>,
  repeat: <svg viewBox="0 0 24 24" {...ICON} className="h-4 w-4" aria-hidden="true"><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12" /><path d="M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></svg>,
  plus: <svg viewBox="0 0 24 24" {...ICON} className="h-4 w-4" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  user: <svg viewBox="0 0 24 24" {...ICON} className="h-4 w-4" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
  target: <svg viewBox="0 0 24 24" {...ICON} className="h-4 w-4" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>,
  arrow: <svg viewBox="0 0 24 24" {...ICON} className="h-4 w-4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
};

export default async function CrmV2Dashboard() {
  await ensureCrmV2Access("/crm-v2");

  const { businessId } = await resolveCurrentBusinessContext();
  const calendarDate = new Date(await readRequestClock());
  const currentDay = parisDateKey(calendarDate);
  const currentMonth = currentDay.slice(0, 7);
  const [calendarYear, calendarMonth] = currentMonth.split("-").map(Number);
  const todayNumber = Number(currentDay.slice(8, 10));

  const firstWeekday = new Date(
    Date.UTC(calendarYear, calendarMonth - 1, 1),
  ).getUTCDay();

  const daysInMonth = new Date(
    Date.UTC(calendarYear, calendarMonth, 0),
  ).getUTCDate();
  let subscriptionsDue = 0;
  try {
    const subscriptionRows = await supabaseRest<Array<{ next_due_on: string; active: boolean }>>(
      "crm_subscriptions",
      "GET",
      null,
      `business_id=eq.${businessId}&active=eq.true&select=next_due_on,active`,
    );
    const current = currentMonth;
    subscriptionsDue = ((subscriptionRows as Array<{ next_due_on: string; active: boolean }> | null) ?? [])
      .filter((item) => item.next_due_on?.startsWith(current)).length;
  } catch {
    subscriptionsDue = 0;
  }

  const nextMonth = nextMonthKey(currentMonth);

  const [metrics, calendar, paymentsRaw, leadsRaw, stepActivityRaw, customEventsRaw, historicalEvents, jobsRaw, servicesRaw] = await Promise.all([
    getCrmDashboardMetrics(),
    getCalendarMonth({ month: currentMonth }),
    supabaseRest<Payment[]>(
      "payments",
      "GET",
      null,
      `business_id=eq.${businessId}&order=received_at.desc&limit=500&select=id,business_id,job_id,amount,method,idempotency_key,received_at,created_at`,
    ),
    supabaseRest<DashboardLeadRow[]>(
      "leads",
      "GET",
      null,
      `business_id=eq.${businessId}&lifecycle_status=neq.CLOSED_LOST&order=created_at.desc&limit=5000&select=id,lifecycle_status,customer_id`,
    ),
    supabaseRest<DashboardStepActivity[]>(
      "activity_log",
      "GET",
      null,
      `business_id=eq.${businessId}&event_type=in.(crm_v2.step.completed,crm_v2.step.reopened)&order=created_at.desc&limit=5000&select=lead_id,event_type,event_data,created_at`,
    ),
    supabaseRest<DashboardCustomEvent[]>(
      "crm_calendar_events",
      "GET",
      null,
      `business_id=eq.${businessId}&event_date=gte.${currentMonth}-01&event_date=lt.${nextMonth}-01&status=neq.CANCELLED&order=event_date.asc,event_time.asc&limit=5000&select=id,event_date,event_time,status,title`,
    ),
    getHistoricalCalendarEntries(businessId, currentMonth),
    supabaseRest<DashboardJobRow[]>(
      "jobs", "GET", null,
      `business_id=eq.${businessId}&status=in.(SCHEDULED,CONFIRMED,IN_PROGRESS,COMPLETED,PAID)&order=created_at.desc&limit=5000&select=id,lead_id,title,total_amount,status`,
    ),
    supabaseRest<DashboardServiceRow[]>(
      "lead_services", "GET", null,
      `business_id=eq.${businessId}&order=created_at.desc,id.desc&limit=5000&select=lead_id,base_price`,
    ),
  ]);

  const payments = (paymentsRaw as Payment[] | null) ?? [];
  const manualPayments = await getManualRevenueEntries(businessId, payments);
  const appointmentCutoff = await readRequestClock();
  const customEvents = (customEventsRaw as DashboardCustomEvent[] | null) ?? [];
  const paymentsThisMonth = payments.filter((payment) => parisMonthKey(payment.received_at) === currentMonth);
  const manualThisMonth = manualPayments.filter((payment) => parisMonthKey(payment.receivedAt) === currentMonth);
  const cashRevenue =
    paymentsThisMonth
      .filter((payment) => payment.method === "CASH")
      .reduce((sum, payment) => sum + (payment.amount || 0), 0) +
    manualThisMonth
      .filter((payment) => payment.method === "CASH")
      .reduce((sum, payment) => sum + payment.amount, 0);
  const bankRevenue =
    paymentsThisMonth
      .filter((payment) => payment.method === "CARD" || payment.method === "BANK_TRANSFER")
      .reduce((sum, payment) => sum + (payment.amount || 0), 0) +
    manualThisMonth
      .filter((payment) => payment.method === "CARD" || payment.method === "BANK_TRANSFER")
      .reduce((sum, payment) => sum + payment.amount, 0);
  const activeLeads = (leadsRaw as DashboardLeadRow[] | null) ?? [];
  const stepActivity = (stepActivityRaw as DashboardStepActivity[] | null) ?? [];
  const leadsToTreat = activeLeads.filter((lead) => !hasBookedStep(lead, stepActivity)).length;
  const clientDossiers = activeLeads.filter((lead) => hasBookedStep(lead, stepActivity)).length;

  // Financial totals are based on recorded payments, never open quotes.
  const monthRevenue = cashRevenue + bankRevenue;
  const jobs = (jobsRaw as DashboardJobRow[] | null) ?? [];
  const services = (servicesRaw as DashboardServiceRow[] | null) ?? [];
  const paidJobIds = new Set(payments.map((payment) => payment.job_id));
  const jobLeadIds = new Set(jobs.map((job) => job.lead_id).filter(Boolean));
  const latestServiceByLead = new Map<string, DashboardServiceRow>();
  for (const service of services) {
    if (!latestServiceByLead.has(service.lead_id)) latestServiceByLead.set(service.lead_id, service);
  }

  const unpaidJobs = jobs.filter((job) =>
    job.status === "COMPLETED" &&
    !paidJobIds.has(job.id) &&
    (!job.lead_id || manualStepDone(job.lead_id, "PAID", stepActivity) !== true),
  );
  const unpaidLeads = activeLeads.filter((lead) =>
    !jobLeadIds.has(lead.id) &&
    manualStepDone(lead.id, "PAID", stepActivity) !== true &&
    (manualStepDone(lead.id, "COMPLETED", stepActivity) ??
      ["COMPLETED", "REVIEW_REQUESTED"].includes(lead.lifecycle_status)),
  );
  const unpaidCount = unpaidJobs.length + unpaidLeads.length;
  const unpaidKnownAmount =
    unpaidJobs.reduce((total, job) => total + Math.max(0, Number(job.total_amount) || 0), 0) +
    unpaidLeads.reduce((total, lead) =>
      total + Math.max(0, Number(latestServiceByLead.get(lead.id)?.base_price) || 0), 0);
  const unpaidWithoutAmount =
    unpaidJobs.filter((job) => !(Number(job.total_amount) > 0)).length +
    unpaidLeads.filter((lead) => !(Number(latestServiceByLead.get(lead.id)?.base_price) > 0)).length;

  const todayAppointments = calendar.items
    .filter((item) => parisDateKey(item.appointment.scheduledAt) === currentDay)
    .map((item) => ({
      id: "appointment-" + item.appointment.id,
      time: hour.format(new Date(item.appointment.scheduledAt)),
      title: item.customer.fullName,
      subtitle: item.job.title || "Prestation AUTO 9",
    }));
  const todayCustomEvents = customEvents.filter((item) => item.event_date === currentDay)
    .map((item) => ({
      id: "calendar-" + item.id,
      time: item.event_time?.slice(0, 5) || "—",
      title: item.title || "Événement",
      subtitle: "Intervention au planning",
    }));
  const todayHistorical = historicalEvents.filter((item) => item.eventDate === currentDay)
    .map((item) => ({
      id: "history-" + item.id,
      time: item.eventTime?.slice(0, 5) || "—",
      title: item.serviceName || "Prestation",
      subtitle: "Prestation du dossier",
    }));
  const todayAgenda = [...todayAppointments, ...todayCustomEvents, ...todayHistorical]
    .sort((a, b) => a.time.localeCompare(b.time));

  const nextEvents = calendar.items
    .filter((item) => new Date(item.appointment.scheduledAt).getTime() >= appointmentCutoff)
    .sort((a, b) => new Date(a.appointment.scheduledAt).getTime() - new Date(b.appointment.scheduledAt).getTime())
    .slice(0, 5);

  // ---------- Affichage ----------
  const countForDay = (key: string) =>
    calendar.items.filter((item) => parisDateKey(item.appointment.scheduledAt) === key).length +
    customEvents.filter((item) => item.event_date === key).length +
    historicalEvents.filter((item) => item.eventDate === key).length;

  // Comparaison avec le mois précédent (mêmes règles : paiements réellement enregistrés).
  const previousMonth = previousMonthKey(currentMonth);
  const previousRevenue =
    payments
      .filter((payment) => parisMonthKey(payment.received_at) === previousMonth && ["CASH", "CARD", "BANK_TRANSFER"].includes(payment.method))
      .reduce((sum, payment) => sum + (payment.amount || 0), 0) +
    manualPayments
      .filter((payment) => parisMonthKey(payment.receivedAt) === previousMonth && ["CASH", "CARD", "BANK_TRANSFER"].includes(payment.method))
      .reduce((sum, payment) => sum + payment.amount, 0);
  const revenuePercent = previousRevenue > 0 ? (monthRevenue / previousRevenue) * 100 : null;
  const previousMonthLabel = monthName.format(new Date(`${previousMonth}-15T00:00:00Z`));

  // CA cumulé jour par jour (mois en cours, jusqu'à aujourd'hui).
  const revenueByDay = new Array<number>(todayNumber).fill(0);
  for (const payment of paymentsThisMonth) {
    if (!["CASH", "CARD", "BANK_TRANSFER"].includes(payment.method)) continue;
    const index = Number(parisDateKey(payment.received_at).slice(8, 10)) - 1;
    if (index >= 0 && index < todayNumber) revenueByDay[index] += payment.amount || 0;
  }
  for (const payment of manualThisMonth) {
    if (!["CASH", "CARD", "BANK_TRANSFER"].includes(payment.method)) continue;
    const index = Number(parisDateKey(payment.receivedAt).slice(8, 10)) - 1;
    if (index >= 0 && index < todayNumber) revenueByDay[index] += payment.amount;
  }
  const cumulativeRevenue = revenueByDay.reduce<number[]>((acc, value) => [...acc, (acc.at(-1) ?? 0) + value], []);

  // Semaine en cours (lundi → dimanche) ; seuls les jours du mois affiché ont leur compte.
  const todayUtc = new Date(Date.UTC(calendarYear, calendarMonth - 1, todayNumber));
  const mondayOffset = (todayUtc.getUTCDay() + 6) % 7;
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayUtc);
    date.setUTCDate(todayUtc.getUTCDate() - mondayOffset + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      letter: ["L", "M", "M", "J", "V", "S", "D"][index],
      number: date.getUTCDate(),
      count: key.startsWith(currentMonth) ? countForDay(key) : null,
      today: key === currentDay,
    };
  });

  const attention = unpaidCount + leadsToTreat + subscriptionsDue;
  const greeting = greetingFor(calendarDate);
  const dateLabel = longDate.format(calendarDate);

  const kpis = [
    {
      key: "unpaid",
      label: "Paiements à suivre",
      value: String(unpaidCount),
      detail: unpaidCount ? eur.format(unpaidKnownAmount) + " connus" + (unpaidWithoutAmount ? " · prix à compléter" : "") : "Tout est à jour",
      chip: unpaidCount ? { text: "À encaisser", tone: "warning" } : { text: "À jour", tone: "accent" },
      href: "/crm-v2/pipeline",
      icon: kpiIcons.euro,
    },
    {
      key: "leads",
      label: "Demandes à traiter",
      value: String(leadsToTreat),
      detail: "Sans réservation confirmée",
      chip: leadsToTreat ? { text: "À rappeler", tone: "warning" } : { text: "Rien en attente", tone: "neutral" },
      href: "/crm-v2/pipeline",
      icon: kpiIcons.inbox,
    },
    {
      key: "dossiers",
      label: "Dossiers réservés",
      value: String(clientDossiers),
      detail: "Clients avec réservation",
      chip: { text: "En cours", tone: "neutral" },
      href: "/crm-v2/pipeline",
      icon: kpiIcons.user,
    },
  ];

  const quickActions = [
    { label: "Nouveau dossier", detail: "Client ou garage", href: "/crm-v2/pipeline/new", icon: kpiIcons.plus },
    { label: "Intervention", detail: "Ajouter au planning", href: "/crm-v2/calendar?new=1", icon: kpiIcons.calendar },
    { label: "Nouveau client", detail: "Créer une fiche", href: "/crm-v2/clients?new=1", icon: kpiIcons.user },
    { label: "Prospection", detail: "Garages et relances", href: "/crm-v2/developpement", icon: kpiIcons.target },
  ];

  return (
    <div className="grid gap-4">
      <header className="crm-rise flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <h1 className="crm-display text-[clamp(28px,4vw,42px)] leading-[1.05]">{greeting}</h1>
          <p className="crm-muted mt-1.5 text-sm first-letter:uppercase">
            {dateLabel}
            {" · "}
            {attention ? (
              <span className="font-semibold" style={{ color: "var(--crm-ink)" }}>
                {attention} chose{attention > 1 ? "s" : ""} demande{attention > 1 ? "nt" : ""} ton attention
              </span>
            ) : (
              "Tout est à jour"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/crm-v2/calendar?new=1" className="crm-btn">{kpiIcons.calendar} Événement</Link>
          <Link href="/crm-v2/pipeline/new" className="crm-btn" data-variant="primary">{kpiIcons.plus} Nouveau dossier</Link>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Link href="/crm-v2/revenue" className="crm-hero-card crm-rise crm-lift grid gap-5 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-7" style={{ "--crm-delay": "60ms" } as React.CSSProperties} data-revenue-card>
          <div className="min-w-0">
            <span className="crm-chip crm-on-dark-chip">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--crm-ring)" }} />
              CA encaissé · {monthName.format(new Date(`${currentMonth}-15T00:00:00Z`))}
            </span>
            <p className="crm-display crm-num mt-4 text-[clamp(38px,5vw,56px)] leading-none" data-revenue="total">{eur.format(monthRevenue)}</p>
            <p className="crm-on-dark-muted mt-2 max-w-[44ch] text-[13px] leading-relaxed">
              Paiements réellement enregistrés ce mois-ci.
              {previousRevenue > 0 ? ` ${previousMonthLabel.charAt(0).toUpperCase() + previousMonthLabel.slice(1)} : ${eur.format(previousRevenue)}.` : ""}
            </p>
            <div className="mt-5 flex flex-wrap gap-6">
              <div>
                <p className="crm-num text-lg font-extrabold" data-revenue="cash">{eur.format(cashRevenue)}</p>
                <p className="crm-on-dark-muted text-[11px]">Espèces</p>
              </div>
              <div>
                <p className="crm-num text-lg font-extrabold" data-revenue="card">{eur.format(bankRevenue)}</p>
                <p className="crm-on-dark-muted text-[11px]">Carte + virement</p>
              </div>
            </div>
            {cumulativeRevenue.length > 1 && (
              <div className="mt-4 max-w-[420px]">
                <Sparkline values={cumulativeRevenue} stroke="#6fd9a8" />
              </div>
            )}
          </div>
          <ProgressRing percent={revenuePercent} label={previousRevenue > 0 ? `du CA de ${previousMonthLabel}` : "pas de mois précédent"} />
        </Link>

        <div className="crm-glass crm-rise grid content-start gap-4 p-5" style={{ "--crm-delay": "120ms" } as React.CSSProperties}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="crm-display crm-num crm-accent-text text-[40px] leading-none">{String(todayNumber).padStart(2, "0")}</span>
              <div>
                <p className="text-sm font-bold first-letter:uppercase">{dateLabel.split(" ")[0]}</p>
                <p className="crm-muted text-xs">{todayAgenda.length} intervention{todayAgenda.length > 1 ? "s" : ""} aujourd&apos;hui</p>
              </div>
            </div>
            <Link href={"/crm-v2/calendar?day=" + currentDay} className="crm-btn !px-3 !py-2 !text-[11.5px]">Journée {kpiIcons.arrow}</Link>
          </div>

          <div className="grid grid-cols-7 gap-1 rounded-2xl p-1.5" style={{ background: "var(--crm-glass-strong)" }}>
            {week.map((d) => (
              <Link
                key={d.key}
                href={`/crm-v2/calendar?day=${d.key}`}
                data-week-day={d.key}
                className="grid place-items-center rounded-xl py-1.5 text-center transition"
                style={d.today ? { background: "var(--crm-accent)", color: "#fff" } : { color: "var(--crm-muted)" }}
              >
                <span className="text-[10px] font-bold">{d.letter}</span>
                <span className="crm-num text-[13px] font-bold">{d.number}</span>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.count ? (d.today ? "#fff" : "var(--crm-accent)") : "transparent" }} />
              </Link>
            ))}
          </div>

          <div className="grid gap-2">
            {todayAgenda.length ? todayAgenda.slice(0, 4).map((event) => (
              <Link key={event.id} href={"/crm-v2/calendar?day=" + currentDay} className="crm-lift grid grid-cols-[auto_3px_minmax(0,1fr)] items-center gap-3 rounded-2xl border p-3" style={{ background: "var(--crm-glass-strong)", borderColor: "var(--crm-glass-border)" }}>
                <time className="crm-num crm-muted text-[12.5px] font-semibold">{event.time}</time>
                <span className="h-7 rounded-full" style={{ background: "var(--crm-accent-soft)" }} />
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold">{event.title}</span>
                  <span className="crm-muted block truncate text-[11.5px]">{event.subtitle}</span>
                </span>
              </Link>
            )) : (
              <div className="rounded-2xl border border-dashed p-4" style={{ borderColor: "var(--crm-line-strong)" }}>
                <p className="crm-muted text-sm">Aucune intervention inscrite aujourd&apos;hui.</p>
                <Link href="/crm-v2/calendar?new=1" className="crm-accent-text mt-2 inline-block text-xs font-bold">+ Ajouter un événement</Link>
              </div>
            )}
            {todayAgenda.length > 4 && (
              <Link href={"/crm-v2/calendar?day=" + currentDay} className="crm-accent-text text-xs font-bold">+ {todayAgenda.length - 4} autre{todayAgenda.length - 4 > 1 ? "s" : ""} →</Link>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href={"/crm-v2/calendar?day=" + currentDay}
          className="crm-glass crm-feature-card crm-rise crm-lift grid content-start gap-2 p-5"
          style={{ "--crm-delay": "160ms" } as React.CSSProperties}
          data-kpi="today"
        >
          <div className="flex items-center justify-between">
            <span className="crm-on-dark-chip grid h-8 w-8 place-items-center rounded-xl">{kpiIcons.calendar}</span>
            <span className="crm-chip crm-on-dark-chip">Aujourd&apos;hui</span>
          </div>
          <p className="crm-display crm-num mt-3 text-[34px] leading-none">{todayAgenda.length}</p>
          <p className="text-sm font-bold">Prestations du jour</p>
          <p className="crm-on-dark-muted text-xs">{nextEvents[0] ? `Prochain : ${hour.format(new Date(nextEvents[0].appointment.scheduledAt))} · ${nextEvents[0].customer.fullName}` : "Interventions planifiées"}</p>
        </Link>
        {kpis.map((kpi, index) => (
          <Link
            key={kpi.key}
            href={kpi.href}
            className="crm-glass crm-rise crm-lift grid content-start gap-2 p-5"
            style={{ "--crm-delay": `${200 + index * 40}ms` } as React.CSSProperties}
            data-kpi={kpi.key}
          >
            <div className="flex items-center justify-between">
              <span className="crm-accent-text grid h-8 w-8 place-items-center rounded-xl" style={{ background: "var(--crm-glass-strong)" }}>{kpi.icon}</span>
              <span className="crm-chip" data-tone={kpi.chip.tone}>{kpi.chip.text}</span>
            </div>
            <p className="crm-display crm-num mt-3 text-[34px] leading-none">{kpi.value}</p>
            <p className="text-sm font-bold">{kpi.label}</p>
            <p className="crm-muted text-xs">{kpi.detail}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Actions rapides">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="crm-glass crm-lift flex items-center gap-3 !rounded-[18px] p-3.5">
            <span className="crm-accent-text grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "var(--crm-glass-strong)" }}>{action.icon}</span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-bold">{action.label}</span>
              <span className="crm-muted block text-[11.5px]">{action.detail}</span>
            </span>
          </Link>
        ))}
      </section>

      {subscriptionsDue > 0 && (
        <Link href="/crm-v2/subscriptions" className="crm-glass crm-lift flex flex-wrap items-center justify-between gap-3 p-5" data-subscriptions-reminder>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "rgba(var(--crm-warning-rgb), .14)", color: "var(--crm-warning-text)" }}>{kpiIcons.repeat}</span>
            <div>
              <p className="crm-eyebrow">Rappel abonnements</p>
              <p className="mt-0.5 text-[15px] font-bold">{subscriptionsDue} abonnement{subscriptionsDue > 1 ? "s" : ""} à planifier ce mois-ci</p>
            </div>
          </div>
          <span className="crm-btn !py-2">Ouvrir {kpiIcons.arrow}</span>
        </Link>
      )}

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <section className="crm-glass p-5 md:p-6" aria-labelledby="crm-month-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="crm-eyebrow">Planning</p>
              <h2 id="crm-month-title" className="mt-1 text-lg font-extrabold first-letter:uppercase">{monthName.format(new Date(`${currentMonth}-15T00:00:00Z`))} {calendarYear}</h2>
            </div>
            <Link href="/crm-v2/calendar" className="crm-btn !px-3 !py-2 !text-[11.5px]">Calendrier {kpiIcons.arrow}</Link>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1.5">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <div key={i} className="crm-faint py-1 text-center text-[10px] font-bold">{d}</div>)}
            {Array.from({ length: firstWeekday === 0 ? 6 : firstWeekday - 1 }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((n) => {
              const key = `${currentMonth}-${String(n).padStart(2, "0")}`;
              const count = countForDay(key);
              const today = n === todayNumber;
              return (
                <Link
                  href={`/crm-v2/calendar?day=${key}`}
                  key={n}
                  data-day={key}
                  data-today={today ? "true" : undefined}
                  className="relative min-h-16 rounded-2xl border p-2 transition hover:-translate-y-px"
                  style={today
                    ? { background: "rgba(var(--crm-accent-rgb), .12)", borderColor: "rgba(var(--crm-accent-rgb), .45)" }
                    : { background: "var(--crm-glass-soft)", borderColor: "var(--crm-line)" }}
                >
                  <span className={`crm-num text-xs ${today ? "crm-accent-text font-extrabold" : "crm-muted"}`}>{n}</span>
                  {count > 0 && (
                    <span className="absolute bottom-2 left-1.5 right-1.5 rounded-full py-0.5 text-center text-[9.5px] font-bold" style={{ background: "rgba(var(--crm-accent-rgb), .16)", color: "var(--crm-accent-text)" }}>
                      {count} RDV
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="crm-glass p-5 md:p-6" aria-labelledby="crm-next-title">
          <p className="crm-eyebrow">À venir</p>
          <h2 id="crm-next-title" className="mt-1 text-lg font-extrabold">Prochains rendez-vous</h2>
          <div className="mt-5 grid gap-2">
            {nextEvents.length ? nextEvents.map((item) => <NextEvent key={item.appointment.id} item={item} />) : (
              <p className="crm-muted rounded-2xl border border-dashed p-5 text-sm" style={{ borderColor: "var(--crm-line-strong)" }}>Aucun rendez-vous planifié.</p>
            )}
          </div>
          <p className="crm-faint mt-4 text-[11px] leading-5">Les montants à encaisser sont indicatifs. Le CA ne compte que les paiements enregistrés.</p>
        </section>
      </div>
    </div>
  );
}
