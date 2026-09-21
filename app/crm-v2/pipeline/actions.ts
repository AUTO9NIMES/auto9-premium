"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../lib/auth/dal";
import { recordJobPayment, transitionLeadStatus, type Payment } from "../../lib/crm";
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
  if (!UUID_REGEX.test(leadId)) {
    redirect("/crm-v2/pipeline?lead_error=invalid");
  }

  try {
    await transitionLeadStatus({
      leadId,
      targetStatus: "CLOSED_LOST",
      source: "crm_v2_cancel",
    });
  } catch {
    redirect("/crm-v2/pipeline?lead_error=unavailable");
  }

  revalidatePath("/crm-v2");
  revalidatePath("/crm-v2/pipeline");
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
