"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../lib/auth/dal";
import {
  recordJobPayment, updateCustomerProfile,
  updateDraftQuoteAmount, type Payment, type UpdateDraftQuoteAmountResult,
} from "../../lib/crm";
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
  let customerId = "";

  try {
    const rows = await supabaseRest<Array<{
      id: string;
      customer_id: string;
      lifecycle_status: string;
    }>>(
      "leads",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${leadId}&select=id,customer_id,lifecycle_status&limit=1`,
    );

    const lead = (rows as Array<{
      id: string;
      customer_id: string;
      lifecycle_status: string;
    }> | null)?.[0];

    if (!lead) {
      redirect("/crm-v2/pipeline?lead_error=invalid");
    }

    customerId = lead.customer_id;

    if (lead.lifecycle_status !== "CLOSED_LOST") {
      // Remove any V2 calendar event linked to this request so an
      // cancelled customer request no longer appears in the planning.
      try {
        await supabaseRest(
          "crm_calendar_events",
          "DELETE",
          null,
          `business_id=eq.${businessId}&lead_id=eq.${leadId}`,
        );
      } catch {
        // Calendar storage may not exist on older environments. Cancellation
        // of the customer request must remain possible in that case.
      }

      await supabaseRest(
        "leads",
        "PATCH",
        {
          lifecycle_status: "CLOSED_LOST",
          updated_at: new Date().toISOString(),
        },
        `business_id=eq.${businessId}&id=eq.${leadId}`,
      );

      await supabaseRest(
        "activity_log",
        "POST",
        {
          business_id: businessId,
          customer_id: customerId,
          lead_id: leadId,
          event_type: "lead.status_changed",
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
  revalidatePath("/crm-v2/calendar");
  revalidatePath("/crm");
  revalidatePath("/crm/pipeline");
  revalidatePath(`/crm/pipeline/${leadId}`);
  if (customerId) {
    revalidatePath(`/crm/clients/${customerId}`);
    revalidatePath(`/crm-v2/clients/${customerId}`);
  }
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


// Profile-only save: service, notes and financial records are not editable here.
export async function updateV2LeadDetails(formData: FormData) {
  await requireCrmAccess();

  const leadId = String(formData.get("leadId") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const city = String(formData.get("city") || "").trim();
  if (!UUID_REGEX.test(leadId) || !fullName) {
    redirect("/crm-v2/pipeline?edit_error=invalid");
  }

  const { businessId } = await resolveCurrentBusinessContext();
  let customerId: string;
  try {
    const rows = await supabaseRest<Array<{ customer_id: string }>>(
      "leads", "GET", null,
      `business_id=eq.${businessId}&id=eq.${leadId}&select=customer_id&limit=1`,
    );
    const lead = (rows as Array<{ customer_id: string }> | null)?.[0];
    if (!lead) redirect("/crm-v2/pipeline?edit_error=not_found");
    customerId = lead.customer_id;
    const parts = fullName.split(/\s+/).filter(Boolean);
    await updateCustomerProfile({
      customerId, fullName,
      firstName: parts[0] || null,
      lastName: parts.slice(1).join(" ") || null,
      email: email || null, phone: phone || null, city: city || null,
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/crm-v2/pipeline?edit_error=unavailable");
  }

  // A shared customer profile appears in every dossier and job for that customer.
  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/clients");
  revalidatePath(`/crm-v2/clients/${customerId}`);
  revalidatePath("/crm");
  revalidatePath("/crm/clients");
  revalidatePath(`/crm/clients/${customerId}`);
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm/pipeline/[leadId]", "page");
  revalidatePath("/crm/jobs");
  revalidatePath("/crm/jobs/[jobId]", "page");
  redirect("/crm-v2/pipeline?edit_updated=1");
}

export async function updateV2DraftPrice(formData: FormData) {
  await requireCrmAccess();

  const quoteId = String(formData.get("quoteId") || "").trim();
  const rawPrice = String(formData.get("price") || "").trim().replace(",", ".");
  const rawExpected = formData.get("expectedPrice");
  const expected = typeof rawExpected === "string" ? rawExpected.trim() : "";
  const totalPrice = Number(rawPrice);
  // Explicit null represents a displayed legacy quote with no amount. Missing
  // expectedPrice must not silently become null and bypass the form contract.
  const expectedTotalPrice = expected === "null" ? null : Number(expected);
  const amountPattern = /^\d+(?:\.\d{1,2})?$/;
  if (
    !UUID_REGEX.test(quoteId) || !amountPattern.test(rawPrice) ||
    !Number.isFinite(totalPrice) || totalPrice <= 0 || totalPrice > 10000000 ||
    (expected !== "null" && (
      !expected || !Number.isFinite(expectedTotalPrice) ||
      expectedTotalPrice === null || expectedTotalPrice < 0 || expectedTotalPrice > 10000000
    ))
  ) {
    redirect("/crm-v2/pipeline?price_error=invalid_amount");
  }

  let result: UpdateDraftQuoteAmountResult;
  try {
    result = await updateDraftQuoteAmount({ quoteId, expectedTotalPrice, totalPrice });
  } catch {
    redirect("/crm-v2/pipeline?price_error=unavailable");
  }
  if (result.status !== "updated" && result.status !== "no_op") {
    redirect(`/crm-v2/pipeline?price_error=${result.status}`);
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
  revalidatePath("/crm-v2/clients");
  revalidatePath("/crm");
  revalidatePath("/crm/pipeline");
  if (result.leadId) revalidatePath(`/crm/pipeline/${result.leadId}`);
  // The RPC returns the lead, not the customer ID. Invalidate the two Customer
  // 360 page patterns without adding a fallible read after a committed mutation.
  revalidatePath("/crm/clients/[customerId]", "page");
  revalidatePath("/crm-v2/clients/[customerId]", "page");
  redirect("/crm-v2/pipeline?price_updated=1");
}
