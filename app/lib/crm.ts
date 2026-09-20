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
  | "QUOTE_ACCEPTED"
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
  vehicle_id?: string | null;
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

export type RecentActivity = {
  id: string;
  eventType: string;
  createdAt: string;
  customerId: string | null;
  leadId: string | null;
  jobId: string | null;
};

export type Appointment = {
  id?: string;
  business_id: string;
  customer_id: string;
  lead_id?: string | null;
  quote_id?: string | null;
  job_id: string;
  vehicle_id?: string | null;
  status: "REQUESTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  requested_at: string;
  scheduled_at?: string | null;
  confirmed_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Payment = {
  id: string;
  business_id: string;
  job_id: string;
  amount: number;
  method: "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER";
  idempotency_key: string;
  received_at: string;
  created_at: string;
};

export type AutomationOutboxEvent = {
  id: string;
  business_id: string;
  event_type: string;
  review_request_id: string;
  created_at: string;
  available_at: string;
  attempt_count: number;
  lease_token: string | null;
  leased_until: string | null;
  processed_at: string | null;
  quarantined_at: string | null;
  provider_message_id: string | null;
  provider_accepted_at: string | null;
  delivery_recipient_email: string | null;
  delivery_customer_name: string | null;
  delivery_review_url: string | null;
  delivery_sender_email: string | null;
  delivery_subject: string | null;
  delivery_text: string | null;
  delivery_html: string | null;
  last_error: string | null;
};

export type ReviewRequest = {
  id: string;
  business_id: string;
  job_id: string;
  idempotency_key: string;
  requested_at: string;
  created_at: string;
};

export type AppointmentTransitionStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export type AcceptQuoteAndCreateJobResult = {
  quote: Quote;
  lead: Lead;
  job: Job;
  appointment: Appointment | null;
};

export type MarkQuoteAsSentResult = {
  quote: Quote;
  noOp: boolean;
};

export type TransitionAppointmentStatusResult = {
  appointment: Appointment;
  job: Job;
  activity: ActivityLog | null;
};

export type ScheduleJobResult = {
  appointment: Appointment;
  job: Job;
  activity: ActivityLog | null;
  noOp: boolean;
};

export type RescheduleJobResult = {
  appointment: Appointment;
  job: Job;
  activity: ActivityLog | null;
  noOp: boolean;
};

export type RecordJobPaymentResult = {
  payment: Payment;
  job: Job;
  activity: ActivityLog | null;
  noOp: boolean;
};

export type RequestJobReviewResult = {
  reviewRequest: ReviewRequest;
  lead: Lead;
  activity: ActivityLog | null;
  noOp: boolean;
};

export type TransitionLeadStatusResult = {
  lead: Lead;
  activity: ActivityLog | null;
};

export type JobDetailsResult = {
  job: Job;
  customer: Customer;
  vehicle: Vehicle | null;
  lead: Lead;
  quote: Quote | null;
  appointment: Appointment | null;
  payment: Payment | null;
  reviewRequest: ReviewRequest | null;
  services: LeadService[];
  activities: ActivityLog[];
};

export type LeadDetailsResult = {
  lead: Lead;
  customer: Customer;
  vehicle: Vehicle | null;
  services: LeadService[];
  quotes: Quote[];
  jobs: Job[];
  appointments: Appointment[];
  activities: RecentActivity[];
};

export type Customer360Result = {
  customer: Customer;
  vehicles: Vehicle[];
  leads: Lead[];
  quotes: Quote[];
  jobs: Job[];
  appointments: Appointment[];
  activities: ActivityLog[];
};

export type JobListQueryParams = {
  page?: number;
  limit?: number;
  status?: JobStatus;
  search?: string;
};

export type JobListItem = {
  job: Job;
  customer: Customer;
  vehicle: Vehicle | null;
  appointment: Appointment | null;
  quote: Quote | null;
};

export type JobListResult = {
  items: JobListItem[];
  pagination: {
    page: number;
    limit: number;
    returned: number;
    hasNextPage: boolean;
  };
};

export type AutomationOutboxDisplayStatus =
  | "PENDING"
  | "RETRY"
  | "LEASED"
  | "QUARANTINED"
  | "PROCESSED";

export type AutomationOutboxListQueryParams = {
  page?: number;
  limit?: number;
  status?: AutomationOutboxDisplayStatus;
  eventType?: string;
};

export type AutomationOutboxListItem = {
  event: AutomationOutboxEvent;
  status: AutomationOutboxDisplayStatus;
};

export type AutomationOutboxListResult = {
  items: AutomationOutboxListItem[];
  pagination: {
    page: number;
    limit: number;
    returned: number;
    hasNextPage: boolean;
  };
};

export type CalendarAppointmentItem = {
  appointment: {
    id: string;
    customerId: string;
    jobId: string;
    vehicleId: string | null;
    status: Appointment["status"];
    requestedAt: string;
    scheduledAt: string;
  };
  job: {
    id: string;
    jobNumber: string | null;
    title: string | null;
    status: JobStatus;
    scheduledAt: string;
  };
  customer: {
    id: string;
    fullName: string;
  };
  vehicle: {
    id: string;
    brand: string | null;
    model: string | null;
  } | null;
};

export type CalendarMonthResult = {
  month: string;
  startsAt: string;
  endsAt: string;
  previousMonth: string;
  nextMonth: string;
  items: CalendarAppointmentItem[];
};

export type LeadListQueryParams = {
  page?: number;
  limit?: number;
  status?: LeadLifecycleStatus;
  source?: string;
  search?: string;
};

export type LeadListItem = {
  lead: Lead;
  customer: Customer;
  vehicle: Vehicle | null;
  latestQuote: Quote | null;
  latestJob: Job | null;
  latestAppointment: Appointment | null;
};

export type LeadListResult = {
  items: LeadListItem[];
  pagination: {
    page: number;
    limit: number;
    returned: number;
    hasNextPage: boolean;
  };
};

export type CustomerListQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CustomerListItem = {
  customer: Customer;
  latestVehicle: Vehicle | null;
  latestLead: Lead | null;
};

export type CustomerListResult = {
  items: CustomerListItem[];
  pagination: {
    page: number;
    limit: number;
    returned: number;
    hasNextPage: boolean;
  };
};

export type UpdateCustomerProfileResult = {
  customer: Customer;
  changedFields: string[];
  noOp: boolean;
};

export type ManualLeadResult = {
  leadId: string;
  noOp: boolean;
};

export type ManualLeadWithCustomerResult = ManualLeadResult & {
  customerId: string;
};

export type CrmQuoteResult = {
  quoteId: string;
  leadId: string;
  quoteVersion: number;
  noOp: boolean;
};

export type CustomerVehicleResult = {
  vehicleId: string;
  customerId: string;
  noOp: boolean;
};

export type CustomerIntakeSelection = {
  customer: Customer;
  vehicles: Vehicle[];
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

export async function updateCustomerProfile(input: {
  customerId: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
}): Promise<UpdateCustomerProfileResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const customerId = input.customerId.trim();
  if (!customerId) {
    throw new Error("customerId is required.");
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/update_customer_profile",
    "POST",
    {
      p_business_id: businessId,
      p_customer_id: customerId,
      p_full_name: input.fullName,
      p_first_name: input.firstName ?? null,
      p_last_name: input.lastName ?? null,
      p_email: input.email ?? null,
      p_phone: input.phone ?? null,
      p_city: input.city ?? null,
      p_source: "crm_customer_profile_ui",
    },
  );

  if (
    !isRecord(result) ||
    !isRecord(result.customer) ||
    !Array.isArray(result.changed_fields) ||
    typeof result.no_op !== "boolean"
  ) {
    throw new Error("Supabase returned an invalid customer profile result.");
  }

  return {
    customer: result.customer as Customer,
    changedFields: result.changed_fields.filter(
      (field): field is string => typeof field === "string",
    ),
    noOp: result.no_op,
  };
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

export async function getCustomerForManualLead(
  customerId: string,
): Promise<CustomerIntakeSelection | null> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const normalizedCustomerId = customerId.trim();
  if (!normalizedCustomerId) {
    throw new Error("customerId is required.");
  }

  const businessId = await getCurrentBusinessId();
  const [customerRows, vehicleRows] = await Promise.all([
    supabaseRest<Customer[]>(
      "customers",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${normalizedCustomerId}&select=id,business_id,full_name,first_name,last_name,email,phone,city,source,created_at,updated_at`,
    ),
    supabaseRest<Vehicle[]>(
      "vehicles",
      "GET",
      null,
      `business_id=eq.${businessId}&customer_id=eq.${normalizedCustomerId}&order=created_at.desc,id.desc&limit=50&select=*`,
    ),
  ]);

  const customer = (customerRows as Customer[] | null)?.[0];
  if (!customer) {
    return null;
  }

  return {
    customer,
    vehicles: (vehicleRows as Vehicle[] | null) ?? [],
  };
}

export async function createManualLead(input: {
  idempotencyKey: string;
  customerId: string;
  vehicleId?: string | null;
  serviceName: string;
  basePrice?: number | null;
  estimatedTime?: string | null;
  customerComment?: string | null;
}): Promise<ManualLeadResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/create_manual_lead",
    "POST",
    {
      p_business_id: businessId,
      p_idempotency_key: input.idempotencyKey.trim(),
      p_customer_id: input.customerId.trim(),
      p_vehicle_id: input.vehicleId?.trim() || null,
      p_service_name: input.serviceName,
      p_base_price: input.basePrice ?? null,
      p_estimated_time: input.estimatedTime ?? null,
      p_customer_comment: input.customerComment ?? null,
    },
  );

  if (
    !isRecord(result) ||
    typeof result.lead_id !== "string" ||
    typeof result.no_op !== "boolean"
  ) {
    throw new Error("Supabase returned an invalid manual lead result.");
  }

  return {
    leadId: result.lead_id,
    noOp: result.no_op,
  };
}

export async function findManualLeadWithCustomerReplay(
  idempotencyKey: string,
): Promise<ManualLeadResult | null> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();
  const customerRows = await supabaseRest<Array<{ id: string }>>(
    "customers",
    "GET",
    null,
    `business_id=eq.${businessId}&idempotency_key=eq.${encodeURIComponent(idempotencyKey.trim())}&select=id&limit=1`,
  );
  const customerId = (customerRows as Array<{ id: string }> | null)?.[0]?.id;

  if (!customerId) {
    return null;
  }

  const leadRows = await supabaseRest<Array<{ id: string }>>(
    "leads",
    "GET",
    null,
    `business_id=eq.${businessId}&customer_id=eq.${customerId}&idempotency_key=eq.${encodeURIComponent(idempotencyKey.trim())}&select=id&limit=1`,
  );
  const leadId = (leadRows as Array<{ id: string }> | null)?.[0]?.id;

  return leadId ? { leadId, noOp: true } : null;
}

export async function createManualLeadWithCustomer(input: {
  idempotencyKey: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  serviceName: string;
  basePrice?: number | null;
  estimatedTime?: string | null;
  customerComment?: string | null;
}): Promise<ManualLeadWithCustomerResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/create_manual_lead_with_customer",
    "POST",
    {
      p_business_id: businessId,
      p_idempotency_key: input.idempotencyKey.trim(),
      p_full_name: input.fullName,
      p_service_name: input.serviceName,
      p_first_name: input.firstName ?? null,
      p_last_name: input.lastName ?? null,
      p_email: normalizeEmail(input.email),
      p_phone: normalizePhone(input.phone),
      p_city: input.city ?? null,
      p_base_price: input.basePrice ?? null,
      p_estimated_time: input.estimatedTime ?? null,
      p_customer_comment: input.customerComment ?? null,
    },
  );

  if (
    !isRecord(result) ||
    typeof result.lead_id !== "string" ||
    typeof result.customer_id !== "string" ||
    typeof result.no_op !== "boolean"
  ) {
    throw new Error("Supabase returned an invalid manual lead with customer result.");
  }

  return {
    leadId: result.lead_id,
    customerId: result.customer_id,
    noOp: result.no_op,
  };
}

export async function findCrmQuoteReplay(
  idempotencyKey: string,
): Promise<CrmQuoteResult | null> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();
  const rows = await supabaseRest<Array<{
    id: string;
    lead_id: string;
    quote_version: number;
  }>>(
    "quotes",
    "GET",
    null,
    `business_id=eq.${businessId}&idempotency_key=eq.${encodeURIComponent(idempotencyKey.trim())}&select=id,lead_id,quote_version&limit=1`,
  );
  const quote = (rows as Array<{
    id: string;
    lead_id: string;
    quote_version: number;
  }> | null)?.[0];

  if (!quote?.id || !quote.lead_id || !Number.isInteger(quote.quote_version)) {
    return null;
  }

  return {
    quoteId: quote.id,
    leadId: quote.lead_id,
    quoteVersion: quote.quote_version,
    noOp: true,
  };
}

export async function createCrmQuote(input: {
  idempotencyKey: string;
  leadId: string;
  totalPrice: number;
  estimatedTime?: string | null;
}): Promise<CrmQuoteResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/create_crm_quote",
    "POST",
    {
      p_business_id: businessId,
      p_idempotency_key: input.idempotencyKey.trim(),
      p_lead_id: input.leadId.trim(),
      p_total_price: input.totalPrice,
      p_estimated_time: input.estimatedTime ?? null,
    },
  );

  if (
    !isRecord(result) ||
    typeof result.quote_id !== "string" ||
    typeof result.lead_id !== "string" ||
    typeof result.quote_version !== "number" ||
    !Number.isInteger(result.quote_version) ||
    typeof result.no_op !== "boolean"
  ) {
    throw new Error("Supabase returned an invalid CRM quote result.");
  }

  return {
    quoteId: result.quote_id,
    leadId: result.lead_id,
    quoteVersion: result.quote_version,
    noOp: result.no_op,
  };
}

export type UpdateDraftQuoteAmountStatus =
  | "updated"
  | "no_op"
  | "conflict"
  | "not_found"
  | "invalid_lifecycle"
  | "invalid_amount";

export type UpdateDraftQuoteAmountResult = {
  status: UpdateDraftQuoteAmountStatus;
  quoteId: string;
  leadId: string | null;
  totalPrice: number | null;
  noOp: boolean;
};

const UPDATE_DRAFT_QUOTE_AMOUNT_STATUSES = new Set<string>([
  "updated",
  "no_op",
  "conflict",
  "not_found",
  "invalid_lifecycle",
  "invalid_amount",
]);

export async function updateDraftQuoteAmount(input: {
  quoteId: string;
  expectedTotalPrice: number | null;
  totalPrice: number;
}): Promise<UpdateDraftQuoteAmountResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/update_draft_quote_amount",
    "POST",
    {
      p_business_id: businessId,
      p_quote_id: input.quoteId.trim(),
      p_expected_total_price: input.expectedTotalPrice,
      p_total_price: input.totalPrice,
    },
  );

  if (
    !isRecord(result) ||
    typeof result.status !== "string" ||
    !UPDATE_DRAFT_QUOTE_AMOUNT_STATUSES.has(result.status) ||
    typeof result.quote_id !== "string" ||
    (result.lead_id !== undefined && result.lead_id !== null && typeof result.lead_id !== "string") ||
    (result.total_price !== undefined && result.total_price !== null && typeof result.total_price !== "number")
  ) {
    throw new Error("Supabase returned an invalid draft quote amount result.");
  }

  return {
    status: result.status as UpdateDraftQuoteAmountStatus,
    quoteId: result.quote_id,
    leadId: (result.lead_id as string | null | undefined) ?? null,
    totalPrice: (result.total_price as number | null | undefined) ?? null,
    noOp: result.status === "no_op",
  };
}

export async function findCustomerVehicleReplay(input: {
  customerId: string;
  idempotencyKey: string;
}): Promise<CustomerVehicleResult | null> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();
  const rows = await supabaseRest<Array<{
    id: string;
    customer_id: string;
  }>>(
    "vehicles",
    "GET",
    null,
    `business_id=eq.${businessId}&idempotency_key=eq.${encodeURIComponent(input.idempotencyKey.trim())}&select=id,customer_id&limit=1`,
  );
  const vehicle = (rows as Array<{ id: string; customer_id: string }> | null)?.[0];

  if (!vehicle?.id || !vehicle.customer_id) {
    return null;
  }

  if (vehicle.customer_id !== input.customerId.trim()) {
    throw new Error("Vehicle request token belongs to another customer.");
  }

  return {
    vehicleId: vehicle.id,
    customerId: vehicle.customer_id,
    noOp: true,
  };
}

export async function createCustomerVehicle(input: {
  idempotencyKey: string;
  customerId: string;
  brand: string;
  model: string;
  variant?: string | null;
  year?: number | null;
  color?: string | null;
  plate?: string | null;
  mileageKm?: number | null;
}): Promise<CustomerVehicleResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/create_customer_vehicle",
    "POST",
    {
      p_business_id: businessId,
      p_idempotency_key: input.idempotencyKey.trim(),
      p_customer_id: input.customerId.trim(),
      p_brand: input.brand,
      p_model: input.model,
      p_variant: input.variant ?? null,
      p_year: input.year ?? null,
      p_color: input.color ?? null,
      p_plate: input.plate ?? null,
      p_mileage_km: input.mileageKm ?? null,
    },
  );

  if (
    !isRecord(result) ||
    typeof result.vehicle_id !== "string" ||
    typeof result.customer_id !== "string" ||
    typeof result.no_op !== "boolean"
  ) {
    throw new Error("Supabase returned an invalid customer vehicle result.");
  }

  return {
    vehicleId: result.vehicle_id,
    customerId: result.customer_id,
    noOp: result.no_op,
  };
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

export async function getJobDetails(
  jobId: string,
): Promise<JobDetailsResult | null> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const normalizedJobId = jobId.trim();

  if (!normalizedJobId) {
    throw new Error("jobId is required.");
  }

  const businessId = await getCurrentBusinessId();

  const jobRows = (await supabaseRest<Job[]>(
    "jobs",
    "GET",
    null,
    `business_id=eq.${businessId}&id=eq.${normalizedJobId}&select=*`,
  )) as Job[] | null;

  const job = jobRows?.[0];

  if (!job?.id) {
    return null;
  }

  const [
    customerRows,
    leadRows,
    vehicleRows,
    quoteRows,
    appointmentRows,
    paymentRows,
    reviewRequestRows,
    services,
    activities,
  ] = await Promise.all([
    supabaseRest<Customer[]>(
      "customers",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${job.customer_id}&select=*`,
    ),
    supabaseRest<Lead[]>(
      "leads",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${job.lead_id}&select=*`,
    ),
    job.vehicle_id
      ? supabaseRest<Vehicle[]>(
          "vehicles",
          "GET",
          null,
          `business_id=eq.${businessId}&id=eq.${job.vehicle_id}&select=*`,
        )
      : Promise.resolve([]),
    job.quote_id
      ? supabaseRest<Quote[]>(
          "quotes",
          "GET",
          null,
          `business_id=eq.${businessId}&id=eq.${job.quote_id}&select=*`,
        )
      : Promise.resolve([]),
    supabaseRest<Appointment[]>(
      "appointments",
      "GET",
      null,
      `business_id=eq.${businessId}&job_id=eq.${job.id}&select=*`,
    ),
    supabaseRest<Payment[]>(
      "payments",
      "GET",
      null,
      `business_id=eq.${businessId}&job_id=eq.${job.id}&order=received_at.desc,id.desc&limit=1&select=id,business_id,job_id,amount,method,idempotency_key,received_at,created_at`,
    ),
    supabaseRest<ReviewRequest[]>(
      "review_requests",
      "GET",
      null,
      `business_id=eq.${businessId}&job_id=eq.${job.id}&limit=1&select=id,business_id,job_id,idempotency_key,requested_at,created_at`,
    ),
    supabaseRest<LeadService[]>(
      "lead_services",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=eq.${job.lead_id}&select=*`,
    ),
    supabaseRest<ActivityLog[]>(
      "activity_log",
      "GET",
      null,
      `business_id=eq.${businessId}&job_id=eq.${job.id}&order=created_at.asc&select=*`,
    ),
  ]);

  const customer = (customerRows as Customer[] | null)?.[0];
  const lead = (leadRows as Lead[] | null)?.[0];

  if (!customer || !lead) {
    throw new Error("Job relationships are inconsistent.");
  }

  return {
    job,
    customer,
    vehicle: (vehicleRows as Vehicle[] | null)?.[0] ?? null,
    lead,
    quote: (quoteRows as Quote[] | null)?.[0] ?? null,
    appointment: (appointmentRows as Appointment[] | null)?.[0] ?? null,
    payment: (paymentRows as Payment[] | null)?.[0] ?? null,
    reviewRequest: (reviewRequestRows as ReviewRequest[] | null)?.[0] ?? null,
    services: (services as LeadService[] | null) ?? [],
    activities: (activities as ActivityLog[] | null) ?? [],
  };
}

export async function getCustomer360(
  customerId: string,
): Promise<Customer360Result | null> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const normalizedCustomerId = customerId.trim();

  if (!normalizedCustomerId) {
    throw new Error("customerId is required.");
  }

  const businessId = await getCurrentBusinessId();

  const customerRows = (await supabaseRest<Customer[]>(
    "customers",
    "GET",
    null,
    `business_id=eq.${businessId}&id=eq.${normalizedCustomerId}&select=*`,
  )) as Customer[] | null;

  const customer = customerRows?.[0];

  if (!customer?.id) {
    return null;
  }

  const [
    vehicles,
    leads,
    jobs,
    appointments,
    activities,
  ] = await Promise.all([
    supabaseRest<Vehicle[]>(
      "vehicles",
      "GET",
      null,
      `business_id=eq.${businessId}&customer_id=eq.${normalizedCustomerId}&order=created_at.desc&select=*`,
    ),
    supabaseRest<Lead[]>(
      "leads",
      "GET",
      null,
      `business_id=eq.${businessId}&customer_id=eq.${normalizedCustomerId}&order=created_at.desc&select=*`,
    ),
    supabaseRest<Job[]>(
      "jobs",
      "GET",
      null,
      `business_id=eq.${businessId}&customer_id=eq.${normalizedCustomerId}&order=created_at.desc&select=*`,
    ),
    supabaseRest<Appointment[]>(
      "appointments",
      "GET",
      null,
      `business_id=eq.${businessId}&customer_id=eq.${normalizedCustomerId}&order=requested_at.desc.nullslast,created_at.desc&select=*`,
    ),
    supabaseRest<ActivityLog[]>(
      "activity_log",
      "GET",
      null,
      `business_id=eq.${businessId}&customer_id=eq.${normalizedCustomerId}&order=created_at.desc&select=*`,
    ),
  ]);

  const normalizedLeads = (leads as Lead[] | null) ?? [];
  const normalizedVehicles = (vehicles as Vehicle[] | null) ?? [];
  const normalizedJobs = (jobs as Job[] | null) ?? [];
  const normalizedAppointments = (appointments as Appointment[] | null) ?? [];
  const normalizedActivities = (activities as ActivityLog[] | null) ?? [];

  const leadIds = [...new Set(
    normalizedLeads
      .map((lead) => lead.id)
      .filter((leadId): leadId is string => Boolean(leadId)),
  )];

  let quotes: Quote[] = [];

  if (leadIds.length > 0) {
    const quoteRows = (await supabaseRest<Quote[]>(
      "quotes",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=in.(${leadIds.join(",")})&order=created_at.desc&select=*`,
    )) as Quote[] | null;

    quotes = quoteRows ?? [];
  }

  return {
    customer,
    vehicles: normalizedVehicles,
    leads: normalizedLeads,
    quotes,
    jobs: normalizedJobs,
    appointments: normalizedAppointments,
    activities: normalizedActivities,
  };
}

const LEAD_DETAILS_MAX_ITEMS = 50;

export async function getLeadDetails(
  leadId: string,
): Promise<LeadDetailsResult | null> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const normalizedLeadId = leadId.trim();

  if (!normalizedLeadId) {
    throw new Error("leadId is required.");
  }

  const businessId = await getCurrentBusinessId();
  const leadRows = (await supabaseRest<Lead[]>(
    "leads",
    "GET",
    null,
    `business_id=eq.${businessId}&id=eq.${normalizedLeadId}&select=*`,
  )) as Lead[] | null;
  const lead = leadRows?.[0];

  if (!lead?.id) {
    return null;
  }

  const [customerRows, vehicleRows, services, quotes, jobs, appointments, activityRows] = await Promise.all([
    supabaseRest<Customer[]>(
      "customers",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${lead.customer_id}&select=*`,
    ),
    lead.vehicle_id
      ? supabaseRest<Vehicle[]>(
          "vehicles",
          "GET",
          null,
          `business_id=eq.${businessId}&id=eq.${lead.vehicle_id}&customer_id=eq.${lead.customer_id}&select=*`,
        )
      : Promise.resolve([]),
    supabaseRest<LeadService[]>(
      "lead_services",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=eq.${normalizedLeadId}&limit=${LEAD_DETAILS_MAX_ITEMS}&order=id.desc&select=*`,
    ),
    supabaseRest<Quote[]>(
      "quotes",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=eq.${normalizedLeadId}&limit=${LEAD_DETAILS_MAX_ITEMS}&order=created_at.desc,id.desc&select=id,business_id,lead_id,quote_version,total_price,estimated_time,status,payload_json,created_at,updated_at`,
    ),
    supabaseRest<Job[]>(
      "jobs",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=eq.${normalizedLeadId}&limit=${LEAD_DETAILS_MAX_ITEMS}&order=created_at.desc,id.desc&select=*`,
    ),
    supabaseRest<Appointment[]>(
      "appointments",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=eq.${normalizedLeadId}&limit=${LEAD_DETAILS_MAX_ITEMS}&order=requested_at.desc.nullslast,created_at.desc,id.desc&select=*`,
    ),
    supabaseRest<ActivityLog[]>(
      "activity_log",
      "GET",
      null,
      `business_id=eq.${businessId}&lead_id=eq.${normalizedLeadId}&limit=${LEAD_DETAILS_MAX_ITEMS}&order=created_at.desc,id.desc&select=id,business_id,lead_id,customer_id,job_id,event_type,created_at`,
    ),
  ]);

  const customer = (customerRows as Customer[] | null)?.[0];

  if (!customer) {
    throw new Error("Lead customer relationship is inconsistent.");
  }

  const activityItems = ((activityRows as ActivityLog[] | null) ?? [])
    .filter(
      (activity): activity is ActivityLog & { id: string; created_at: string } =>
        Boolean(activity.id && activity.created_at),
    )
    .map((activity) => ({
      id: activity.id,
      eventType: activity.event_type,
      createdAt: activity.created_at,
      customerId: activity.customer_id ?? null,
      leadId: activity.lead_id ?? null,
      jobId: activity.job_id ?? null,
    }));

  return {
    lead,
    customer,
    vehicle: (vehicleRows as Vehicle[] | null)?.[0] ?? null,
    services: (services as LeadService[] | null) ?? [],
    quotes: (quotes as Quote[] | null) ?? [],
    jobs: (jobs as Job[] | null) ?? [],
    appointments: (appointments as Appointment[] | null) ?? [],
    activities: activityItems,
  };
}

