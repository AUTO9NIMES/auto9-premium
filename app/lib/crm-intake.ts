import { resolveCurrentBusinessContext } from "./business";
import { createLead, createLeadService, createQuote, createVehicle, findCustomerByEmailOrPhone, logActivity, upsertCustomer, type LeadLifecycleStatus } from "./crm";

export type WebsiteLeadDraft = {
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

export async function persistWebsiteLead(draft: WebsiteLeadDraft) {
  const customerName = (draft.customerName || "").trim();
  const customerPhone = (draft.customerPhone || "").trim();
  const customerEmail = (draft.customerEmail || "").trim();

  if (!customerName || !customerPhone) {
    throw new Error("customerName and customerPhone are required");
  }

  const businessContext = await resolveCurrentBusinessContext();
  const businessId = businessContext.businessId;

  const existingCustomer = await findCustomerByEmailOrPhone(customerEmail, customerPhone);
  const customer = existingCustomer && existingCustomer.length > 0
    ? existingCustomer[0]
    : await upsertCustomer({
        business_id: businessId,
        full_name: customerName,
        email: customerEmail || null,
        phone: customerPhone,
        city: draft.customerCity || null,
        source: draft.source || "website",
      });

  if (!customer?.id) {
    throw new Error("Unable to resolve or create a customer record.");
  }

  const vehicle = await createVehicle({
    business_id: businessId,
    customer_id: customer.id,
    brand: draft.vehicleName ? draft.vehicleName.split(" ")[0] || null : null,
    model: draft.vehicleName || null,
    vehicle_type: draft.vehicleId || null,
    color: null,
    plate: null,
  });

  const lead = await createLead({
    business_id: businessId,
    customer_id: customer.id,
    vehicle_id: vehicle?.id || null,
    source: draft.source || "website",
    source_page: draft.sourcePage || "/devis",
    lifecycle_status: "NEW" as LeadLifecycleStatus,
    utm_source: draft.utmSource || null,
    utm_campaign: draft.utmCampaign || null,
    notes: draft.customerComment || null,
  });

  if (!lead?.id) {
    throw new Error("Unable to create a lead record.");
  }

  await createLeadService({
    business_id: businessId,
    lead_id: lead.id,
    service_name: draft.serviceName || "Prestation",
    service_slug: draft.serviceId || null,
    base_price: draft.basePrice || null,
    estimated_time: draft.estimatedTime || null,
    selected_options: draft.selectedOptions || [],
    premium_addons: draft.selectedPremiumAddons?.map((addon) => addon.name) || [],
    customer_comment: draft.customerComment || null,
  });

  const quote = await createQuote({
    business_id: businessId,
    lead_id: lead.id,
    quote_version: 1,
    total_price: draft.totalPrice || 0,
    estimated_time: draft.estimatedTime || null,
    status: "DRAFT",
    payload_json: {
      customerName,
      customerPhone,
      customerCity: draft.customerCity || null,
      serviceName: draft.serviceName || null,
      vehicleName: draft.vehicleName || null,
      selectedOptions: draft.selectedOptions || [],
      selectedPremiumAddons: draft.selectedPremiumAddons || [],
      availabilityDateTime: draft.availabilityDateTime || null,
    },
  });

  await logActivity({
    business_id: businessId,
    lead_id: lead.id,
    customer_id: customer.id,
    event_type: "website.lead.created",
    event_data: {
      source: draft.source || "website",
      customer_name: customerName,
      customer_phone: customerPhone,
      vehicle_name: draft.vehicleName || null,
      service_name: draft.serviceName || null,
      total_price: draft.totalPrice || null,
      quote_id: quote?.id || null,
      vehicle_id: vehicle?.id || null,
    },
  });

  return {
    customer,
    vehicle,
    lead,
    quote,
  };
}
