import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../lib/auth/dal";
import { transitionJobAppointment } from "./actions";
import {
  getJobsList,
  type Appointment,
  type JobListItem,
  type JobStatus,
} from "../../lib/crm";

export const dynamic = "force-dynamic";

const JOB_LIST_LIMIT = 20;
const SEARCH_MAX_LENGTH = 100;

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

const appointmentStatusLabels: Record<Appointment["status"], string> = {
  REQUESTED: "Demandé",
  CONFIRMED: "Confirmé",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearch(value: string | string[] | undefined): string | undefined {
  const normalized = firstQueryValue(value)?.trim();
  return normalized ? normalized.slice(0, SEARCH_MAX_LENGTH) : undefined;
}

function normalizeStatus(value: string | string[] | undefined): JobStatus | undefined {
  const candidate = firstQueryValue(value);
  return jobStatuses.includes(candidate as JobStatus)
    ? candidate as JobStatus
    : undefined;
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium", timeStyle: "short",
  }).format(date);
}

function formatAmount(value?: number | null): string | null {
  return typeof value === "number"
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value)
    : null;
}

function customerName(item: JobListItem): string {
  const name = [item.customer.first_name, item.customer.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
  return name || item.customer.full_name.trim() || "Identité non renseignée";
}

function vehicleName(item: JobListItem): string | null {
  if (!item.vehicle) return null;
  const name = [item.vehicle.brand, item.vehicle.model, item.vehicle.variant]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
  return name || "Véhicule sans désignation";
}

function appointmentActions(status: Appointment["status"]): Array<{
  label: string;
  targetStatus: "CONFIRMED" | "COMPLETED" | "CANCELLED";
}> {
  if (status === "REQUESTED") {
    return [
      { label: "Confirmer", targetStatus: "CONFIRMED" },
      { label: "Annuler", targetStatus: "CANCELLED" },
    ];
  }

  if (status === "CONFIRMED") {
    return [
      { label: "Terminer", targetStatus: "COMPLETED" },
      { label: "Annuler", targetStatus: "CANCELLED" },
    ];
  }

  return [];
}

function JobCard({ item }: { item: JobListItem }) {
  const job = item.job;
  const jobHref = UUID_REGEX.test(job.id || "")
    ? `/crm/jobs/${job.id}`
    : null;
  const customerHref = UUID_REGEX.test(item.customer.id || "")
    ? `/crm/clients/${item.customer.id}`
    : null;
  const vehicle = vehicleName(item);
  const scheduledAt = formatDateTime(job.scheduled_at);
  const appointmentAt = formatDateTime(item.appointment?.requested_at);
  const amount = formatAmount(job.total_amount);
  const quoteAmount = formatAmount(item.quote?.total_price);

  return (
    <article className="border border-white/10 bg-[#101419] p-5 transition-colors hover:border-[#d8b477]/50">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#d8b477]">{job.job_number || "Prestation"}</p>
          {jobHref ? (
            <Link href={jobHref} className="mt-2 block truncate text-base font-medium text-white hover:text-[#d8b477]">
              {job.title || "Prestation sans intitulé"}
            </Link>
          ) : (
            <h3 className="mt-2 truncate text-base font-medium text-white">{job.title || "Prestation sans intitulé"}</h3>
          )}
        </div>
        <span className="w-fit shrink-0 border border-[#d8b477]/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[#d8b477]">{jobStatusLabels[job.status]}</span>
      </div>
      <div className="mt-5 grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">Client</p>
          {customerHref ? <Link href={customerHref} className="mt-2 block truncate text-sm text-white hover:text-[#d8b477]">{customerName(item)}</Link> : <p className="mt-2 truncate text-sm text-white">{customerName(item)}</p>}
          {item.customer.email && <p className="mt-1 truncate text-xs text-white/40">{item.customer.email}</p>}
          {!item.customer.email && item.customer.phone && <p className="mt-1 text-xs text-white/40">{item.customer.phone}</p>}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">Véhicule</p>
          <p className="mt-2 text-sm text-white/75">{vehicle || "Véhicule non renseigné"}</p>
          {item.vehicle?.plate && <p className="mt-1 text-xs text-white/40">{item.vehicle.plate}</p>}
        </div>
      </div>
      <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs text-white/45">
        {scheduledAt && <p>Planifiée : <span className="text-white/70">{scheduledAt}</span></p>}
        {appointmentAt && <p>Rendez-vous : <span className="text-white/70">{appointmentAt}</span>{item.appointment?.status ? ` · ${appointmentStatusLabels[item.appointment.status]}` : ""}</p>}
        {item.quote?.status && <p>Devis : <span className="text-white/70">{item.quote.status}{quoteAmount ? ` · ${quoteAmount}` : ""}</span></p>}
        {amount && <p>Montant prestation : <span className="text-[#d8b477]">{amount}</span></p>}
        {!scheduledAt && !appointmentAt && !item.quote && !amount && <p className="text-white/30">Contexte opérationnel non renseigné</p>}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/30">
        <span>Créée le {formatDate(job.created_at) || "date non renseignée"}</span>
        {job.notes && <span className="max-w-[55%] truncate text-white/45">{job.notes}</span>}
      </div>
      {item.appointment?.id && UUID_REGEX.test(item.appointment.id) && appointmentActions(item.appointment.status).length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {appointmentActions(item.appointment.status).map((action) => (
            <form key={action.targetStatus} action={transitionJobAppointment}>
              <input type="hidden" name="appointmentId" value={item.appointment?.id || ""} />
              <input type="hidden" name="targetStatus" value={action.targetStatus} />
              <button type="submit" className="border border-white/15 px-3 py-2 text-xs text-white/65 transition-colors hover:border-[#d8b477] hover:text-[#d8b477]">
                {action.label}
              </button>
            </form>
          ))}
        </div>
      )}
    </article>
  );
}