const JOB_LIST_DEFAULT_PAGE = 1;
const JOB_LIST_DEFAULT_LIMIT = 20;
const JOB_LIST_MAX_LIMIT = 100;
const JOB_LIST_SEARCH_CANDIDATE_LIMIT = 200;

function normalizeJobListSearch(search?: string): string | null {
  if (search === undefined) {
    return null;
  }

  const normalized = search.trim();
  return normalized.length > 0 ? normalized : null;
}

function matchesJobListSearch(
  item: JobListItem,
  normalizedSearch: string,
): boolean {
  const searchableFields = [
    item.job.title,
    item.job.job_number,
    item.customer.full_name,
    item.customer.phone,
    item.customer.email,
    item.vehicle?.plate,
    item.vehicle?.brand,
    item.vehicle?.model,
  ].map((value) => (value ?? "").toLowerCase());

  return searchableFields.join(" ").includes(normalizedSearch.toLowerCase());
}

export async function getJobsList(
  input: JobListQueryParams,
): Promise<JobListResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();

  const page = Number.isInteger(input.page) && (input.page ?? 0) > 0
    ? Math.max(1, input.page as number)
    : JOB_LIST_DEFAULT_PAGE;

  const limit = Number.isInteger(input.limit) && (input.limit ?? 0) > 0
    ? Math.min(Math.max(1, input.limit as number), JOB_LIST_MAX_LIMIT)
    : JOB_LIST_DEFAULT_LIMIT;

  const normalizedSearch = normalizeJobListSearch(input.search);

  const baseJobsFilter = `business_id=eq.${businessId}${input.status ? `&status=eq.${input.status}` : ""}`;

  if (normalizedSearch) {
    const candidateRows = (await supabaseRest<Job[]>(
      "jobs",
      "GET",
      null,
      `${baseJobsFilter}&order=created_at.desc,id.desc&limit=${JOB_LIST_SEARCH_CANDIDATE_LIMIT}&select=*`,
    )) as Job[] | null;

    const candidateJobs = (candidateRows ?? []).filter((job): job is Job => Boolean(job?.id));

    if (candidateJobs.length === 0) {
      return {
        items: [],
        pagination: {
          page,
          limit,
          returned: 0,
          hasNextPage: false,
        },
      };
    }

    const customerIds = [...new Set(
      candidateJobs
        .map((job) => job.customer_id)
        .filter((customerId): customerId is string => Boolean(customerId)),
    )];

    const vehicleIds = [...new Set(
      candidateJobs
        .map((job) => job.vehicle_id)
        .filter((vehicleId): vehicleId is string => Boolean(vehicleId)),
    )];

    const quoteIds = [...new Set(
      candidateJobs
        .map((job) => job.quote_id)
        .filter((quoteId): quoteId is string => Boolean(quoteId)),
    )];

    const jobIds = [...new Set(
      candidateJobs
        .map((job) => job.id)
        .filter((jobId): jobId is string => Boolean(jobId)),
    )];

    const [customerRows, vehicleRows, appointmentRows, quoteRows] = await Promise.all([
      customerIds.length > 0
        ? supabaseRest<Customer[]>(
            "customers",
            "GET",
            null,
            `business_id=eq.${businessId}&id=in.(${customerIds.join(",")})&select=*`,
          )
        : Promise.resolve([]),
      vehicleIds.length > 0
        ? supabaseRest<Vehicle[]>(
            "vehicles",
            "GET",
            null,
            `business_id=eq.${businessId}&id=in.(${vehicleIds.join(",")})&select=*`,
          )
        : Promise.resolve([]),
      jobIds.length > 0
        ? supabaseRest<Appointment[]>(
            "appointments",
            "GET",
            null,
            `business_id=eq.${businessId}&job_id=in.(${jobIds.join(",")})&select=*`,
          )
        : Promise.resolve([]),
      quoteIds.length > 0
        ? supabaseRest<Quote[]>(
            "quotes",
            "GET",
            null,
            `business_id=eq.${businessId}&id=in.(${quoteIds.join(",")})&select=*`,
          )
        : Promise.resolve([]),
    ]);

    const customersById = new Map<string, Customer>();
    for (const customer of (customerRows as Customer[] | null) ?? []) {
      if (customer.id) {
        customersById.set(customer.id, customer);
      }
    }

    const vehiclesById = new Map<string, Vehicle>();
    for (const vehicle of (vehicleRows as Vehicle[] | null) ?? []) {
      if (vehicle.id) {
        vehiclesById.set(vehicle.id, vehicle);
      }
    }

    const appointmentsByJobId = new Map<string, Appointment>();
    for (const appointment of (appointmentRows as Appointment[] | null) ?? []) {
      if (appointment.job_id && !appointmentsByJobId.has(appointment.job_id)) {
        appointmentsByJobId.set(appointment.job_id, appointment);
      }
    }

    const quotesById = new Map<string, Quote>();
    for (const quote of (quoteRows as Quote[] | null) ?? []) {
      if (quote.id) {
        quotesById.set(quote.id, quote);
      }
    }

    const jobListItems: JobListItem[] = candidateJobs.map((job) => {
      const customer = customersById.get(job.customer_id);

      if (!customer) {
        throw new Error("Job relationships are inconsistent.");
      }

      return {
        job,
        customer,
        vehicle: job.vehicle_id ? vehiclesById.get(job.vehicle_id) ?? null : null,
        appointment: job.id ? appointmentsByJobId.get(job.id) ?? null : null,
        quote: job.quote_id ? quotesById.get(job.quote_id) ?? null : null,
      };
    });

    const matchedItems = jobListItems.filter((item) => matchesJobListSearch(item, normalizedSearch));
    const startIndex = (page - 1) * limit;
    const pageItems = matchedItems.slice(startIndex, startIndex + limit);

    return {
      items: pageItems,
      pagination: {
        page,
        limit,
        returned: pageItems.length,
        hasNextPage: startIndex + limit < matchedItems.length,
      },
    };
  }

  const offset = (page - 1) * limit;
  const jobsRows = (await supabaseRest<Job[]>(
    "jobs",
    "GET",
    null,
    `${baseJobsFilter}&order=created_at.desc,id.desc&offset=${offset}&limit=${limit + 1}&select=*`,
  )) as Job[] | null;

  const jobs = (jobsRows ?? []).filter((job): job is Job => Boolean(job?.id));
  const pageJobs = jobs.slice(0, limit);
  const hasNextPage = jobs.length > limit;

  if (pageJobs.length === 0) {
    return {
      items: [],
      pagination: {
        page,
        limit,
        returned: 0,
        hasNextPage: false,
      },
    };
  }

  const customerIds = [...new Set(
    pageJobs
      .map((job) => job.customer_id)
      .filter((customerId): customerId is string => Boolean(customerId)),
  )];

  const vehicleIds = [...new Set(
    pageJobs
      .map((job) => job.vehicle_id)
      .filter((vehicleId): vehicleId is string => Boolean(vehicleId)),
  )];

  const quoteIds = [...new Set(
    pageJobs
      .map((job) => job.quote_id)
      .filter((quoteId): quoteId is string => Boolean(quoteId)),
  )];

  const jobIds = [...new Set(
    pageJobs
      .map((job) => job.id)
      .filter((jobId): jobId is string => Boolean(jobId)),
  )];

  const [customerRows, vehicleRows, appointmentRows, quoteRows] = await Promise.all([
    customerIds.length > 0
      ? supabaseRest<Customer[]>(
          "customers",
          "GET",
          null,
          `business_id=eq.${businessId}&id=in.(${customerIds.join(",")})&select=*`,
        )
      : Promise.resolve([]),
    vehicleIds.length > 0
      ? supabaseRest<Vehicle[]>(
          "vehicles",
          "GET",
          null,
          `business_id=eq.${businessId}&id=in.(${vehicleIds.join(",")})&select=*`,
        )
      : Promise.resolve([]),
    jobIds.length > 0
      ? supabaseRest<Appointment[]>(
          "appointments",
          "GET",
          null,
          `business_id=eq.${businessId}&job_id=in.(${jobIds.join(",")})&select=*`,
        )
      : Promise.resolve([]),
    quoteIds.length > 0
      ? supabaseRest<Quote[]>(
          "quotes",
          "GET",
          null,
          `business_id=eq.${businessId}&id=in.(${quoteIds.join(",")})&select=*`,
        )
      : Promise.resolve([]),
  ]);

  const customersById = new Map<string, Customer>();
  for (const customer of (customerRows as Customer[] | null) ?? []) {
    if (customer.id) {
      customersById.set(customer.id, customer);
    }
  }

  const vehiclesById = new Map<string, Vehicle>();
  for (const vehicle of (vehicleRows as Vehicle[] | null) ?? []) {
    if (vehicle.id) {
      vehiclesById.set(vehicle.id, vehicle);
    }
  }

  const appointmentsByJobId = new Map<string, Appointment>();
  for (const appointment of (appointmentRows as Appointment[] | null) ?? []) {
    if (appointment.job_id && !appointmentsByJobId.has(appointment.job_id)) {
      appointmentsByJobId.set(appointment.job_id, appointment);
    }
  }

  const quotesById = new Map<string, Quote>();
  for (const quote of (quoteRows as Quote[] | null) ?? []) {
    if (quote.id) {
      quotesById.set(quote.id, quote);
    }
  }

  const items: JobListItem[] = pageJobs.map((job) => {
    const customer = customersById.get(job.customer_id);

    if (!customer) {
      throw new Error("Job relationships are inconsistent.");
    }

    return {
      job,
      customer,
      vehicle: job.vehicle_id ? vehiclesById.get(job.vehicle_id) ?? null : null,
      appointment: job.id ? appointmentsByJobId.get(job.id) ?? null : null,
      quote: job.quote_id ? quotesById.get(job.quote_id) ?? null : null,
    };
  });

  return {
    items,
    pagination: {
      page,
      limit,
      returned: items.length,
      hasNextPage,
    },
  };
}


