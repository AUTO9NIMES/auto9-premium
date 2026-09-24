import type {
  Appointment,
  Customer360LeadServiceEvidence,
  Customer360ReviewRequestEvidence,
  Job,
  Lead,
  Quote,
} from "../../../lib/crm";

export type CustomerNextActionKind =
  | "RECORD_PAYMENT"
  | "REQUEST_REVIEW"
  | "COMPLETE_JOB"
  | "START_JOB"
  | "CONFIRM_APPOINTMENT"
  | "SCHEDULE_JOB"
  | "SHARE_QUOTE"
  | "CREATE_OR_EDIT_QUOTE"
  | "FOLLOW_UP_LEAD"
  | "NONE";

export type CustomerNextAction = {
  kind: CustomerNextActionKind;
  href: string | null;
  leadId: string | null;
  jobId: string | null;
};

export type CustomerNextActionInput = {
  leads: Lead[];
  quotes: Quote[];
  jobs: Job[];
  appointments: Appointment[];
  leadServiceEvidence: Customer360LeadServiceEvidence[];
  reviewRequests: Customer360ReviewRequestEvidence[];
};

type Candidate = CustomerNextAction & {
  priority: number;
  createdAt: string | null;
  stableId: string;
};

const NONE: CustomerNextAction = {
  kind: "NONE",
  href: null,
  leadId: null,
  jobId: null,
};

const PRE_OPERATIONAL_LEAD_STATUSES = new Set([
  "NEW",
  "QUALIFIED",
  "CONTACTED",
]);

function nonEmptyId(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function timestamp(value: string | null | undefined): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed)
    ? parsed
    : Number.NEGATIVE_INFINITY;
}

function compareCandidates(a: Candidate, b: Candidate): number {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }

  const aTime = timestamp(a.createdAt);
  const bTime = timestamp(b.createdAt);

  if (aTime !== bTime) {
    return bTime - aTime;
  }

  return a.stableId.localeCompare(b.stableId);
}

function jobCandidate(
  kind: CustomerNextActionKind,
  priority: number,
  job: Job,
  jobId: string,
): Candidate {
  return {
    kind,
    priority,
    createdAt: job.created_at ?? null,
    stableId: jobId,
    href: `/crm/jobs/${jobId}`,
    leadId: job.lead_id,
    jobId,
  };
}

function leadCandidate(
  kind: CustomerNextActionKind,
  priority: number,
  lead: Lead,
  leadId: string,
): Candidate {
  return {
    kind,
    priority,
    createdAt: lead.created_at ?? null,
    stableId: leadId,
    href: `/crm/pipeline/${leadId}`,
    leadId,
    jobId: null,
  };
}