export default async function JobsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureCrmAccess();

  const params = await searchParams;
  const search = normalizeSearch(params.search);
  const status = normalizeStatus(params.status);
  const updated = firstQueryValue(params.updated) === "1";
  const actionError = firstQueryValue(params.error);
  let result;
  let failed = false;

  try {
    result = await getJobsList({
      page: 1,
      limit: JOB_LIST_LIMIT,
      search,
      status,
    });
  } catch {
    failed = true;
  }

  const items = result?.items ?? [];
  const hasFilters = Boolean(search || status);

  return (
    <div data-crm-route="jobs" className="space-y-10">
      <section className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#d8b477]">03 / Opérations</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">Prestations</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">Le point de pilotage des prestations planifiées, en cours et terminées.</p>
        </div>
        <span className="w-fit border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/35">Lecture seule</span>
      </section>

      {updated && <p role="status" className="border border-emerald-300/30 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-200">Rendez-vous mis à jour.</p>}
      {actionError && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">{actionError === "invalid" ? "Action invalide." : actionError === "access" ? "Action non autorisée." : "Action momentanément indisponible."}</p>}

      <section aria-labelledby="jobs-list" className="space-y-5">
        <div className="flex items-end justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">Suivi opérationnel</p>
            <h2 id="jobs-list" className="mt-2 text-xl font-medium text-white">Registre des prestations</h2>
          </div>
          {!failed && <span className="text-xs text-white/30">{result?.pagination.returned ?? 0} chargée{result?.pagination.returned === 1 ? "" : "s"}</span>}
        </div>
        <div className="border border-white/10 bg-[#101419] px-5 py-5 md:px-7">
          <form method="get" className="flex flex-col gap-3 lg:flex-row">
            <label htmlFor="jobs-search" className="sr-only">Rechercher une prestation</label>
            <input id="jobs-search" name="search" type="search" defaultValue={search} maxLength={SEARCH_MAX_LENGTH} placeholder="Client, prestation, numéro ou véhicule" className="min-w-0 flex-1 border border-white/15 bg-[#0d1014] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#d8b477]" />
            <label htmlFor="jobs-status" className="sr-only">Filtrer par statut</label>
            <select id="jobs-status" name="status" defaultValue={status || ""} className="border border-white/15 bg-[#0d1014] px-4 py-3 text-sm text-white outline-none focus:border-[#d8b477]">
              <option value="">Tous les statuts</option>
              {jobStatuses.map((jobStatus) => <option key={jobStatus} value={jobStatus}>{jobStatusLabels[jobStatus]}</option>)}
            </select>
            <button type="submit" className="border border-[#d8b477] px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#d8b477] transition-colors hover:bg-[#d8b477] hover:text-[#080a0d]">Filtrer</button>
            {hasFilters && <Link href="/crm/jobs" className="border border-white/10 px-5 py-3 text-center text-xs text-white/50 transition-colors hover:border-white/30 hover:text-white">Effacer</Link>}
          </form>
          <p className="mt-3 text-[11px] text-white/30">Recherche et filtres appliqués par la couche CRM existante.</p>
        </div>

        {failed ? (
          <div className="flex min-h-56 items-center justify-center border border-white/10 bg-[#101419] px-6 py-12 text-center">
            <div>
              <p className="text-sm text-white/70">Le registre est momentanément indisponible.</p>
              <p className="mt-2 text-xs text-white/35">Réessayez plus tard.</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center border border-white/10 bg-[#101419] px-6 py-12 text-center">
            <div>
              <div className="mx-auto flex h-10 w-10 items-center justify-center border border-[#d8b477]/40 text-[#d8b477]">03</div>
              <p className="mt-5 text-sm text-white/65">{hasFilters ? "Aucune prestation ne correspond à ces filtres." : "Aucune prestation enregistrée pour le moment."}</p>
              <p className="mt-2 text-xs text-white/35">{hasFilters ? "Modifiez la recherche ou le statut sélectionné." : "Les prestations réelles apparaîtront ici."}</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) => <JobCard key={item.job.id || `${item.job.job_number}-${item.job.created_at}`} item={item} />)}
          </div>
        )}
      </section>

      {!failed && result?.pagination.hasNextPage && (
        <p className="text-xs text-white/35">Affichage limité aux {JOB_LIST_LIMIT} premières prestations correspondant aux filtres. Ce compteur n&apos;est pas un total global.</p>
      )}
    </div>
  );
}