const AUTOMATION_OUTBOX_LIST_DEFAULT_PAGE = 1;
const AUTOMATION_OUTBOX_LIST_DEFAULT_LIMIT = 20;
const AUTOMATION_OUTBOX_LIST_MAX_LIMIT = 100;

function getAutomationOutboxDisplayStatus(
  event: AutomationOutboxEvent,
  now: Date,
): AutomationOutboxDisplayStatus {
  if (event.processed_at) {
    return "PROCESSED";
  }

  if (event.quarantined_at) {
    return "QUARANTINED";
  }

  const leasedUntil = event.leased_until
    ? new Date(event.leased_until)
    : null;

  const hasActiveLease =
    Boolean(event.lease_token) &&
    leasedUntil !== null &&
    !Number.isNaN(leasedUntil.getTime()) &&
    leasedUntil.getTime() > now.getTime();

  if (hasActiveLease) {
    return "LEASED";
  }

  if (event.last_error) {
    return "RETRY";
  }

  return "PENDING";
}

export async function getAutomationOutboxList(
  input: AutomationOutboxListQueryParams,
): Promise<AutomationOutboxListResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();

  const page =
    Number.isInteger(input.page) && (input.page ?? 0) > 0
      ? Math.max(1, input.page as number)
      : AUTOMATION_OUTBOX_LIST_DEFAULT_PAGE;

  const limit =
    Number.isInteger(input.limit) && (input.limit ?? 0) > 0
      ? Math.min(
          Math.max(1, input.limit as number),
          AUTOMATION_OUTBOX_LIST_MAX_LIMIT,
        )
      : AUTOMATION_OUTBOX_LIST_DEFAULT_LIMIT;

  const normalizedEventType = input.eventType?.trim() || null;
  const now = new Date();
  const nowIso = encodeURIComponent(now.toISOString());

  const filters = [
    `business_id=eq.${businessId}`,
    normalizedEventType
      ? `event_type=eq.${encodeURIComponent(normalizedEventType)}`
      : null,
  ].filter((value): value is string => Boolean(value));

  if (input.status === "PROCESSED") {
    filters.push("processed_at=not.is.null");
  } else if (input.status === "QUARANTINED") {
    filters.push("processed_at=is.null");
    filters.push("quarantined_at=not.is.null");
  } else if (input.status === "LEASED") {
    filters.push("processed_at=is.null");
    filters.push("quarantined_at=is.null");
    filters.push("lease_token=not.is.null");
    filters.push(`leased_until=gt.${nowIso}`);
  } else if (input.status === "RETRY") {
    filters.push("processed_at=is.null");
    filters.push("quarantined_at=is.null");
    filters.push("last_error=not.is.null");
    filters.push(
      `or=(lease_token.is.null,leased_until.lte.${nowIso})`,
    );
  } else if (input.status === "PENDING") {
    filters.push("processed_at=is.null");
    filters.push("quarantined_at=is.null");
    filters.push("last_error=is.null");
    filters.push(
      `or=(lease_token.is.null,leased_until.lte.${nowIso})`,
    );
  }

  const offset = (page - 1) * limit;

  const rows = (await supabaseRest<AutomationOutboxEvent[]>(
    "automation_outbox",
    "GET",
    null,
    `${filters.join("&")}&order=created_at.desc,id.desc&offset=${offset}&limit=${limit + 1}&select=*`,
  )) as AutomationOutboxEvent[] | null;

  const events = (rows ?? []).filter(
    (event): event is AutomationOutboxEvent => Boolean(event?.id),
  );

  const pageEvents = events.slice(0, limit);

  return {
    items: pageEvents.map((event) => ({
      event,
      status: getAutomationOutboxDisplayStatus(event, now),
    })),
    pagination: {
      page,
      limit,
      returned: pageEvents.length,
      hasNextPage: events.length > limit,
    },
  };
}


