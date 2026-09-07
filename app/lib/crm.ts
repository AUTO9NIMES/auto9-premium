import { hasSupabaseWriteConfig, supabaseRest } from "./supabase";
import { resolveCurrentBusinessContext } from "./business";

export type LeadLifecycleStatus =
  | "NEW"
  | "QUALIFIED"
  | "CONTACTED"
  | "QUOTE_SENT"
  | "BOOKED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REVIEW_REQUESTED"
  | "CLOSED_LOST";

export type JobStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "PAID";

export type Customer = {
  id?: string;
  business_id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  source?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CustomerIdentifier = {
  id?: string;
  business_id: string;
  customer_id: string;
  identifier_type: "email" | "phone" | "company" | "external_ref";
  identifier_value: string;
  normalized_value: string;
  source?: string | null;
  is_primary?: boolean;
  created_at?: string;
};

export type Vehicle = {
  id?: string;
  business_id: string;
  customer_id: string;
  brand?: string | null;
  model?: string | null;
  variant?: string | null;
  year?: number | null;
  color?: string | null;
  plate?: string | null;
  mileage_km?: number | null;
  vehicle_type?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Lead = {
  id?: string;
  business_id: string;
  customer_id: string;
  source: string;
  source_page?: string | null;
  lifecycle_status: LeadLifecycleStatus;
  utm_source?: string | null;
  utm_campaign?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type LeadService = {
  id?: string;
  business_id: string;
  lead_id: string;
  service_name: string;
  service_slug?: string | null;
  base_price?: number | null;
  estimated_time?: string | null;
  selected_options?: string[] | null;
  premium_addons?: string[] | null;
  customer_comment?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Quote = {
  id?: string;
  business_id: string;
  lead_id: string;
  quote_version: number;
  total_price?: number | null;
  estimated_time?: string | null;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  payload_json?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type Job = {
  id?: string;
  business_id: string;
  customer_id: string;
  lead_id: string;
  vehicle_id?: string | null;
  quote_id?: string | null;
  job_number?: string | null;
  title?: string | null;
  status: JobStatus;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  total_amount?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ActivityLog = {
  id?: string;
  business_id: string;
  lead_id?: string | null;
  customer_id?: string | null;
  job_id?: string | null;
  event_type: string;
  event_data?: Record<string, unknown> | null;
  created_at?: string;
};

function normalizeEmail(value?: string | null): string | null {
  const normalized = (value || "").trim().toLowerCase();
  return normalized || null;
}

function normalizePhone(value?: string | null): string | null {
  const normalized = (value || "").replace(/\D/g, "");
  return normalized || null;
}

async function upsertCustomerIdentifier(
  businessId: string,
  customerId: string,
  identifierType: CustomerIdentifier["identifier_type"],
  identifierValue: string,
  source: string,
) {
  const normalizedValue = identifierValue.trim();

  if (!normalizedValue) {
    return null;
  }

  const rows = (await supabaseRest<CustomerIdentifier[]>("customer_identifiers", "GET", null,
    `business_id=eq.${businessId}&identifier_type=eq.${identifierType}&normalized_value=eq.${encodeURIComponent(normalizedValue)}&select=*`,
  )) as CustomerIdentifier[] | null;

  if (rows && rows.length > 0) {
    const existing = rows[0];
    return existing.customer_id === customerId ? existing : null;
  }

  return (await supabaseRest<CustomerIdentifier>("customer_identifiers", "POST", {
    business_id: businessId,
    customer_id: customerId,
    identifier_type: identifierType,
    identifier_value: normalizedValue,
    normalized_value: normalizedValue,
    is_primary: true,
    source,
  }, "select=*")) as CustomerIdentifier | null;
}

async function getCurrentBusinessId(): Promise<string> {
  const business = await resolveCurrentBusinessContext();

  if (!business.businessId) {
    throw new Error("Unable to resolve current business tenant.");
  }

  return business.businessId;
}

export async function upsertCustomer(input: Customer) {
  if (!hasSupabaseWriteConfig()) {
    return null;
  }

  const businessId = await getCurrentBusinessId();
  const normalized = {
    ...input,
    business_id: businessId,
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
    full_name: input.full_name.trim(),
    first_name: input.first_name?.trim() || null,
    last_name: input.last_name?.trim() || null,
    city: input.city?.trim() || null,
    source: input.source?.trim() || null,
  };

  const result = normalized.id
    ? ((await supabaseRest<Customer>("customers", "PATCH", normalized, `id=eq.${normalized.id}&business_id=eq.${businessId}&select=*`)) as Customer | null)
    : ((await supabaseRest<Customer>("customers", "POST", normalized, "select=*")) as Customer | null);

  if (result?.id) {
    const identifierEmail = normalizeEmail(normalized.email);
    const identifierPhone = normalizePhone(normalized.phone);

    if (identifierEmail) {
      await upsertCustomerIdentifier(businessId, result.id, "email", identifierEmail, "website");
    }

    if (identifierPhone) {
      await upsertCustomerIdentifier(businessId, result.id, "phone", identifierPhone, "website");
    }
  }

  return result;
}

export async function findCustomerByEmailOrPhone(email?: string | null, phone?: string | null) {
  if (!hasSupabaseWriteConfig()) {
    return null;
  }

  const businessId = await getCurrentBusinessId();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedEmail && !normalizedPhone) {
    return null;
  }

  const exactIdentifierQueries = [
    normalizedEmail ? `business_id=eq.${businessId}&identifier_type=eq.email&normalized_value=eq.${encodeURIComponent(normalizedEmail)}` : null,
    normalizedPhone ? `business_id=eq.${businessId}&identifier_type=eq.phone&normalized_value=eq.${encodeURIComponent(normalizedPhone)}` : null,
  ].filter(Boolean) as string[];

  for (const query of exactIdentifierQueries) {
    const rows = (await supabaseRest<CustomerIdentifier[]>("customer_identifiers", "GET", null, `select=customer_id&${query}`)) as CustomerIdentifier[] | null;

    if (rows && rows.length > 0) {
      const customerIds = rows.map((row) => row.customer_id);
      const queryCustomer = `business_id=eq.${businessId}&id=in.(${customerIds.join(",")})&select=*`;
      return (await supabaseRest<Customer[]>("customers", "GET", null, queryCustomer)) as Customer[] | null;
    }
  }

  return null;
}

export async function createVehicle(input: Vehicle) {
  if (!hasSupabaseWriteConfig()) {
    return null;
  }

  const businessId = await getCurrentBusinessId();

  return (await supabaseRest<Vehicle>("vehicles", "POST", { ...input, business_id: businessId }, "select=*")) as Vehicle | null;
}

export async function createLead(input: Lead) {
  if (!hasSupabaseWriteConfig()) {
    return null;
  }

  const businessId = await getCurrentBusinessId();

  return (await supabaseRest<Lead>("leads", "POST", { ...input, business_id: businessId }, "select=*")) as Lead | null;
}

export async function createLeadService(input: LeadService) {
  if (!hasSupabaseWriteConfig()) {
    return null;
  }

  const businessId = await getCurrentBusinessId();

  return (await supabaseRest<LeadService>("lead_services", "POST", { ...input, business_id: businessId }, "select=*")) as LeadService | null;
}

export async function createQuote(input: Quote) {
  if (!hasSupabaseWriteConfig()) {
    return null;
  }

  const businessId = await getCurrentBusinessId();

  return (await supabaseRest<Quote>("quotes", "POST", { ...input, business_id: businessId }, "select=*")) as Quote | null;
}

export async function createJob(input: Job) {
  if (!hasSupabaseWriteConfig()) {
    return null;
  }

  const businessId = await getCurrentBusinessId();

  return (await supabaseRest<Job>("jobs", "POST", { ...input, business_id: businessId }, "select=*")) as Job | null;
}

export async function logActivity(input: ActivityLog) {
  if (!hasSupabaseWriteConfig()) {
    return null;
  }

  const businessId = await getCurrentBusinessId();

  return (await supabaseRest<ActivityLog>("activity_log", "POST", { ...input, business_id: businessId }, "select=*")) as ActivityLog | null;
}
