import "server-only";

export const GARAGE_EVENT_ASSIGN = "crm_v3.garage.lead_assigned";
export const GARAGE_EVENT_ADDED = "crm_v3.garage.partner_added";

export type GaragePartner = { key: string; name: string };

export const INITIAL_GARAGES: GaragePartner[] = [
  { key: "twiice-auto", name: "Twiice Auto" },
  { key: "bolides-et-legendes", name: "Bolides et Légendes" },
];

export type GarageEventRow = {
  id: string;
  lead_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
};

export function readGaragePartners(events: GarageEventRow[]): GaragePartner[] {
  const partners = [...INITIAL_GARAGES];
  const seen = new Set(partners.map((partner) => partner.key));
  for (const event of [...events].reverse()) {
    if (event.event_type !== GARAGE_EVENT_ADDED) continue;
    const key = event.event_data?.garage_key;
    const name = event.event_data?.name;
    if (typeof key !== "string" || typeof name !== "string" ||
        !/^[a-z0-9-]{3,64}$/.test(key) || !name.trim() ||
        name.length > 120 || seen.has(key)) continue;
    partners.push({ key, name: name.trim() });
    seen.add(key);
  }
  return partners;
}

export function readGarageAssignments(events: GarageEventRow[], validKeys: Set<string>) {
  const assignments = new Map<string, string>();
  for (const event of events) {
    if (event.event_type !== GARAGE_EVENT_ASSIGN || !event.lead_id ||
        assignments.has(event.lead_id)) continue;
    const key = event.event_data?.garage_key;
    if (key === null || key === "") {
      assignments.set(event.lead_id, "");
    } else if (typeof key === "string" && validKeys.has(key)) {
      assignments.set(event.lead_id, key);
    }
  }
  return assignments;
}