const CALENDAR_TIME_ZONE = "Europe/Paris";
const CALENDAR_MAX_ITEMS = 200;
const CALENDAR_MIN_YEAR = 2000;
const CALENDAR_MAX_YEAR = 2100;
const CALENDAR_MONTH_REGEX = /^([0-9]{4})-(0[1-9]|1[0-2])$/;

type CalendarAppointmentRow = {
  id: string;
  business_id: string;
  customer_id: string;
  lead_id: string | null;
  quote_id: string | null;
  job_id: string;
  vehicle_id: string | null;
  status: Appointment["status"];
  requested_at: string;
  scheduled_at: string;
};

type CalendarJobRow = {
  id: string;
  business_id: string;
  customer_id: string;
  lead_id: string;
  quote_id: string | null;
  vehicle_id: string | null;
  job_number: string | null;
  title: string | null;
  status: JobStatus;
  scheduled_at: string;
};

type CalendarCustomerRow = {
  id: string;
  business_id: string;
  full_name: string;
};

type CalendarVehicleRow = {
  id: string;
  business_id: string;
  customer_id: string;
  brand: string | null;
  model: string | null;
};

const calendarDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CALENDAR_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getCalendarDateTimeParts(date: Date) {
  const parts = calendarDateTimeFormatter.formatToParts(date);
  const values = new Map(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  const hour = values.get("hour");
  const minute = values.get("minute");
  const second = values.get("second");

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second)
  ) {
    throw new Error("Unable to resolve Europe/Paris calendar time.");
  }

  return {
    year: year as number,
    month: month as number,
    day: day as number,
    hour: hour as number,
    minute: minute as number,
    second: second as number,
  };
}

function parisLocalMidnightToInstant(
  year: number,
  month: number,
): string {
  const desiredUtcValue = Date.UTC(year, month - 1, 1, 0, 0, 0);
  let candidateValue = desiredUtcValue;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const parts = getCalendarDateTimeParts(new Date(candidateValue));
    const representedUtcValue = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const correction = desiredUtcValue - representedUtcValue;

    candidateValue += correction;

    if (correction === 0) {
      break;
    }
  }

  const candidate = new Date(candidateValue);
  const verified = getCalendarDateTimeParts(candidate);

  if (
    verified.year !== year ||
    verified.month !== month ||
    verified.day !== 1 ||
    verified.hour !== 0 ||
    verified.minute !== 0 ||
    verified.second !== 0
  ) {
    throw new Error("Unable to resolve Europe/Paris month boundary.");
  }

  return candidate.toISOString();
}

function formatCalendarMonth(year: number, month: number): string {
  return String(year).padStart(4, "0") + "-" + String(month).padStart(2, "0");
}

function shiftCalendarMonth(
  year: number,
  month: number,
  amount: number,
): { year: number; month: number } {
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1));

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
  };
}

