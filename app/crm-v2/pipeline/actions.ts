"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCrmAccess } from "../../lib/auth/dal";
import { recordJobPayment, type Payment } from "../../lib/crm";

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
