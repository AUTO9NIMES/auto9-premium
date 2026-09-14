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
  confirmed_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
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

export type TransitionAppointmentStatusResult = {
  appointment: Appointment;
  job: Job;
  activity: ActivityLog | null;
};

export type JobDetailsResult = {
  job: Job;
  customer: Customer;
  vehicle: Vehicle | null;
  lead: Lead;
  quote: Quote | null;
  appointment: Appointment | null;
  services: LeadService[];
  activities: ActivityLog[];
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
      `${baseJobsFilter}&order=created_at.desc&limit=${JOB_LIST_SEARCH_CANDIDATE_LIMIT}&select=*`,
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
    `${baseJobsFilter}&order=created_at.desc&offset=${offset}&limit=${limit + 1}&select=*`,
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

export async function logActivity(input: ActivityLog) {
  if (!hasSupabaseWriteConfig()) {
    return null;
  }

  const businessId = await getCurrentBusinessId();

  return (await supabaseRest<ActivityLog>("activity_log", "POST", { ...input, business_id: businessId }, "select=*")) as ActivityLog | null;
}