function resolveCalendarMonth(input?: string): {
  key: string;
  year: number;
  month: number;
} {
  const normalized = input?.trim();

  if (!normalized) {
    const current = getCalendarDateTimeParts(new Date());

    return {
      key: formatCalendarMonth(current.year, current.month),
      year: current.year,
      month: current.month,
    };
  }

  const match = CALENDAR_MONTH_REGEX.exec(normalized);

  if (!match) {
    throw new Error("Calendar month has an invalid format.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    !Number.isInteger(year) ||
    year < CALENDAR_MIN_YEAR ||
    year > CALENDAR_MAX_YEAR
  ) {
    throw new Error("Calendar month is outside the supported range.");
  }

  return {
    key: formatCalendarMonth(year, month),
    year,
    month,
  };
}

export async function getCalendarMonth(input?: {
  month?: string;
}): Promise<CalendarMonthResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();
  const selected = resolveCalendarMonth(input?.month);
  const previous = shiftCalendarMonth(selected.year, selected.month, -1);
  const next = shiftCalendarMonth(selected.year, selected.month, 1);
  const startsAt = parisLocalMidnightToInstant(
    selected.year,
    selected.month,
  );
  const endsAt = parisLocalMidnightToInstant(next.year, next.month);

  const appointmentRows = (await supabaseRest<CalendarAppointmentRow[]>(
    "appointments",
    "GET",
    null,
    "business_id=eq." + businessId +
      "&scheduled_at=gte." + encodeURIComponent(startsAt) +
      "&scheduled_at=lt." + encodeURIComponent(endsAt) +
      "&order=scheduled_at.asc,id.asc" +
      "&limit=" + (CALENDAR_MAX_ITEMS + 1) +
      "&select=id,business_id,customer_id,lead_id,quote_id,job_id,vehicle_id,status,requested_at,scheduled_at",
  )) as CalendarAppointmentRow[] | null;

  const appointments = appointmentRows ?? [];

  if (appointments.length > CALENDAR_MAX_ITEMS) {
    throw new Error("Calendar month exceeds the supported event limit.");
  }

  if (appointments.length === 0) {
    return {
      month: selected.key,
      startsAt,
      endsAt,
      previousMonth: formatCalendarMonth(previous.year, previous.month),
      nextMonth: formatCalendarMonth(next.year, next.month),
      items: [],
    };
  }

  const jobIds = [...new Set(appointments.map((appointment) => appointment.job_id))];
  const customerIds = [
    ...new Set(appointments.map((appointment) => appointment.customer_id)),
  ];
  const vehicleIds = [
    ...new Set(
      appointments
        .map((appointment) => appointment.vehicle_id)
        .filter((vehicleId): vehicleId is string => Boolean(vehicleId)),
    ),
  ];

  const [jobRows, customerRows, vehicleRows] = await Promise.all([
    supabaseRest<CalendarJobRow[]>(
      "jobs",
      "GET",
      null,
      "business_id=eq." + businessId +
        "&id=in.(" + jobIds.join(",") + ")" +
        "&select=id,business_id,customer_id,lead_id,quote_id,vehicle_id,job_number,title,status,scheduled_at",
    ),
    supabaseRest<CalendarCustomerRow[]>(
      "customers",
      "GET",
      null,
      "business_id=eq." + businessId +
        "&id=in.(" + customerIds.join(",") + ")" +
        "&select=id,business_id,full_name",
    ),
    vehicleIds.length > 0
      ? supabaseRest<CalendarVehicleRow[]>(
          "vehicles",
          "GET",
          null,
          "business_id=eq." + businessId +
            "&id=in.(" + vehicleIds.join(",") + ")" +
            "&select=id,business_id,customer_id,brand,model",
        )
      : Promise.resolve([]),
  ]);

  const jobsById = new Map(
    ((jobRows as CalendarJobRow[] | null) ?? []).map((job) => [job.id, job]),
  );
  const customersById = new Map(
    ((customerRows as CalendarCustomerRow[] | null) ?? []).map(
      (customer) => [customer.id, customer],
    ),
  );
  const vehiclesById = new Map(
    ((vehicleRows as CalendarVehicleRow[] | null) ?? []).map(
      (vehicle) => [vehicle.id, vehicle],
    ),
  );

  const items = appointments.map((appointment): CalendarAppointmentItem => {
    const job = jobsById.get(appointment.job_id);
    const customer = customersById.get(appointment.customer_id);
    const vehicle = appointment.vehicle_id
      ? vehiclesById.get(appointment.vehicle_id)
      : null;

    if (
      !appointment.id ||
      appointment.business_id !== businessId ||
      !appointment.requested_at ||
      !appointment.scheduled_at ||
      !job ||
      job.business_id !== businessId ||
      job.customer_id !== appointment.customer_id ||
      job.lead_id !== appointment.lead_id ||
      job.quote_id !== appointment.quote_id ||
      job.vehicle_id !== appointment.vehicle_id ||
      job.scheduled_at !== appointment.scheduled_at ||
      !customer ||
      customer.business_id !== businessId ||
      !customer.full_name ||
      (
        appointment.vehicle_id !== null &&
        (
          !vehicle ||
          vehicle.business_id !== businessId ||
          vehicle.customer_id !== appointment.customer_id
        )
      )
    ) {
      throw new Error("Calendar relationships are inconsistent.");
    }

    return {
      appointment: {
        id: appointment.id,
        customerId: appointment.customer_id,
        jobId: appointment.job_id,
        vehicleId: appointment.vehicle_id,
        status: appointment.status,
        requestedAt: appointment.requested_at,
        scheduledAt: appointment.scheduled_at,
      },
      job: {
        id: job.id,
        jobNumber: job.job_number,
        title: job.title,
        status: job.status,
        scheduledAt: job.scheduled_at,
      },
      customer: {
        id: customer.id,
        fullName: customer.full_name,
      },
      vehicle: vehicle
        ? {
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
          }
        : null,
    };
  });

  return {
    month: selected.key,
    startsAt,
    endsAt,
    previousMonth: formatCalendarMonth(previous.year, previous.month),
    nextMonth: formatCalendarMonth(next.year, next.month),
    items,
  };
}

const LEAD_LIST_DEFAULT_PAGE = 1;
const LEAD_LIST_DEFAULT_LIMIT = 20;
const LEAD_LIST_MAX_LIMIT = 100;
const LEAD_LIST_SEARCH_CANDIDATE_LIMIT = 200;

function normalizeLeadListSearch(search?: string): string | null {
  if (search === undefined) {
    return null;
  }

  const normalized = search.trim();
  return normalized.length > 0 ? normalized : null;
}

function matchesLeadListSearch(
  item: LeadListItem,
  normalizedSearch: string,
): boolean {
  const searchableFields = [
    item.customer.full_name,
    item.customer.phone,
    item.customer.email,
    item.vehicle?.plate,
    item.vehicle?.brand,
    item.vehicle?.model,
  ].map((value) => (value ?? "").toLowerCase());

  return searchableFields.join(" ").includes(normalizedSearch.toLowerCase());
}

async function enrichLeadListItems(
  businessId: string,
  leads: Lead[],
): Promise<LeadListItem[]> {
  const customerIds = [...new Set(
    leads
      .map((lead) => lead.customer_id)
      .filter((customerId): customerId is string => Boolean(customerId)),
  )];

  const vehicleIds = [...new Set(
    leads
      .map((lead) => lead.vehicle_id)
      .filter((vehicleId): vehicleId is string => Boolean(vehicleId)),
  )];

  const leadIds = [...new Set(
    leads
      .map((lead) => lead.id)
      .filter((leadId): leadId is string => Boolean(leadId)),
  )];

  const [customerRows, vehicleRows, quoteRows, jobRows, appointmentRows] = await Promise.all([
    customerIds.length > 0
      ? supabaseRest<Customer[]>(
          "customers",
          "GET",
          null,
          `business_id=eq.${businessId}&id=in.(${customerIds.join(",")})&select=*`,
        )
      : Promise.resolve([]),
    vehicleIds.length > 0
      ? supabaseRest<Vehicle[]>(
          "vehicles",
          "GET",
          null,
          `business_id=eq.${businessId}&id=in.(${vehicleIds.join(",")})&select=*`,
        )
      : Promise.resolve([]),
    leadIds.length > 0
      ? supabaseRest<Quote[]>(
          "quotes",
          "GET",
          null,
          `business_id=eq.${businessId}&lead_id=in.(${leadIds.join(",")})&order=created_at.desc,id.desc&select=*`,
        )
      : Promise.resolve([]),
    leadIds.length > 0
      ? supabaseRest<Job[]>(
          "jobs",
          "GET",
          null,
          `business_id=eq.${businessId}&lead_id=in.(${leadIds.join(",")})&order=created_at.desc,id.desc&select=*`,
        )
      : Promise.resolve([]),
    leadIds.length > 0
      ? supabaseRest<Appointment[]>(
          "appointments",
          "GET",
          null,
          `business_id=eq.${businessId}&lead_id=in.(${leadIds.join(",")})&order=requested_at.desc.nullslast,created_at.desc,id.desc&select=*`,
        )
      : Promise.resolve([]),
  ]);

  const customersById = new Map<string, Customer>();
  for (const customer of (customerRows as Customer[] | null) ?? []) {
    if (customer.id) {
      customersById.set(customer.id, customer);
    }
  }

  const vehiclesById = new Map<string, Vehicle>();
  for (const vehicle of (vehicleRows as Vehicle[] | null) ?? []) {
    if (vehicle.id) {
      vehiclesById.set(vehicle.id, vehicle);
    }
  }

  // Rows are pre-sorted by the deterministic tiebreaker, so the first match per lead is the latest.
  const latestQuoteByLeadId = new Map<string, Quote>();
  for (const quote of (quoteRows as Quote[] | null) ?? []) {
    if (quote.lead_id && !latestQuoteByLeadId.has(quote.lead_id)) {
      latestQuoteByLeadId.set(quote.lead_id, quote);
    }
  }

  const latestJobByLeadId = new Map<string, Job>();
  for (const job of (jobRows as Job[] | null) ?? []) {
    if (job.lead_id && !latestJobByLeadId.has(job.lead_id)) {
      latestJobByLeadId.set(job.lead_id, job);
    }
  }

  const latestAppointmentByLeadId = new Map<string, Appointment>();
  for (const appointment of (appointmentRows as Appointment[] | null) ?? []) {
    if (appointment.lead_id && !latestAppointmentByLeadId.has(appointment.lead_id)) {
      latestAppointmentByLeadId.set(appointment.lead_id, appointment);
    }
  }

  return leads.map((lead) => {
    const customer = customersById.get(lead.customer_id);

    if (!customer) {
      throw new Error("Lead relationships are inconsistent.");
    }

    return {
      lead,
      customer,
      vehicle: lead.vehicle_id ? vehiclesById.get(lead.vehicle_id) ?? null : null,
      latestQuote: lead.id ? latestQuoteByLeadId.get(lead.id) ?? null : null,
      latestJob: lead.id ? latestJobByLeadId.get(lead.id) ?? null : null,
      latestAppointment: lead.id ? latestAppointmentByLeadId.get(lead.id) ?? null : null,
    };
  });
}

export async function getLeadsList(
  input: LeadListQueryParams,
): Promise<LeadListResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();

  const page = Number.isInteger(input.page) && (input.page ?? 0) > 0
    ? Math.max(1, input.page as number)
    : LEAD_LIST_DEFAULT_PAGE;

  const limit = Number.isInteger(input.limit) && (input.limit ?? 0) > 0
    ? Math.min(Math.max(1, input.limit as number), LEAD_LIST_MAX_LIMIT)
    : LEAD_LIST_DEFAULT_LIMIT;

  const normalizedSearch = normalizeLeadListSearch(input.search);
  const normalizedSource = input.source?.trim() || null;

  const baseLeadsFilter = `business_id=eq.${businessId}${input.status ? `&lifecycle_status=eq.${input.status}` : ""}${normalizedSource ? `&source=eq.${encodeURIComponent(normalizedSource)}` : ""}`;

  if (normalizedSearch) {
    const candidateRows = (await supabaseRest<Lead[]>(
      "leads",
      "GET",
      null,
      `${baseLeadsFilter}&order=created_at.desc,id.desc&limit=${LEAD_LIST_SEARCH_CANDIDATE_LIMIT}&select=*`,
    )) as Lead[] | null;

    const candidateLeads = (candidateRows ?? []).filter((lead): lead is Lead => Boolean(lead?.id));

    if (candidateLeads.length === 0) {
      return {
        items: [],
        pagination: {
          page,
          limit,
          returned: 0,
          hasNextPage: false,
        },
      };
    }

    const enrichedItems = await enrichLeadListItems(businessId, candidateLeads);
    const matchedItems = enrichedItems.filter((item) => matchesLeadListSearch(item, normalizedSearch));
    const startIndex = (page - 1) * limit;
    const pageItems = matchedItems.slice(startIndex, startIndex + limit);

    return {
      items: pageItems,
      pagination: {
        page,
        limit,
        returned: pageItems.length,
        hasNextPage: startIndex + limit < matchedItems.length,
      },
    };
  }

  const offset = (page - 1) * limit;
  const leadsRows = (await supabaseRest<Lead[]>(
    "leads",
    "GET",
    null,
    `${baseLeadsFilter}&order=created_at.desc,id.desc&offset=${offset}&limit=${limit + 1}&select=*`,
  )) as Lead[] | null;

  const leads = (leadsRows ?? []).filter((lead): lead is Lead => Boolean(lead?.id));
  const pageLeads = leads.slice(0, limit);
  const hasNextPage = leads.length > limit;

  if (pageLeads.length === 0) {
    return {
      items: [],
      pagination: {
        page,
        limit,
        returned: 0,
        hasNextPage: false,
      },
    };
  }

  const items = await enrichLeadListItems(businessId, pageLeads);

  return {
    items,
    pagination: {
      page,
      limit,
      returned: items.length,
      hasNextPage,
    },
  };
}

