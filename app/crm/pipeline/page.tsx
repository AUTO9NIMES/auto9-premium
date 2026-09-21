import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../lib/auth/dal";
import { acceptPipelineQuote, markPipelineQuoteSent, transitionPipelineLead } from "./actions";
import Pagination, { normalizePage } from "../components/Pagination";
import {
  getLeadsList,
  type LeadListItem,
  type LeadLifecycleStatus,
  type Quote,
} from "../../lib/crm";

export const dynamic = "force-dynamic";

const LEAD_LIST_LIMIT = 20;
const SEARCH_MAX_LENGTH = 100;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const quoteStatusLabels: Record<Quote["status"], string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  EXPIRED: "Expiré",
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

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearch(value: string | string[] | undefined): string | undefined {
  const normalized = firstQueryValue(value)?.trim();
  return normalized ? normalized.slice(0, SEARCH_MAX_LENGTH) : undefined;
}

function normalizeStatus(value: string | string[] | undefined): LeadLifecycleStatus | undefined {
  const candidate = firstQueryValue(value);
  return leadStatuses.includes(candidate as LeadLifecycleStatus)
    ? candidate as LeadLifecycleStatus
    : undefined;
}

function formatDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatAmount(value?: number | null): string | null {
  return typeof value === "number"
    ? new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(value)
    : null;
}

