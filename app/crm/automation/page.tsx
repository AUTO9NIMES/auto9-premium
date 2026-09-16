import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../lib/auth/dal";
import {
  getAutomationOutboxList,
  type AutomationOutboxDisplayStatus,
  type AutomationOutboxListItem,
} from "../../lib/crm";
import Pagination, { normalizePage } from "../components/Pagination";

export const dynamic = "force-dynamic";

const OUTBOX_LIST_LIMIT = 20;
const EVENT_TYPE_MAX_LENGTH = 100;

const outboxStatuses: AutomationOutboxDisplayStatus[] = [
  "PENDING",
  "RETRY",
  "LEASED",
  "PROCESSED",
];

const outboxStatusLabels: Record<AutomationOutboxDisplayStatus, string> = {
  PENDING: "À traiter",
  RETRY: "Nouvel essai",
  LEASED: "En traitement",
  PROCESSED: "Traité",
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

function firstQueryValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeStatus(
  value: string | string[] | undefined,
): AutomationOutboxDisplayStatus | undefined {
  const candidate = firstQueryValue(value);

  return outboxStatuses.includes(candidate as AutomationOutboxDisplayStatus)
    ? (candidate as AutomationOutboxDisplayStatus)
    : undefined;
}

function normalizeEventType(
  value: string | string[] | undefined,
): string | undefined {
  const normalized = firstQueryValue(value)?.trim();

  return normalized
    ? normalized.slice(0, EVENT_TYPE_MAX_LENGTH)
    : undefined;
}

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClass(status: AutomationOutboxDisplayStatus): string {
  if (status === "PROCESSED") {
    return "border-emerald-300/30 text-emerald-200";
  }

  if (status === "LEASED") {
    return "border-sky-300/30 text-sky-200";
  }

  if (status === "RETRY") {
    return "border-amber-300/30 text-amber-200";
  }

  return "border-white/15 text-white/55";
}

function OutboxCard({ item }: { item: AutomationOutboxListItem }) {
  const event = item.event;
  const createdAt = formatDateTime(event.created_at);
  const availableAt = formatDateTime(event.available_at);
  const leasedUntil = formatDateTime(event.leased_until);
  const processedAt = formatDateTime(event.processed_at);

  return (
    <article className="border border-white/10 bg-[#101419] p-5 transition-colors hover:border-[#d8b477]/50">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#d8b477]">
            Événement
          </p>
          <h3 className="mt-2 break-all text-base font-medium text-white">
            {event.event_type}
          </h3>
        </div>

        <span
          className={`w-fit shrink-0 border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusClass(item.status)}`}
        >
          {outboxStatusLabels[item.status]}
        </span>
      </div>

      <div className="mt-5 grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">
            Tentatives
          </p>
          <p className="mt-2 text-sm text-white/75">
            {event.attempt_count}
          </p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">
            Review request
          </p>
          <p className="mt-2 break-all text-xs text-white/50">
            {event.review_request_id || "Non renseignée"}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs text-white/45">
        <p>
          Créé :{" "}
          <span className="text-white/70">
            {createdAt || "date non renseignée"}
          </span>
        </p>

        <p>
          Disponible :{" "}
          <span className="text-white/70">
            {availableAt || "date non renseignée"}
          </span>
        </p>

        {leasedUntil && (
          <p>
            Lease jusqu&apos;à :{" "}
            <span className="text-white/70">{leasedUntil}</span>
          </p>
        )}

        {processedAt && (
          <p>
            Traité :{" "}
            <span className="text-emerald-200">{processedAt}</span>
          </p>
        )}
      </div>

      {event.last_error && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/70">
            Dernière erreur
          </p>
          <p className="mt-2 break-all text-xs leading-5 text-amber-100/70">
            {event.last_error}
          </p>
        </div>
      )}

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="break-all text-[10px] text-white/25">
          ID {event.id}
        </p>
      </div>
    </article>
  );
}

