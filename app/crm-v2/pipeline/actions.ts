"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../lib/auth/dal";
import { recordJobPayment, updateCustomerProfile, type Payment } from "../../lib/crm";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";

const allowedMethods = new Set<Payment["method"]>(["CASH", "CARD", "BANK_TRANSFER"]);

export async function recordV2Payment(formData: FormData) {
  await requireCrmAccess();

  const jobId = String(formData.get("jobId") || "").trim();
  const method = String(formData.get("method") || "").trim() as Payment["method"];

  if (!jobId || !allowedMethods.has(method)) {
    redirect("/crm-v2/pipeline?payment_error=invalid");
  }

  try {
    await recordJobPayment({
      idempotencyKey: crypto.randomUUID(),
      jobId,
      method,
    });
  } catch {
    redirect("/crm-v2/pipeline?payment_error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm/jobs");
  redirect("/crm-v2/pipeline?payment=recorded");
}


const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function cancelV2Lead(formData: FormData) {
  await requireCrmAccess();

  const leadId = String(formData.get("leadId") || "").trim();
  const comment = String(formData.get("comment") || "").trim().slice(0, 1000);

  if (!UUID_REGEX.test(leadId)) {
    redirect("/crm-v2/pipeline?lead_error=invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  try {
    const rows = await supabaseRest<{
      id: string;
      customer_id: string;
      lifecycle_status: string;
    }>(
      "leads",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${leadId}&select=id,customer_id,lifecycle_status&limit=1`,
    );

    const lead = Array.isArray(rows) ? rows[0] : rows;

    if (!lead) {
      redirect("/crm-v2/pipeline?lead_error=invalid");
    }

    if (lead.lifecycle_status !== "CLOSED_LOST") {
      await supabaseRest<Record<string, unknown>>(
        "leads",
        "PATCH",
        {
          lifecycle_status: "CLOSED_LOST",
          updated_at: new Date().toISOString(),
        },
        `business_id=eq.${businessId}&id=eq.${leadId}`,
      );

      await supabaseRest<Record<string, unknown>>(
        "activity_log",
        "POST",
        {
          business_id: businessId,
          customer_id: lead.customer_id,
          lead_id: leadId,
          event_type: "lead.cancelled",
          event_data: {
            source: "crm_v2",
            previous_status: lead.lifecycle_status,
            new_status: "CLOSED_LOST",
            comment: comment || null,
          },
        },
        "select=id",
      );
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    redirect("/crm-v2/pipeline?lead_error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/clients");
  revalidatePath("/crm/pipeline");
  redirect("/crm-v2/pipeline?lead_cancelled=1");
}

export async function deleteV2Lead(formData: FormData) {
  await requireCrmAccess();

  const leadId = String(formData.get("leadId") || "").trim();
  if (!UUID_REGEX.test(leadId)) {
    redirect("/crm-v2/pipeline?lead_error=invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  try {
    const jobs = await supabaseRest<Array<{ id: string }>>(
      "jobs",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=eq.${leadId}&select=id&limit=1`,
    );

    if ((jobs as Array<{ id: string }> | null)?.length) {
      redirect("/crm-v2/pipeline?lead_error=linked");
    }

    await supabaseRest(
      "leads",
      "DELETE",
      null,
      `business_id=eq.${businessId}&id=eq.${leadId}`,
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/crm-v2/pipeline?lead_error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm/pipeline");
  redirect("/crm-v2/pipeline?lead_deleted=1");
}


const MANUAL_STEPS = [
  "CONTACTED",
  "QUOTE_SENT",
  "BOOKED",
  "IN_PROGRESS",
  "COMPLETED",
  "REVIEW_REQUESTED",
] as const;

type ManualStepKey = (typeof MANUAL_STEPS)[number];

function isManualStepKey(value: string): value is ManualStepKey {
  return MANUAL_STEPS.includes(value as ManualStepKey);
}

export async function toggleV2LeadStep(formData: FormData) {
  await requireCrmAccess();

  const leadId = String(formData.get("leadId") || "").trim();
  const stepKey = String(formData.get("stepKey") || "").trim();
  const nextDone = String(formData.get("nextDone") || "") === "1";

  if (!UUID_REGEX.test(leadId) || !isManualStepKey(stepKey)) {
    redirect("/crm-v2/pipeline?step_error=invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  try {
    const leadRows = await supabaseRest<Array<{ id: string; customer_id: string }>>(
      "leads",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${leadId}&select=id,customer_id&limit=1`,
    );
    const lead = (leadRows as Array<{ id: string; customer_id: string }> | null)?.[0];
    if (!lead) redirect("/crm-v2/pipeline?step_error=invalid");

    const targetIndex = MANUAL_STEPS.indexOf(stepKey);
    const affected = nextDone
      ? MANUAL_STEPS.slice(0, targetIndex + 1)
      : MANUAL_STEPS.slice(targetIndex);

    for (const key of affected) {
      await supabaseRest(
        "activity_log",
        "POST",
        {
          business_id: businessId,
          customer_id: lead.customer_id,
          lead_id: leadId,
          event_type: nextDone ? "crm_v2.step.completed" : "crm_v2.step.reopened",
          event_data: {
            step_key: key,
            source: "crm_v2_pipeline",
          },
        },
        "select=id",
      );
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/crm-v2/pipeline?step_error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  redirect("/crm-v2/pipeline?step_updated=1");
}


export async function updateV2LeadDetails(formData: FormData) {
  await requireCrmAccess();

  const leadId = String(formData.get("leadId") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const serviceName = String(formData.get("serviceName") || "").trim();
  const note = String(formData.get("note") || "").trim().slice(0, 2000);
  const priceRaw = String(formData.get("price") || "").trim();
  const price = priceRaw ? Number(priceRaw.replace(",", ".")) : null;

  if (
    !UUID_REGEX.test(leadId) ||
    !fullName ||
    !serviceName ||
    (price !== null && (!Number.isFinite(price) || price < 0))
  ) {
    redirect("/crm-v2/pipeline?edit_error=invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  try {
    const leadRows = await supabaseRest<Array<{
      id: string;
      customer_id: string;
      notes: string | null;
    }>>(
      "leads",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${leadId}&select=id,customer_id,notes&limit=1`,
    );
    const lead = (leadRows as Array<{
      id: string;
      customer_id: string;
      notes: string | null;
    }> | null)?.[0];

    if (!lead) {
      redirect("/crm-v2/pipeline?edit_error=invalid");
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    await updateCustomerProfile({
      customerId: lead.customer_id,
      fullName,
      firstName: parts[0] || null,
      lastName: parts.slice(1).join(" ") || null,
      email: email || null,
      phone: phone || null,
      city: city || null,
    });

    await supabaseRest(
      "leads",
      "PATCH",
      {
        notes: note || null,
        updated_at: new Date().toISOString(),
      },
      `business_id=eq.${businessId}&id=eq.${leadId}`,
    );

    const serviceRows = await supabaseRest<Array<{ id: string }>>(
      "lead_services",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=eq.${leadId}&order=created_at.desc&select=id&limit=1`,
    );
    const serviceId = (serviceRows as Array<{ id: string }> | null)?.[0]?.id;

    if (serviceId) {
      await supabaseRest(
        "lead_services",
        "PATCH",
        {
          service_name: serviceName,
          base_price: price,
          customer_comment: note || null,
          updated_at: new Date().toISOString(),
        },
        `business_id=eq.${businessId}&id=eq.${serviceId}`,
      );
    }

    const quoteRows = await supabaseRest<Array<{
      id: string;
      payload_json: Record<string, unknown> | null;
    }>>(
      "quotes",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=eq.${leadId}&order=quote_version.desc&select=id,payload_json&limit=1`,
    );
    const quote = (quoteRows as Array<{
      id: string;
      payload_json: Record<string, unknown> | null;
    }> | null)?.[0];

    if (quote) {
      await supabaseRest(
        "quotes",
        "PATCH",
        {
          total_price: price,
          payload_json: {
            ...(quote.payload_json || {}),
            serviceName,
          },
          updated_at: new Date().toISOString(),
        },
        `business_id=eq.${businessId}&id=eq.${quote.id}`,
      );
    }

    const jobRows = await supabaseRest<Array<{ id: string; status: string }>>(
      "jobs",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=eq.${leadId}&order=created_at.desc&select=id,status&limit=1`,
    );
    const job = (jobRows as Array<{ id: string; status: string }> | null)?.[0];

    if (job && job.status !== "PAID") {
      await supabaseRest(
        "jobs",
        "PATCH",
        {
          title: serviceName,
          total_amount: price,
          notes: note || null,
          updated_at: new Date().toISOString(),
        },
        `business_id=eq.${businessId}&id=eq.${job.id}`,
      );
    }

    await supabaseRest(
      "activity_log",
      "POST",
      {
        business_id: businessId,
        customer_id: lead.customer_id,
        lead_id: leadId,
        event_type: "lead.details_updated",
        event_data: {
          source: "crm_v2",
          service_name: serviceName,
          price,
          note: note || null,
        },
      },
      "select=id",
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/crm-v2/pipeline?edit_error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/clients");
  redirect("/crm-v2/pipeline?edit_updated=1");
}
