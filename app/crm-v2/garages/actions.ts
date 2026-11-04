"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";
import {
  GARAGE_EVENT_ADDED, GARAGE_EVENT_ASSIGN,
  readGaragePartners, type GarageEventRow,
} from "./data";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const home = "/crm-v2/garages";

export async function addGaragePartner(formData: FormData) {
  await requireCrmAccess();
  const name = String(formData.get("name") || "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) redirect(home + "?error=invalid");
  const { businessId } = await resolveCurrentBusinessContext();
  try {
    const events = await supabaseRest<GarageEventRow[]>(
      "activity_log", "GET", null,
      `business_id=eq.${businessId}&event_type=eq.${GARAGE_EVENT_ADDED}&order=created_at.desc&limit=5000&select=id,lead_id,event_type,event_data,created_at`,
    );
    const partners = readGaragePartners((events as GarageEventRow[] | null) ?? []);
    if (partners.some((partner) => partner.name.toLocaleLowerCase("fr-FR") === name.toLocaleLowerCase("fr-FR"))) {
      redirect(home + "?error=duplicate");
    }
    const key = crypto.randomUUID();
    const created = await supabaseRest<{ id: string }>("activity_log", "POST", {
      business_id: businessId,
      event_type: GARAGE_EVENT_ADDED,
      event_data: { garage_key: key, name },
    }, "select=id");
    if (!created || Array.isArray(created) || !created.id) throw new Error("Garage event not saved");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("CRM V3 garage creation failed", error);
    redirect(home + "?error=unavailable");
  }
  revalidatePath(home);
  redirect(home + "?added=1");
}

export async function assignGarageLead(formData: FormData) {
  await requireCrmAccess();
  const leadId = String(formData.get("leadId") || "").trim();
  const garageKey = String(formData.get("garageKey") ?? "").trim();
  if (!UUID.test(leadId) || (garageKey && !/^[a-z0-9-]{3,64}$/.test(garageKey))) {
    redirect(home + "?error=invalid");
  }
  const { businessId } = await resolveCurrentBusinessContext();
  try {
    const [leads, events] = await Promise.all([
      supabaseRest<Array<{ id: string; customer_id: string }>>(
        "leads", "GET", null,
        `business_id=eq.${businessId}&id=eq.${leadId}&limit=1&select=id,customer_id`,
      ),
      supabaseRest<GarageEventRow[]>(
        "activity_log", "GET", null,
        `business_id=eq.${businessId}&event_type=eq.${GARAGE_EVENT_ADDED}&order=created_at.desc&limit=5000&select=id,lead_id,event_type,event_data,created_at`,
      ),
    ]);
    const lead = (leads as Array<{ id: string; customer_id: string }> | null)?.[0];
    if (!lead) redirect(home + "?error=not_found");
    const partners = readGaragePartners((events as GarageEventRow[] | null) ?? []);
    if (garageKey && !partners.some((partner) => partner.key === garageKey)) {
      redirect(home + "?error=invalid");
    }

    const created = await supabaseRest<{ id: string }>("activity_log", "POST", {
      business_id: businessId,
      lead_id: leadId,
      customer_id: lead.customer_id,
      event_type: GARAGE_EVENT_ASSIGN,
      event_data: { garage_key: garageKey || null, source: "crm_v3_garages" },
    }, "select=id");
    if (!created || Array.isArray(created) || !created.id) throw new Error("Garage assignment not saved");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("CRM V3 garage assignment failed", error);
    redirect(home + "?error=unavailable");
  }
  revalidatePath(home);
  revalidatePath("/crm-v2");
  redirect(home + "?assigned=1");
}
