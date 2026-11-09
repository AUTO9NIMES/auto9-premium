import Link from "next/link";
import { ensureCrmV2Access } from "../access";
import { readRequestClock } from "../../lib/request-clock";
import { parisDateKey } from "../../lib/paris-business-calendar";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";
import { getManualRevenueEntries } from "../../lib/manual-revenue";
import { addGaragePartner, assignGarageLead } from "./actions";
import {
  GARAGE_EVENT_ADDED, GARAGE_EVENT_ASSIGN,
  readGarageAssignments, readGaragePartners,
  type GarageEventRow,
} from "./data";

export const dynamic = "force-dynamic";
const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Paris" });

type LeadRow = {
  id: string; customer_id: string; vehicle_id: string | null;
  lifecycle_status: string; created_at: string; performance_date: string | null;
};
type CustomerRow = { id: string; full_name: string };
type VehicleRow = { id: string; brand: string | null; model: string | null; plate: string | null };
type JobRow = {
  id: string; lead_id: string; status: string;
  total_amount: number | null; title: string | null;
  scheduled_at: string | null; completed_at: string | null; created_at: string;
};
type PaymentRow = { id: string; job_id: string; amount: number; received_at: string };
type ServiceRow = { lead_id: string; service_name: string; base_price: number | null; created_at: string };
type StepRow = { lead_id: string | null; event_type: string; event_data: Record<string, unknown> | null; created_at: string };

function displayDate(value?: string | null) {
  if (!value) return "Date à préciser";
  const date = new Date(value.length === 10 ? value + "T12:00:00Z" : value);
  return Number.isFinite(date.getTime()) ? shortDate.format(date) : "Date à préciser";
}

