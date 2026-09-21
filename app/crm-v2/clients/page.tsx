import Link from "next/link";
import { getCustomersList, type CustomerListItem } from "../../lib/crm";
import { createV2Customer, deleteV2Customer } from "./actions";

export const dynamic = "force-dynamic";

function customerName(item: CustomerListItem) {
  return [item.customer.first_name, item.customer.last_name].filter(Boolean).join(" ") || item.customer.full_name || "Client";
}

function vehicle(item: CustomerListItem) {
  const v = item.latestVehicle;
  if (!v) return null;
  return [v.brand, v.model, v.plate].filter(Boolean).join(" · ");
}

export default async function CrmV2Clients({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawSearch = Array.isArray(params.search) ? params.search[0] : params.search;
  const search = rawSearch?.trim() || undefined;
  const showNew = (Array.isArray(params.new) ? params.new[0] : params.new) === "1";
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const created = (Array.isArray(params.created) ? params.created[0] : params.created) === "1";
  const deleted = (Array.isArray(params.deleted) ? params.deleted[0] : params.deleted) === "1";

  const result = await getCustomersList({ page: 1, limit: 100, search });

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/55">Relation client</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Clients</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Une base simple : créer, retrouver, ouvrir ou supprimer un contact sans activité liée.</p>
        </div>
        <Link href="/crm-v2/clients?new=1" className="w-fit rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100">+ Nouveau client</Link>
      </header>

      {created && <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">Client créé.</div>}
      {deleted && <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">Client supprimé.</div>}
      {error && (
        <div className="rounded-xl border border-red-300/20 bg-red-300/[0.05] px-4 py-3 text-sm text-red-100">
          {error === "linked" ? "Ce client possède déjà un dossier ou une prestation. Suppression bloquée pour protéger l'historique." : error === "name" ? "Le nom du client est obligatoire." : "L'action n'a pas pu être effectuée."}
        </div>
      )}

      {showNew && (
        <section className="rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.06] to-blue-500/[0.025] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/55">Ajout manuel</p>
              <h2 className="mt-2 text-xl font-semibold">Nouveau client</h2>
            </div>
            <Link href="/crm-v2/clients" className="text-xs text-white/35 hover:text-white">Fermer ×</Link>
          </div>
          <form action={createV2Customer} className="mt-6 grid gap-3 md:grid-cols-2">
            <input name="fullName" required placeholder="Nom complet *" className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:border-cyan-300/35" />
            <input name="phone" placeholder="Téléphone" className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:border-cyan-300/35" />
            <input name="email" type="email" placeholder="Email" className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:border-cyan-300/35" />
            <input name="city" placeholder="Ville" className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:border-cyan-300/35" />
            <button className="mt-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 md:col-span-2">Créer le client</button>
          </form>
        </section>
      )}

      <form className="flex gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-2">
        <input name="search" defaultValue={search} placeholder="Nom, email, téléphone..." className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/25" />
        <button className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/70">Rechercher</button>
      </form>

      <section className="overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b]">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-4 border-b border-white/8 px-5 py-3 text-[9px] uppercase tracking-[0.16em] text-white/25 max-md:hidden">
          <span>Client</span><span>Contact</span><span>Véhicule</span><span>Actions</span>
        </div>
        <div className="divide-y divide-white/8">
          {result.items.length ? result.items.map((item) => (
            <article key={item.customer.id || item.customer.full_name} className="grid gap-4 px-5 py-5 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{customerName(item)}</p>
                <p className="mt-1 text-xs text-white/35">{item.customer.city || "Ville non renseignée"}</p>
              </div>
              <div className="min-w-0 text-xs text-white/50">
                <p className="truncate">{item.customer.email || "—"}</p>
                <p className="mt-1">{item.customer.phone || "—"}</p>
              </div>
              <div className="text-xs text-white/50">{vehicle(item) || "Aucun véhicule"}</div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {item.customer.id && <Link href={`/crm/clients/${item.customer.id}`} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] text-white/60 hover:border-cyan-300/25 hover:text-cyan-100">Ouvrir</Link>}
                {item.customer.id && (
                  <form action={deleteV2Customer}>
                    <input type="hidden" name="customerId" value={item.customer.id} />
                    <button className="rounded-lg border border-red-300/10 px-3 py-2 text-[10px] text-red-200/45 hover:border-red-300/25 hover:text-red-100">Supprimer</button>
                  </form>
                )}
              </div>
            </article>
          )) : <div className="p-10 text-center text-sm text-white/30">Aucun client trouvé.</div>}
        </div>
      </section>
    </div>
  );
}
