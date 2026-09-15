import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../lib/auth/dal";
import Pagination, { normalizePage } from "../components/Pagination";
import {
  getCustomersList,
  type CustomerListItem,
  type LeadLifecycleStatus,
} from "../../lib/crm";

export const dynamic = "force-dynamic";

const CUSTOMER_LIST_LIMIT = 20;
const SEARCH_MAX_LENGTH = 100;

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

function normalizeSearchValue(value: string | string[] | undefined): string | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue?.trim();

  if (!normalizedValue) {
    return undefined;
  }

  return normalizedValue.slice(0, SEARCH_MAX_LENGTH);
}

function formatCustomerName(item: CustomerListItem): string {
  const customer = item.customer;
  const name = [customer.first_name, customer.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");

  return name || customer.full_name.trim() || "Identité non renseignée";
}

function formatVehicle(item: CustomerListItem): string | null {
  const vehicle = item.latestVehicle;

  if (!vehicle) {
    return null;
  }

  const identity = [vehicle.brand, vehicle.model, vehicle.variant]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
  const year = vehicle.year ? String(vehicle.year) : null;
  const plate = vehicle.plate?.trim() || null;

  return [identity || null, year, plate].filter(Boolean).join(" · ") || null;
}

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

function formatDate(value?: string): string | null {
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

function CustomerRow({ item }: { item: CustomerListItem }) {
  const customer = item.customer;
  const vehicle = formatVehicle(item);
  const leadStatus = item.latestLead?.lifecycle_status
    ? leadStatusLabels[item.latestLead.lifecycle_status]
    : null;
  const createdAt = formatDate(customer.created_at);
  const customerHref = customer.id ? `/crm/clients/${customer.id}` : null;

  const content = (
    <div className="grid gap-5 px-5 py-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:px-7">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{formatCustomerName(item)}</p>
        <p className="mt-1 truncate text-xs text-white/40">{customer.city || "Ville non renseignée"}</p>
      </div>
      <div className="space-y-1 text-xs text-white/55">
        {customer.email && <p className="truncate">{customer.email}</p>}
        {customer.phone && <p>{customer.phone}</p>}
        {!customer.email && !customer.phone && <p className="text-white/30">Coordonnées non renseignées</p>}
      </div>
      <div className="space-y-1 text-xs text-white/55">
        {vehicle && <p className="truncate">{vehicle}</p>}
        {leadStatus && <p className="text-[#d8b477]">{leadStatus}</p>}
        {!vehicle && !leadStatus && <p className="text-white/30">Aucune activité associée</p>}
      </div>
      <div className="flex items-center justify-between gap-4 text-xs text-white/30 md:block md:text-right">
        {createdAt && <p>{createdAt}</p>}
        {customerHref ? (
          <Link href={customerHref} className="mt-2 inline-block text-[#d8b477] hover:text-white">
            Profil détaillé <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span className="mt-2 inline-block text-white/25">Profil détaillé indisponible</span>
        )}
      </div>
    </div>
  );

  return <div className="border-b border-white/10 last:border-b-0">{content}</div>;
}

export default async function ClientsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureCrmAccess();

  const params = await searchParams;
  const page = normalizePage(params.page);
  const search = normalizeSearchValue(params.q);
  let result;
  let failed = false;

  try {
    result = await getCustomersList({
      page,
      limit: CUSTOMER_LIST_LIMIT,
      search,
    });
  } catch {
    failed = true;
  }

  const items = result?.items ?? [];
  const hasSearch = Boolean(search);

  return (
    <div data-crm-route="clients" className="space-y-10">
      <section className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#d8b477]">01 / Relationnel</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">Clients</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">L&apos;espace central pour retrouver les contacts, véhicules et historiques de prestation.</p>
        </div>
        <span className="w-fit border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/35">Répertoire réel</span>
      </section>

      <section aria-labelledby="clients-list" className="border border-white/10 bg-[#101419]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-7">
          <h2 id="clients-list" className="text-sm font-medium text-white">Répertoire clients</h2>
          {!failed && <span className="text-xs text-white/30">{result?.pagination.returned ?? 0} affiché{result?.pagination.returned === 1 ? "" : "s"}</span>}
        </div>
        <div className="border-b border-white/10 px-5 py-5 md:px-7">
          <form method="get" className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="customer-search" className="sr-only">Rechercher un client</label>
            <input id="customer-search" name="q" type="search" defaultValue={search} maxLength={SEARCH_MAX_LENGTH} placeholder="Nom, email, téléphone ou ville" className="min-w-0 flex-1 border border-white/15 bg-[#0d1014] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#d8b477]" />
            <button type="submit" className="border border-[#d8b477] px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#d8b477] transition-colors hover:bg-[#d8b477] hover:text-[#080a0d]">Rechercher</button>
            {hasSearch && <Link href="/crm/clients" className="border border-white/10 px-5 py-3 text-center text-xs text-white/50 transition-colors hover:border-white/30 hover:text-white">Effacer</Link>}
          </form>
          <p className="mt-3 text-[11px] text-white/30">Recherche sur les clients récents et leurs coordonnées disponibles.</p>
        </div>
        {failed ? (
          <div className="flex min-h-56 items-center justify-center px-6 py-12 text-center">
            <div>
              <p className="text-sm text-white/70">Le répertoire est momentanément indisponible.</p>
              <p className="mt-2 text-xs text-white/35">Réessayez plus tard.</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center px-6 py-12 text-center">
            <div>
              <div className="mx-auto flex h-10 w-10 items-center justify-center border border-[#d8b477]/40 text-[#d8b477]">A9</div>
              <p className="mt-5 text-sm text-white/65">{hasSearch ? "Aucun client ne correspond à cette recherche." : "Aucun client enregistré pour le moment."}</p>
              <p className="mt-2 text-xs text-white/35">{hasSearch ? "Essayez un autre nom, email, téléphone ou ville." : "Le répertoire se remplira avec les demandes clients réelles."}</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-5 border-b border-white/10 px-7 py-3 text-[10px] uppercase tracking-[0.16em] text-white/25 md:grid">
              <span>Identité</span>
              <span>Coordonnées</span>
              <span>Dernière activité</span>
              <span>Créé le</span>
            </div>
            {items.map((item) => <CustomerRow key={item.customer.id} item={item} />)}
          </div>
        )}
      </section>

      {!failed && result && <Pagination
        basePath="/crm/clients"
        currentPage={result.pagination.page}
        hasNextPage={result.pagination.hasNextPage}
        query={{ q: search }}
      />}

      {!failed && result?.pagination.hasNextPage && (
        <p className="text-xs text-white/35">Affichage limité aux {CUSTOMER_LIST_LIMIT} premiers clients. La pagination sera ajoutée dans une étape dédiée.</p>
      )}
    </div>
  );
}
