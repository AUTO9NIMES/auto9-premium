import { timingSafeEqual } from "node:crypto";
import { TIME_TO_DEFINE_NOTE } from "../../../../crm-v2/calendar/quick-add";
import { resolveCurrentBusinessContext } from "../../../../lib/business";
import { parisDateKey } from "../../../../lib/paris-business-calendar";
import { hasSupabaseWriteConfig, supabaseRest } from "../../../../lib/supabase";

const headers = { "Cache-Control": "private, no-store" };
const dayMs = 86_400_000;
const maxPerSource = 250;
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
};
type ManualEvent = {
  id: string;
  lead_id: string | null;
  event_date: string;
  event_time: string;
  service_name: string | null;
  notes: string | null;
};
type Service = { lead_id: string; service_name: string | null };
type Entry = { id: string; title: string; date: string; time: string | null };

function monday(value: string | null) {
  if (!value || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value &&
    date.getUTCDay() === 1 ? date : null;
}

function localMidnight(day: Date) {
  const offset = parisOffset.formatToParts(day).find(part => part.type === "timeZoneName")!.value.slice(3);
  return day.toISOString().slice(0, 10) + "T00:00:00" + offset;
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

export async function GET(request: Request) {
  const json = (data: object, status = 200) => Response.json(data, { headers, status });
  const token = process.env.AUTO9_CALENDAR_TOKEN?.trim();
  if (!token) return json({ error: "Service indisponible" }, 503);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from("Bearer " + token);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return json({ error: "Non autorisé" }, 401);
  }

  const from = monday(new URL(request.url).searchParams.get("week"));
  if (!from) return json({ error: "Semaine invalide" }, 400);
  const to = new Date(+from + 7 * dayMs);
  if (!hasSupabaseWriteConfig()) return json({ error: "Service indisponible" }, 503);

  try {
    const { businessId } = await resolveCurrentBusinessContext();
    const scope = {
      business_id: "eq." + businessId,
      status: "neq.CANCELLED",
      limit: String(maxPerSource + 1),
    };
    const appointmentsQuery = new URLSearchParams({
      ...scope,
      scheduled_at: "gte." + localMidnight(from),
      order: "scheduled_at.asc,id.asc",
      select: "id,lead_id,scheduled_at",
    });
    appointmentsQuery.append("scheduled_at", "lt." + localMidnight(to));
    const manualQuery = new URLSearchParams({
      ...scope,
      event_date: "gte." + from.toISOString().slice(0, 10),
      order: "event_date.asc,event_time.asc,id.asc",
      select: "id,lead_id,event_date,event_time,service_name,notes",
    });
    manualQuery.append("event_date", "lt." + to.toISOString().slice(0, 10));
    const [appointments, manual] = await Promise.all([
      supabaseRest<Appointment>("appointments", "GET", null, appointmentsQuery.toString()),
      supabaseRest<ManualEvent>("crm_calendar_events", "GET", null, manualQuery.toString()),
    ]);
    if (!Array.isArray(appointments) || !Array.isArray(manual) ||
      appointments.length > maxPerSource || manual.length > maxPerSource) {
      throw new Error("Planning unavailable");
    }

    const names = await serviceNames(businessId, appointments);
    const appointmentsByLeadAndTime = new Set<string>();
    const entries: Entry[] = appointments.map(item => {
      const date = parisDateKey(item.scheduled_at);
      const time = parisTime.format(new Date(item.scheduled_at));
      if (item.lead_id) appointmentsByLeadAndTime.add([item.lead_id, date, time].join(":"));
      return { id: "appointment:" + item.id, title: serviceTitle(names.get(item.lead_id ?? "")), date, time };
    });
    for (const item of manual) {
      const time = item.notes?.startsWith(TIME_TO_DEFINE_NOTE) ? null : item.event_time.slice(0, 5);
      if (item.lead_id && time && appointmentsByLeadAndTime.has([item.lead_id, item.event_date, time].join(":"))) {
        continue;
      }
      entries.push({ id: "calendar:" + item.id, title: serviceTitle(item.service_name), date: item.event_date, time });
    }
    return json({ entries });
  } catch {
    return json({ error: "Planning indisponible" }, 503);
  }
}
