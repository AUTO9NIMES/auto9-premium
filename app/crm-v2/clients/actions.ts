"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { upsertCustomer } from "../../lib/crm";
import { supabaseRest } from "../../lib/supabase";

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function createV2Customer(formData: FormData) {
  await requireCrmAccess();

  const fullName = value(formData, "fullName");
  if (!fullName) redirect("/crm-v2/clients?new=1&error=name");

  const parts = fullName.split(/\s+/);
  const firstName = value(formData, "firstName") || parts[0] || "";
  const lastName = value(formData, "lastName") || parts.slice(1).join(" ");

  const customer = await upsertCustomer({
    business_id: "",
    full_name: fullName,
    first_name: firstName || null,
    last_name: lastName || null,
    email: value(formData, "email") || null,
    phone: value(formData, "phone") || null,
    city: value(formData, "city") || null,
    source: "crm_v2_manual",
  });

  if (!customer?.id) redirect("/crm-v2/clients?new=1&error=create");

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/clients");
  redirect("/crm-v2/clients?created=1");
}

export async function deleteV2Customer(formData: FormData) {
  await requireCrmAccess();

  const customerId = value(formData, "customerId");
  if (!customerId) redirect("/crm-v2/clients?error=delete");

  const { businessId } = await resolveCurrentBusinessContext();

  const [leads, jobs] = await Promise.all([
    supabaseRest<Array<{ id: string }>>("leads", "GET", null, `business_id=eq.${businessId}&customer_id=eq.${customerId}&select=id&limit=1`),
    supabaseRest<Array<{ id: string }>>("jobs", "GET", null, `business_id=eq.${businessId}&customer_id=eq.${customerId}&select=id&limit=1`),
  ]);

  if ((Array.isArray(leads) && leads.length) || (Array.isArray(jobs) && jobs.length)) {
    redirect("/crm-v2/clients?error=linked");
  }

  await supabaseRest("customer_identifiers", "DELETE", null, `business_id=eq.${businessId}&customer_id=eq.${customerId}`);
  await supabaseRest("vehicles", "DELETE", null, `business_id=eq.${businessId}&customer_id=eq.${customerId}`);
  await supabaseRest("customers", "DELETE", null, `business_id=eq.${businessId}&id=eq.${customerId}`);

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/clients");
  redirect("/crm-v2/clients?deleted=1");
}
