import "server-only";

import { supabaseRest } from "./supabase";

export type HistoricalCalendarEntry = {
  id: string;
  leadId: string;
  customerId: string;
  vehicleId: string | null;
  serviceName: string;
  price: number | null;
  eventDate: string;
  eventTime: string;
  status: "CONFIRMED" | "COMPLETED";
};

type LeadRow = {
  id: string;
  customer_id: string;
  vehicle_id: string | null;
  lifecycle_status: string;
  created_at: string;
};

type ServiceRow = {
  lead_id: string;
  service_name: string | null;
  base_price: number | null;
  created_at: string | null;
};

type JobRow = {
  lead_id: string | null;
};

type CustomEventRow = {
  lead_id: string | null;
};

function parisParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map = new Map(parts.map((part) => [part.type, part.value]));
  const year = map.get("year");
  const month = map.get("month");
  const day = map.get("day");
  const hour = map.get("hour");
  const minute = map.get("minute");

  if (!year || !month || !day || !hour || !minute) return null;

  return {
    monthKey: `${year}-${month}`,
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

export async function getHistoricalCalendarEntries(
  businessId: string,
  month: string,
): Promise<HistoricalCalendarEntry[]> {
  const leadsRaw = await supabaseRest<LeadRow[]>(
    "leads",
    "GET",
    null,
    `business_id=eq.${businessId}&lifecycle_status=neq.CLOSED_LOST&order=created_at.desc&limit=5000&select=id,customer_id,vehicle_id,lifecycle_status,created_at`,
  );

  const leads = ((leadsRaw as LeadRow[] | null) ?? []).filter((lead) => {
    const parts = parisParts(lead.created_at);
    return Boolean(parts && parts.monthKey === month && lead.customer_id);
  });

  if (!leads.length) return [];

  const leadIds = leads.map((lead) => lead.id);
  const inFilter = leadIds.join(",");

  const [servicesRaw, jobsRaw, customRaw] = await Promise.all([
    supabaseRest<ServiceRow[]>(
      "lead_services",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=in.(${inFilter})&order=created_at.desc&limit=5000&select=lead_id,service_name,base_price,created_at`,
    ),
    supabaseRest<JobRow[]>(
      "jobs",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=in.(${inFilter})&limit=5000&select=lead_id`,
    ),
    supabaseRest<CustomEventRow[]>(
      "crm_calendar_events",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=in.(${inFilter})&limit=5000&select=lead_id`,
    ),
  ]);

  const services = (servicesRaw as ServiceRow[] | null) ?? [];
  const jobs = (jobsRaw as JobRow[] | null) ?? [];
  const customs = (customRaw as CustomEventRow[] | null) ?? [];

  const serviceByLead = new Map<string, ServiceRow>();
  for (const service of services) {
    if (!serviceByLead.has(service.lead_id)) {
      serviceByLead.set(service.lead_id, service);
    }
  }

  const leadsWithJob = new Set(
    jobs.map((job) => job.lead_id).filter((value): value is string => Boolean(value)),
  );
  const leadsWithCustomEvent = new Set(
    customs.map((event) => event.lead_id).filter((value): value is string => Boolean(value)),
  );

  return leads
    .filter((lead) => !leadsWithJob.has(lead.id) && !leadsWithCustomEvent.has(lead.id))
    .map((lead) => {
      const when = parisParts(lead.created_at);
      const service = serviceByLead.get(lead.id);
      if (!when) return null;

      return {
        id: `historical-${lead.id}`,
        leadId: lead.id,
        customerId: lead.customer_id,
        vehicleId: lead.vehicle_id,
        serviceName: service?.service_name?.trim() || "Prestation AUTO 9",
        price:
          typeof service?.base_price === "number" && Number.isFinite(service.base_price)
            ? service.base_price
            : null,
        eventDate: when.date,
        eventTime: when.time,
        status: ["COMPLETED", "REVIEW_REQUESTED"].includes(lead.lifecycle_status)
          ? "COMPLETED"
          : "CONFIRMED",
      } satisfies HistoricalCalendarEntry;
    })
    .filter((entry): entry is HistoricalCalendarEntry => Boolean(entry));
}
