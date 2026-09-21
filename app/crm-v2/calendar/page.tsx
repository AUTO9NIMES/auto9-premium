import Link from "next/link";
import {
  getCalendarMonth,
  type CalendarAppointmentItem,
} from "../../lib/crm";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "./actions";

export const dynamic = "force-dynamic";

const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const monthLabel = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});
const time = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

type CustomerRow = {
  id: string;
  full_name: string;
};

type VehicleRow = {
  id: string;
  customer_id: string;
  brand: string | null;
  model: string | null;
  plate: string | null;
};

type CalendarEventRow = {
  id: string;
  business_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  title: string;
  service_name: string | null;
  event_date: string;
  event_time: string;
  notes: string | null;
  status: "CONFIRMED" | "COMPLETED" | "CANCELLED";
};

function normalizeMonth(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function AppointmentEvent({ item }: { item: CalendarAppointmentItem }) {
  return (
    <div className="rounded-lg border border-cyan-300/10 bg-cyan-300/[0.04] p-2">
      <p className="text-[10px] font-semibold text-cyan-100">
        {time.format(new Date(item.appointment.scheduledAt))}
      </p>
      <p className="mt-1 truncate text-[11px] text-white/75">
        {item.customer.fullName}
      </p>
      <p className="mt-1 truncate text-[9px] text-white/30">
        {item.job.title || "Prestation AUTO 9"}
      </p>
    </div>
  );
}

function CustomEvent({
  item,
  customer,
  vehicle,
  selectedMonth,
}: {
  item: CalendarEventRow;
  customer?: CustomerRow;
  vehicle?: VehicleRow;
  selectedMonth: string;
}) {
  return (
    <Link
      href={`/crm-v2/calendar?month=${selectedMonth}&edit=${item.id}`}
      className="block rounded-lg border border-emerald-300/12 bg-emerald-300/[0.04] p-2 transition hover:border-emerald-300/30"
    >
      <p className="text-[10px] font-semibold text-emerald-100">
        {item.event_time.slice(0, 5)}
      </p>
      <p className="mt-1 truncate text-[11px] text-white/75">
        {customer?.full_name || item.title}
      </p>
      <p className="mt-1 truncate text-[9px] text-white/30">
        {[item.service_name || item.title, vehicle ? [vehicle.brand, vehicle.model].filter(Boolean).join(" ") : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
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
  const showNew =
    (Array.isArray(params.new) ? params.new[0] : params.new) === "1";
  const rawDay = Array.isArray(params.day) ? params.day[0] : params.day;
  const presetDay =
    rawDay && /^\d{4}-\d{2}-\d{2}$/.test(rawDay)
      ? rawDay
      : `${selectedMonth}-01`;
  const editId = Array.isArray(params.edit) ? params.edit[0] : params.edit;
  const eventCreated =
    (Array.isArray(params.event_created)
      ? params.event_created[0]
      : params.event_created) === "1";
  const eventUpdated =
    (Array.isArray(params.event_updated)
      ? params.event_updated[0]
      : params.event_updated) === "1";
  const eventDeleted =
    (Array.isArray(params.event_deleted)
      ? params.event_deleted[0]
      : params.event_deleted) === "1";
  const eventError = Array.isArray(params.event_error)
    ? params.event_error[0]
    : params.event_error;

  const result = await getCalendarMonth({ month: selectedMonth });
  const { businessId } = await resolveCurrentBusinessContext();

  let customEvents: CalendarEventRow[] = [];
  let customers: CustomerRow[] = [];
  let vehicles: VehicleRow[] = [];
  let eventStorageUnavailable = false;

  try {
    const [eventRows, customerRows, vehicleRows] = await Promise.all([
      supabaseRest<CalendarEventRow[]>(
        "crm_calendar_events",
        "GET",
        null,
        `business_id=eq.${businessId}&event_date=gte.${selectedMonth}-01&event_date=lt.${result.nextMonth}-01&order=event_date.asc,event_time.asc&select=*`,
      ),
      supabaseRest<CustomerRow[]>(
        "customers",
        "GET",
        null,
        `business_id=eq.${businessId}&order=full_name.asc&select=id,full_name`,
      ),
      supabaseRest<VehicleRow[]>(
        "vehicles",
        "GET",
        null,
        `business_id=eq.${businessId}&order=created_at.desc&select=id,customer_id,brand,model,plate`,
      ),
    ]);

    customEvents = (eventRows as CalendarEventRow[] | null) ?? [];
    customers = (customerRows as CustomerRow[] | null) ?? [];
    vehicles = (vehicleRows as VehicleRow[] | null) ?? [];
  } catch {
    eventStorageUnavailable = true;
  }

  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const editing = editId
    ? customEvents.find((event) => event.id === editId) || null
    : null;

  const [year, month] = selectedMonth.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  const first = new Date(year, month - 1, 1).getDay();
  const offset = first === 0 ? 6 : first - 1;
  const anchor = new Date(year, month - 1, 15);

  const appointmentsByDay = new Map<number, CalendarAppointmentItem[]>();
  for (const item of result.items) {
    const d = new Date(item.appointment.scheduledAt);
    const day = Number(
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        timeZone: "Europe/Paris",
      }).format(d),
    );
    appointmentsByDay.set(day, [...(appointmentsByDay.get(day) || []), item]);
  }

  const customByDay = new Map<number, CalendarEventRow[]>();
  for (const item of customEvents) {
    const day = Number(item.event_date.slice(-2));
    customByDay.set(day, [...(customByDay.get(day) || []), item]);
  }

  const formEvent = editing;
  const formOpen = showNew || Boolean(formEvent);

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/55">
            Planning
          </p>
          <h1 className="mt-3 text-3xl font-bold capitalize tracking-tight md:text-5xl">
            {monthLabel.format(anchor)}
          </h1>
          <p className="mt-3 text-sm text-white/45">
            Rendez-vous, événements passés et futurs, clients et véhicules au même endroit.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/crm-v2/calendar?month=${result.previousMonth}`}
            className="rounded-xl border border-white/10 px-4 py-3 text-xs text-white/60"
          >
            ← Mois précédent
          </Link>
          <Link
            href={`/crm-v2/calendar?month=${result.nextMonth}`}
            className="rounded-xl border border-white/10 px-4 py-3 text-xs text-white/60"
          >
            Mois suivant →
          </Link>
          <Link
            href={`/crm-v2/calendar?month=${selectedMonth}&new=1`}
            className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100"
          >
            + Nouvel événement / RDV
          </Link>
        </div>
      </header>

      {eventCreated && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">
          Événement ajouté au calendrier.
        </div>
      )}
      {eventUpdated && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">
          Événement modifié.
        </div>
      )}
      {eventDeleted && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">
          Événement supprimé.
        </div>
      )}
      {eventError && (
        <div className="rounded-xl border border-red-300/20 bg-red-300/[0.05] px-4 py-3 text-sm text-red-100">
          L&apos;événement n&apos;a pas pu être enregistré.
        </div>
      )}
      {eventStorageUnavailable && (
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-sm text-amber-100">
          La table des événements V2 doit encore être initialisée dans la base de données.
        </div>
      )}

      {formOpen && (
        <section className="rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.06] to-blue-500/[0.025] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/55">
                {formEvent ? "Modification" : "Création"}
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                {formEvent ? "Modifier le rendez-vous" : "Nouvel événement / RDV"}
              </h2>
              <p className="mt-2 text-xs text-white/35">
                Tu peux saisir une date passée ou future. Cela ne crée pas de nouveau lead.
              </p>
            </div>
            <Link
              href={`/crm-v2/calendar?month=${selectedMonth}`}
              className="text-xs text-white/35 hover:text-white"
            >
              Fermer ×
            </Link>
          </div>

          <form
            action={formEvent ? updateCalendarEvent : createCalendarEvent}
            className="mt-6 grid gap-4 md:grid-cols-2"
          >
            {formEvent && (
              <input type="hidden" name="eventId" value={formEvent.id} />
            )}

            <label className="text-xs text-white/45">
              Client
              <select
                name="customerId"
                defaultValue={formEvent?.customer_id || ""}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white"
              >
                <option value="">Sans client</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-white/45">
              Véhicule possédé
              <select
                name="vehicleId"
                defaultValue={formEvent?.vehicle_id || ""}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white"
              >
                <option value="">Aucun véhicule</option>
                {vehicles.map((vehicle) => {
                  const owner = customerById.get(vehicle.customer_id)?.full_name || "Client";
                  const label =
                    [vehicle.brand, vehicle.model, vehicle.plate]
                      .filter(Boolean)
                      .join(" · ") || "Véhicule";
                  return (
                    <option key={vehicle.id} value={vehicle.id}>
                      {owner} — {label}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="text-xs text-white/45">
              Titre *
              <input
                name="title"
                required
                defaultValue={formEvent?.title || ""}
                placeholder="Ex. Entretien abonnement / nettoyage"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              />
            </label>

            <label className="text-xs text-white/45">
              Prestation
              <input
                name="serviceName"
                defaultValue={formEvent?.service_name || ""}
                placeholder="Ex. Formule Duo"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              />
            </label>

            <label className="text-xs text-white/45">
              Date *
              <input
                name="eventDate"
                type="date"
                required
                defaultValue={formEvent?.event_date || presetDay}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white"
              />
            </label>

            <label className="text-xs text-white/45">
              Heure *
              <input
                name="eventTime"
                type="time"
                required
                defaultValue={formEvent?.event_time?.slice(0, 5) || "09:00"}
                step="1800"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white"
              />
            </label>

            <label className="text-xs text-white/45 md:col-span-2">
              Notes
              <textarea
                name="notes"
                rows={3}
                defaultValue={formEvent?.notes || ""}
                placeholder="Informations utiles, adresse, détail de la prestation..."
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              />
            </label>

            <button className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 md:col-span-2">
              {formEvent ? "Enregistrer les modifications" : "Ajouter au calendrier"}
            </button>
          </form>

          {formEvent && (
            <form action={deleteCalendarEvent} className="mt-3">
              <input type="hidden" name="eventId" value={formEvent.id} />
              <input type="hidden" name="month" value={selectedMonth} />
              <button className="rounded-xl border border-red-300/15 px-4 py-2.5 text-xs text-red-100/60 hover:border-red-300/30 hover:text-red-100">
                Supprimer cet événement
              </button>
            </form>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b]">
        <div className="grid grid-cols-7 border-b border-white/8 bg-white/[0.015]">
          {dayNames.map((d) => (
            <div
              key={d}
              className="px-2 py-3 text-center text-[10px] uppercase tracking-[0.14em] text-white/30"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: offset }).map((_, i) => (
            <div
              key={`blank-${i}`}
              className="min-h-28 border-b border-r border-white/6 bg-white/[0.008] md:min-h-40"
            />
          ))}

          {Array.from({ length: days }, (_, i) => i + 1).map((n) => {
            const appointments = appointmentsByDay.get(n) || [];
            const customs = customByDay.get(n) || [];
            const count = appointments.length + customs.length;
            const dateKey = `${selectedMonth}-${String(n).padStart(2, "0")}`;
            const today =
              new Date().getFullYear() === year &&
              new Date().getMonth() + 1 === month &&
              new Date().getDate() === n;

            return (
              <div
                key={n}
                className={`min-h-28 border-b border-r border-white/6 p-2 md:min-h-40 ${today ? "bg-cyan-300/[0.035]" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/crm-v2/calendar?month=${selectedMonth}&new=1&day=${dateKey}`}
                    className={`text-xs transition hover:text-cyan-100 ${today ? "font-bold text-cyan-100" : "text-white/45"}`}
                    title="Ajouter un événement ce jour"
                  >
                    {n} +
                  </Link>
                  {count > 0 && (
                    <span className="text-[9px] text-cyan-200/55">{count}</span>
                  )}
                </div>

                <div className="mt-2 space-y-1.5">
                  {appointments.slice(0, 2).map((item) => (
                    <AppointmentEvent
                      key={item.appointment.id}
                      item={item}
                    />
                  ))}
                  {customs.slice(0, 2).map((item) => (
                    <CustomEvent
                      key={item.id}
                      item={item}
                      customer={
                        item.customer_id
                          ? customerById.get(item.customer_id)
                          : undefined
                      }
                      vehicle={
                        item.vehicle_id
                          ? vehicleById.get(item.vehicle_id)
                          : undefined
                      }
                      selectedMonth={selectedMonth}
                    />
                  ))}
                  {count > 4 && (
                    <p className="text-[9px] text-white/25">
                      + {count - 4} autre(s)
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs leading-5 text-white/40">
        <span className="text-cyan-100">Bleu</span> : rendez-vous issus du flux commercial.{" "}
        <span className="text-emerald-100">Vert</span> : événements créés directement dans le calendrier V2 et modifiables.
      </div>
    </div>
  );
}
