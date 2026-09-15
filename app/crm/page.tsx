import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../lib/auth/dal";
import {
  getCustomersList,
  getJobsList,
  getLeadsList,
  getRecentActivity,
  type CustomerListResult,
  type JobStatus,
  type JobListResult,
  type LeadListResult,
  type LeadLifecycleStatus,
  type RecentActivity,
} from "../lib/crm";

export const dynamic = "force-dynamic";

const DASHBOARD_LIST_LIMIT = 20;
const RECENT_ACTIVITY_LIMIT = 10;
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

const leadStatuses: LeadLifecycleStatus[] = [
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "QUOTE_SENT",
  "BOOKED",
  "IN_PROGRESS",
  "COMPLETED",
  "REVIEW_REQUESTED",
  "CLOSED_LOST",
];

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

const jobStatuses: JobStatus[] = [
  "QUOTE_ACCEPTED",
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "PAID",
];

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

  let customersResult: CustomerListResult | undefined;
  let leadsResult: LeadListResult | undefined;
  let jobsResult: JobListResult | undefined;
  let failed = false;

  try {
    [customersResult, leadsResult, jobsResult] = await Promise.all([
      getCustomersList({ page: 1, limit: DASHBOARD_LIST_LIMIT }),
      getLeadsList({ page: 1, limit: DASHBOARD_LIST_LIMIT }),
      getJobsList({ page: 1, limit: DASHBOARD_LIST_LIMIT }),
    ]);
  } catch {
    failed = true;
  }

  if (failed || !customersResult || !leadsResult || !jobsResult) {
    return (
      <div data-crm-route="dashboard" className="space-y-8">
        <section className="border-b border-white/10 pb-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8b477]">Dashboard / Vue d&apos;ensemble</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">CRM AUTO9</h1>
        </section>
        <section className="border border-white/10 bg-[#101419] p-7">
          <p className="text-sm text-white/70">Le dashboard est momentanément indisponible.</p>
          <p className="mt-2 text-xs text-white/35">Les données CRM n&apos;ont pas pu être chargées.</p>
        </section>
      </div>
    );
  }

  const leadCounts = leadStatuses.map((status) =>
    leadsResult.items.filter((item) => item.lead.lifecycle_status === status).length,
  );
  const jobCounts = jobStatuses.map((status) =>
    jobsResult.items.filter((item) => item.job.status === status).length,
  );
  const hasMoreResults = customersResult.pagination.hasNextPage ||
    leadsResult.pagination.hasNextPage || jobsResult.pagination.hasNextPage;
  let recentActivity: RecentActivity[] = [];
  let activityFailed = false;

  try {
    recentActivity = await getRecentActivity({ limit: RECENT_ACTIVITY_LIMIT });
  } catch {
    activityFailed = true;
  }

  return (
    <div data-crm-route="dashboard" className="space-y-12">
      <section className="max-w-3xl">
        <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#d8b477]">Dashboard / Vue d&apos;ensemble</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">CRM AUTO9</h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-white/50 md:text-base">Un point de départ opérationnel construit à partir des données CRM actuellement chargées.</p>
      </section>

      <section aria-labelledby="dashboard-summary" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 id="dashboard-summary" className="text-sm font-medium text-white">Aperçu chargé</h2>
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">Première page</span>
        </div>
        <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3">
          {[
            ["Clients chargés", customersResult.pagination.returned],
            ["Leads chargés", leadsResult.pagination.returned],
            ["Prestations chargées", jobsResult.pagination.returned],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#101419] p-5 md:p-6">
              <p className="text-xs text-white/40">{label}</p>
              <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/25">Résultats chargés</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-10 xl:grid-cols-2">
        <section aria-labelledby="lead-overview" className="space-y-4">
          <SectionHeading eyebrow="01 / Pipeline" title="Répartition des leads" />
          <div className="border border-white/10 bg-[#101419] p-5 md:p-7">
            <div className="divide-y divide-white/10">
              {leadStatuses.map((status, index) => (
                <div key={status} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="text-xs text-white/60">{leadStatusLabels[status]}</span>
                  <span className="text-sm font-medium text-white">{leadCounts[index]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="job-overview" className="space-y-4">
          <SectionHeading eyebrow="02 / Opérations" title="Répartition des prestations" />
          <div className="border border-white/10 bg-[#101419] p-5 md:p-7">
            <div className="divide-y divide-white/10">
              {jobStatuses.map((status, index) => (
                <div key={status} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="text-xs text-white/60">{jobStatusLabels[status]}</span>
                  <span className="text-sm font-medium text-white">{jobCounts[index]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="quick-links" className="space-y-4">
        <SectionHeading eyebrow="03 / Accès rapide" title="Ouvrir un espace" />
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Clients", "/crm/clients", "Répertoire relationnel"],
            ["Pipeline", "/crm/pipeline", "Demandes et suivi commercial"],
            ["Prestations", "/crm/jobs", "Registre opérationnel"],
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
        <SectionHeading eyebrow="04 / Historique" title="Activité récente" headingId="recent-activity" />
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

      {hasMoreResults && (
        <p className="text-xs text-white/35">Les cartes et répartitions concernent uniquement les {DASHBOARD_LIST_LIMIT} premiers résultats chargés de chaque registre. Elles ne représentent pas des totaux globaux.</p>
      )}
    </div>
  );
}
