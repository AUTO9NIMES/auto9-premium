import Link from "next/link";
import { getCalendarMonth, type CalendarAppointmentItem } from "../../lib/crm";

export const dynamic = "force-dynamic";

const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function normalizeMonth(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Event({ item }: { item: CalendarAppointmentItem }) {
  return (
    <Link href={`/crm/jobs/${item.job.id}`} className="block rounded-lg border border-cyan-300/10 bg-cyan-300/[0.04] p-2 transition hover:border-cyan-300/25">
      <p className="text-[10px] font-semibold text-cyan-100">{time.format(new Date(item.appointment.scheduledAt))}</p>
      <p className="mt-1 truncate text-[11px] text-white/75">{item.customer.fullName}</p>
      <p className="mt-1 truncate text-[9px] text-white/30">{item.job.title || "Prestation AUTO 9"}</p>
    </Link>
  );
}

export default async function CrmV2Calendar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawMonth = Array.isArray(params.month) ? params.month[0] : params.month;
  const selectedMonth = normalizeMonth(rawMonth);
  const result = await getCalendarMonth({ month: selectedMonth });

  const [year, month] = selectedMonth.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  const first = new Date(year, month - 1, 1).getDay();
  const offset = first === 0 ? 6 : first - 1;
  const anchor = new Date(year, month - 1, 15);

  const eventsByDay = new Map<number, CalendarAppointmentItem[]>();
  for (const item of result.items) {
    const d = new Date(item.appointment.scheduledAt);
    const day = d.getDate();
    eventsByDay.set(day, [...(eventsByDay.get(day) || []), item]);
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/55">Planning</p>
          <h1 className="mt-3 text-3xl font-bold capitalize tracking-tight md:text-5xl">{monthLabel.format(anchor)}</h1>
          <p className="mt-3 text-sm text-white/45">Tes rendez-vous clients au même endroit, avec accès direct à chaque prestation.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/crm-v2/calendar?month=${result.previousMonth}`} className="rounded-xl border border-white/10 px-4 py-3 text-xs text-white/60">← Mois précédent</Link>
          <Link href={`/crm-v2/calendar?month=${result.nextMonth}`} className="rounded-xl border border-white/10 px-4 py-3 text-xs text-white/60">Mois suivant →</Link>
          <Link href="/crm/pipeline/new" className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100">+ Nouveau RDV client</Link>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b]">
        <div className="grid grid-cols-7 border-b border-white/8 bg-white/[0.015]">
          {dayNames.map((d) => <div key={d} className="px-2 py-3 text-center text-[10px] uppercase tracking-[0.14em] text-white/30">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: offset }).map((_, i) => <div key={`blank-${i}`} className="min-h-28 border-b border-r border-white/6 bg-white/[0.008] md:min-h-40" />)}
          {Array.from({ length: days }, (_, i) => i + 1).map((n) => {
            const events = eventsByDay.get(n) || [];
            const today = new Date().getFullYear() === year && new Date().getMonth() + 1 === month && new Date().getDate() === n;
            return (
              <div key={n} className={`min-h-28 border-b border-r border-white/6 p-2 md:min-h-40 ${today ? "bg-cyan-300/[0.035]" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${today ? "font-bold text-cyan-100" : "text-white/45"}`}>{n}</span>
                  {events.length > 0 && <span className="text-[9px] text-cyan-200/55">{events.length}</span>}
                </div>
                <div className="mt-2 space-y-1.5">
                  {events.slice(0, 3).map((item) => <Event key={item.appointment.id} item={item} />)}
                  {events.length > 3 && <p className="text-[9px] text-white/25">+ {events.length - 3} autre(s)</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[0.03] px-4 py-3 text-xs leading-5 text-amber-100/55">
        Les rendez-vous clients sont déjà reliés au moteur actuel. Les événements libres (ex. commande produits, passage garage, tâche perso) seront ajoutés séparément pour ne pas détourner la table des prestations.
      </div>
    </div>
  );
}