const CUSTOMER_LIST_DEFAULT_PAGE = 1;
const CUSTOMER_LIST_DEFAULT_LIMIT = 20;
const CUSTOMER_LIST_MAX_LIMIT = 100;
const CUSTOMER_LIST_SEARCH_CANDIDATE_LIMIT = 200;

function normalizeCustomerListSearch(search?: string): string | null {
  if (search === undefined) {
    return null;
  }

  const normalized = search.trim();
  return normalized.length > 0 ? normalized : null;
}

function matchesCustomerListSearch(
  item: CustomerListItem,
  normalizedSearch: string,
): boolean {
  const searchableFields = [
    item.customer.full_name,
    item.customer.phone,
    item.customer.email,
    item.customer.city,
  ].map((value) => (value ?? "").toLowerCase());

  return searchableFields.join(" ").includes(normalizedSearch.toLowerCase());
}

async function enrichCustomerListItems(
  businessId: string,
  customers: Customer[],
): Promise<CustomerListItem[]> {
  const customerIds = [...new Set(
    customers
      .map((customer) => customer.id)
      .filter((customerId): customerId is string => Boolean(customerId)),
  )];

  const [vehicleRows, leadRows] = await Promise.all([
    customerIds.length > 0
      ? supabaseRest<Vehicle[]>(
          "vehicles",
          "GET",
          null,
          `business_id=eq.${businessId}&customer_id=in.(${customerIds.join(",")})&order=created_at.desc,id.desc&select=*`,
        )
      : Promise.resolve([]),
    customerIds.length > 0
      ? supabaseRest<Lead[]>(
          "leads",
          "GET",
          null,
          `business_id=eq.${businessId}&customer_id=in.(${customerIds.join(",")})&order=created_at.desc,id.desc&select=*`,
        )
      : Promise.resolve([]),
  ]);

  // Rows are pre-sorted by the deterministic tiebreaker, so the first match per customer is the latest.
  const latestVehicleByCustomerId = new Map<string, Vehicle>();
  for (const vehicle of (vehicleRows as Vehicle[] | null) ?? []) {
    if (vehicle.customer_id && !latestVehicleByCustomerId.has(vehicle.customer_id)) {
      latestVehicleByCustomerId.set(vehicle.customer_id, vehicle);
    }
  }

  const latestLeadByCustomerId = new Map<string, Lead>();
  for (const lead of (leadRows as Lead[] | null) ?? []) {
    if (lead.customer_id && !latestLeadByCustomerId.has(lead.customer_id)) {
      latestLeadByCustomerId.set(lead.customer_id, lead);
    }
  }

  return customers.map((customer) => ({
    customer,
    latestVehicle: customer.id ? latestVehicleByCustomerId.get(customer.id) ?? null : null,
    latestLead: customer.id ? latestLeadByCustomerId.get(customer.id) ?? null : null,
  }));
}

export async function getCustomersList(
  input: CustomerListQueryParams,
): Promise<CustomerListResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();

  const page = Number.isInteger(input.page) && (input.page ?? 0) > 0
    ? Math.max(1, input.page as number)
    : CUSTOMER_LIST_DEFAULT_PAGE;

  const limit = Number.isInteger(input.limit) && (input.limit ?? 0) > 0
    ? Math.min(Math.max(1, input.limit as number), CUSTOMER_LIST_MAX_LIMIT)
    : CUSTOMER_LIST_DEFAULT_LIMIT;

  const normalizedSearch = normalizeCustomerListSearch(input.search);
  const baseCustomersFilter = `business_id=eq.${businessId}`;

  if (normalizedSearch) {
    const candidateRows = (await supabaseRest<Customer[]>(
      "customers",
      "GET",
      null,
      `${baseCustomersFilter}&order=created_at.desc,id.desc&limit=${CUSTOMER_LIST_SEARCH_CANDIDATE_LIMIT}&select=*`,
    )) as Customer[] | null;

    const candidateCustomers = (candidateRows ?? []).filter((customer): customer is Customer => Boolean(customer?.id));

    if (candidateCustomers.length === 0) {
      return {
        items: [],
        pagination: {
          page,
          limit,
          returned: 0,
          hasNextPage: false,
        },
      };
    }

    const enrichedItems = await enrichCustomerListItems(businessId, candidateCustomers);
    const matchedItems = enrichedItems.filter((item) => matchesCustomerListSearch(item, normalizedSearch));
    const startIndex = (page - 1) * limit;
    const pageItems = matchedItems.slice(startIndex, startIndex + limit);

    return {
      items: pageItems,
      pagination: {
        page,
        limit,
        returned: pageItems.length,
        hasNextPage: startIndex + limit < matchedItems.length,
      },
    };
  }

  const offset = (page - 1) * limit;
  const customersRows = (await supabaseRest<Customer[]>(
    "customers",
    "GET",
    null,
    `${baseCustomersFilter}&order=created_at.desc,id.desc&offset=${offset}&limit=${limit + 1}&select=*`,
  )) as Customer[] | null;

  const customers = (customersRows ?? []).filter((customer): customer is Customer => Boolean(customer?.id));
  const pageCustomers = customers.slice(0, limit);
  const hasNextPage = customers.length > limit;

  if (pageCustomers.length === 0) {
    return {
      items: [],
      pagination: {
        page,
        limit,
        returned: 0,
        hasNextPage: false,
      },
    };
  }

  const items = await enrichCustomerListItems(businessId, pageCustomers);

  return {
    items,
    pagination: {
      page,
      limit,
      returned: items.length,
      hasNextPage,
    },
  };
}

const RECENT_ACTIVITY_DEFAULT_LIMIT = 10;
const RECENT_ACTIVITY_MAX_LIMIT = 50;
type RecentActivityRow = Pick<
  ActivityLog,
  "id" | "event_type" | "created_at" | "customer_id" | "lead_id" | "job_id"
>;

export async function getRecentActivity(input?: {
  limit?: number;
}): Promise<RecentActivity[]> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();
  const limit = Number.isInteger(input?.limit) && (input?.limit ?? 0) > 0
    ? Math.min(input?.limit as number, RECENT_ACTIVITY_MAX_LIMIT)
    : RECENT_ACTIVITY_DEFAULT_LIMIT;

  const rows = (await supabaseRest<RecentActivityRow[]>(
    "activity_log",
    "GET",
    null,
    `business_id=eq.${businessId}&order=created_at.desc,id.desc&limit=${limit}&select=id,event_type,created_at,customer_id,lead_id,job_id`,
  )) as RecentActivityRow[] | null;

  return (rows ?? [])
    .filter(
      (activity): activity is typeof activity & { id: string; created_at: string } =>
        Boolean(activity.id && activity.created_at),
    )
    .map((activity) => ({
      id: activity.id,
      eventType: activity.event_type,
      createdAt: activity.created_at,
      customerId: activity.customer_id ?? null,
      leadId: activity.lead_id ?? null,
      jobId: activity.job_id ?? null,
    }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function validateAcceptedQuoteResult(
  value: unknown,
  businessId: string,
  quoteId: string,
): AcceptQuoteAndCreateJobResult {
  if (!isRecord(value) || !isRecord(value.quote) || !isRecord(value.lead) || !isRecord(value.job)) {
    throw new Error("Supabase returned an invalid quote acceptance result.");
  }

  const quote = value.quote;
  const lead = value.lead;
  const job = value.job;
  const appointment = value.appointment === undefined ? null : value.appointment;

  if (
    quote.id !== quoteId ||
    quote.business_id !== businessId ||
    quote.status !== "ACCEPTED" ||
    typeof quote.lead_id !== "string" ||
    lead.id !== quote.lead_id ||
    lead.business_id !== businessId ||
    lead.lifecycle_status !== "BOOKED" ||
    typeof lead.customer_id !== "string" ||
    typeof job.id !== "string" ||
    job.business_id !== businessId ||
    job.customer_id !== lead.customer_id ||
    job.lead_id !== lead.id ||
    job.quote_id !== quote.id ||
    (appointment !== null && !isRecord(appointment)) ||
    (isRecord(appointment) &&
      (appointment.business_id !== businessId ||
        appointment.customer_id !== lead.customer_id ||
        appointment.lead_id !== lead.id ||
        appointment.quote_id !== quote.id ||
        appointment.job_id !== job.id ||
        appointment.status !== "REQUESTED" &&
          appointment.status !== "CONFIRMED" &&
          appointment.status !== "COMPLETED" &&
          appointment.status !== "CANCELLED"))
  ) {
    throw new Error("Supabase returned an inconsistent quote acceptance result.");
  }

  return {
    quote: quote as Quote,
    lead: lead as Lead,
    job: job as Job,
    appointment: (appointment as Appointment | null) || null,
  };
}

export async function acceptQuoteAndCreateJob(input: {
  quoteId: string;
  source?: string;
}): Promise<AcceptQuoteAndCreateJobResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const quoteId = input.quoteId.trim();

  if (!quoteId) {
    throw new Error("quoteId is required.");
  }

  const businessContext = await resolveCurrentBusinessContext();
  const businessId = businessContext.businessId;
  const result = await supabaseRest<unknown>(
    "rpc/accept_quote_and_create_job",
    "POST",
    {
      p_business_id: businessId,
      p_quote_id: quoteId,
      p_source: input.source?.trim() || "internal",
    },
  );

  return validateAcceptedQuoteResult(result, businessId, quoteId);
}

export async function markQuoteAsSent(
  quoteId: string,
): Promise<MarkQuoteAsSentResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const normalizedQuoteId = quoteId.trim();
  if (!normalizedQuoteId) {
    throw new Error("quoteId is required.");
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/mark_quote_as_sent",
    "POST",
    {
      p_business_id: businessId,
      p_quote_id: normalizedQuoteId,
      p_source: "crm_quote_send_ui",
    },
  );

  if (
    !isRecord(result) ||
    !isRecord(result.quote) ||
    typeof result.no_op !== "boolean"
  ) {
    throw new Error("Supabase returned an invalid quote send result.");
  }

  return {
    quote: result.quote as Quote,
    noOp: result.no_op,
  };
}

export type IssueQuoteShareTokenResult = {
  quote: Quote;
  token: string;
  transitioned: boolean;
};

export async function issueQuoteShareToken(
  quoteId: string,
): Promise<IssueQuoteShareTokenResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const normalizedQuoteId = quoteId.trim();
  if (!normalizedQuoteId) {
    throw new Error("quoteId is required.");
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/issue_quote_share_token",
    "POST",
    {
      p_business_id: businessId,
      p_quote_id: normalizedQuoteId,
    },
  );

  if (
    !isRecord(result) ||
    !isRecord(result.quote) ||
    typeof result.token !== "string" ||
    !/^[0-9a-f]{32}$/.test(result.token) ||
    typeof result.transitioned !== "boolean"
  ) {
    throw new Error("Supabase returned an invalid quote share token result.");
  }

  return {
    quote: result.quote as Quote,
    token: result.token,
    transitioned: result.transitioned,
  };
}

export type PublicQuote = {
  businessName: string;
  customerName: string | null;
  vehicleName: string | null;
  serviceNames: string[];
  totalPrice: number | null;
  estimatedTime: string | null;
  status: Quote["status"];
  createdAt: string | null;
};