export default async function AutomationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureCrmAccess();

  const params = await searchParams;
  const page = normalizePage(params.page);
  const status = normalizeStatus(params.status);
  const eventType = normalizeEventType(params.eventType);

  let result;
  let failed = false;

  try {
    result = await getAutomationOutboxList({
      page,
      limit: OUTBOX_LIST_LIMIT,
      status,
      eventType,
    });
  } catch {
    failed = true;
  }

  const items = result?.items ?? [];
  const hasFilters = Boolean(status || eventType);

  return (
    <div data-crm-route="automation" className="space-y-10">
      <section className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#d8b477]">
            05 / Infrastructure
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Automatisations
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">
            Observabilité en lecture seule des événements asynchrones AUTO9.
            Cette vue ne déclenche, ne relance et ne modifie aucun événement.
          </p>
        </div>

        <span className="w-fit border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/35">
          Lecture seule
        </span>
      </section>

      <section aria-labelledby="automation-list" className="space-y-5">
        <div className="flex items-end justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">
              Reliable Outbox
            </p>
            <h2
              id="automation-list"
              className="mt-2 text-xl font-medium text-white"
            >
              Registre des événements
            </h2>
          </div>

          {!failed && (
            <span className="text-xs text-white/30">
              {result?.pagination.returned ?? 0} chargé
              {result?.pagination.returned === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="border border-white/10 bg-[#101419] px-5 py-5 md:px-7">
          <form method="get" className="flex flex-col gap-3 lg:flex-row">
            <label htmlFor="automation-event-type" className="sr-only">
              Filtrer par type d&apos;événement
            </label>
            <input
              id="automation-event-type"
              name="eventType"
              type="text"
              defaultValue={eventType}
              maxLength={EVENT_TYPE_MAX_LENGTH}
              placeholder="Ex. review.requested.v1"
              className="min-w-0 flex-1 border border-white/15 bg-[#0d1014] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#d8b477]"
            />

            <label htmlFor="automation-status" className="sr-only">
              Filtrer par statut
            </label>
            <select
              id="automation-status"
              name="status"
              defaultValue={status || ""}
              className="border border-white/15 bg-[#0d1014] px-4 py-3 text-sm text-white outline-none focus:border-[#d8b477]"
            >
              <option value="">Tous les statuts</option>
              {outboxStatuses.map((outboxStatus) => (
                <option key={outboxStatus} value={outboxStatus}>
                  {outboxStatusLabels[outboxStatus]}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="border border-[#d8b477] px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#d8b477] transition-colors hover:bg-[#d8b477] hover:text-[#080a0d]"
            >
              Filtrer
            </button>

            {hasFilters && (
              <Link
                href="/crm/automation"
                className="border border-white/10 px-5 py-3 text-center text-xs text-white/50 transition-colors hover:border-white/30 hover:text-white"
              >
                Effacer
              </Link>
            )}
          </form>

          <p className="mt-3 text-[11px] text-white/30">
            Les statuts sont dérivés du protocole claim / lease / ACK / NACK.
          </p>
        </div>

        {failed ? (
          <div className="flex min-h-56 items-center justify-center border border-white/10 bg-[#101419] px-6 py-12 text-center">
            <div>
              <p className="text-sm text-white/70">
                Le registre des automatisations est momentanément indisponible.
              </p>
              <p className="mt-2 text-xs text-white/35">
                Réessayez plus tard.
              </p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center border border-white/10 bg-[#101419] px-6 py-12 text-center">
            <div>
              <div className="mx-auto flex h-10 w-10 items-center justify-center border border-[#d8b477]/40 text-[#d8b477]">
                05
              </div>
              <p className="mt-5 text-sm text-white/65">
                {hasFilters
                  ? "Aucun événement ne correspond à ces filtres."
                  : "Aucun événement d’automatisation enregistré pour le moment."}
              </p>
              <p className="mt-2 text-xs text-white/35">
                {hasFilters
                  ? "Modifiez le statut ou le type d’événement."
                  : "Les événements apparaîtront ici lorsqu’ils seront produits."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) => (
              <OutboxCard key={item.event.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {!failed && result && (
        <Pagination
          basePath="/crm/automation"
          currentPage={result.pagination.page}
          hasNextPage={result.pagination.hasNextPage}
          query={{ status, eventType }}
        />
      )}

      {!failed && result?.pagination.hasNextPage && (
        <p className="text-xs text-white/35">
          Affichage limité à {OUTBOX_LIST_LIMIT} événements par page.
          Le compteur affiché n&apos;est pas un total global.
        </p>
      )}
    </div>
  );
}
