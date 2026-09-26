import { resolveCurrentBusinessContext } from "./business";
import { hasSupabaseWriteConfig, supabaseRest } from "./supabase";

export type LeadServiceEditStatus =
  | "updated"
  | "no_op"
  | "invalid"
  | "not_found"
  | "conflict"
  | "blocked";

export type LeadServiceEditResult = {
  status: LeadServiceEditStatus;
  customerId: string | null;
};

const statuses = new Set<LeadServiceEditStatus>([
  "updated", "no_op", "invalid", "not_found", "conflict", "blocked",
]);

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function updateLeadServiceDetails(input: {
  leadId: string;
  serviceId: string;
  expectedServiceName: string;
  expectedUpdatedAt: string;
  serviceName: string;
}): Promise<LeadServiceEditResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const { businessId } = await resolveCurrentBusinessContext();

  const response = await supabaseRest<unknown>(
    "rpc/update_lead_service_details",
    "POST",
    {
      p_business_id: businessId,
      p_lead_id: input.leadId,
      p_service_id: input.serviceId,
      p_expected_service_name: input.expectedServiceName,
      p_expected_updated_at: input.expectedUpdatedAt,
      p_service_name: input.serviceName,
      p_source: "crm_pipeline_ui",
    },
  );

  if (!record(response) || !statuses.has(response.status as LeadServiceEditStatus)) {
    throw new Error("Invalid service-edit RPC response.");
  }

  const status = response.status as LeadServiceEditStatus;

  if (status === "updated" || status === "no_op") {
    if (
      typeof response.customer_id !== "string" ||
      !record(response.service) ||
      response.service.id !== input.serviceId ||
      response.service.business_id !== businessId ||
      response.service.lead_id !== input.leadId
    ) {
      throw new Error("Service-edit RPC returned inconsistent ownership.");
    }

    if (status === "updated") {
      const activity = response.activity;
      if (!record(activity)) {
        throw new Error("Service-edit RPC did not return its audit event.");
      }
      if (
        typeof activity.id !== "string" ||
        activity.id.trim().length === 0 ||
        activity.business_id !== businessId ||
        activity.lead_id !== input.leadId ||
        activity.customer_id !== response.customer_id ||
        activity.event_type !== "lead.service_updated" ||
        !record(activity.event_data) ||
        activity.event_data.service_id !== input.serviceId ||
        activity.event_data.previous_service_name !== input.expectedServiceName ||
        activity.event_data.new_service_name !== input.serviceName
      ) {
        throw new Error("Service-edit RPC returned an inconsistent audit event.");
      }
    } else if (response.activity !== null) {
      throw new Error("Service-edit RPC returned an audit event for an unchanged service.");
    }
  }

  return {
    status,
    customerId: typeof response.customer_id === "string"
      ? response.customer_id
      : null,
  };
}