function customerName(item: LeadListItem): string {
  const name = [item.customer.first_name, item.customer.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");

  return name || item.customer.full_name.trim() || "Identité non renseignée";
}

function vehicleName(item: LeadListItem): string | null {
  if (!item.vehicle) {
    return null;
  }

  const name = [item.vehicle.brand, item.vehicle.model, item.vehicle.variant]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");

  return name || "Véhicule sans désignation";
}

function quoteServiceName(quote: Quote): string | null {
  const serviceName = quote.payload_json?.serviceName;
  return typeof serviceName === "string" && serviceName.trim()
    ? serviceName.trim()
    : null;
}

function leadActions(status: LeadLifecycleStatus): Array<{
  label: string;
  targetStatus: "QUALIFIED" | "CONTACTED" | "CLOSED_LOST";
}> {
  if (status === "NEW") {
    return [
      { label: "Qualifier", targetStatus: "QUALIFIED" },
      { label: "Clôturer", targetStatus: "CLOSED_LOST" },
    ];
  }

  if (status === "QUALIFIED") {
    return [
      { label: "Contacter", targetStatus: "CONTACTED" },
      { label: "Clôturer", targetStatus: "CLOSED_LOST" },
    ];
  }

  if (status === "CONTACTED") {
    return [
      { label: "Clôturer", targetStatus: "CLOSED_LOST" },
    ];
  }

  if (status === "QUOTE_SENT") {
    return [{ label: "Clôturer", targetStatus: "CLOSED_LOST" }];
  }

  return [];
}

function jobStatusLabel(status: string) {
  const labels: Record<string, string> = {
    QUOTE_ACCEPTED: "Devis accepté",
    SCHEDULED: "Planifiée",
    CONFIRMED: "Confirmée",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
    PAID: "Payée",
  };

  return labels[status] || status;
}

function sourceLabel(source: string | null | undefined) {
  const labels: Record<string, string> = {
    website_quote_request: "Demande devis web",
  };

  if (!source) return "Non renseignée";
  return labels[source] || source.replaceAll("_", " ");
}

function LeadCard({ item }: { item: LeadListItem }) {
  const { lead, customer, vehicle, latestQuote, latestJob, latestAppointment } = item;
  const leadHref = lead.id && UUID_REGEX.test(lead.id) ? `/crm/pipeline/${lead.id}` : null;
  const customerHref = customer.id && UUID_REGEX.test(customer.id) ? `/crm/clients/${customer.id}` : null;
  const name = customerName(item);
  const vehicleLabel = vehicleName(item);
  const quoteAmount = latestQuote ? formatAmount(latestQuote.total_price) : null;
  const quoteService = latestQuote ? quoteServiceName(latestQuote) : null;
  const requestedDate = formatDateTime(latestAppointment?.requested_at);
  const scheduledDate = formatDateTime(latestAppointment?.scheduled_at);
  const isOperationalAppointment = Boolean(
    latestAppointment?.scheduled_at &&
    (latestAppointment.status === "CONFIRMED" || latestAppointment.status === "COMPLETED"),
  );
  const canSendQuote = Boolean(
    latestQuote?.id &&
    UUID_REGEX.test(latestQuote.id) &&
    latestQuote.status === "DRAFT" &&
    lead.lifecycle_status === "CONTACTED",
  );
  const canAcceptQuote = Boolean(
    latestQuote?.id &&
    UUID_REGEX.test(latestQuote.id) &&
    ["NEW", "QUALIFIED", "CONTACTED", "QUOTE_SENT"].includes(lead.lifecycle_status) &&
    ["DRAFT", "SENT"].includes(latestQuote.status),
  );
  const actions = lead.id && UUID_REGEX.test(lead.id) ? leadActions(lead.lifecycle_status) : [];

  return (
    <article className="group border border-white/10 bg-[#101419] transition-colors hover:border-white/20">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
              {formatDate(lead.created_at)}
            </p>
          </div>

          <span className="shrink-0 border border-[#d8b477]/25 bg-[#d8b477]/5 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-[#d8b477]">
            {leadStatusLabels[lead.lifecycle_status]}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {leadHref && (
            <Link href={leadHref} className="text-[10px] uppercase tracking-[0.14em] text-[#d8b477] transition-colors hover:text-white">
              Ouvrir le dossier →
            </Link>
          )}
          {customerHref && (
            <Link href={customerHref} className="text-[10px] uppercase tracking-[0.14em] text-white/35 transition-colors hover:text-white">
              Client 360 →
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-px bg-white/10">
          <div className="bg-[#0d1014] p-3">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/25">Véhicule</p>
            <p className="mt-1.5 text-xs text-white/70">{vehicleLabel || "Non renseigné"}</p>
            {vehicle?.plate && <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/35">{vehicle.plate}</p>}
          </div>

          <div className="bg-[#0d1014] p-3">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/25">Source</p>
            <p className="mt-1.5 break-words text-xs text-white/70">{sourceLabel(lead.source)}</p>
          </div>
        </div>

        {(customer.phone || customer.email) && (
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/25">Contact</p>
            <div className="mt-2 space-y-1">
              {customer.phone && <p className="text-xs text-white/60">{customer.phone}</p>}
              {customer.email && <p className="break-all text-xs text-white/60">{customer.email}</p>}
            </div>
          </div>
        )}

        <div className="border-t border-white/10 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-white/25">Devis</p>
              <p className="mt-1.5 text-xs text-white/65">
                {latestQuote ? quoteStatusLabels[latestQuote.status] : "Aucun devis"}
              </p>
            </div>
            {quoteAmount && <p className="text-sm font-medium text-[#d8b477]">{quoteAmount}</p>}
          </div>

          {quoteService && <p className="mt-2 text-[11px] leading-5 text-white/40">{quoteService}</p>}
        </div>

        {latestJob && (
          <div className="border-t border-white/10 pt-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/25">Prestation</p>
            <p className="mt-1.5 text-xs text-white/65">{jobStatusLabel(latestJob.status)}</p>
          </div>
        )}

        {latestAppointment && (
          <div className="border-t border-white/10 pt-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/25">Planning</p>

            {isOperationalAppointment && scheduledDate ? (
              <>
                <p className="mt-1.5 text-sm font-medium text-[#d8b477]">{scheduledDate}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/35">
                  {latestAppointment.status === "COMPLETED" ? "Créneau réalisé" : "Rendez-vous confirmé"}
                </p>
              </>
            ) : latestAppointment.scheduled_at && scheduledDate ? (
              <>
                <p className="mt-1.5 text-sm font-medium text-white/75">{scheduledDate}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/35">Créneau planifié</p>
              </>
            ) : requestedDate ? (
              <>
                <p className="mt-1.5 text-sm text-white/70">{requestedDate}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/35">Souhait client · non planifié</p>
              </>
            ) : (
              <p className="mt-1.5 text-xs text-white/35">Aucun créneau renseigné</p>
            )}

            {requestedDate && latestAppointment.scheduled_at && (
              <p className="mt-2 text-[10px] leading-4 text-white/30">Demande initiale : {requestedDate}</p>
            )}
          </div>
        )}

        {lead.notes && (
          <div className="border-t border-white/10 pt-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/25">Note</p>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/45">{lead.notes}</p>
          </div>
        )}
      </div>

      {(canAcceptQuote || canSendQuote || actions.length > 0) && (
        <div className="border-t border-white/10 bg-[#0d1014] px-4 py-4">
          <p className="mb-3 text-[9px] uppercase tracking-[0.16em] text-white/25">Actions</p>

          <div className="flex flex-wrap gap-2">
            {canAcceptQuote && latestQuote?.id && (
              <form action={acceptPipelineQuote}>
                <input type="hidden" name="quoteId" value={latestQuote.id} />
                <button type="submit" className="border border-[#d8b477]/50 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[#d8b477] transition-colors hover:bg-[#d8b477] hover:text-[#080a0d]">
                  Accepter le devis
                </button>
              </form>
            )}

            {canSendQuote && latestQuote?.id && (
              <form action={markPipelineQuoteSent}>
                <input type="hidden" name="quoteId" value={latestQuote.id} />
                <button type="submit" className="border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/60 transition-colors hover:border-white/35 hover:text-white">
                  Marquer envoyé
                </button>
              </form>
            )}

            {actions.map((action) => (
              <form key={action.targetStatus} action={transitionPipelineLead}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="targetStatus" value={action.targetStatus} />
                <button type="submit" className="border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/60 transition-colors hover:border-[#d8b477] hover:text-[#d8b477]">
                  {action.label}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function PipelineColumn({ status, items }: {
  status: LeadLifecycleStatus;
  items: LeadListItem[];
}) {
  return (
    <section aria-labelledby={`pipeline-${status}`} className="min-w-[320px] flex-1 bg-[#0d1014] p-4 lg:min-w-[340px]">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">Étape</p>
          <h3 id={`pipeline-${status}`} className="mt-1 text-sm font-medium text-white">{leadStatusLabels[status]}</h3>
        </div>
        <span className="flex h-7 min-w-7 items-center justify-center border border-white/10 px-2 text-[10px] text-white/40">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.length > 0 ? items.map((item) => (
          <LeadCard key={item.lead.id || `${item.lead.created_at}-${item.lead.source}`} item={item} />
        )) : <p className="py-8 text-center text-xs text-white/25">Aucun lead chargé</p>}
      </div>
    </section>
  );
}

export default async function PipelinePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureCrmAccess();

  const params = await searchParams;
  const page = normalizePage(params.page);
  const search = normalizeSearch(params.search);
  const status = normalizeStatus(params.status);
  const updated = firstQueryValue(params.updated) === "1";
  const actionError = firstQueryValue(params.error);
  const quoteUpdated = firstQueryValue(params.quote_updated) === "1";
  const quoteError = firstQueryValue(params.quote_error);
  const quoteSent = firstQueryValue(params.quote_sent) === "1";
  const quoteSendError = firstQueryValue(params.quote_send_error);
  let result;
  let failed = false;

  try {
    result = await getLeadsList({
      page,
      limit: LEAD_LIST_LIMIT,
      search,
      status,
    });
  } catch {
    failed = true;
  }

  const items = result?.items ?? [];
  const itemsByStatus = new Map<LeadLifecycleStatus, LeadListItem[]>();

  for (const leadStatus of leadStatuses) {
    itemsByStatus.set(
      leadStatus,
      items.filter((item) => item.lead.lifecycle_status === leadStatus),
    );
  }

  const hasFilters = Boolean(search || status);

  return (
    <div data-crm-route="pipeline" className="space-y-10">
      <section className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#d8b477]">02 / Développement</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">Pipeline</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">Une vue claire des opportunités, des demandes entrantes et des prochaines relances.</p>
        </div>
        <Link href="/crm/pipeline/new" className="w-fit border border-[#d8b477] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#d8b477] transition-colors hover:bg-[#d8b477] hover:text-[#080a0d]">Nouveau lead</Link>
      </section>

      {updated && <p role="status" className="border border-emerald-300/30 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-200">Lead mis à jour.</p>}
      {actionError && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">{actionError === "invalid" ? "Action invalide." : actionError === "access" ? "Action non autorisée." : "Action momentanément indisponible."}</p>}
      {quoteUpdated && <p role="status" className="border border-emerald-300/30 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-200">Devis accepté. Le lead et la prestation ont été mis à jour.</p>}
      {quoteError && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">{quoteError === "invalid" ? "Action invalide." : quoteError === "access" ? "Action non autorisée." : "Action momentanément indisponible."}</p>}
      {quoteSent && <p role="status" className="border border-emerald-300/30 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-200">Devis marqué comme envoyé.</p>}
      {quoteSendError && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">{quoteSendError === "invalid" ? "Action invalide." : quoteSendError === "access" ? "Action non autorisée." : "Action momentanément indisponible."}</p>}

      <section aria-labelledby="pipeline-board" className="border border-white/10 bg-[#101419]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 md:flex-row md:items-end md:justify-between md:px-7">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#d8b477]">Flux commercial</p>
            <h2 id="pipeline-board" className="mt-1 text-lg font-medium text-white">Vue pipeline</h2>
            <p className="mt-1 text-xs text-white/35">Suivez chaque dossier de la demande entrante jusqu&apos;à la prestation.</p>
          </div>
          {!failed && (
            <span className="text-[10px] uppercase tracking-[0.14em] text-white/30">
              {result?.pagination.returned ?? 0} dossier{result?.pagination.returned === 1 ? "" : "s"} sur cette page
            </span>
          )}
        </div>
        <div className="border-b border-white/10 px-5 py-5 md:px-7">
          <form method="get" className="flex flex-col gap-3 lg:flex-row">
            <label htmlFor="pipeline-search" className="sr-only">Rechercher un lead</label>
            <input id="pipeline-search" name="search" type="search" defaultValue={search} maxLength={SEARCH_MAX_LENGTH} placeholder="Client, email, téléphone ou véhicule" className="min-w-0 flex-1 border border-white/15 bg-[#0d1014] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#d8b477]" />
            <label htmlFor="pipeline-status" className="sr-only">Filtrer par statut</label>
            <select id="pipeline-status" name="status" defaultValue={status || ""} className="border border-white/15 bg-[#0d1014] px-4 py-3 text-sm text-white outline-none focus:border-[#d8b477]">
              <option value="">Tous les statuts</option>
              {leadStatuses.map((leadStatus) => <option key={leadStatus} value={leadStatus}>{leadStatusLabels[leadStatus]}</option>)}
            </select>
            <button type="submit" className="border border-[#d8b477] px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#d8b477] transition-colors hover:bg-[#d8b477] hover:text-[#080a0d]">Filtrer</button>
            {hasFilters && <Link href="/crm/pipeline" className="border border-white/10 px-5 py-3 text-center text-xs text-white/50 transition-colors hover:border-white/30 hover:text-white">Effacer</Link>}
          </form>
          <p className="mt-3 text-[11px] text-white/30">Les colonnes reprennent les statuts exacts du cycle de vie des leads.</p>
        </div>

        {failed ? (
          <div className="flex min-h-56 items-center justify-center px-6 py-12 text-center">
            <div>
              <p className="text-sm text-white/70">Le pipeline est momentanément indisponible.</p>
              <p className="mt-2 text-xs text-white/35">Réessayez plus tard.</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center px-6 py-12 text-center">
            <div>
              <div className="mx-auto flex h-10 w-10 items-center justify-center border border-[#d8b477]/40 text-[#d8b477]">A9</div>
              <p className="mt-5 text-sm text-white/65">{hasFilters ? "Aucun lead ne correspond à ces filtres." : "Aucun lead enregistré pour le moment."}</p>
              <p className="mt-2 text-xs text-white/35">{hasFilters ? "Modifiez la recherche ou le statut sélectionné." : "Les demandes entrantes apparaîtront ici."}</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto bg-[#080a0d] p-3 md:p-4">
            {leadStatuses.map((leadStatus) => <PipelineColumn key={leadStatus} status={leadStatus} items={itemsByStatus.get(leadStatus) || []} />)}
          </div>
        )}
      </section>

      {!failed && result && <Pagination
        basePath="/crm/pipeline"
        currentPage={result.pagination.page}
        hasNextPage={result.pagination.hasNextPage}
        query={{ search, status }}
      />}

      {!failed && result?.pagination.hasNextPage && (
        <p className="text-xs text-white/35">Affichage limité aux {LEAD_LIST_LIMIT} premiers leads correspondant aux filtres. Ce compteur n&apos;est pas un total global.</p>
      )}
    </div>
  );
}
