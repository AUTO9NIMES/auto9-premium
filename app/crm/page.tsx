import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../lib/auth/dal";
import {
  DASHBOARD_JOB_STATUSES,
  DASHBOARD_LEAD_STATUSES,
  getCalendarMonth,
  getCrmDashboardMetrics,
  getRecentActivity,
  type CalendarAppointmentItem,
  type Payment,
  type CrmDashboardMetrics,
  type JobStatus,
  type LeadLifecycleStatus,
  type RecentActivity,
} from "../lib/crm";
import { resolveCurrentBusinessContext } from "../lib/business";
import { supabaseRest } from "../lib/supabase";

export const dynamic = "force-dynamic";

const RECENT_ACTIVITY_LIMIT = 10;

type DashboardSubscription = {
  next_due_on: string;
  active: boolean;
};

function parisDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
}

function currentParisMonthKey(): string {
  const parts = parisDateParts();
  return `${parts.year}-${parts.month}`;
}

function currentParisMonthUtcBounds(): { start: string; end: string } {
  const parts = parisDateParts();
  const year = Number(parts.year);
  const month = Number(parts.month);

  /*
   * Payments are persisted as timestamptz. Query a deliberately safe UTC
   * envelope around the Paris calendar month, then perform the authoritative
   * Europe/Paris month check in memory. This avoids silently dropping
   * transactions around DST/month boundaries.
   */
  const start = new Date(Date.UTC(year, month - 1, 1) - 2 * 60 * 60 * 1000);
  const end = new Date(Date.UTC(year, month, 1) + 2 * 60 * 60 * 1000);

  return { start: start.toISOString(), end: end.toISOString() };
}

function parisMonthKey(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return `${values.year}-${values.month}`;
}

function money(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function appointmentTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Horaire indisponible";

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(date);
}
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const activityLabels: Record<string, string> = {
  "website.lead.created": "Nouveau lead reçu",
  "quote.accepted": "Devis accepté",
  "appointment.requested": "Rendez-vous demandé",
  "appointment.confirmed": "Rendez-vous confirmé",
  "appointment.completed": "Rendez-vous terminé",
  "appointment.cancelled": "Rendez-vous annulé",
  "lead.status_changed": "Statut du lead modifié",
};

const leadStatuses: LeadLifecycleStatus[] = DASHBOARD_LEAD_STATUSES;

const leadStatusLabels: Record<LeadLifecycleStatus, string> = {
  NEW: "Nouveau",
  QUALIFIED: "Qualifié",
  CONTACTED: "Contacté",
  QUOTE_SENT: "Devis envoyé",
  BOOKED: "Réservé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  REVIEW_REQUESTED: "Avis demandé",
  CLOSED_LOST: "Clôturé",
};

const jobStatuses: JobStatus[] = DASHBOARD_JOB_STATUSES;

const jobStatusLabels: Record<JobStatus, string> = {
  QUOTE_ACCEPTED: "Devis accepté",
  SCHEDULED: "Planifiée",
  CONFIRMED: "Confirmée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  PAID: "Payée",
};

async function ensureCrmAccess() {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirect("/crm/login?error=access");
    }
    throw new Error("Service CRM temporairement indisponible.");
  }
}

