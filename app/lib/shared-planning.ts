import { TIME_TO_DEFINE_NOTE } from "../crm-v2/calendar/quick-add";
import { parisDateKey } from "./paris-business-calendar";
import { supabaseRest } from "./supabase";

const pageSize = 250;
const parisOffset = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  timeZoneName: "longOffset",
});
const parisTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type Appointment = {
  id: string;
  lead_id: string | null;
  scheduled_at: string;
  updated_at: string;
};
type ManualEvent = {
  id: string;
  lead_id: string | null;
  event_date: string;
  event_time: string;
  service_name: string | null;
  notes: string | null;
  updated_at: string;
};
type Service = { lead_id: string; service_name: string | null };
export type PlanningEntry = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  startsAt: string | null;
  updatedAt: string;
};

function localMidnight(day: string) {
  const midnight = Date.parse(day + "T00:00:00Z");
  const offset = parisOffset.formatToParts(midnight - 2 * 3_600_000)
    .find(part => part.type === "timeZoneName")!.value.slice(3);
  return day + "T00:00:00" + offset;
}

async function loadPages<T>(table: string, query: URLSearchParams, paginate: boolean) {
  const result: T[] = [];
  if (!paginate) query.set("limit", String(pageSize + 1));
  for (let offset = 0; ; offset += pageSize) {
    query.set("offset", String(offset));
    const rows = await supabaseRest<T>(table, "GET", null, query.toString());
    if (!Array.isArray(rows) || (!paginate && rows.length > pageSize)) {
      throw new Error("Planning unavailable");
    }
    result.push(...rows);
    if (!paginate || rows.length < pageSize) return result;
  }
}

function serviceTitle(value?: string | null) {
  return value?.trim().slice(0, 160) || "Rendez-vous AUTO 9";
}

async function serviceNames(businessId: string, appointments: Appointment[]) {
  const leads = [...new Set(appointments.flatMap(item => item.lead_id ? [item.lead_id] : []))];
  const names = new Map<string, string>();
  for (let offset = 0; offset < leads.length; offset += 50) {
    const batch = leads.slice(offset, offset + 50);
    const query = new URLSearchParams({
      business_id: "eq." + businessId,
      lead_id: "in.(" + batch.join(",") + ")",
      order: "created_at.asc,id.asc",
      select: "lead_id,service_name",
    });
    const services = await supabaseRest<Service>("lead_services", "GET", null, query.toString());
    if (!Array.isArray(services)) throw new Error("Planning unavailable");
    for (const item of services) {
      const name = item.service_name?.trim();
      if (name && !names.has(item.lead_id)) names.set(item.lead_id, name);
    }
  }
  return names;
}

export async function loadSharedPlanning(businessId: string, from: string, to: string, paginate = false) {
  const scope = {
    business_id: "eq." + businessId,
    status: "neq.CANCELLED",
    limit: String(pageSize),
  };
  const appointmentsQuery = new URLSearchParams({
    ...scope,
    scheduled_at: "gte." + localMidnight(from),
    order: "scheduled_at.asc,id.asc",
    select: "id,lead_id,scheduled_at,updated_at",
  });
  appointmentsQuery.append("scheduled_at", "lt." + localMidnight(to));
  const manualQuery = new URLSearchParams({
    ...scope,
    event_date: "gte." + from,
    order: "event_date.asc,event_time.asc,id.asc",
    select: "id,lead_id,event_date,event_time,service_name,notes,updated_at",
  });
  manualQuery.append("event_date", "lt." + to);
  const [appointments, manual] = await Promise.all([
    loadPages<Appointment>("appointments", appointmentsQuery, paginate),
    loadPages<ManualEvent>("crm_calendar_events", manualQuery, paginate),
  ]);

  const names = await serviceNames(businessId, appointments);
  const appointmentsByLeadAndTime = new Set<string>();
  const entries: PlanningEntry[] = appointments.map(item => {
    const date = parisDateKey(item.scheduled_at);
    const time = parisTime.format(new Date(item.scheduled_at));
    if (item.lead_id) appointmentsByLeadAndTime.add([item.lead_id, date, time].join(":"));
    return { id: "appointment:" + item.id, title: serviceTitle(names.get(item.lead_id ?? "")), date, time, startsAt: item.scheduled_at, updatedAt: item.updated_at };
  });
  for (const item of manual) {
    const time = item.notes?.startsWith(TIME_TO_DEFINE_NOTE) ? null : item.event_time.slice(0, 5);
    if (item.lead_id && time && appointmentsByLeadAndTime.has([item.lead_id, item.event_date, time].join(":"))) {
      continue;
    }
    entries.push({ id: "calendar:" + item.id, title: serviceTitle(item.service_name), date: item.event_date, time, startsAt: null, updatedAt: item.updated_at });
  }
  return entries;
}
