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
  targetStatus: "QUALIFIED" | "CONTACTED" | "QUOTE_SENT" | "CLOSED_LOST";
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
      { label: "Marquer devis envoyé", targetStatus: "QUOTE_SENT" },
      { label: "Clôturer", targetStatus: "CLOSED_LOST" },
    ];
  }

  if (status === "QUOTE_SENT") {
    return [{ label: "Clôturer", targetStatus: "CLOSED_LOST" }];
  }

  return [];
}

function LeadCard({ item }: { item: LeadListItem }) {
  const lead = item.lead;
  const leadHref = lead.id && UUID_REGEX.test(lead.id)
    ? `/crm/pipeline/${lead.id}`
    : null;
  const customerHref = item.customer.id
    ? `/crm/clients/${item.customer.id}`
    : null;
  const vehicle = vehicleName(item);
  const quoteAmount = formatAmount(item.latestQuote?.total_price);
  const appointmentDate = formatDateTime(item.latestAppointment?.requested_at);
  const quoteService = item.latestQuote ? quoteServiceName(item.latestQuote) : null;
  const canSendQuote = Boolean(
    item.latestQuote?.id &&
    UUID_REGEX.test(item.latestQuote.id) &&
    item.latestQuote.status === "DRAFT",
  );
  const canAcceptQuote = Boolean(
    item.latestQuote?.id &&
    UUID_REGEX.test(item.latestQuote.id) &&
    (lead.lifecycle_status === "NEW" ||
      lead.lifecycle_status === "QUALIFIED" ||
      lead.lifecycle_status === "CONTACTED" ||
      lead.lifecycle_status === "QUOTE_SENT") &&
    (item.latestQuote.status === "DRAFT" || item.latestQuote.status === "SENT"),
  );

  return (
    <article className="border border-white/10 bg-[#101419] p-4 transition-colors hover:border-[#d8b477]/50">
      <div className="flex items-start justify-between gap-3">
        {customerHref ? (
          <Link href={customerHref} className="min-w-0 text-sm font-medium text-white hover:text-[#d8b477]">
            <span className="block truncate">{customerName(item)}</span>
          </Link>
        ) : (
          <p className="min-w-0 truncate text-sm font-medium text-white">{customerName(item)}</p>
        )}
        <span className="shrink-0 text-[10px] text-white/30">{formatDate(lead.created_at) || "Date inconnue"}</span>
      </div>

      {leadHref && <Link href={leadHref} className="mt-3 inline-block text-xs text-[#d8b477] hover:text-white">Voir le lead →</Link>}

      <div className="mt-4 space-y-2 text-xs text-white/45">
        {customerHref && <Link href={customerHref} className="block truncate text-white/45 hover:text-white">{item.customer.email || item.customer.phone || "Coordonnées non renseignées"}</Link>}
        {!customerHref && <p className="truncate">{item.customer.email || item.customer.phone || "Coordonnées non renseignées"}</p>}
        {vehicle && <p className="truncate">{vehicle}{item.vehicle?.plate ? ` · ${item.vehicle.plate}` : ""}</p>}
        <p>Source : {lead.source}</p>
      </div>

      {(quoteAmount || item.latestQuote || item.latestJob || appointmentDate) && (
        <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-white/35">
          {item.latestQuote && <p>Devis : {quoteStatusLabels[item.latestQuote.status]}{quoteAmount ? ` · ${quoteAmount}` : ""}</p>}
          {item.latestQuote?.estimated_time && <p>Durée estimée : {item.latestQuote.estimated_time}</p>}
          {quoteService && <p>Service : {quoteService}</p>}
          {item.latestJob && <p>Prestation : {item.latestJob.status}</p>}
          {appointmentDate && <p>Rendez-vous : {appointmentDate}</p>}
        </div>
      )}

      {canAcceptQuote && item.latestQuote?.id && (
        <form action={acceptPipelineQuote} className="mt-4 border-t border-white/10 pt-4">
          <input type="hidden" name="quoteId" value={item.latestQuote.id} />
          <button type="submit" className="w-full border border-[#d8b477] px-3 py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-[#d8b477] transition-colors hover:bg-[#d8b477] hover:text-[#080a0d]">
            Accepter le devis
          </button>
        </form>
      )}

      {canSendQuote && item.latestQuote?.id && (
        <form action={markPipelineQuoteSent} className="mt-4 border-t border-white/10 pt-4">
          <input type="hidden" name="quoteId" value={item.latestQuote.id} />
          <button type="submit" className="w-full border border-white/15 px-3 py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-[#d8b477] hover:text-[#d8b477]">
            Marquer comme envoyé
          </button>
        </form>
      )}

      {lead.notes && <p className="mt-4 line-clamp-3 text-xs leading-5 text-white/40">{lead.notes}</p>}

      {lead.id && leadActions(lead.lifecycle_status).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          {leadActions(lead.lifecycle_status).map((action) => (
            <form key={action.targetStatus} action={transitionPipelineLead}>
              <input type="hidden" name="leadId" value={lead.id} />
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

function PipelineColumn({ status, items }: {
  status: LeadLifecycleStatus;
  items: LeadListItem[];
}) {
  return (
    <section aria-labelledby={`pipeline-${status}`} className="min-w-[280px] flex-1 bg-[#0d1014] p-4">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <h3 id={`pipeline-${status}`} className="text-xs font-medium text-white">{leadStatusLabels[status]}</h3>
        <span className="text-[10px] text-white/30">{items.length}</span>
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
        <span className="w-fit border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/35">Lecture seule</span>
      </section>

      {updated && <p role="status" className="border border-emerald-300/30 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-200">Lead mis à jour.</p>}
      {actionError && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">{actionError === "invalid" ? "Action invalide." : actionError === "access" ? "Action non autorisée." : "Action momentanément indisponible."}</p>}
      {quoteUpdated && <p role="status" className="border border-emerald-300/30 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-200">Devis accepté. Le lead et la prestation ont été mis à jour.</p>}
      {quoteError && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">{quoteError === "invalid" ? "Action invalide." : quoteError === "access" ? "Action non autorisée." : "Action momentanément indisponible."}</p>}
      {quoteSent && <p role="status" className="border border-emerald-300/30 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-200">Devis marqué comme envoyé.</p>}
      {quoteSendError && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">{quoteSendError === "invalid" ? "Action invalide." : quoteSendError === "access" ? "Action non autorisée." : "Action momentanément indisponible."}</p>}

      <section aria-labelledby="pipeline-board" className="border border-white/10 bg-[#101419]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-7">
          <h2 id="pipeline-board" className="text-sm font-medium text-white">Vue pipeline</h2>
          {!failed && <span className="text-xs text-white/30">{result?.pagination.returned ?? 0} lead{result?.pagination.returned === 1 ? "" : "s"} chargé{result?.pagination.returned === 1 ? "" : "s"}</span>}
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
          <div className="flex gap-px overflow-x-auto bg-white/10 p-px">
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