function SectionHeading({ eyebrow, title, headingId }: {
  eyebrow: string;
  title: string;
  headingId?: string;
}) {
  return (
    <div className="flex items-end justify-between border-b border-white/10 pb-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">{eyebrow}</p>
        <h2 id={headingId} className="mt-2 text-xl font-medium text-white">{title}</h2>
      </div>
      <span className="text-[10px] uppercase tracking-[0.16em] text-white/25">Résultats chargés</span>
    </div>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date non renseignée";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function activityLabel(eventType: string): string {
  return activityLabels[eventType] || "Activité CRM";
}

function ActivityRow({ activity }: { activity: RecentActivity }) {
  const jobHref = activity.jobId && UUID_REGEX.test(activity.jobId)
    ? `/crm/jobs/${activity.jobId}`
    : null;
  const customerHref = activity.customerId && UUID_REGEX.test(activity.customerId)
    ? `/crm/clients/${activity.customerId}`
    : null;

  return (
    <article className="flex flex-col gap-3 border-b border-white/10 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm text-white">{activityLabel(activity.eventType)}</p>
        {(jobHref || customerHref) && (
          <Link href={jobHref || customerHref || "#"} className="mt-1 inline-block text-xs text-[#d8b477] hover:text-white">
            {jobHref ? "Voir la prestation" : "Voir le client"} <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      <time dateTime={activity.createdAt} className="shrink-0 text-xs text-white/35">
        {formatDateTime(activity.createdAt)}
      </time>
    </article>
  );
}

export default async function CrmPage() {
  await ensureCrmAccess();

  let metrics: CrmDashboardMetrics | undefined;
  let recentActivity: RecentActivity[] = [];
  let monthlyPayments: Payment[] = [];
  let subscriptionsDue = 0;
  let nextAppointments: CalendarAppointmentItem[] = [];
  let metricsFailed = false;
  let activityFailed = false;
  let financeFailed = false;
  let subscriptionsFailed = false;
  let appointmentsFailed = false;

  try {
    metrics = await getCrmDashboardMetrics();
  } catch {
    metricsFailed = true;
  }

  try {
    recentActivity = await getRecentActivity({ limit: RECENT_ACTIVITY_LIMIT });
  } catch {
    activityFailed = true;
  }

  const { businessId } = await resolveCurrentBusinessContext();
  const parisMonth = currentParisMonthKey();
  const paymentBounds = currentParisMonthUtcBounds();

  try {
    const paymentRows = await supabaseRest<Payment>(
      "payments",
      "GET",
      null,
      `business_id=eq.${businessId}&received_at=gte.${encodeURIComponent(paymentBounds.start)}&received_at=lt.${encodeURIComponent(paymentBounds.end)}&order=received_at.desc,id.desc&select=id,business_id,job_id,amount,method,idempotency_key,received_at,created_at`,
    );

    monthlyPayments = (Array.isArray(paymentRows) ? paymentRows : paymentRows ? [paymentRows] : [])
      .filter((payment) => parisMonthKey(payment.received_at) === parisMonth);
  } catch {
    financeFailed = true;
  }

  try {
    const subscriptionRows = await supabaseRest<DashboardSubscription>(
      "crm_subscriptions",
      "GET",
      null,
      `business_id=eq.${businessId}&active=eq.true&next_due_on=gte.${parisMonth}-01&next_due_on=lt.${(() => {
        const [year, month] = parisMonth.split("-").map(Number);
        const next = new Date(Date.UTC(year, month, 1));
        return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
      })()}&select=next_due_on,active`,
    );

    subscriptionsDue = (Array.isArray(subscriptionRows)
      ? subscriptionRows
      : subscriptionRows
        ? [subscriptionRows]
        : []).length;
  } catch {
    subscriptionsFailed = true;
  }

  try {
    const calendar = await getCalendarMonth({ month: parisMonth });
    nextAppointments = calendar.items
      .filter((item) => new Date(item.appointment.scheduledAt).getTime() >= Date.now())
      .sort(
        (a, b) =>
          new Date(a.appointment.scheduledAt).getTime() -
          new Date(b.appointment.scheduledAt).getTime(),
      )
      .slice(0, 5);
  } catch {
    appointmentsFailed = true;
  }

  const monthlyRevenue = monthlyPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const cashRevenue = monthlyPayments
    .filter((payment) => payment.method === "CASH")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const bankRevenue = monthlyPayments
    .filter(
      (payment) =>
        payment.method === "CARD" || payment.method === "BANK_TRANSFER",
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  if (metricsFailed || !metrics) {
    return (
      <div data-crm-route="dashboard" className="space-y-8">
        <section className="border-b border-white/10 pb-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8b477]">Dashboard / Vue d&apos;ensemble</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">CRM AUTO9</h1>
        </section>
        <section className="border border-white/10 bg-[#101419] p-7">
          <p className="text-sm text-white/70">Le dashboard est momentanément indisponible.</p>
          <p className="mt-2 text-xs text-white/35">Les métriques CRM n&apos;ont pas pu être chargées.</p>
        </section>
      </div>
    );
  }

  return (
    <div data-crm-route="dashboard" className="space-y-12">
      <section className="max-w-3xl">
        <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#d8b477]">Dashboard / Vue d&apos;ensemble</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">CRM AUTO9</h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-white/50 md:text-base">Une vue opérationnelle globale de l&apos;activité CRM AUTO9.</p>
      </section>

      <section aria-labelledby="dashboard-summary" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 id="dashboard-summary" className="text-sm font-medium text-white">Vue globale</h2>
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">Tous les enregistrements</span>
        </div>
        <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3">
          {[
            ["Clients", metrics.customersTotal],
            ["Leads actifs", metrics.activeLeads],
            ["Prestations actives", metrics.activeJobs],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#101419] p-5 md:p-6">
              <p className="text-xs text-white/40">{label}</p>
              <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/25">Total global</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-10 xl:grid-cols-2">
        <section aria-labelledby="lead-overview" className="space-y-4">
          <SectionHeading eyebrow="01 / Pipeline" title="Répartition des leads" />
          <div className="border border-white/10 bg-[#101419] p-5 md:p-7">
            <div className="divide-y divide-white/10">
              {leadStatuses.map((status) => (
                <div key={status} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="text-xs text-white/60">{leadStatusLabels[status]}</span>
                  <span className="text-sm font-medium text-white">{metrics.leadsByStatus[status]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="job-overview" className="space-y-4">
          <SectionHeading eyebrow="02 / Opérations" title="Répartition des prestations" />
          <div className="border border-white/10 bg-[#101419] p-5 md:p-7">
            <div className="divide-y divide-white/10">
              {jobStatuses.map((status) => (
                <div key={status} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="text-xs text-white/60">{jobStatusLabels[status]}</span>
                  <span className="text-sm font-medium text-white">{metrics.jobsByStatus[status]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="business-signals" className="space-y-4">
        <SectionHeading eyebrow="03 / Pilotage" title="Signaux métier" headingId="business-signals" />

        <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/crm/revenue" className="bg-[#101419] p-5 transition-colors hover:bg-white/[0.04] md:p-6">
            <p className="text-xs text-white/40">CA encaissé ce mois</p>
            <p className="mt-4 text-2xl font-semibold text-[#d8b477]">
              {financeFailed ? "—" : money(monthlyRevenue)}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/25">
              Paiements enregistrés
            </p>
          </Link>

          <Link href="/crm/revenue" className="bg-[#101419] p-5 transition-colors hover:bg-white/[0.04] md:p-6">
            <p className="text-xs text-white/40">Espèces</p>
            <p className="mt-4 text-2xl font-semibold text-white">
              {financeFailed ? "—" : money(cashRevenue)}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/25">
              Mois en cours
            </p>
          </Link>

          <Link href="/crm/revenue" className="bg-[#101419] p-5 transition-colors hover:bg-white/[0.04] md:p-6">
            <p className="text-xs text-white/40">Carte + virement</p>
            <p className="mt-4 text-2xl font-semibold text-white">
              {financeFailed ? "—" : money(bankRevenue)}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/25">
              Mois en cours
            </p>
          </Link>

          <Link href="/crm/subscriptions" className="bg-[#101419] p-5 transition-colors hover:bg-white/[0.04] md:p-6">
            <p className="text-xs text-white/40">Abonnements à planifier</p>
            <p className="mt-4 text-2xl font-semibold text-white">
              {subscriptionsFailed ? "—" : subscriptionsDue}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/25">
              Échéance ce mois
            </p>
          </Link>
        </div>
      </section>

      <section aria-labelledby="upcoming-appointments" className="space-y-4">
        <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">04 / Planning</p>
            <h2 id="upcoming-appointments" className="mt-2 text-xl font-medium text-white">
              Prochains rendez-vous
            </h2>
          </div>
          <Link href="/crm/calendar" className="text-xs text-[#d8b477] hover:text-white">
            Ouvrir le calendrier <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="border border-white/10 bg-[#101419] px-5 md:px-7">
          {appointmentsFailed ? (
            <p className="py-7 text-sm text-white/45">
              Les prochains rendez-vous sont momentanément indisponibles.
            </p>
          ) : nextAppointments.length === 0 ? (
            <p className="py-7 text-sm text-white/35">Aucun rendez-vous planifié.</p>
          ) : (
            nextAppointments.map((item) => (
              <article
                key={item.appointment.id}
                className="flex flex-col gap-3 border-b border-white/10 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {item.customer.fullName}
                  </p>
                  <p className="mt-1 truncate text-xs text-white/40">
                    {item.job.title || item.job.jobNumber || "Prestation AUTO9"}
                  </p>
                </div>
                <time
                  dateTime={item.appointment.scheduledAt}
                  className="shrink-0 text-xs text-[#d8b477]"
                >
                  {appointmentTime(item.appointment.scheduledAt)}
                </time>
              </article>
            ))
          )}
        </div>
      </section>

      <section aria-labelledby="quick-links" className="space-y-4">
        <SectionHeading eyebrow="05 / Accès rapide" title="Ouvrir un espace" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["Clients", "/crm/clients", "Répertoire relationnel"],
            ["Pipeline", "/crm/pipeline", "Demandes et suivi commercial"],
            ["Prestations", "/crm/jobs", "Registre opérationnel"],
            ["Calendrier", "/crm/calendar", "Planning opérationnel"],
            ["Chiffre d’affaires", "/crm/revenue", "Encaissements enregistrés"],
            ["Abonnements", "/crm/subscriptions", "Récurrence et échéances"],
          ].map(([label, href, detail]) => (
            <Link key={href} href={href} className="border border-white/10 bg-[#101419] p-5 transition-colors hover:border-[#d8b477]/60">
              <span className="text-sm font-medium text-white">{label}</span>
              <span className="mt-2 block text-xs text-white/40">{detail}</span>
              <span className="mt-6 block text-xs text-[#d8b477]">Accéder <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-activity" className="space-y-4">
        <SectionHeading eyebrow="06 / Historique" title="Activité récente" headingId="recent-activity" />
        <div className="border border-white/10 bg-[#101419] px-5 md:px-7">
          {activityFailed ? (
            <p className="py-7 text-sm text-white/45">L&apos;activité récente est momentanément indisponible.</p>
          ) : recentActivity.length === 0 ? (
            <p className="py-7 text-sm text-white/35">Aucune activité récente.</p>
          ) : (
            recentActivity.map((activity) => <ActivityRow key={activity.id} activity={activity} />)
          )}
        </div>
      </section>

    </div>
  );
}
