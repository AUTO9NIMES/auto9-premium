import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../../lib/auth/dal";
import { createManualLeadAction } from "../actions";
import {
  getCustomerForManualLead,
  getCustomersList,
  type CustomerIntakeSelection,
  type CustomerListItem,
} from "../../../lib/crm";

export const dynamic = "force-dynamic";

const SEARCH_MAX_LENGTH = 100;
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

function customerName(item: CustomerListItem): string {
  const name = [item.customer.first_name, item.customer.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
  return name || item.customer.full_name.trim() || "Identité non renseignée";
}

function selectionName(selection: CustomerIntakeSelection): string {
  const customer = selection.customer;
  const name = [customer.first_name, customer.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
  return name || customer.full_name.trim() || "Identité non renseignée";
}

export default async function NewManualLeadPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureCrmAccess();

  const params = await searchParams;
  const rawSearch = Array.isArray(params.q) ? params.q[0] : params.q;
  const search = rawSearch?.trim().slice(0, SEARCH_MAX_LENGTH) || "";
  const rawCustomerId = Array.isArray(params.customerId) ? params.customerId[0] : params.customerId;
  const customerId = rawCustomerId?.trim() || null;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  let customers: CustomerListItem[] = [];
  let selection: CustomerIntakeSelection | null = null;
  let readFailed = false;

  try {
    if (customerId && UUID_REGEX.test(customerId)) {
      selection = await getCustomerForManualLead(customerId);
    }
    if (search && !selection) {
      const result = await getCustomersList({ page: 1, limit: 20, search });
      customers = result.items;
    }
  } catch {
    readFailed = true;
  }

  const idempotencyKey = randomUUID();

  return (
    <div data-crm-route="pipeline" className="space-y-10">
      <Link href="/crm/pipeline" className="inline-block text-xs text-[#d8b477] hover:text-white">← Retour au pipeline</Link>
      <section className="border-b border-white/10 pb-8">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8b477]">Pipeline / Nouvelle demande</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">Nouveau lead</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">Sélectionnez un client existant puis renseignez sa demande.</p>
      </section>

      {error && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">{error === "invalid" ? "Vérifiez les informations saisies." : error === "access" ? "Action non autorisée." : "Création momentanément indisponible."}</p>}
      {readFailed && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">Le répertoire clients est momentanément indisponible.</p>}

      {!selection ? (
        <section aria-labelledby="customer-picker" className="space-y-4">
          <div className="border-b border-white/10 pb-4"><h2 id="customer-picker" className="text-xl font-medium text-white">1. Sélectionner un client</h2></div>
          <form method="get" className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="customer-search" className="sr-only">Rechercher un client</label>
            <input id="customer-search" name="q" defaultValue={search} maxLength={SEARCH_MAX_LENGTH} placeholder="Nom, email, téléphone ou ville" className="min-w-0 flex-1 border border-white/15 bg-[#0d1014] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#d8b477]" />
            <button type="submit" className="border border-[#d8b477] px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[#d8b477] hover:bg-[#d8b477] hover:text-[#080a0d]">Rechercher</button>
          </form>
          {search && !readFailed && <div className="space-y-2">{customers.length ? customers.map((item) => item.customer.id ? <Link key={item.customer.id} href={`/crm/pipeline/new?q=${encodeURIComponent(search)}&customerId=${item.customer.id}`} className="block border border-white/10 bg-[#101419] p-4 hover:border-[#d8b477]/60"><p className="text-sm text-white">{customerName(item)}</p><p className="mt-1 text-xs text-white/40">{item.customer.email || item.customer.phone || item.customer.city || "Coordonnées non renseignées"}</p></Link> : null) : <p className="border border-dashed border-white/15 px-5 py-8 text-sm text-white/35">Aucun client trouvé.</p>}</div>}
        </section>
      ) : (
        <section aria-labelledby="selected-customer" className="space-y-4">
          <div className="flex items-end justify-between border-b border-white/10 pb-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">1. Client sélectionné</p><h2 id="selected-customer" className="mt-2 text-xl font-medium text-white">{selectionName(selection)}</h2></div><Link href="/crm/pipeline/new" className="text-xs text-[#d8b477] hover:text-white">Changer</Link></div>
          <p className="text-sm text-white/45">{[selection.customer.email, selection.customer.phone, selection.customer.city].filter((value): value is string => Boolean(value?.trim())).join(" · ") || "Coordonnées non renseignées"}</p>
        </section>
      )}

      {selection && <form action={createManualLeadAction} className="space-y-8 border border-white/10 bg-[#101419] p-5 md:p-7">
        <input type="hidden" name="customerId" value={selection.customer.id || ""} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <section aria-labelledby="lead-form" className="grid gap-4 md:grid-cols-2">
          <h2 id="lead-form" className="md:col-span-2 text-xl font-medium text-white">2. Renseigner la demande</h2>
          <div><label htmlFor="vehicleId" className="block text-xs text-white/55">Véhicule existant <span className="text-white/30">(optionnel)</span></label><select id="vehicleId" name="vehicleId" defaultValue="" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]"><option value="">Aucun véhicule sélectionné</option>{selection.vehicles.map((vehicle) => vehicle.id ? <option key={vehicle.id} value={vehicle.id}>{[vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(" ") || "Véhicule sans désignation"}{vehicle.plate ? ` · ${vehicle.plate}` : ""}</option> : null)}</select></div>
          <div><label htmlFor="serviceName" className="block text-xs text-white/55">Service demandé</label><input id="serviceName" name="serviceName" required maxLength={200} placeholder="Ex. Nettoyage intérieur" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="basePrice" className="block text-xs text-white/55">Prix de base <span className="text-white/30">(optionnel)</span></label><input id="basePrice" name="basePrice" type="number" min="0" step="0.01" inputMode="decimal" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="estimatedTime" className="block text-xs text-white/55">Durée estimée <span className="text-white/30">(optionnel)</span></label><input id="estimatedTime" name="estimatedTime" maxLength={100} placeholder="Ex. 3 heures" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div className="md:col-span-2"><label htmlFor="customerComment" className="block text-xs text-white/55">Commentaire <span className="text-white/30">(optionnel)</span></label><textarea id="customerComment" name="customerComment" maxLength={2000} rows={4} className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
        </section>
        <button type="submit" className="border border-[#d8b477] px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-[#d8b477] hover:bg-[#d8b477] hover:text-[#080a0d]">Créer le lead</button>
      </form>}
    </div>
  );
}
