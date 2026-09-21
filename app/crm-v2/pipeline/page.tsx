import Link from "next/link";
import { getLeadsList, type LeadLifecycleStatus, type LeadListItem } from "../../lib/crm";
import { recordV2Payment } from "./actions";

export const dynamic = "force-dynamic";

const steps: Array<{ key: LeadLifecycleStatus | "PAID"; label: string }> = [
  { key: "NEW", label: "Demande reçue" },
  { key: "CONTACTED", label: "Client contacté" },
  { key: "QUOTE_SENT", label: "Devis envoyé" },
  { key: "BOOKED", label: "Devis accepté / RDV réservé" },
  { key: "IN_PROGRESS", label: "Prestation en cours" },
  { key: "COMPLETED", label: "Prestation effectuée" },
  { key: "PAID", label: "Paiement reçu" },
  { key: "REVIEW_REQUESTED", label: "Avis Google demandé" },
];

const rank: Record<LeadLifecycleStatus, number> = {
  NEW: 0,
  QUALIFIED: 0,
  CONTACTED: 1,
  QUOTE_SENT: 2,
  BOOKED: 3,
  IN_PROGRESS: 4,
  COMPLETED: 5,
  REVIEW_REQUESTED: 7,
  CLOSED_LOST: -1,
};

function name(item: LeadListItem) {
  return [item.customer.first_name, item.customer.last_name].filter(Boolean).join(" ") || item.customer.full_name || "Client";
}

function vehicle(item: LeadListItem) {
  if (!item.vehicle) return "Véhicule non renseigné";
  return [item.vehicle.brand, item.vehicle.model, item.vehicle.plate].filter(Boolean).join(" · ") || "Véhicule";
}

function serviceName(item: LeadListItem) {
  const value = item.latestQuote?.payload_json?.serviceName;
  return typeof value === "string" && value.trim()
    ? value
    : item.latestJob?.title || "Prestation AUTO 9";
}

function money(value?: number | null) {
  if (typeof value !== "number") return null;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function isDone(item: LeadListItem, key: LeadLifecycleStatus | "PAID") {
  if (key === "PAID") return item.latestJob?.status === "PAID";
  if (item.lead.lifecycle_status === "CLOSED_LOST") return false;
  return rank[item.lead.lifecycle_status] >= rank[key];
}

function currentIndex(item: LeadListItem) {
  if (item.lead.lifecycle_status === "CLOSED_LOST") return -1;
  if (item.latestJob?.status === "PAID" && rank[item.lead.lifecycle_status] < 7) return 6;
  return rank[item.lead.lifecycle_status];
}

function LeadProgress({ item }: { item: LeadListItem }) {
  const active = currentIndex(item);
  const amount = money(item.latestQuote?.total_price || item.latestJob?.total_amount);
  const closed = item.lead.lifecycle_status === "CLOSED_LOST";
  const canRecordPayment = Boolean(item.latestJob?.id && item.latestJob.status === "COMPLETED");

  return (
    <article className="overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b]">
      <div className="flex flex-col gap-4 border-b border-white/8 p-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-white">{name(item)}</h2>
            {closed && <span className="rounded-full border border-red-300/20 bg-red-300/5 px-2 py-1 text-[9px] uppercase tracking-[0.15em] text-red-200/70">Perdu / annulé</span>}
          </div>
          <p className="mt-1 text-xs text-white/40">{vehicle(item)}</p>
          <p className="mt-3 text-sm text-white/65">{serviceName(item)}</p>
        </div>
        <div className="shrink-0 text-left md:text-right">
          {amount && <p className="text-xl font-bold text-cyan-100">{amount}</p>}
          {item.latestAppointment?.scheduled_at && (
            <p className="mt-1 text-xs text-white/35">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(item.latestAppointment.scheduled_at))}</p>
          )}
          {item.lead.id && <Link href={`/crm/pipeline/${item.lead.id}`} className="mt-3 inline-block text-[11px] text-cyan-200/65 hover:text-cyan-100">Ouvrir le dossier →</Link>}
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const done = isDone(item, step.key);
            const now = !done && index === active + 1;
            return (
              <div key={step.key} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${done ? "border-emerald-300/18 bg-emerald-300/[0.05]" : now ? "border-amber-300/20 bg-amber-300/[0.05]" : "border-white/6 bg-white/[0.02]"}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${done ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-200" : now ? "border-amber-300/35 bg-amber-300/10 text-amber-200" : "border-white/10 text-white/25"}`}>
                  {done ? "✓" : now ? "•" : ""}
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${done ? "text-emerald-100" : now ? "text-amber-100" : "text-white/35"}`}>{step.label}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/20">{done ? "Fait" : now ? "À faire" : "En attente"}</p>
                </div>
              </div>
            );
          })}
        </div>

        {canRecordPayment && item.latestJob?.id && (
          <div className="mt-4 rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.035] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Paiement reçu</p>
                <p className="mt-1 text-xs text-white/35">Choisis le mode utilisé par le client.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["CARD", "Carte"],
                  ["BANK_TRANSFER", "Virement"],
                  ["CASH", "Espèces"],
                ].map(([method, label]) => (
                  <form key={method} action={recordV2Payment}>
                    <input type="hidden" name="jobId" value={item.latestJob!.id} />
                    <input type="hidden" name="method" value={method} />
                    <button className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white/70 transition hover:border-cyan-300/30 hover:text-cyan-100">
                      {label}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default async function CrmV2Pipeline({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawSearch = Array.isArray(params.search) ? params.search[0] : params.search;
  const search = rawSearch?.trim() || undefined;
  const paymentRecorded = (Array.isArray(params.payment) ? params.payment[0] : params.payment) === "recorded";
  const paymentError = Array.isArray(params.payment_error) ? params.payment_error[0] : params.payment_error;

  const result = await getLeadsList({ page: 1, limit: 50, search });

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/55">Suivi client</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Pipeline</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Un dossier par client. Vert = fait, orange = prochaine action, gris = à venir.</p>
        </div>
        <Link href="/crm/pipeline/new" className="w-fit rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100">+ Nouveau dossier</Link>
      </header>

      {paymentRecorded && <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">Paiement enregistré. Le CA du mois a été mis à jour.</div>}
      {paymentError && <div className="rounded-xl border border-red-300/20 bg-red-300/[0.05] px-4 py-3 text-sm text-red-100">Le paiement n'a pas pu être enregistré.</div>}

      <form className="flex gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-2">
        <input name="search" defaultValue={search} placeholder="Rechercher un client, téléphone, véhicule..." className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/25" />
        <button className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/70">Rechercher</button>
      </form>

      <div className="space-y-4">
        {result.items.length ? result.items.map((item) => <LeadProgress key={item.lead.id || item.lead.created_at} item={item} />) : (
          <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-white/30">Aucun dossier trouvé.</div>
        )}
      </div>
    </div>
  );
}