export default async function GaragesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureCrmV2Access("/crm-v2/garages");

  const params = await searchParams;
  const raw = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) || "";
  };
  const { businessId } = await resolveCurrentBusinessContext();
  const currentMonth = parisDateKey(new Date(await readRequestClock())).slice(0, 7);
  const [activityRaw, leadsRaw, customersRaw, vehiclesRaw, jobsRaw, paymentsRaw, servicesRaw, stepsRaw] =
    await Promise.all([
      supabaseRest<GarageEventRow[]>("activity_log", "GET", null,
        "business_id=eq." + businessId + "&event_type=in.(" + GARAGE_EVENT_ADDED + "," + GARAGE_EVENT_ASSIGN + ")&order=created_at.desc&limit=5000&select=id,lead_id,event_type,event_data,created_at"),
      supabaseRest<LeadRow[]>("leads", "GET", null,
        "business_id=eq." + businessId + "&order=created_at.desc&limit=5000&select=id,customer_id,vehicle_id,lifecycle_status,created_at,performance_date"),
      supabaseRest<CustomerRow[]>("customers", "GET", null,
        "business_id=eq." + businessId + "&limit=5000&select=id,full_name"),
      supabaseRest<VehicleRow[]>("vehicles", "GET", null,
        "business_id=eq." + businessId + "&limit=5000&select=id,brand,model,plate"),
      supabaseRest<JobRow[]>("jobs", "GET", null,
        "business_id=eq." + businessId + "&order=created_at.desc&limit=5000&select=id,lead_id,status,total_amount,title,scheduled_at,completed_at,created_at"),
      supabaseRest<PaymentRow[]>("payments", "GET", null,
        "business_id=eq." + businessId + "&order=received_at.desc&limit=5000&select=id,job_id,amount,received_at"),
      supabaseRest<ServiceRow[]>("lead_services", "GET", null,
        "business_id=eq." + businessId + "&order=created_at.desc,id.desc&limit=5000&select=lead_id,service_name,base_price,created_at"),
      supabaseRest<StepRow[]>("activity_log", "GET", null,
        "business_id=eq." + businessId + "&event_type=in.(crm_v2.step.completed,crm_v2.step.reopened)&order=created_at.desc&limit=5000&select=lead_id,event_type,event_data,created_at"),
    ]);

  const events = (activityRaw as GarageEventRow[] | null) ?? [];
  const partners = readGaragePartners(events);
  const assignments = readGarageAssignments(events, new Set(partners.map((garage) => garage.key)));
  const leads = (leadsRaw as LeadRow[] | null) ?? [];
  const customers = new Map(((customersRaw as CustomerRow[] | null) ?? []).map((row) => [row.id, row]));
  const vehicles = new Map(((vehiclesRaw as VehicleRow[] | null) ?? []).map((row) => [row.id, row]));
  const jobs = (jobsRaw as JobRow[] | null) ?? [];
  const payments = (paymentsRaw as PaymentRow[] | null) ?? [];
  const services = (servicesRaw as ServiceRow[] | null) ?? [];
  const steps = (stepsRaw as StepRow[] | null) ?? [];
  const manualRevenue = await getManualRevenueEntries(businessId, payments);
  const paidByJob = new Map<string, number>();
  for (const payment of payments) {
    paidByJob.set(payment.job_id, (paidByJob.get(payment.job_id) || 0) + Number(payment.amount || 0));
  }
  const latestServiceByLead = new Map<string, ServiceRow>();
  for (const service of services) {
    if (!latestServiceByLead.has(service.lead_id)) latestServiceByLead.set(service.lead_id, service);
  }
  const jobsByLead = new Map<string, JobRow[]>();
  for (const job of jobs) jobsByLead.set(job.lead_id, [...(jobsByLead.get(job.lead_id) || []), job]);
  const latestCompletion = new Map<string, boolean>();
  for (const step of steps) {
    if (!step.lead_id || step.event_data?.step_key !== "COMPLETED" || latestCompletion.has(step.lead_id)) continue;
    latestCompletion.set(step.lead_id, step.event_type === "crm_v2.step.completed");
  }
  const manualRevenueByLead = new Map<string, number>();
  for (const payment of manualRevenue) {
    manualRevenueByLead.set(payment.leadId, (manualRevenueByLead.get(payment.leadId) || 0) + payment.amount);
  }

  const summaries = partners.map((garage) => {
    const garageLeads = leads.filter((lead) => assignments.get(lead.id) === garage.key);
    const garageLeadIds = new Set(garageLeads.map((lead) => lead.id));
    const garageJobs = jobs.filter((job) => garageLeadIds.has(job.lead_id));
    const jobIds = new Set(garageJobs.map((job) => job.id));
    const garagePayments = payments.filter((payment) => jobIds.has(payment.job_id));
    const garageManual = manualRevenue.filter((payment) => garageLeadIds.has(payment.leadId));
    const totalReceived = garagePayments.reduce((total, payment) => total + Number(payment.amount || 0), 0) +
      garageManual.reduce((total, payment) => total + payment.amount, 0);
    const thisMonthReceived = garagePayments
      .filter((payment) => parisDateKey(payment.received_at).slice(0, 7) === currentMonth)
      .reduce((total, payment) => total + Number(payment.amount || 0), 0) +
      garageManual
        .filter((payment) => parisDateKey(payment.receivedAt).slice(0, 7) === currentMonth)
        .reduce((total, payment) => total + payment.amount, 0);
    let pendingCount = 0, pendingKnown = 0, pendingUnknown = 0, completedCount = 0;
    for (const lead of garageLeads) {
      const leadJobs = jobsByLead.get(lead.id) || [];
      if (leadJobs.length) {
        for (const job of leadJobs) {
          if (job.status === "CANCELLED") continue;
          if (job.status === "PAID" || job.status === "COMPLETED") completedCount++;
          const received = paidByJob.get(job.id) || 0;
          if (job.status !== "COMPLETED") continue;
          const amount = job.total_amount == null ? null : Number(job.total_amount);
          if (amount != null && amount > received) { pendingCount++; pendingKnown += amount - received; }
          else if (amount == null && received === 0) { pendingCount++; pendingUnknown++; }
        }
      } else {
        const completed = latestCompletion.get(lead.id) ??
          ["COMPLETED", "REVIEW_REQUESTED"].includes(lead.lifecycle_status);
        if (!completed) continue;
        completedCount++;
        const received = manualRevenueByLead.get(lead.id) || 0;
        const amount = latestServiceByLead.get(lead.id)?.base_price;
        if (amount != null && Number(amount) > received) {
          pendingCount++; pendingKnown += Number(amount) - received;
        } else if (amount == null && received === 0) { pendingCount++; pendingUnknown++; }
      }
    }
    return { garage, leads: garageLeads, completedCount, totalReceived, thisMonthReceived, pendingCount, pendingKnown, pendingUnknown };
  });
  const selected = summaries.find((entry) => entry.garage.key === raw("garage")) ?? summaries[0];
  const query = raw("q").trim().slice(0, 100).toLocaleLowerCase("fr-FR");
  const availableLeads = leads.filter((lead) =>
    !assignments.get(lead.id) &&
    (!query || [
      customers.get(lead.customer_id)?.full_name,
      latestServiceByLead.get(lead.id)?.service_name,
      vehicles.get(lead.vehicle_id || "")?.plate,
      vehicles.get(lead.vehicle_id || "")?.model,
    ].some((field) => field?.toLocaleLowerCase("fr-FR").includes(query)))
  ).slice(0, 60);
  const error = raw("error");
  const success = raw("assigned") === "1" || raw("added") === "1";

  return (
    <div className="space-y-7">
      <header className="rounded-[28px] border border-cyan-300/15 bg-gradient-to-br from-[#10243a] via-[#0b1725] to-[#080d14] p-6 md:p-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/65">AUTO 9 · CRM V3</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Garages professionnels</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
          Tes partenaires, les véhicules préparés et leurs règlements, réunis au même endroit.
          Associe les dossiers existants pour afficher leurs chiffres réels.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/crm-v2/pipeline/new" className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100">+ Nouveau dossier</Link>
          <Link href="/crm-v2/developpement" className="rounded-xl border border-white/15 px-4 py-3 text-xs font-semibold text-white/75">Prospection garages →</Link>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-300/25 bg-red-300/[0.07] p-4 text-sm text-red-100">
        {error === "duplicate" ? "Ce garage existe déjà." : error === "invalid" ? "Vérifie les informations envoyées." :
          error === "not_found" ? "Dossier introuvable. Actualise la page." : "Enregistrement impossible. Réessaie."}
      </div>}
      {success && <div role="status" className="rounded-xl border border-emerald-300/25 bg-emerald-300/[0.06] p-4 text-sm text-emerald-100">
        Modification du garage enregistrée.
      </div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Garages partenaires", String(partners.length), "Garages suivis"],
          ["Dossiers rattachés", String([...assignments.values()].filter(Boolean).length), "Affectations enregistrées"],
          ["CA encaissé ce mois", eur.format(summaries.reduce((sum, item) => sum + item.thisMonthReceived, 0)), "Paiements attribués aux garages"],
          ["À encaisser", eur.format(summaries.reduce((sum, item) => sum + item.pendingKnown, 0)), "Hors montants non renseignés"],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</p>
            <p className="mt-3 text-3xl font-bold text-cyan-100">{value}</p>
            <p className="mt-2 text-xs text-white/40">{detail}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <aside className="space-y-4">
          <section className="rounded-3xl border border-white/10 bg-[#0b121b] p-5">
            <h2 className="text-lg font-semibold">Mes partenaires</h2>
            <div className="mt-4 space-y-2">
              {summaries.map((entry) => (
                <Link key={entry.garage.key} href={"/crm-v2/garages?garage=" + encodeURIComponent(entry.garage.key)}
                  className={"block rounded-xl border p-4 transition " +
                    (selected?.garage.key === entry.garage.key
                      ? "border-cyan-300/35 bg-cyan-300/[0.08]" : "border-white/10 bg-white/[0.025] hover:border-cyan-300/25")}>
                  <p className="font-semibold text-white">{entry.garage.name}</p>
                  <div className="mt-2 flex justify-between text-xs text-white/50">
                    <span>{entry.leads.length} dossiers</span>
                    <span>{eur.format(entry.thisMonthReceived)} ce mois</span>
                  </div>
                </Link>
              ))}
            </div>
            <form action={addGaragePartner} className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-5">
              <label htmlFor="garage-name" className="text-xs text-white/60">Ajouter un partenaire</label>
              <input id="garage-name" name="name" required minLength={2} maxLength={120}
                placeholder="Nom du garage" className="rounded-xl border border-white/15 bg-[#081019] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/50" />
              <button type="submit" className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100">+ Ajouter ce garage</button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0b121b] p-5">
            <h2 className="text-lg font-semibold">Rattacher un dossier</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">
              Les anciens dossiers ne sont pas attribués automatiquement, pour éviter les erreurs de facturation.
            </p>
            <form method="get" className="mt-4 flex gap-2">
              <input type="hidden" name="garage" value={selected?.garage.key ?? ""} />
              <input name="q" defaultValue={raw("q")} maxLength={100} placeholder="Client, véhicule…"
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#081019] px-3 py-2.5 text-xs text-white outline-none" />
              <button type="submit" className="rounded-lg border border-white/15 px-3 py-2.5 text-xs text-white/75">Chercher</button>
            </form>
            <form action={assignGarageLead} className="mt-3 space-y-3">
              <input type="hidden" name="garageKey" value={selected?.garage.key ?? ""} />
              <label className="block text-xs text-white/60">Dossier à rattacher
                <select name="leadId" required defaultValue="" className="mt-2 w-full rounded-lg border border-white/15 bg-[#081019] px-3 py-3 text-sm text-white">
                  <option value="" disabled>Choisir un dossier</option>
                  {availableLeads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {(customers.get(lead.customer_id)?.full_name || "Client") + " · " +
                       (vehicles.get(lead.vehicle_id || "")?.plate || latestServiceByLead.get(lead.id)?.service_name || displayDate(lead.created_at))}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={!availableLeads.length} className="w-full rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100 disabled:opacity-40">
                Associer au garage
              </button>
              {!availableLeads.length && <p className="text-xs text-white/40">Aucun dossier non attribué trouvé.</p>}
            </form>
          </section>
        </aside>

        <div className="space-y-4">
          {selected && (
            <>
              <section className="rounded-3xl border border-cyan-300/15 bg-[#0b121b] p-5 md:p-6">
                <p className="text-[10px] uppercase tracking-[.2em] text-cyan-200/50">Fiche partenaire</p>
                <h2 className="mt-2 text-2xl font-bold">{selected.garage.name}</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Véhicules / dossiers", String(selected.leads.length)],
                    ["Prestations terminées", String(selected.completedCount)],
                    ["CA encaissé ce mois", eur.format(selected.thisMonthReceived)],
                    ["CA encaissé historique", eur.format(selected.totalReceived)],
                    ["En attente de paiement", String(selected.pendingCount)],
                    ["Reste à encaisser connu", eur.format(selected.pendingKnown)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                      <p className="text-xs text-white/45">{label}</p>
                      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
                {selected.pendingUnknown > 0 && (
                  <p className="mt-4 text-xs text-amber-200/75">{selected.pendingUnknown} prestation(s) sans montant enregistré : le reste à encaisser est incomplet.</p>
                )}
              </section>

              <section className="rounded-3xl border border-white/10 bg-[#0b121b] p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.2em] text-cyan-200/55">Historique opérationnel</p>
                    <h2 className="mt-2 text-xl font-semibold">Véhicules préparés et dossiers</h2>
                  </div>
                  <Link href="/crm-v2/pipeline" className="text-xs text-cyan-200/70">Tous les dossiers →</Link>
                </div>
                <div className="mt-5 space-y-3">
                  {selected.leads.length ? selected.leads.map((lead) => {
                    const vehicle = vehicles.get(lead.vehicle_id || "");
                    const service = latestServiceByLead.get(lead.id);
                    const leadJobs = jobsByLead.get(lead.id) || [];
                    const latestJob = leadJobs[0];
                    const paid = leadJobs.length
                      ? leadJobs.reduce((sum, job) => sum + (paidByJob.get(job.id) || 0), 0)
                      : manualRevenueByLead.get(lead.id) || 0;
                    const amount = leadJobs.length
                      ? leadJobs.reduce((sum, job) => sum + Math.max(0, Number(job.total_amount) || 0), 0)
                      : Number(service?.base_price) || 0;
                    return (
                      <div key={lead.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{customers.get(lead.customer_id)?.full_name || "Client"}</p>
                            <p className="mt-1 text-xs text-white/55">
                              {[vehicle?.brand, vehicle?.model, vehicle?.plate].filter(Boolean).join(" · ") || "Véhicule non renseigné"}
                            </p>
                            <p className="mt-1 text-xs text-white/45">{latestJob?.title || service?.service_name || "Prestation AUTO 9"}</p>
                            <p className="mt-2 text-xs text-white/35">{displayDate(lead.performance_date || latestJob?.completed_at || latestJob?.scheduled_at || lead.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-cyan-100">{amount > 0 ? eur.format(amount) : "Prix non saisi"}</p>
                            <p className="mt-1 text-xs text-white/50">Encaissé : {eur.format(paid)}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3">
                          <Link href={"/crm-v2/pipeline?search=" + encodeURIComponent(customers.get(lead.customer_id)?.full_name || "")}
                            className="text-xs text-cyan-200/75 hover:text-cyan-100">Ouvrir le dossier →</Link>
                          <form action={assignGarageLead}>
                            <input type="hidden" name="leadId" value={lead.id} />
                            <input type="hidden" name="garageKey" value="" />
                            <button className="text-xs text-white/40 hover:text-red-200">Retirer du garage</button>
                          </form>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-xl border border-dashed border-white/10 px-5 py-8 text-sm text-white/45">
                      Aucun dossier encore rattaché à ce garage. Utilise le formulaire à gauche pour associer les prestations existantes.
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
      <p className="text-xs leading-5 text-white/35">
        Les chiffres affichés concernent uniquement les dossiers explicitement associés à un garage.
        Ils proviennent des prestations et paiements enregistrés dans AUTO 9, sans créer de facture ni modifier la comptabilité existante.
      </p>
    </div>
  );
}
