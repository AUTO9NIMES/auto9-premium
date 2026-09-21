import Link from "next/link";
import { getCustomersList, type Customer } from "../../lib/crm";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";
import { advanceSubscription, createSubscription, toggleSubscription } from "./actions";

export const dynamic = "force-dynamic";

type Subscription = {
  id: string;
  business_id: string;
  customer_id: string;
  service_name: string;
  price: number | null;
  frequency_months: number;
  next_due_on: string;
  active: boolean;
  notes: string | null;
  created_at: string;
};

function money(value: number | null) {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function dueThisMonth(date: string) {
  const now = new Date();
  const d = new Date(date + "T12:00:00Z");
  return d.getUTCFullYear() === now.getFullYear() && d.getUTCMonth() === now.getMonth();
}

function emailHref(customer: Customer | undefined, subscription: Subscription) {
  if (!customer?.email) return "#";
  const subject = encodeURIComponent("Votre entretien AUTO 9 - réservation du prochain rendez-vous");
  const body = encodeURIComponent(
    `Bonjour ${customer.first_name || customer.full_name || ""},\n\nVotre entretien AUTO 9 est à planifier pour ce mois-ci.\n\nPrestation : ${subscription.service_name}\n\nVous pouvez choisir directement votre jour et votre horaire ici :\nhttps://auto9nimes.com/book-online\n\nÀ bientôt,\nAUTO 9\nRetrouvez la joie du neuf`
  );
  return `mailto:${customer.email}?subject=${subject}&body=${body}`;
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const showNew = (Array.isArray(params.new) ? params.new[0] : params.new) === "1";
  const created = (Array.isArray(params.created) ? params.created[0] : params.created) === "1";
  const updated = (Array.isArray(params.updated) ? params.updated[0] : params.updated) === "1";
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  const { businessId } = await resolveCurrentBusinessContext();
  const customersResult = await getCustomersList({ page: 1, limit: 100 });

  let subscriptions: Subscription[] = [];
  let storageUnavailable = false;

  try {
    const rows = await supabaseRest<Subscription[]>(
      "crm_subscriptions",
      "GET",
      null,
      `business_id=eq.${businessId}&order=active.desc,next_due_on.asc&select=*`
    );
    subscriptions = (rows as Subscription[] | null) ?? [];
  } catch {
    storageUnavailable = true;
  }

  const customerById = new Map(customersResult.items.map((item) => [item.customer.id, item.customer]));
  const dueCount = subscriptions.filter((s) => s.active && dueThisMonth(s.next_due_on)).length;

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/55">Fidélisation</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Abonnements</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
            Tes clients récurrents, leurs prestations et les rendez-vous à replanifier chaque mois.
          </p>
        </div>
        <Link href="/crm-v2/subscriptions?new=1" className="w-fit rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100">
          + Nouvel abonnement
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">À planifier ce mois</p>
          <p className="mt-3 text-3xl font-bold text-cyan-100">{dueCount}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Abonnements actifs</p>
          <p className="mt-3 text-3xl font-bold">{subscriptions.filter((s) => s.active).length}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Mensuel potentiel</p>
          <p className="mt-3 text-3xl font-bold">
            {money(subscriptions.filter((s) => s.active && s.frequency_months === 1).reduce((sum, s) => sum + (s.price || 0), 0))}
          </p>
        </div>
      </section>

      {created && <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">Abonnement créé.</div>}
      {updated && <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">Abonnement mis à jour.</div>}
      {(error || storageUnavailable) && (
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-sm text-amber-100">
          {storageUnavailable ? "La table Abonnements doit encore être initialisée dans la base de données." : "L'action n'a pas pu être effectuée."}
        </div>
      )}

      {showNew && (
        <section className="rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.06] to-blue-500/[0.025] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/55">Création</p>
              <h2 className="mt-2 text-xl font-semibold">Nouvel abonnement</h2>
            </div>
            <Link href="/crm-v2/subscriptions" className="text-xs text-white/35 hover:text-white">Fermer ×</Link>
          </div>
          <form action={createSubscription} className="mt-6 grid gap-3 md:grid-cols-2">
            <select name="customerId" required className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white">
              <option value="">Choisir un client *</option>
              {customersResult.items.map(({ customer }) => (
                <option key={customer.id} value={customer.id}>{customer.full_name}</option>
              ))}
            </select>
            <input name="serviceName" required placeholder="Prestation * (ex. Formule Duo)" className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm outline-none placeholder:text-white/25" />
            <label className="text-xs text-white/45">
              Tarif négocié (€)
              <input name="price" inputMode="decimal" placeholder="Ex. 169" className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm outline-none placeholder:text-white/25" />
              <span className="mt-1 block text-[10px] text-white/25">Montant libre selon l'accord conclu avec le client.</span>
            </label>
            <select name="frequencyMonths" defaultValue="1" className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white">
              <option value="1">Tous les mois</option>
              <option value="2">Tous les 2 mois</option>
              <option value="3">Tous les 3 mois</option>
              <option value="6">Tous les 6 mois</option>
            </select>
            <label className="text-xs text-white/45">
              Prochain passage
              <input name="nextDueOn" type="date" required className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white" />
            </label>
            <textarea name="notes" placeholder="Notes (facultatif)" className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm outline-none placeholder:text-white/25" />
            <button className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 md:col-span-2">Créer l'abonnement</button>
          </form>
        </section>
      )}

      <div className="space-y-3">
        {subscriptions.map((subscription) => {
          const customer = customerById.get(subscription.customer_id);
          const due = subscription.active && dueThisMonth(subscription.next_due_on);
          const emailReady = Boolean(customer?.email);

          return (
            <article key={subscription.id} className={`rounded-3xl border p-5 md:p-6 ${due ? "border-amber-300/20 bg-amber-300/[0.035]" : "border-white/8 bg-[#0b121b]"}`}>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{customer?.full_name || "Client"}</h2>
                    {due && <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-amber-100">À planifier</span>}
                    {!subscription.active && <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/35">En pause</span>}
                  </div>
                  <p className="mt-2 text-sm text-white/65">{subscription.service_name} · {money(subscription.price)}</p>
                  <p className="mt-2 text-xs text-white/35">
                    Tous les {subscription.frequency_months === 1 ? "mois" : `${subscription.frequency_months} mois`} · prochain passage {new Intl.DateTimeFormat("fr-FR").format(new Date(subscription.next_due_on + "T12:00:00Z"))}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href="/crm-v2/calendar" className="rounded-xl border border-white/10 px-3 py-2.5 text-xs text-white/65 hover:border-cyan-300/25 hover:text-cyan-100">
                    Planifier RDV
                  </Link>
                  {emailReady ? (
                    <a href={emailHref(customer, subscription)} className="rounded-xl border border-cyan-300/25 bg-cyan-300/[0.07] px-3 py-2.5 text-xs font-semibold text-cyan-100">
                      Préparer l'email
                    </a>
                  ) : (
                    <span className="rounded-xl border border-white/8 px-3 py-2.5 text-xs text-white/25">Email manquant</span>
                  )}
                  <form action={advanceSubscription}>
                    <input type="hidden" name="subscriptionId" value={subscription.id} />
                    <input type="hidden" name="currentDue" value={subscription.next_due_on} />
                    <input type="hidden" name="frequencyMonths" value={subscription.frequency_months} />
                    <button className="rounded-xl border border-emerald-300/15 px-3 py-2.5 text-xs text-emerald-100/70 hover:border-emerald-300/30">RDV planifié ✓</button>
                  </form>
                  <form action={toggleSubscription}>
                    <input type="hidden" name="subscriptionId" value={subscription.id} />
                    <input type="hidden" name="active" value={String(subscription.active)} />
                    <button className="rounded-xl border border-white/8 px-3 py-2.5 text-xs text-white/35 hover:text-white">{subscription.active ? "Mettre en pause" : "Réactiver"}</button>
                  </form>
                </div>
              </div>
            </article>
          );
        })}

        {!subscriptions.length && !storageUnavailable && (
          <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-white/30">Aucun abonnement enregistré.</div>
        )}
      </div>
    </div>
  );
}
