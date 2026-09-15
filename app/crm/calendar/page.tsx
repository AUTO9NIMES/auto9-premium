import Link from "next/link";
import { redirect } from "next/navigation";

import { CrmAccessError, requireCrmAccess } from "../../lib/auth/dal";
import {
  getCalendarMonth,
  type CalendarAppointmentItem,
  type CalendarMonthResult,
  type JobStatus,
} from "../../lib/crm";

export const dynamic = "force-dynamic";

const appointmentStatusLabels: Record<
  CalendarAppointmentItem["appointment"]["status"],
  string
> = {
  REQUESTED: "Demandé",
  CONFIRMED: "Confirmé",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

const jobStatusLabels: Record<JobStatus, string> = {
  QUOTE_ACCEPTED: "Devis accepté",
  SCHEDULED: "Planifiée",
  CONFIRMED: "Confirmée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  PAID: "Payée",
};

const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
});

const monthLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  month: "long",
  year: "numeric",
});

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

function formatDayKey(value: string): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Map(
    dayKeyFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const year = parts.get("year");
  const month = parts.get("month");
  const day = parts.get("day");

  return year && month && day ? year + "-" + month + "-" + day : null;
}

function formatTime(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Heure invalide" : timeFormatter.format(date);
}

function formatVehicle(
  vehicle: CalendarAppointmentItem["vehicle"],
): string | null {
  if (!vehicle) return null;

  const label = [vehicle.brand, vehicle.model]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");

  return label || null;
}

function CalendarEvent({ item }: { item: CalendarAppointmentItem }) {
  const vehicle = formatVehicle(item.vehicle);

  return (
    <Link
      href={"/crm/jobs/" + item.job.id}
      className="block border border-white/10 bg-[#101419] p-3 transition-colors hover:border-[#d8b477]/60"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white">
          {formatTime(item.appointment.scheduledAt)}
        </p>
        <span className="text-[9px] uppercase tracking-[0.12em] text-[#d8b477]">
          {appointmentStatusLabels[item.appointment.status]}
        </span>
      </div>
      <p className="mt-2 truncate text-xs text-white/70">
        {item.customer.fullName}
      </p>
      <p className="mt-1 truncate text-[11px] text-white/40">
        {item.job.title || item.job.jobNumber || "Prestation"}
      </p>
      {vehicle && (
        <p className="mt-1 truncate text-[10px] text-white/30">{vehicle}</p>
      )}
      <p className="mt-2 text-[9px] uppercase tracking-[0.1em] text-white/30">
        {jobStatusLabels[item.job.status]}
      </p>
    </Link>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureCrmAccess();

  const query = await searchParams;
  const rawMonth = Array.isArray(query.month) ? query.month[0] : query.month;

  let result: CalendarMonthResult | null = null;
  let failed = false;

  try {
    result = await getCalendarMonth({ month: rawMonth });
  } catch {
    failed = true;
  }

  if (failed || !result) {
    return (
      <div data-crm-route="calendar" className="space-y-8">
        <section className="border-b border-white/10 pb-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8b477]">
            Planning / Lecture seule
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Calendrier
          </h1>
          <p role="alert" className="mt-5 border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">
            Période invalide ou planning momentanément indisponible.
          </p>
        </section>
      </div>
    );
  }

  const [yearText, monthText] = result.month.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const monthAnchor = new Date(Date.UTC(year, month - 1, 15, 12));
  const monthLabel = monthLabelFormatter.format(monthAnchor);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday =
    (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;

  const itemsByDay = new Map<string, CalendarAppointmentItem[]>();

  for (const item of result.items) {
    const key = formatDayKey(item.appointment.scheduledAt);

    if (!key || !key.startsWith(result.month + "-")) {
      throw new Error("Calendar item falls outside the requested month.");
    }

    const items = itemsByDay.get(key) ?? [];
    items.push(item);
    itemsByDay.set(key, items);
  }

  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <div data-crm-route="calendar" className="space-y-8">
      <section className="border-b border-white/10 pb-8">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8b477]">
          Planning / Lecture seule
        </p>
        <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-semibold capitalize tracking-tight text-white md:text-5xl">
              {monthLabel}
            </h1>
            <p className="mt-3 text-sm text-white/45">
              Horaires opérationnels Europe/Paris · aucun déplacement depuis cette vue.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={"/crm/calendar?month=" + result.previousMonth}
              className="border border-white/10 px-4 py-2.5 text-xs text-white/60 transition-colors hover:border-[#d8b477]/60 hover:text-[#d8b477]"
            >
              ← Mois précédent
            </Link>
            <Link
              href={"/crm/calendar?month=" + result.nextMonth}
              className="border border-white/10 px-4 py-2.5 text-xs text-white/60 transition-colors hover:border-[#d8b477]/60 hover:text-[#d8b477]"
            >
              Mois suivant →
            </Link>
          </div>
        </div>
      </section>

      <section aria-label={"Calendrier de " + monthLabel}>
        <div className="grid grid-cols-7 border-t border-l border-white/10">
          {weekDays.map((day) => (
            <div
              key={day}
              className="border-r border-b border-white/10 bg-[#0d1014] px-2 py-3 text-center text-[10px] uppercase tracking-[0.15em] text-white/35"
            >
              {day}
            </div>
          ))}

          {cells.map((day, index) => {
            if (day === null) {
              return (
                <div
                  key={"empty-" + index}
                  aria-hidden="true"
                  className="min-h-28 border-r border-b border-white/10 bg-white/[0.01]"
                />
              );
            }

            const dayKey =
              result.month + "-" + String(day).padStart(2, "0");
            const events = itemsByDay.get(dayKey) ?? [];

            return (
              <div
                key={dayKey}
                className="min-h-28 border-r border-b border-white/10 bg-[#0d1014] p-2 md:min-h-40"
              >
                <p className="mb-2 text-xs font-medium text-white/45">{day}</p>
                <div className="space-y-2">
                  {events.map((item) => (
                    <CalendarEvent
                      key={item.appointment.id}
                      item={item}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {result.items.length === 0 && (
          <p className="border-r border-b border-l border-white/10 px-5 py-8 text-center text-sm text-white/35">
            Aucun horaire opérationnel sur ce mois.
          </p>
        )}

        <p className="mt-4 text-xs text-white/30">
          {result.items.length} rendez-vous planifié
          {result.items.length === 1 ? "" : "s"} affiché
          {result.items.length === 1 ? "" : "s"}.
        </p>
      </section>
    </div>
  );
}