export async function getPublicQuoteByToken(
  token: string,
): Promise<PublicQuote | null> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const normalizedToken = token.trim();
  if (!/^[0-9a-f]{32}$/.test(normalizedToken)) {
    return null;
  }

  let result: unknown;
  try {
    result = await supabaseRest<unknown>(
      "rpc/get_public_quote_by_token",
      "POST",
      { p_token: normalizedToken },
    );
  } catch {
    // Unknown / rotated / DRAFT tokens surface as an RPC error; the public
    // page treats them uniformly as unavailable without leaking detail.
    return null;
  }

  if (!isRecord(result)) {
    throw new Error("Supabase returned an invalid public quote result.");
  }

  const serviceNames = Array.isArray(result.service_names)
    ? result.service_names.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : [];

  return {
    businessName: typeof result.business_name === "string" ? result.business_name : "AUTO 9",
    customerName:
      (typeof result.customer_name === "string" && result.customer_name.trim()
        ? result.customer_name
        : null) ??
      (typeof result.customer_full_name_fallback === "string" &&
      result.customer_full_name_fallback.trim()
        ? result.customer_full_name_fallback
        : null),
    vehicleName:
      typeof result.vehicle_name === "string" && result.vehicle_name.trim()
        ? result.vehicle_name
        : null,
    serviceNames,
    totalPrice: typeof result.total_price === "number" ? result.total_price : null,
    estimatedTime:
      typeof result.estimated_time === "string" && result.estimated_time.trim()
        ? result.estimated_time
        : null,
    status: result.status as Quote["status"],
    createdAt: typeof result.created_at === "string" ? result.created_at : null,
  };
}

export async function acceptPublicQuoteByToken(
  token: string,
): Promise<AcceptQuoteAndCreateJobResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const normalizedToken = token.trim();
  if (!/^[0-9a-f]{32}$/.test(normalizedToken)) {
    throw new Error("token is required.");
  }

  const result = await supabaseRest<unknown>(
    "rpc/accept_public_quote_by_token",
    "POST",
    {
      p_token: normalizedToken,
      p_source: "public_quote_share",
    },
  );

  // The delegated canonical acceptance returns the 026 result shape. Validate
  // the minimal envelope defensively before returning.
  if (
    !isRecord(result) ||
    !isRecord(result.quote) ||
    !isRecord(result.lead) ||
    !isRecord(result.job)
  ) {
    throw new Error("Supabase returned an invalid public quote acceptance result.");
  }

  return result as unknown as AcceptQuoteAndCreateJobResult;
}

function validateTransitionLeadResult(
  value: unknown,
  businessId: string,
  leadId: string,
  targetStatus: LeadLifecycleStatus,
): TransitionLeadStatusResult {
  if (!isRecord(value) || !isRecord(value.lead)) {
    throw new Error("Supabase returned an invalid lead transition result.");
  }

  const lead = value.lead;
  const activity = value.activity === null || value.activity === undefined
    ? null
    : value.activity;

  if (
    lead.id !== leadId ||
    lead.business_id !== businessId ||
    lead.lifecycle_status !== targetStatus ||
    (activity !== null && !isRecord(activity))
  ) {
    throw new Error("Supabase returned an inconsistent lead transition result.");
  }

  return {
    lead: lead as Lead,
    activity: activity as ActivityLog | null,
  };
}

export async function transitionLeadStatus(input: {
  leadId: string;
  targetStatus: LeadLifecycleStatus;
  source?: string;
}): Promise<TransitionLeadStatusResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const leadId = input.leadId.trim();

  if (!leadId) {
    throw new Error("leadId is required.");
  }

  const businessContext = await resolveCurrentBusinessContext();
  const businessId = businessContext.businessId;
  const result = await supabaseRest<unknown>(
    "rpc/transition_lead_status",
    "POST",
    {
      p_business_id: businessId,
      p_lead_id: leadId,
      p_target_status: input.targetStatus,
      p_source: input.source?.trim() || "internal",
    },
  );

  return validateTransitionLeadResult(
    result,
    businessId,
    leadId,
    input.targetStatus,
  );
}

function validateTransitionAppointmentResult(
  value: unknown,
  businessId: string,
  appointmentId: string,
  targetStatus: AppointmentTransitionStatus,
): TransitionAppointmentStatusResult {
  if (!isRecord(value) || !isRecord(value.appointment) || !isRecord(value.job)) {
    throw new Error("Supabase returned an invalid appointment transition result.");
  }

  const appointment = value.appointment;
  const job = value.job;
  const activity = value.activity === null || value.activity === undefined
    ? null
    : value.activity;

  if (
    appointment.id !== appointmentId ||
    appointment.business_id !== businessId ||
    appointment.job_id !== job.id ||
    appointment.status !== targetStatus ||
    job.business_id !== businessId ||
    typeof job.id !== "string" ||
    (activity !== null && !isRecord(activity))
  ) {
    throw new Error("Supabase returned an inconsistent appointment transition result.");
  }

  return {
    appointment: appointment as Appointment,
    job: job as Job,
    activity: activity as ActivityLog | null,
  };
}

export async function transitionAppointmentStatus(input: {
  appointmentId: string;
  targetStatus: AppointmentTransitionStatus;
  source?: string;
  notes?: string | null;
}): Promise<TransitionAppointmentStatusResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const appointmentId = input.appointmentId.trim();

  if (!appointmentId) {
    throw new Error("appointmentId is required.");
  }

  const businessContext = await resolveCurrentBusinessContext();
  const businessId = businessContext.businessId;
  const result = await supabaseRest<unknown>(
    "rpc/transition_appointment_status",
    "POST",
    {
      p_business_id: businessId,
      p_appointment_id: appointmentId,
      p_target_status: input.targetStatus,
      p_source: input.source?.trim() || "internal",
      p_notes: input.notes ?? null,
    },
  );

  return validateTransitionAppointmentResult(
    result,
    businessId,
    appointmentId,
    input.targetStatus,
  );
}

function validateScheduleJobResult(
  value: unknown,
  businessId: string,
  jobId: string,
): ScheduleJobResult {
  if (!isRecord(value) || !isRecord(value.appointment) || !isRecord(value.job) || typeof value.no_op !== "boolean") {
    throw new Error("Supabase returned an invalid scheduling result.");
  }

  const appointment = value.appointment;
  const job = value.job;
  const activity = value.activity === null || value.activity === undefined
    ? null
    : value.activity;

  if (
    appointment.business_id !== businessId ||
    appointment.job_id !== jobId ||
    appointment.status !== "REQUESTED" ||
    typeof appointment.scheduled_at !== "string" ||
    job.business_id !== businessId ||
    job.id !== jobId ||
    job.status !== "SCHEDULED" ||
    typeof job.scheduled_at !== "string" ||
    appointment.scheduled_at !== job.scheduled_at ||
    (activity !== null && !isRecord(activity))
  ) {
    throw new Error("Supabase returned an inconsistent scheduling result.");
  }

  return {
    appointment: appointment as Appointment,
    job: job as Job,
    activity: activity as ActivityLog | null,
    noOp: value.no_op,
  };
}

export async function scheduleJob(input: {
  jobId: string;
  scheduledAtLocal: string;
}): Promise<ScheduleJobResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const jobId = input.jobId.trim();
  if (!jobId) {
    throw new Error("jobId is required.");
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/schedule_job",
    "POST",
    {
      p_business_id: businessId,
      p_job_id: jobId,
      p_scheduled_at_local: input.scheduledAtLocal,
    },
  );

  return validateScheduleJobResult(result, businessId, jobId);
}


function validateRescheduleJobResult(
  value: unknown,
  businessId: string,
  jobId: string,
): RescheduleJobResult {
  if (
    !isRecord(value) ||
    !isRecord(value.appointment) ||
    !isRecord(value.job) ||
    typeof value.no_op !== "boolean"
  ) {
    throw new Error("Supabase returned an invalid rescheduling result.");
  }

  const appointment = value.appointment;
  const job = value.job;
  const activity = value.activity === null || value.activity === undefined
    ? null
    : value.activity;

  const eligibleState =
    (appointment.status === "REQUESTED" && job.status === "SCHEDULED") ||
    (appointment.status === "CONFIRMED" && job.status === "CONFIRMED");

  const validActivity =
    activity === null ||
    (
      isRecord(activity) &&
      activity.business_id === businessId &&
      activity.job_id === jobId &&
      activity.event_type === "appointment.rescheduled"
    );

  if (
    appointment.business_id !== businessId ||
    appointment.job_id !== jobId ||
    typeof appointment.id !== "string" ||
    typeof appointment.requested_at !== "string" ||
    typeof appointment.scheduled_at !== "string" ||
    job.business_id !== businessId ||
    job.id !== jobId ||
    typeof job.scheduled_at !== "string" ||
    appointment.scheduled_at !== job.scheduled_at ||
    !eligibleState ||
    !validActivity ||
    (value.no_op && activity !== null) ||
    (!value.no_op && activity === null)
  ) {
    throw new Error("Supabase returned an inconsistent rescheduling result.");
  }

  return {
    appointment: appointment as Appointment,
    job: job as Job,
    activity: activity as ActivityLog | null,
    noOp: value.no_op,
  };
}

export async function rescheduleJob(input: {
  jobId: string;
  expectedScheduledAt: string;
  scheduledAtLocal: string;
}): Promise<RescheduleJobResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const jobId = input.jobId.trim();
  const expectedScheduledAt = input.expectedScheduledAt.trim();
  const scheduledAtLocal = input.scheduledAtLocal.trim();

  if (!jobId || !expectedScheduledAt || !scheduledAtLocal) {
    throw new Error(
      "jobId, expectedScheduledAt and scheduledAtLocal are required.",
    );
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/reschedule_job",
    "POST",
    {
      p_business_id: businessId,
      p_job_id: jobId,
      p_expected_scheduled_at: expectedScheduledAt,
      p_scheduled_at_local: scheduledAtLocal,
    },
  );

  return validateRescheduleJobResult(result, businessId, jobId);
}

export type StartJobResult = {
  job: Job;
  activity: ActivityLog | null;
  noOp: boolean;
};

function validateStartJobResult(
  value: unknown,
  businessId: string,
  jobId: string,
): StartJobResult {
  if (!isRecord(value) || !isRecord(value.job) || typeof value.no_op !== "boolean") {
    throw new Error("Supabase returned an invalid job start result.");
  }

  const job = value.job;
  const activity = value.activity === null || value.activity === undefined
    ? null
    : value.activity;

  if (
    job.id !== jobId ||
    job.business_id !== businessId ||
    job.status !== "IN_PROGRESS" ||
    typeof job.started_at !== "string" ||
    (activity !== null && !isRecord(activity))
  ) {
    throw new Error("Supabase returned an inconsistent job start result.");
  }

  return {
    job: job as Job,
    activity: activity as ActivityLog | null,
    noOp: value.no_op,
  };
}

export async function startJob(jobId: string): Promise<StartJobResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const normalizedJobId = jobId.trim();
  if (!normalizedJobId) {
    throw new Error("jobId is required.");
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/start_job",
    "POST",
    {
      p_business_id: businessId,
      p_job_id: normalizedJobId,
    },
  );

  return validateStartJobResult(result, businessId, normalizedJobId);
}

