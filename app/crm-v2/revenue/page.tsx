import Link from "next/link";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";
import type { Payment } from "../../lib/crm";

export const dynamic = "force-dynamic";

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const months = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function parisParts(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  if (!year || !month) return null;
  return { year, month };
}

function buildPath(values: number[]) {
  const width = 960;
  const height = 260;
  const padX = 28;
  const padY = 24;
  const max = Math.max(...values, 1);

  const points = values.map((value, index) => {
    const x = padX + (index * (width - padX * 2)) / Math.max(values.length - 1, 1);
    const y = height - padY - (value / max) * (height - padY * 2);
    return { x, y, value };
  });

  const d = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  return { width, height, points, d, max };
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawYear = Array.isArray(params.year) ? params.year[0] : params.year;
  const currentYear = new Date().getFullYear();
  const selectedYear = /^\d{4}$/.test(rawYear || "") ? Number(rawYear) : currentYear;

  const { businessId } = await resolveCurrentBusinessContext();
  const rows = await supabaseRest<Payment[]>(
    "payments",
    "GET",
    null,
    `business_id=eq.${businessId}&order=received_at.asc&limit=5000&select=id,business_id,job_id,amount,method,idempotency_key,received_at,created_at`,
  );

  const payments = (rows as Payment[] | null) ?? [];
  const years = Array.from(
    new Set([
      currentYear,
      ...payments
        .map((payment) => parisParts(payment.received_at)?.year)
        .filter((year): year is number => typeof year === "number"),
    ]),
  ).sort((a, b) => b - a);

  const monthData = months.map((label, index) => {
    const monthNumber = index + 1;
    const monthPayments = payments.filter((payment) => {
      const parts = parisParts(payment.received_at);
      return parts?.year === selectedYear && parts?.month === monthNumber;
    });

    const total = monthPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const cash = monthPayments
      .filter((payment) => payment.method === "CASH")
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const bank = monthPayments
      .filter((payment) => payment.method === "CARD" || payment.method === "BANK_TRANSFER")
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);

    return { label, total, cash, bank, count: monthPayments.length };
  });

  const annualTotal = monthData.reduce((sum, month) => sum + month.total, 0);
  const annualCash = monthData.reduce((sum, month) => sum + month.cash, 0);
  const annualBank = monthData.reduce((sum, month) => sum + month.bank, 0);
  const chart = buildPath(monthData.map((month) => month.total));

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/55">Pilotage financier</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Chiffre d’affaires</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
            Suivi mensuel des encaissements enregistrés dans le CRM, avec historique annuel et ventilation par mode de paiement.
          </p>
        </div>

        <form className="flex items-center gap-2">
          <label className="text-xs text-white/35">Année</label>
          <select
            name="year"
            defaultValue={String(selectedYear)}
            className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white"
          >
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <button className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-3 text-xs font-semibold text-cyan-100">
            Afficher
          </button>
        </form>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-300/10 to-blue-500/[0.04] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">CA {selectedYear}</p>
          <p className="mt-3 text-3xl font-bold text-cyan-100">{eur.format(annualTotal)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Espèces</p>
          <p className="mt-3 text-3xl font-bold">{eur.format(annualCash)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Carte + virement</p>
          <p className="mt-3 text-3xl font-bold">{eur.format(annualBank)}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/8 bg-[#0b121b] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/50">Progression</p>
            <h2 className="mt-2 text-xl font-semibold">Évolution mensuelle du CA</h2>
          </div>
          <p className="text-xs text-white/30">Encaissements réellement enregistrés</p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <div className="min-w-[760px]">
            <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-[280px] w-full" role="img" aria-label={`Évolution du chiffre d'affaires ${selectedYear}`}>
              {[0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chart.height - 24 - ratio * (chart.height - 48);
                return (
                  <line
                    key={ratio}
                    x1="28"
                    x2={chart.width - 28}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                  />
                );
              })}
              <path d={chart.d} fill="none" stroke="rgb(103 232 249)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {chart.points.map((point, index) => (
                <g key={months[index]}>
                  <circle cx={point.x} cy={point.y} r="6" fill="rgb(103 232 249)" />
                  <circle cx={point.x} cy={point.y} r="12" fill="rgba(103,232,249,0.12)" />
                  <text x={point.x} y={chart.height - 4} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.35)">
                    {months[index].slice(0, 3)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b]">
        <div className="grid grid-cols-[1.1fr_.9fr_.9fr_.9fr_.7fr] gap-3 border-b border-white/8 px-5 py-3 text-[9px] uppercase tracking-[0.16em] text-white/25 max-md:hidden">
          <span>Mois</span><span>CA total</span><span>Espèces</span><span>Carte + virement</span><span>Encaissements</span>
        </div>

        <div className="divide-y divide-white/8">
          {monthData.map((month, index) => {
            const now = selectedYear === currentYear && index === new Date().getMonth();
            return (
              <div
                key={month.label}
                className={`grid gap-3 px-5 py-4 md:grid-cols-[1.1fr_.9fr_.9fr_.9fr_.7fr] md:items-center ${now ? "bg-cyan-300/[0.035]" : ""}`}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{month.label}</p>
                  {now && <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-cyan-200/60">Mois en cours</p>}
                </div>
                <p className="text-sm font-semibold text-cyan-100">{eur.format(month.total)}</p>
                <p className="text-sm text-white/60">{eur.format(month.cash)}</p>
                <p className="text-sm text-white/60">{eur.format(month.bank)}</p>
                <p className="text-sm text-white/40">{month.count}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div>
        <Link href="/crm-v2" className="text-xs text-cyan-200/65 hover:text-cyan-100">← Retour au dashboard</Link>
      </div>
    </div>
  );
}
