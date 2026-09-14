import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../lib/auth/dal";
import {
  getCustomersList,
  getJobsList,
  getLeadsList,
  type CustomerListResult,
  type JobStatus,
  type JobListResult,
  type LeadListResult,
  type LeadLifecycleStatus,
} from "../lib/crm";

export const dynamic = "force-dynamic";

const DASHBOARD_LIST_LIMIT = 20;

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

function SectionHeading({ eyebrow, title }: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-end justify-between border-b border-white/10 pb-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-medium text-white">{title}</h2>
      </div>
      <span className="text-[10px] uppercase tracking-[0.16em] text-white/25">Résultats chargés</span>
    </div>
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

      {hasMoreResults && (
        <p className="text-xs text-white/35">Les cartes et répartitions concernent uniquement les {DASHBOARD_LIST_LIMIT} premiers résultats chargés de chaque registre. Elles ne représentent pas des totaux globaux.</p>
      )}
    </div>
  );
}
