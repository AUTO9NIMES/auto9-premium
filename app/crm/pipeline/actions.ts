"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CrmAccessError,
  requireCrmAccess,
} from "../../lib/auth/dal";
import {
  transitionLeadStatus,
  type LeadLifecycleStatus,
} from "../../lib/crm";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const manualTargetStatuses = new Set<LeadLifecycleStatus>([
  "QUALIFIED",
  "CONTACTED",
  "QUOTE_SENT",
  "CLOSED_LOST",
]);

function redirectWithError(error: "invalid" | "access" | "unavailable"): never {
  redirect(`/crm/pipeline?error=${error}`);
}

export async function transitionPipelineLead(formData: FormData) {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirectWithError("access");
    }
    redirectWithError("unavailable");
  }

  const leadId = formData.get("leadId");
  const targetStatus = formData.get("targetStatus");

  if (
    typeof leadId !== "string" ||
    !UUID_REGEX.test(leadId.trim()) ||
    typeof targetStatus !== "string" ||
    !manualTargetStatuses.has(targetStatus as LeadLifecycleStatus)
  ) {
    redirectWithError("invalid");
  }

  try {
    await transitionLeadStatus({
      leadId: leadId.trim(),
      targetStatus: targetStatus as LeadLifecycleStatus,
      source: "crm_pipeline_ui",
    });
  } catch {
    redirectWithError("unavailable");
  }

  revalidatePath("/crm/pipeline");
  redirect("/crm/pipeline?updated=1");
}
