import Link from "next/link";
import { getCalendarMonth, getCrmDashboardMetrics, type CalendarAppointmentItem, type Payment } from "../lib/crm";\nimport { resolveCurrentBusinessContext } from "../lib/business";\nimport { supabaseRest } from "../lib/supabase";

export const dynamic = "force-dynamic";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const day = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit" });
const hour = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parisMonthKey(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).format(d);
}

function MiniEvent({ item }: { item: CalendarAppointmentItem }) {
  const when = new Date(item.appointment.scheduledAt);
  return (
    <Link href={`/crm/jobs/${item.job.id}`} className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.04]">
      <div className="w-14 shrink-0 text-center">
        <p className="text-[10px] uppercase text-white/35">{day.format(when)}</p>
        <p className="mt-1 text-xs font-semibold text-cyan-200">{hour.format(when)}</p>
      </div>
      <div className="min-w-0 border-l border-white/10 pl-3">
        <p className="truncate text-sm font-medium text-white">{item.customer.fullName}</p>
        <p className="mt-1 truncate text-xs text-white/40">{item.job.title || item.job.jobNumber || "Prestation AUTO 9"}</p>
      </div>
    </Link>
  );
}

export default async function CrmV2Dashboard() {
  const { businessId } = await resolveCurrentBusinessContext();
  let subscriptionsDue = 0;
  try {
    const subscriptionRows = await supabaseRest<Array<{ next_due_on: string; active: boolean }>>(
      "crm_subscriptions",
      "GET",
      null,
      `business_id=eq.${businessId}&active=eq.true&select=next_due_on,active`,
    );
    const current = monthKey();
    subscriptionsDue = ((subscriptionRows as Array<{ next_due_on: string; active: boolean }> | null) ?? [])
      .filter((item) => item.next_due_on?.startsWith(current)).length;
  } catch {
    subscriptionsDue = 0;
  }

  const [metrics, calendar, paymentsRaw] = await Promise.all([
    getCrmDashboardMetrics(),
    getCalendarMonth({ month: monthKey() }),
    supabaseRest<Payment[]>(
      "payments",
      "GET",
      null,
      `business_id=eq.${businessId}&order=received_at.desc&limit=500&select=id,business_id,job_id,amount,method,idempotency_key,received_at,created_at`,
    ),
  ]);

  const payments = (paymentsRaw as Payment[] | null) ?? [];
  const currentMonth = monthKey();
  const paymentsThisMonth = payments.filter((payment) => parisMonthKey(payment.received_at) === currentMonth);
  const monthlyRevenue = paymentsThisMonth.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const cashRevenue = paymentsThisMonth
    .filter((payment) => payment.method === "CASH")
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const bankRevenue = paymentsThisMonth
    .filter((payment) => payment.method === "CARD" || payment.method === "BANK_TRANSFER")
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const nextEvents = calendar.items
    .filter((item) => new Date(item.appointment.scheduledAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.appointment.scheduledAt).getTime() - new Date(b.appointment.scheduledAt).getTime())
    .slice(0, 5);

  const cards = [
    { label: "CA du mois", value: eur.format(monthlyRevenue), detail: `${paymentsThisMonth.length} encaissement${paymentsThisMonth.length > 1 ? "s" : ""}`, accent: true, href: "/crm-v2/revenue" },
    { label: "CA espèces", value: eur.format(cashRevenue), detail: "Paiements en espèces", href: "/crm/jobs?status=PAID" },
    { label: "CA carte + virement", value: eur.format(bankRevenue), detail: "Encaissements bancaires", href: "/crm/jobs?status=PAID" },
    { label: "Clients", value: String(metrics.customersTotal), detail: `${metrics.activeLeads} lead${metrics.activeLeads > 1 ? "s" : ""} actif${metrics.activeLeads > 1 ? "s" : ""}`, href: "/crm-v2/clients" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/55">AUTO 9 · Pilotage</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Vue d'ensemble</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Tout ce qui compte aujourd'hui : chiffre, clients, dossiers et planning.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/crm-v2/clients?new=1" className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/15">+ Nouveau client</Link>
          <Link href="/crm-v2/calendar?new=1" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-semibold text-white/75 transition hover:border-white/20">+ Événement</Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`group rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-cyan-300/[0.045] hover:shadow-[0_12px_35px_rgba(34,211,238,0.07)] ${card.accent ? "border-cyan-300/25 bg-gradient-to-br from-cyan-300/10 to-blue-500/[0.04]" : "border-white/8 bg-white/[0.025]"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">{card.label}</p>
              <span className="text-sm text-white/20 transition group-hover:translate-x-0.5 group-hover:text-cyan-200/70">→</span>
            </div>
            <p className={`mt-4 text-3xl font-bold ${card.accent ? "text-cyan-100" : "text-white"}`}>{card.value}</p>
            <p className="mt-2 text-xs text-white/35">{card.detail}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-5 2xl:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-3xl border border-white/8 bg-[#0b121b] p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/50">Planning</p>
              <h2 className="mt-2 text-xl font-semibold">Calendrier du mois</h2>
            </div>
            <Link href="/crm-v2/calendar" className="text-xs text-cyan-200/70 hover:text-cyan-100">Ouvrir le calendrier →</Link>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-1">
            {["L","M","M","J","V","S","D"].map((d, i) => <div key={i} className="py-2 text-center text-[10px] text-white/25">{d}</div>)}
            {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() === 0 ? 6 : new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() - 1 }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map((n) => {
              const key = `${monthKey()}-${String(n).padStart(2, "0")}`;
              const count = calendar.items.filter((item) => item.appointment.scheduledAt.startsWith(key)).length;
              const today = n === new Date().getDate();
              return (
                <Link href={`/crm-v2/calendar?day=${key}`} key={n} className={`relative min-h-16 rounded-xl border p-2 transition hover:border-cyan-300/25 ${today ? "border-cyan-300/35 bg-cyan-300/[0.07]" : "border-white/6 bg-white/[0.018]"}`}>
                  <span className={`text-xs ${today ? "font-bold text-cyan-100" : "text-white/55"}`}>{n}</span>
                  {count > 0 && <span className="absolute bottom-2 left-2 right-2 rounded-full bg-cyan-300/20 py-1 text-center text-[9px] font-semibold text-cyan-100">{count} RDV</span>}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-[#0b121b] p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/50">À venir</p>
              <h2 className="mt-2 text-xl font-semibold">Prochains rendez-vous</h2>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {nextEvents.length ? nextEvents.map((item) => <MiniEvent key={item.appointment.id} item={item} />) : <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/30">Aucun rendez-vous planifié.</p>}
          </div>
        </section>
      </div>

      {subscriptionsDue > 0 && (
        <Link href="/crm-v2/subscriptions" className="block rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-5 transition hover:border-amber-300/35">
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-100/60">Rappel abonnements</p>
          <p className="mt-2 text-lg font-semibold text-amber-100">{subscriptionsDue} abonnement{subscriptionsDue > 1 ? "s" : ""} à planifier ce mois-ci</p>
          <p className="mt-2 text-xs text-white/40">Ouvrir l'espace abonnements →</p>
        </Link>
      )}

      <section className="grid gap-3 md:grid-cols-4">
        <Link href="/crm-v2/pipeline" className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 transition hover:border-cyan-300/25">
          <p className="text-sm font-semibold">Pipeline checklist</p>
          <p className="mt-2 text-xs leading-5 text-white/40">Chaque client, chaque étape, un seul coup d'œil.</p>
        </Link>
        <Link href="/crm-v2/clients" className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 transition hover:border-cyan-300/25">
          <p className="text-sm font-semibold">Clients</p>
          <p className="mt-2 text-xs leading-5 text-white/40">Créer, retrouver et gérer la base clients.</p>
        </Link>
        <Link href="/crm-v2/subscriptions" className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 transition hover:border-cyan-300/25">
          <p className="text-sm font-semibold">Abonnements</p>
          <p className="mt-2 text-xs leading-5 text-white/40">Clients récurrents et rappels mensuels.</p>
        </Link>
        <Link href="/crm/jobs" className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 transition hover:border-cyan-300/25">
          <p className="text-sm font-semibold">Prestations</p>
          <p className="mt-2 text-xs leading-5 text-white/40">Accès au registre opérationnel existant.</p>
        </Link>
      </section>
    </div>
  );
}
