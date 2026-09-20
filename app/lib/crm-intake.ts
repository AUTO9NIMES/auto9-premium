import { resolveCurrentBusinessContext } from "./business";
import { hasSupabaseWriteConfig, supabaseRest } from "./supabase";

export type WebsiteLeadDraft = {
  submissionId: string;
  websiteSubmissionFingerprint: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCity?: string;
  servicePlace?: string;
  servicePlaceLabel?: string;
  availabilityDateTime?: string;
  formattedAvailabilityDateTime?: string;
  serviceId?: string;
  serviceName?: string;
  vehicleId?: string;
  vehicleName?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  basePrice?: number;
  selectedOptions?: string[];
  selectedPremiumAddons?: Array<{
    id: string;
    name: string;
    price?: number | null;
    label?: string;
  }>;
  totalPrice?: number;
  estimatedTime?: string;
  hasQuoteAddon?: boolean;
  customerComment?: string;
  mainPhotoIndex?: number;
  reservationMessage?: string;
  source?: string;
  sourcePage?: string;
  utmSource?: string;
  utmCampaign?: string;
};

export type WebsiteLeadResult = {
  customerId: string;
  vehicleId: string;
  leadId: string;
  quoteId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function persistWebsiteLead(
  draft: WebsiteLeadDraft,
): Promise<WebsiteLeadResult> {
  const submissionId = (draft.submissionId || "").trim();
  const customerName = (draft.customerName || "").trim();
  const customerPhone = (draft.customerPhone || "").trim();
  const customerEmail = (draft.customerEmail || "").trim();

  // These two existing forms still send a free-form vehicle name.
  // Keep it as the model only; never infer a brand from free-form text or
  // use the pricing category as the configurator's exact vehicle identity.
  const usesLegacyVehicleName =
    draft.source === "website_pro_booking" ||
    draft.source === "website_special_request";
  const legacyVehicleName = usesLegacyVehicleName
    ? (draft.vehicleName || "").trim()
    : "";
  const vehicleBrand = (draft.vehicleBrand || "").trim();
  const vehicleModel = (draft.vehicleModel ?? legacyVehicleName).trim();
  const vehiclePlate = (draft.vehiclePlate || "").trim();

  if (!submissionId || !customerName || !customerPhone) {
    throw new Error(
      "submissionId, customerName and customerPhone are required",
    );
  }

  if (!vehicleModel || (!usesLegacyVehicleName && !vehicleBrand)) {
    throw new Error("vehicleModel is required; vehicleBrand is required outside legacy intake");
  }

  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessContext = await resolveCurrentBusinessContext();

  const result = await supabaseRest<unknown>(
    "rpc/create_website_quote_request",
    "POST",
    {
      p_business_id: businessContext.businessId,
      p_submission_id: submissionId,
      p_submission_fingerprint:
        draft.websiteSubmissionFingerprint,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_email: customerEmail || null,
      p_customer_city: draft.customerCity || null,
      p_source: draft.source || "website",
      p_source_page: draft.sourcePage || "/devis",
      p_utm_source: draft.utmSource || null,
      p_utm_campaign: draft.utmCampaign || null,
      p_customer_comment: draft.customerComment || null,
      p_vehicle_name: draft.vehicleName || null,
      p_vehicle_type: draft.vehicleId || null,
      p_vehicle_brand: vehicleBrand || null,
      p_vehicle_model: vehicleModel,
      p_vehicle_plate: vehiclePlate || null,
      p_service_name: draft.serviceName || "Prestation",
      p_service_slug: draft.serviceId || null,
      p_base_price: draft.basePrice ?? null,
      p_estimated_time: draft.estimatedTime || null,
      p_selected_options: draft.selectedOptions || [],
      p_premium_addons: draft.selectedPremiumAddons || [],
      p_total_price: draft.totalPrice ?? 0,
      p_availability_datetime: draft.availabilityDateTime || null,
    },
  );

  if (
    !isRecord(result) ||
    typeof result.customer_id !== "string" ||
    typeof result.vehicle_id !== "string" ||
    typeof result.lead_id !== "string" ||
    typeof result.quote_id !== "string"
  ) {
    throw new Error("Supabase returned an invalid website intake result.");
  }

  return {
    customerId: result.customer_id,
    vehicleId: result.vehicle_id,
    leadId: result.lead_id,
    quoteId: result.quote_id,
  };
}
