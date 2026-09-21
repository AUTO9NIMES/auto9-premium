import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CrmAccessError,
  requireCrmAccess,
} from "../../lib/auth/dal";
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
  price: number | null;
  lead_id: string | null;
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

function formatVehicleLabel(vehicle?: {
  brand?: string | null;
  model?: string | null;
  plate?: string | null;
}) {
  if (!vehicle) return null;

  const model = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
  const plate = vehicle.plate?.trim();

  return [model || null, plate || null].filter(Boolean).join(" · ") || null;
}

function AppointmentEvent({ item }: { item: CalendarAppointmentItem }) {
  const vehicleLabel = formatVehicleLabel(item.vehicle || undefined);
  const jobLabel =
    item.job.title ||
    (item.job.jobNumber ? `Prestation ${item.job.jobNumber}` : "Prestation AUTO 9");

  return (
    <article className="group rounded-xl border border-[#d8b477]/30 bg-gradient-to-br from-[#d8b477]/[0.11] via-[#d8b477]/[0.045] to-transparent p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.16)] transition hover:border-[#d8b477]/55">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-[#d8b477]/25 bg-[#d8b477]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#f0ce91]">
              Opérationnel
            </span>
            <span className="text-[10px] font-bold text-[#f0ce91]">
              {time.format(new Date(item.appointment.scheduledAt))}
            </span>
          </div>

          <p className="mt-2 truncate text-[11px] font-semibold text-white">
            {item.customer.fullName}
          </p>

          <p className="mt-1 truncate text-[9px] text-white/50">
            {jobLabel}
          </p>

          {vehicleLabel && (
            <p className="mt-1 truncate text-[9px] text-white/30">
              {vehicleLabel}
            </p>
          )}
        </div>

        <span className="shrink-0 rounded-md border border-white/8 px-1.5 py-1 text-[8px] uppercase tracking-[0.08em] text-white/40">
          {item.appointment.status}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Link
          href={`/crm/jobs/${item.job.id}`}
          className="rounded-md border border-[#d8b477]/25 bg-[#d8b477]/10 px-2 py-1 text-[9px] font-semibold text-[#f0ce91] transition hover:border-[#d8b477]/50 hover:bg-[#d8b477]/15"
        >
          Job →
        </Link>

        <Link
          href={`/crm/clients/${item.customer.id}`}
          className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-white/50 transition hover:border-white/20 hover:text-white"
        >
          Client 360
        </Link>
      </div>
    </article>
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
  const vehicleLabel = formatVehicleLabel(vehicle);
  const serviceLabel = item.service_name || item.title;

  return (
    <article className="group rounded-xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.07] via-blue-400/[0.025] to-transparent p-2.5 transition hover:border-cyan-300/35">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-100/75">
              Planning
            </span>

            <span className="text-[10px] font-bold text-cyan-100">
              {item.event_time.slice(0, 5)}
            </span>
          </div>

          <p className="mt-2 truncate text-[11px] font-semibold text-white/85">
            {customer?.full_name || item.title}
          </p>

          <p className="mt-1 truncate text-[9px] text-white/45">
            {serviceLabel}
          </p>

          {vehicleLabel && (
            <p className="mt-1 truncate text-[9px] text-white/30">
              {vehicleLabel}
            </p>
          )}
        </div>

        {typeof item.price === "number" && (
          <span className="shrink-0 text-[10px] font-bold text-cyan-100/80">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(item.price)}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Link
          href={`/crm/calendar?month=${selectedMonth}&edit=${item.id}`}
          className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.06] px-2 py-1 text-[9px] font-semibold text-cyan-100/80 transition hover:border-cyan-300/40 hover:text-cyan-50"
        >
          Modifier
        </Link>

        {customer && (
          <Link
            href={`/crm/clients/${customer.id}`}
            className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-white/50 transition hover:border-white/20 hover:text-white"
          >
            Client 360
          </Link>
        )}

        {item.lead_id && (
          <Link
            href={`/crm/pipeline/${item.lead_id}`}
            className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-white/50 transition hover:border-white/20 hover:text-white"
          >
            Pipeline
          </Link>
        )}
      </div>
    </article>
  );
}

export default async function CrmCalendar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect("/crm/login");
      }

      if (error.code === "FORBIDDEN") {
        redirect("/crm");
      }
    }

    throw error;
  }

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
  const leadCreated =
    (Array.isArray(params.lead_created) ? params.lead_created[0] : params.lead_created) === "1";
  const leadError =
    (Array.isArray(params.lead_error) ? params.lead_error[0] : params.lead_error) === "1";

  const result = await getCalendarMonth({ month: selectedMonth });
  const { businessId } = await resolveCurrentBusinessContext();

  let customEvents: CalendarEventRow[] = [];
  let customers: CustomerRow[] = [];
  let vehicles: VehicleRow[] = [];
  let eventStorageUnavailable = false;

  try {
    const eventRows = await supabaseRest<CalendarEventRow[]>(
      "crm_calendar_events",
      "GET",
      null,
      `business_id=eq.${businessId}&event_date=gte.${selectedMonth}-01&event_date=lt.${result.nextMonth}-01&order=event_date.asc,event_time.asc&select=*`,
    );
    customEvents = (eventRows as CalendarEventRow[] | null) ?? [];
  } catch {
    eventStorageUnavailable = true;
  }

  try {
    const customerRows = await supabaseRest<CustomerRow[]>(
      "customers",
      "GET",
      null,
      `business_id=eq.${businessId}&order=full_name.asc&select=id,full_name`,
    );
    customers = (customerRows as CustomerRow[] | null) ?? [];
  } catch {
    customers = [];
  }

  try {
    const vehicleRows = await supabaseRest<VehicleRow[]>(
      "vehicles",
      "GET",
      null,
      `business_id=eq.${businessId}&order=created_at.desc&select=id,customer_id,brand,model,plate`,
    );
    vehicles = (vehicleRows as VehicleRow[] | null) ?? [];
  } catch {
    vehicles = [];
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
            href={`/crm/calendar?month=${result.previousMonth}`}
            className="rounded-xl border border-white/10 px-4 py-3 text-xs text-white/60"
          >
            ← Mois précédent
          </Link>
          <Link
            href={`/crm/calendar?month=${result.nextMonth}`}
            className="rounded-xl border border-white/10 px-4 py-3 text-xs text-white/60"
          >
            Mois suivant →
          </Link>
          <Link
            href={`/crm/calendar?month=${selectedMonth}&new=1`}
            className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100"
          >
            + Ajouter au planning
          </Link>
        </div>
      </header>

      {eventCreated && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">
          Événement ajouté au calendrier.
        </div>
      )}
      {leadCreated && (
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] px-4 py-3 text-sm text-cyan-100">
          Le lead commercial associé a été ajouté au pipeline.
        </div>
      )}
      {leadError && (
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-sm text-amber-100">
          L’événement planning a été créé, mais son lead n&apos;a pas pu être ajouté au pipeline.
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
          Le stockage des événements de planning est temporairement indisponible.
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
                {formEvent ? "Modifier l’événement planning" : "Nouvel événement planning"}
              </h2>
              <p className="mt-2 text-xs text-white/35">
                Un événement planning peut préparer le travail commercial et alimenter le pipeline. Le rendez-vous opérationnel, lui, naît du flux Job → Appointment.
              </p>
            </div>
            <Link
              href={`/crm/calendar?month=${selectedMonth}`}
              className="text-xs text-white/35 hover:text-white"
            >
              Fermer ×
            </Link>
          </div>

          <form
            action={formEvent ? updateCalendarEvent : createCalendarEvent}
            className="mt-6 grid gap-4 md:grid-cols-2"
          >
            {formEvent ? (
              <input type="hidden" name="eventId" value={formEvent.id} />
            ) : (
              <input
                type="hidden"
                name="idempotencyKey"
                value={randomUUID()}
              />
            )}

            <label className="text-xs text-white/45">
              Client
              <select
                name="customerId"
                defaultValue={formEvent?.customer_id || ""}
                disabled={Boolean(formEvent?.lead_id)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <option value="">Sans client</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name}
                  </option>
                ))}
              </select>
              {formEvent?.lead_id && formEvent.customer_id && (
                <input
                  type="hidden"
                  name="customerId"
                  value={formEvent.customer_id}
                />
              )}
            </label>

            {!formEvent && (
              <details className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 md:col-span-2">
                <summary className="cursor-pointer text-sm font-semibold text-cyan-100">
                  + Créer un nouveau client rapidement
                </summary>
                <p className="mt-2 text-xs text-white/35">
                  Si aucun client existant n'est sélectionné, le CRM créera ce client en même temps que le rendez-vous.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input
                    name="newClientName"
                    placeholder="Nom complet"
                    className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
                  />
                  <input
                    name="newClientPhone"
                    placeholder="Téléphone"
                    className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
                  />
                  <input
                    name="newClientEmail"
                    type="email"
                    placeholder="Email"
                    className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
                  />
                  <input
                    name="newClientCity"
                    placeholder="Ville"
                    className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
                  />
                </div>
              </details>
            )}

            <label className="text-xs text-white/45">
              Véhicule possédé
              <select
                name="vehicleId"
                defaultValue={formEvent?.vehicle_id || ""}
                disabled={Boolean(formEvent?.lead_id)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-45"
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
              {formEvent?.lead_id && formEvent.vehicle_id && (
                <input
                  type="hidden"
                  name="vehicleId"
                  value={formEvent.vehicle_id}
                />
              )}
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
                readOnly={Boolean(formEvent?.lead_id)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 read-only:cursor-not-allowed read-only:opacity-45"
              />
            </label>

            <label className="text-xs text-white/45">
              Prix de la prestation (€)
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={formEvent?.price ?? ""}
                placeholder="Ex. 99"
                readOnly={Boolean(formEvent?.lead_id)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 read-only:cursor-not-allowed read-only:opacity-45"
              />
              <span className="mt-1 block text-[10px] text-white/25">
                {formEvent?.lead_id
                  ? "Prix verrouillé : le lead Pipeline associé reste la source commerciale."
                  : "Ce montant sera repris dans le lead créé dans le pipeline."}
              </span>
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

            {formEvent?.lead_id && (
              <div className="rounded-xl border border-[#d8b477]/20 bg-[#d8b477]/[0.05] px-4 py-3 text-xs leading-5 text-[#f0ce91]/80 md:col-span-2">
                Cet événement est lié au Pipeline. Client, véhicule, prestation et prix sont verrouillés ici pour éviter toute divergence commerciale. Le titre, la date, l’heure et les notes restent modifiables.
              </div>
            )}

            <button className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 md:col-span-2">
              {formEvent ? "Enregistrer les modifications" : "Ajouter au calendrier"}
            </button>
          </form>

          {formEvent && (
            <form action={deleteCalendarEvent} className="mt-3">
              <input type="hidden" name="eventId" value={formEvent.id} />
              <input type="hidden" name="month" value={selectedMonth} />
              <button className="rounded-xl border border-red-300/15 px-4 py-2.5 text-xs text-red-100/60 hover:border-red-300/30 hover:text-red-100">
                Supprimer cet événement planning
              </button>
              {formEvent.lead_id && (
                <p className="mt-2 text-[10px] leading-5 text-white/30">
                  Le lead Pipeline associé ne sera pas supprimé.
                </p>
              )}
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
                className={`min-h-28 border-b border-r border-white/6 p-2 md:min-h-40 ${today ? "bg-[#d8b477]/[0.035]" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs ${today ? "font-bold text-[#f0ce91]" : "text-white/45"}`}
                  >
                    {n}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {count > 0 && (
                      <span className="rounded-full border border-white/8 px-1.5 py-0.5 text-[8px] text-white/35">
                        {count}
                      </span>
                    )}

                    <Link
                      href={`/crm/calendar?month=${selectedMonth}&new=1&day=${dateKey}`}
                      className="flex h-5 w-5 items-center justify-center rounded-md border border-cyan-300/10 text-[11px] text-cyan-100/45 transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.06] hover:text-cyan-50"
                      title={`Ajouter un événement planning le ${dateKey}`}
                      aria-label={`Ajouter un événement planning le ${dateKey}`}
                    >
                      +
                    </Link>
                  </div>
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

      <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-xs leading-5 text-white/45 md:grid-cols-2">
        <div>
          <span className="font-semibold text-[#f0ce91]">Opérationnel</span>
          <span className="text-white/30"> · </span>
          Job + Appointment canonique. Consultation depuis le calendrier, gestion depuis la prestation.
        </div>
        <div>
          <span className="font-semibold text-cyan-100">Planning commercial</span>
          <span className="text-white/30"> · </span>
          Événement préparatoire modifiable, avec Client 360 et Pipeline lorsqu&apos;ils sont liés.
        </div>
      </div>
    </div>
  );
}
