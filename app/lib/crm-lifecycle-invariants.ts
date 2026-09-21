type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object";
}

function hasOptionalRecord(value: unknown): boolean {
  return value === null || isRecord(value);
}

export function hasCanonicalScheduledJob(input: {
  appointment: UnknownRecord;
  job: UnknownRecord;
  activity: unknown;
  businessId: string;
  jobId: string;
}): boolean {
  const { appointment, job, activity, businessId, jobId } = input;

  return (
    appointment.business_id === businessId &&
    appointment.job_id === jobId &&
    appointment.status === "REQUESTED" &&
    typeof appointment.scheduled_at === "string" &&
    job.business_id === businessId &&
    job.id === jobId &&
    job.status === "SCHEDULED" &&
    typeof job.scheduled_at === "string" &&
    appointment.scheduled_at === job.scheduled_at &&
    hasOptionalRecord(activity)
  );
}

export function hasCanonicalRescheduledJob(input: {
  appointment: UnknownRecord;
  job: UnknownRecord;
  activity: unknown;
  businessId: string;
  jobId: string;
  noOp: boolean;
}): boolean {
  const { appointment, job, activity, businessId, jobId, noOp } = input;

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

  return (
    appointment.business_id === businessId &&
    appointment.job_id === jobId &&
    typeof appointment.id === "string" &&
    typeof appointment.requested_at === "string" &&
    typeof appointment.scheduled_at === "string" &&
    job.business_id === businessId &&
    job.id === jobId &&
    typeof job.scheduled_at === "string" &&
    appointment.scheduled_at === job.scheduled_at &&
    eligibleState &&
    validActivity &&
    !(noOp && activity !== null) &&
    !(!noOp && activity === null)
  );
}

export function hasCanonicalStartedJob(input: {
  job: UnknownRecord;
  activity: unknown;
  businessId: string;
  jobId: string;
}): boolean {
  const { job, activity, businessId, jobId } = input;

  return (
    job.id === jobId &&
    job.business_id === businessId &&
    job.status === "IN_PROGRESS" &&
    typeof job.started_at === "string" &&
    hasOptionalRecord(activity)
  );
}

export function hasCanonicalPaidJob(input: {
  payment: UnknownRecord;
  job: UnknownRecord;
  activity: unknown;
  businessId: string;
  jobId: string;
}): boolean {
  const { payment, job, activity, businessId, jobId } = input;

  return (
    payment.business_id === businessId &&
    payment.job_id === jobId &&
    typeof payment.id === "string" &&
    typeof payment.amount === "number" &&
    ["CASH", "CARD", "BANK_TRANSFER", "OTHER"].includes(payment.method as string) &&
    typeof payment.received_at === "string" &&
    job.business_id === businessId &&
    job.id === jobId &&
    job.status === "PAID" &&
    hasOptionalRecord(activity)
  );
}

export function hasCanonicalReviewRequest(input: {
  reviewRequest: UnknownRecord;
  lead: UnknownRecord;
  activity: unknown;
  businessId: string;
  jobId: string;
}): boolean {
  const { reviewRequest, lead, activity, businessId, jobId } = input;

  return (
    reviewRequest.business_id === businessId &&
    reviewRequest.job_id === jobId &&
    typeof reviewRequest.id === "string" &&
    typeof reviewRequest.requested_at === "string" &&
    lead.business_id === businessId &&
    lead.lifecycle_status === "REVIEW_REQUESTED" &&
    hasOptionalRecord(activity)
  );
}