export function selectCustomerNextAction(
  input: CustomerNextActionInput,
): CustomerNextAction {
  const candidates: Candidate[] = [];

  const leadById = new Map(
    input.leads
      .filter((lead) => nonEmptyId(lead.id))
      .map((lead) => [lead.id as string, lead]),
  );

  const appointmentsByJob = new Map<string, Appointment[]>();

  for (const appointment of input.appointments) {
    const existing = appointmentsByJob.get(appointment.job_id) ?? [];
    existing.push(appointment);
    appointmentsByJob.set(appointment.job_id, existing);
  }

  const reviewedJobIds = new Set(
    input.reviewRequests.map((review) => review.job_id),
  );

  const leadIdsWithServices = new Set(
    input.leadServiceEvidence.map((service) => service.lead_id),
  );

  const quotesByLead = new Map<string, Quote[]>();

  for (const quote of input.quotes) {
    const existing = quotesByLead.get(quote.lead_id) ?? [];
    existing.push(quote);
    quotesByLead.set(quote.lead_id, existing);
  }

  const jobQuoteIds = new Set(
    input.jobs
      .map((job) => job.quote_id)
      .filter(nonEmptyId),
  );

  for (const job of input.jobs) {
    if (!nonEmptyId(job.id)) {
      continue;
    }

    const jobId = job.id;
    const relatedLead = leadById.get(job.lead_id);
    const relatedAppointments = appointmentsByJob.get(job.id) ?? [];

    if (
      job.status === "COMPLETED" &&
      typeof job.total_amount === "number" &&
      Number.isFinite(job.total_amount) &&
      job.total_amount > 0
    ) {
      candidates.push(jobCandidate("RECORD_PAYMENT", 10, job, jobId));
    }

    if (
      job.status === "PAID" &&
      relatedLead?.lifecycle_status === "BOOKED" &&
      !reviewedJobIds.has(job.id)
    ) {
      candidates.push(jobCandidate("REQUEST_REVIEW", 11, job, jobId));
    }

    if (
      job.status === "IN_PROGRESS" &&
      relatedAppointments.some(
        (appointment) =>
          typeof appointment.id === "string" &&
          appointment.id.trim().length > 0 &&
          appointment.status === "CONFIRMED",
      )
    ) {
      candidates.push(jobCandidate("COMPLETE_JOB", 1, job, jobId));
    }

    if (job.status === "CONFIRMED") {
      candidates.push(jobCandidate("START_JOB", 2, job, jobId));
    }

    if (job.status === "SCHEDULED") {
      const confirmable = relatedAppointments.some((appointment) =>
        typeof appointment.id === "string" &&
        appointment.id.trim().length > 0 &&
        appointment.status === "REQUESTED" &&
        typeof job.scheduled_at === "string" &&
        job.scheduled_at.length > 0 &&
        typeof appointment.scheduled_at === "string" &&
        appointment.scheduled_at.length > 0 &&
        appointment.scheduled_at === job.scheduled_at
      );

      if (confirmable) {
        candidates.push(
          jobCandidate("CONFIRM_APPOINTMENT", 3, job, jobId),
        );
      }
    }

    if (
      job.status === "QUOTE_ACCEPTED" &&
      !job.scheduled_at
    ) {
      const schedulable =
        relatedAppointments.length === 0 ||
        relatedAppointments.every(
          (appointment) =>
            appointment.status === "REQUESTED" &&
            !appointment.scheduled_at,
        );

      if (schedulable) {
        candidates.push(jobCandidate("SCHEDULE_JOB", 4, job, jobId));
      }
    }
  }

  for (const lead of input.leads) {
    if (!nonEmptyId(lead.id)) {
      continue;
    }

    const leadId = lead.id;
    const relatedQuotes = quotesByLead.get(leadId) ?? [];

    const shareableDraft = relatedQuotes.some(
      (quote) =>
        quote.status === "DRAFT" &&
        lead.lifecycle_status === "CONTACTED" &&
        nonEmptyId(quote.id) &&
        !jobQuoteIds.has(quote.id),
    );

    const shareableSent = relatedQuotes.some(
      (quote) =>
        quote.status === "SENT" &&
        lead.lifecycle_status === "QUOTE_SENT",
    );

    if (shareableDraft || shareableSent) {
      candidates.push(leadCandidate("SHARE_QUOTE", 20, lead, leadId));
      continue;
    }

    const editableDraft = relatedQuotes.some(
      (quote) =>
        quote.status === "DRAFT" &&
        nonEmptyId(quote.id) &&
        !jobQuoteIds.has(quote.id),
    );

    const canCreateQuote =
      relatedQuotes.length === 0 &&
      leadIdsWithServices.has(lead.id);

    if (
      PRE_OPERATIONAL_LEAD_STATUSES.has(lead.lifecycle_status) &&
      (editableDraft || canCreateQuote)
    ) {
      candidates.push(
        leadCandidate("CREATE_OR_EDIT_QUOTE", 21, lead, leadId),
      );
      continue;
    }

    if (PRE_OPERATIONAL_LEAD_STATUSES.has(lead.lifecycle_status)) {
      candidates.push(leadCandidate("FOLLOW_UP_LEAD", 22, lead, leadId));
    }
  }

  if (candidates.length === 0) {
    return NONE;
  }

  const selected = [...candidates].sort(compareCandidates)[0];

  return {
    kind: selected.kind,
    href: selected.href,
    leadId: selected.leadId,
    jobId: selected.jobId,
  };
}