function validateRecordJobPaymentResult(
  value: unknown,
  businessId: string,
  jobId: string,
): RecordJobPaymentResult {
  if (!isRecord(value) || !isRecord(value.payment) || !isRecord(value.job) || typeof value.no_op !== "boolean") {
    throw new Error("Supabase returned an invalid payment result.");
  }

  const payment = value.payment;
  const job = value.job;
  const activity = value.activity === null || value.activity === undefined
    ? null
    : value.activity;

  if (
    payment.business_id !== businessId ||
    payment.job_id !== jobId ||
    typeof payment.id !== "string" ||
    typeof payment.amount !== "number" ||
    !["CASH", "CARD", "BANK_TRANSFER", "OTHER"].includes(payment.method as string) ||
    typeof payment.received_at !== "string" ||
    job.business_id !== businessId ||
    job.id !== jobId ||
    job.status !== "PAID" ||
    (activity !== null && !isRecord(activity))
  ) {
    throw new Error("Supabase returned an inconsistent payment result.");
  }

  return {
    payment: payment as Payment,
    job: job as Job,
    activity: activity as ActivityLog | null,
    noOp: value.no_op,
  };
}

export async function findJobPaymentReplay(input: {
  idempotencyKey: string;
  jobId: string;
}): Promise<RecordJobPaymentResult | null> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const businessId = await getCurrentBusinessId();
  const paymentRows = await supabaseRest<Payment[]>(
    "payments",
    "GET",
    null,
    `business_id=eq.${businessId}&idempotency_key=eq.${encodeURIComponent(input.idempotencyKey.trim())}&select=*&limit=1`,
  );
  const payment = (paymentRows as Payment[] | null)?.[0];

  if (!payment) {
    return null;
  }

  if (payment.job_id !== input.jobId.trim()) {
    throw new Error("Payment request token belongs to another job.");
  }

  const jobRows = await supabaseRest<Job[]>(
    "jobs",
    "GET",
    null,
    `business_id=eq.${businessId}&id=eq.${payment.job_id}&select=*`,
  );
  const job = (jobRows as Job[] | null)?.[0];

  if (!job || job.status !== "PAID") {
    throw new Error("Payment replay has inconsistent job state.");
  }

  return {
    payment,
    job,
    activity: null,
    noOp: true,
  };
}

export async function recordJobPayment(input: {
  idempotencyKey: string;
  jobId: string;
  method: Payment["method"];
}): Promise<RecordJobPaymentResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const jobId = input.jobId.trim();
  if (!jobId) {
    throw new Error("jobId is required.");
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/record_job_payment",
    "POST",
    {
      p_business_id: businessId,
      p_idempotency_key: input.idempotencyKey.trim(),
      p_job_id: jobId,
      p_method: input.method,
    },
  );

  return validateRecordJobPaymentResult(result, businessId, jobId);
}

function validateRequestJobReviewResult(
  value: unknown,
  businessId: string,
  jobId: string,
): RequestJobReviewResult {
  if (!isRecord(value) || !isRecord(value.review_request) || !isRecord(value.lead) || typeof value.no_op !== "boolean") {
    throw new Error("Supabase returned an invalid review request result.");
  }

  const reviewRequest = value.review_request;
  const lead = value.lead;
  const activity = value.activity === null || value.activity === undefined
    ? null
    : value.activity;

  if (
    reviewRequest.business_id !== businessId ||
    reviewRequest.job_id !== jobId ||
    typeof reviewRequest.id !== "string" ||
    typeof reviewRequest.requested_at !== "string" ||
    lead.business_id !== businessId ||
    lead.lifecycle_status !== "REVIEW_REQUESTED" ||
    (activity !== null && !isRecord(activity))
  ) {
    throw new Error("Supabase returned an inconsistent review request result.");
  }

  return {
    reviewRequest: reviewRequest as ReviewRequest,
    lead: lead as Lead,
    activity: activity as ActivityLog | null,
    noOp: value.no_op,
  };
}

export async function requestJobReview(input: {
  idempotencyKey: string;
  jobId: string;
}): Promise<RequestJobReviewResult> {
  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase persistence is not configured.");
  }

  const jobId = input.jobId.trim();
  if (!jobId) {
    throw new Error("jobId is required.");
  }

  const businessId = await getCurrentBusinessId();
  const result = await supabaseRest<unknown>(
    "rpc/request_job_review",
    "POST",
    {
      p_business_id: businessId,
      p_idempotency_key: input.idempotencyKey.trim(),
      p_job_id: jobId,
    },
  );

  return validateRequestJobReviewResult(result, businessId, jobId);
}

export async function logActivity(input: ActivityLog) {
  if (!hasSupabaseWriteConfig()) {
    return null;
  }

  const businessId = await getCurrentBusinessId();

  return (await supabaseRest<ActivityLog>("activity_log", "POST", { ...input, business_id: businessId }, "select=*")) as ActivityLog | null;
}


function requireClaimedOutboxEvent(
  value: unknown,
  businessId: string,
): AutomationOutboxEvent {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error("Invalid automation outbox claim response.");
  }

  const event = value as Record<string, unknown>;

  if (
    typeof event.id !== "string" ||
    event.business_id !== businessId ||
    typeof event.event_type !== "string" ||
    typeof event.review_request_id !== "string" ||
    typeof event.created_at !== "string" ||
    typeof event.available_at !== "string" ||
    typeof event.attempt_count !== "number" ||
    typeof event.lease_token !== "string" ||
    typeof event.leased_until !== "string" ||
    event.processed_at !== null ||
    !(
      (event.provider_message_id === null &&
        event.provider_accepted_at === null) ||
      (typeof event.provider_message_id === "string" &&
        event.provider_message_id.length > 0 &&
        typeof event.provider_accepted_at === "string")
    ) ||
    !(
      (event.delivery_recipient_email === null &&
        event.delivery_customer_name === null &&
        event.delivery_review_url === null &&
        event.delivery_sender_email === null &&
        event.delivery_subject === null &&
        event.delivery_text === null &&
        event.delivery_html === null) ||
      (typeof event.delivery_recipient_email === "string" &&
        event.delivery_recipient_email.length > 0 &&
        typeof event.delivery_customer_name === "string" &&
        event.delivery_customer_name.length > 0 &&
        typeof event.delivery_review_url === "string" &&
        event.delivery_review_url.length > 0 &&
        typeof event.delivery_sender_email === "string" &&
        event.delivery_sender_email.length > 0 &&
        typeof event.delivery_subject === "string" &&
        event.delivery_subject.length > 0 &&
        typeof event.delivery_text === "string" &&
        event.delivery_text.length > 0 &&
        typeof event.delivery_html === "string" &&
        event.delivery_html.length > 0)
    )
  ) {
    throw new Error("Invalid automation outbox event shape.");
  }

  return event as AutomationOutboxEvent;
}

export async function claimAutomationOutbox(input: {
  businessId: string;
  limit?: number;
  leaseSeconds?: number;
}): Promise<AutomationOutboxEvent[]> {
  const businessId = input.businessId.trim();
  const limit = input.limit ?? 10;
  const leaseSeconds = input.leaseSeconds ?? 300;

  if (!businessId) {
    throw new Error("businessId is required.");
  }

  const result = await supabaseRest<AutomationOutboxEvent>(
    "rpc/claim_automation_outbox",
    "POST",
    {
      p_business_id: businessId,
      p_limit: limit,
      p_lease_seconds: leaseSeconds,
    },
    undefined,
    true,
  );

  if (!result) {
    return [];
  }

  const rows = Array.isArray(result) ? result : [result];

  return rows.map((row) => requireClaimedOutboxEvent(row, businessId));
}

export async function recordAutomationOutboxDeliverySnapshot(input: {
  businessId: string;
  outboxId: string;
  leaseToken: string;
  recipientEmail: string;
  customerName: string;
  reviewUrl: string;
  senderEmail: string;
  subject: string;
  text: string;
  html: string;
}): Promise<AutomationOutboxEvent> {
  const businessId = input.businessId.trim();
  const outboxId = input.outboxId.trim();
  const leaseToken = input.leaseToken.trim();
  const recipientEmail = input.recipientEmail.trim();
  const customerName = input.customerName.trim();
  const reviewUrl = input.reviewUrl.trim();
  const senderEmail = input.senderEmail.trim();
  const subject = input.subject.trim();
  const text = input.text;
  const html = input.html;

  if (
    !businessId ||
    !outboxId ||
    !leaseToken ||
    !recipientEmail ||
    !customerName ||
    !reviewUrl ||
    !senderEmail ||
    !subject ||
    !text ||
    !html
  ) {
    throw new Error("Delivery snapshot fields are required.");
  }

  const result = await supabaseRest<AutomationOutboxEvent>(
    "rpc/record_automation_outbox_delivery_snapshot",
    "POST",
    {
      p_business_id: businessId,
      p_outbox_id: outboxId,
      p_lease_token: leaseToken,
      p_recipient_email: recipientEmail,
      p_customer_name: customerName,
      p_review_url: reviewUrl,
      p_sender_email: senderEmail,
      p_subject: subject,
      p_text: text,
      p_html: html,
    },
  );

  if (
    !result ||
    Array.isArray(result) ||
    result.id !== outboxId ||
    result.business_id !== businessId ||
    result.delivery_recipient_email !== recipientEmail ||
    result.delivery_customer_name !== customerName ||
    result.delivery_review_url !== reviewUrl ||
    result.delivery_sender_email !== senderEmail ||
    result.delivery_subject !== subject ||
    result.delivery_text !== text ||
    result.delivery_html !== html
  ) {
    throw new Error("Invalid automation outbox delivery snapshot response.");
  }

  return result;
}

export async function recordAutomationOutboxProviderAcceptance(input: {
  businessId: string;
  outboxId: string;
  leaseToken: string;
  providerMessageId: string;
}): Promise<AutomationOutboxEvent> {
  const businessId = input.businessId.trim();
  const outboxId = input.outboxId.trim();
  const leaseToken = input.leaseToken.trim();
  const providerMessageId = input.providerMessageId.trim();

  if (!businessId || !outboxId || !leaseToken || !providerMessageId) {
    throw new Error("Provider acceptance identity is required.");
  }

  const result = await supabaseRest<AutomationOutboxEvent>(
    "rpc/record_automation_outbox_provider_acceptance",
    "POST",
    {
      p_business_id: businessId,
      p_outbox_id: outboxId,
      p_lease_token: leaseToken,
      p_provider_message_id: providerMessageId,
    },
  );

  if (
    !result ||
    Array.isArray(result) ||
    result.id !== outboxId ||
    result.business_id !== businessId ||
    result.provider_message_id !== providerMessageId ||
    typeof result.provider_accepted_at !== "string"
  ) {
    throw new Error("Invalid automation outbox provider acceptance response.");
  }

  return result;
}

export async function ackAutomationOutbox(input: {
  businessId: string;
  outboxId: string;
  leaseToken: string;
}): Promise<AutomationOutboxEvent> {
  const result = await supabaseRest<AutomationOutboxEvent>(
    "rpc/ack_automation_outbox",
    "POST",
    {
      p_business_id: input.businessId.trim(),
      p_outbox_id: input.outboxId.trim(),
      p_lease_token: input.leaseToken.trim(),
    },
  );

  if (!result || Array.isArray(result)) {
    throw new Error("Invalid automation outbox ACK response.");
  }

  return result;
}

export async function nackAutomationOutbox(input: {
  businessId: string;
  outboxId: string;
  leaseToken: string;
  retryAfterSeconds: number;
  error?: string | null;
}): Promise<AutomationOutboxEvent> {
  const result = await supabaseRest<AutomationOutboxEvent>(
    "rpc/nack_automation_outbox",
    "POST",
    {
      p_business_id: input.businessId.trim(),
      p_outbox_id: input.outboxId.trim(),
      p_lease_token: input.leaseToken.trim(),
      p_retry_after_seconds: input.retryAfterSeconds,
      p_error: input.error?.trim().slice(0, 500) || null,
    },
  );

  if (!result || Array.isArray(result)) {
    throw new Error("Invalid automation outbox NACK response.");
  }

  return result;
}
