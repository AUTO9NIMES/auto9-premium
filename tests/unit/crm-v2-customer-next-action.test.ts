import { describe, expect, it } from "vitest";

import type {
  Appointment,
  Job,
  Lead,
  Quote,
} from "../../app/lib/crm";
import {
  selectCustomerNextAction,
  type CustomerNextActionInput,
} from "../../app/crm/clients/[customerId]/next-action";

function lead(
  id: string,
  lifecycle_status: Lead["lifecycle_status"],
  created_at = "2026-09-24T10:00:00.000Z",
): Lead {
  return {
    id,
    business_id: "business-1",
    customer_id: "customer-1",
    lifecycle_status,
    created_at,
  } as Lead;
}

function job(
  id: string,
  lead_id: string,
  status: Job["status"],
  overrides: Partial<Job> = {},
): Job {
  return {
    id,
    business_id: "business-1",
    customer_id: "customer-1",
    lead_id,
    status,
    created_at: "2026-09-24T10:00:00.000Z",
    ...overrides,
  } as Job;
}

function appointment(
  id: string,
  lead_id: string,
  job_id: string,
  status: Appointment["status"],
  overrides: Partial<Appointment> = {},
): Appointment {
  return {
    id,
    business_id: "business-1",
    customer_id: "customer-1",
    lead_id,
    job_id,
    status,
    requested_at: "2026-09-24T09:00:00.000Z",
    created_at: "2026-09-24T09:00:00.000Z",
    ...overrides,
  } as Appointment;
}

function quote(
  id: string,
  lead_id: string,
  status: Quote["status"],
  created_at = "2026-09-24T10:00:00.000Z",
): Quote {
  return {
    id,
    business_id: "business-1",
    lead_id,
    quote_version: 1,
    status,
    created_at,
  };
}

function input(
  overrides: Partial<CustomerNextActionInput> = {},
): CustomerNextActionInput {
  return {
    leads: [],
    quotes: [],
    jobs: [],
    appointments: [],
    leadServiceEvidence: [],
    reviewRequests: [],
    ...overrides,
  };
}

describe("Customer 360 next best action", () => {
  it("recommends payment only for a completed job with a positive finite amount", () => {
    const valid = job("job-pay", "lead-pay", "COMPLETED", { total_amount: 250.5 });

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-pay", "BOOKED")],
        jobs: [valid],
      })),
    ).toMatchObject({
      kind: "RECORD_PAYMENT",
      href: "/crm/jobs/job-pay",
      jobId: "job-pay",
    });

    for (const total_amount of [0, null, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        selectCustomerNextAction(input({
          leads: [lead("lead-pay", "BOOKED")],
          jobs: [job("job-invalid", "lead-pay", "COMPLETED", { total_amount })],
        })).kind,
      ).not.toBe("RECORD_PAYMENT");
    }
  });

  it("requests a review only for PAID + BOOKED without an existing review request", () => {
    const base = input({
      leads: [lead("lead-review", "BOOKED")],
      jobs: [job("job-review", "lead-review", "PAID")],
    });

    expect(selectCustomerNextAction(base)).toMatchObject({
      kind: "REQUEST_REVIEW",
      href: "/crm/jobs/job-review",
      jobId: "job-review",
    });

    expect(
      selectCustomerNextAction({
        ...base,
        reviewRequests: [{
          id: "review-1",
          job_id: "job-review",
          requested_at: "2026-09-24T11:00:00.000Z",
          created_at: "2026-09-24T11:00:00.000Z",
        }],
      }).kind,
    ).not.toBe("REQUEST_REVIEW");

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-review", "COMPLETED")],
        jobs: [job("job-review", "lead-review", "PAID")],
      })).kind,
    ).not.toBe("REQUEST_REVIEW");
  });

  it("completes only an in-progress job with its own confirmed appointment", () => {
    const currentJob = job("job-live", "lead-live", "IN_PROGRESS");

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-live", "BOOKED")],
        jobs: [currentJob],
        appointments: [
          appointment("appt-live", "lead-live", "job-live", "CONFIRMED"),
        ],
      })).kind,
    ).toBe("COMPLETE_JOB");

    for (const status of ["REQUESTED", "CANCELLED"] as const) {
      expect(
        selectCustomerNextAction(input({
          leads: [lead("lead-live", "BOOKED")],
          jobs: [currentJob],
          appointments: [
            appointment("appt-live", "lead-live", "job-live", status),
          ],
        })).kind,
      ).not.toBe("COMPLETE_JOB");
    }

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-live", "BOOKED")],
        jobs: [currentJob],
        appointments: [
          appointment("appt-other", "lead-other", "job-other", "CONFIRMED"),
        ],
      })).kind,
    ).not.toBe("COMPLETE_JOB");
  });

  it("starts a confirmed job", () => {
    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-start", "BOOKED")],
        jobs: [job("job-start", "lead-start", "CONFIRMED")],
      })),
    ).toMatchObject({
      kind: "START_JOB",
      href: "/crm/jobs/job-start",
    });
  });

  it("confirms only a coherent requested appointment for its scheduled job", () => {
    const scheduledAt = "2026-09-25T08:30:00.000Z";
    const scheduledJob = job("job-confirm", "lead-confirm", "SCHEDULED", {
      scheduled_at: scheduledAt,
    });

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-confirm", "BOOKED")],
        jobs: [scheduledJob],
        appointments: [
          appointment(
            "appt-confirm",
            "lead-confirm",
            "job-confirm",
            "REQUESTED",
            { scheduled_at: scheduledAt },
          ),
        ],
      })).kind,
    ).toBe("CONFIRM_APPOINTMENT");

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-confirm", "BOOKED")],
        jobs: [scheduledJob],
        appointments: [
          appointment(
            "appt-mismatch",
            "lead-confirm",
            "job-confirm",
            "REQUESTED",
            { scheduled_at: "2026-09-25T09:00:00.000Z" },
          ),
        ],
      })).kind,
    ).not.toBe("CONFIRM_APPOINTMENT");

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-confirm", "BOOKED")],
        jobs: [scheduledJob],
        appointments: [
          appointment(
            "appt-cancelled",
            "lead-confirm",
            "job-confirm",
            "CANCELLED",
            { scheduled_at: scheduledAt },
          ),
        ],
      })).kind,
    ).not.toBe("CONFIRM_APPOINTMENT");
  });

  it("schedules only an unscheduled quote-accepted job with no conflicting appointment state", () => {
    const schedulable = job("job-schedule", "lead-schedule", "QUOTE_ACCEPTED", {
      scheduled_at: null,
    });

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-schedule", "BOOKED")],
        jobs: [schedulable],
      })).kind,
    ).toBe("SCHEDULE_JOB");

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-schedule", "BOOKED")],
        jobs: [schedulable],
        appointments: [
          appointment(
            "appt-requested",
            "lead-schedule",
            "job-schedule",
            "REQUESTED",
            { scheduled_at: null },
          ),
        ],
      })).kind,
    ).toBe("SCHEDULE_JOB");

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-schedule", "BOOKED")],
        jobs: [
          job("job-schedule", "lead-schedule", "QUOTE_ACCEPTED", {
            scheduled_at: "2026-09-25T08:30:00.000Z",
          }),
        ],
      })).kind,
    ).not.toBe("SCHEDULE_JOB");
  });

  it("shares only canonically shareable draft or sent quotes", () => {
    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-draft", "CONTACTED")],
        quotes: [quote("quote-draft", "lead-draft", "DRAFT")],
      })).kind,
    ).toBe("SHARE_QUOTE");

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-sent", "QUOTE_SENT")],
        quotes: [quote("quote-sent", "lead-sent", "SENT")],
      })).kind,
    ).toBe("SHARE_QUOTE");

    for (const status of ["REJECTED", "EXPIRED"] as const) {
      expect(
        selectCustomerNextAction(input({
          leads: [lead("lead-terminal-quote", "QUOTE_SENT")],
          quotes: [quote("quote-terminal", "lead-terminal-quote", status)],
        })).kind,
      ).not.toBe("SHARE_QUOTE");
    }
  });

  it("uses minimal service evidence for canonical quote creation eligibility", () => {
    const candidate = lead("lead-create", "QUALIFIED");

    expect(
      selectCustomerNextAction(input({
        leads: [candidate],
        leadServiceEvidence: [{ lead_id: "lead-create" }],
      })),
    ).toMatchObject({
      kind: "CREATE_OR_EDIT_QUOTE",
      href: "/crm/pipeline/lead-create",
      leadId: "lead-create",
    });

    expect(
      selectCustomerNextAction(input({
        leads: [candidate],
      })).kind,
    ).not.toBe("CREATE_OR_EDIT_QUOTE");

    expect(
      selectCustomerNextAction(input({
        leads: [candidate],
        quotes: [quote("existing", "lead-create", "SENT")],
        leadServiceEvidence: [{ lead_id: "lead-create" }],
      })).kind,
    ).not.toBe("CREATE_OR_EDIT_QUOTE");
  });

  it("never lets unrelated records unlock or suppress another relationship", () => {
    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-a", "BOOKED"), lead("lead-b", "BOOKED")],
        jobs: [job("job-a", "lead-a", "IN_PROGRESS")],
        appointments: [
          appointment("appt-b", "lead-b", "job-b", "CONFIRMED"),
        ],
      })).kind,
    ).not.toBe("COMPLETE_JOB");

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-a", "BOOKED"), lead("lead-b", "BOOKED")],
        jobs: [job("job-a", "lead-a", "PAID")],
        reviewRequests: [{
          id: "review-b",
          job_id: "job-b",
          requested_at: "2026-09-24T11:00:00.000Z",
          created_at: "2026-09-24T11:00:00.000Z",
        }],
      })).kind,
    ).toBe("REQUEST_REVIEW");

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-a", "QUALIFIED"), lead("lead-b", "QUALIFIED")],
        quotes: [quote("quote-b", "lead-b", "SENT")],
        leadServiceEvidence: [{ lead_id: "lead-a" }],
      })).kind,
    ).toBe("CREATE_OR_EDIT_QUOTE");
  });

  it("uses deterministic priority instead of blindly selecting newest history", () => {
    const operational = selectCustomerNextAction(
      input({
        leads: [
          lead("lead-current", "BOOKED", "2026-09-24T12:00:00.000Z"),
          lead("lead-old", "BOOKED", "2026-09-20T12:00:00.000Z"),
        ],
        jobs: [
          job("job-old-paid", "lead-old", "PAID", {
            created_at: "2026-09-20T12:00:00.000Z",
          }),
          job("job-current", "lead-current", "IN_PROGRESS", {
            created_at: "2026-09-24T12:00:00.000Z",
          }),
        ],
        appointments: [
          appointment(
            "appt-current",
            "lead-current",
            "job-current",
            "CONFIRMED",
          ),
        ],
        reviewRequests: [
          {
            id: "review-old",
              job_id: "job-old-paid",
            requested_at: "2026-09-20T13:00:00.000Z",
            created_at: "2026-09-20T13:00:00.000Z",
          },
        ],
      }),
    );

    expect(operational).toMatchObject({
      kind: "COMPLETE_JOB",
      jobId: "job-current",
    });

    const activeLead = selectCustomerNextAction(
      input({
        leads: [
          lead("lead-active", "QUALIFIED", "2026-09-20T12:00:00.000Z"),
          lead("lead-lost", "CLOSED_LOST", "2026-09-24T12:00:00.000Z"),
        ],
        leadServiceEvidence: [{ lead_id: "lead-active" }],
      }),
    );

    expect(activeLead).toMatchObject({
      kind: "CREATE_OR_EDIT_QUOTE",
      leadId: "lead-active",
    });
  });

  it("breaks equal-priority ties deterministically by recency then stable id", () => {
    const newer = selectCustomerNextAction(input({
      leads: [
        lead("lead-old", "QUALIFIED", "2026-09-20T10:00:00.000Z"),
        lead("lead-new", "QUALIFIED", "2026-09-24T10:00:00.000Z"),
      ],
      leadServiceEvidence: [
        { lead_id: "lead-old" },
        { lead_id: "lead-new" },
      ],
    }));

    expect(newer.leadId).toBe("lead-new");

    const tied = selectCustomerNextAction(input({
      leads: [
        lead("lead-b", "QUALIFIED"),
        lead("lead-a", "QUALIFIED"),
      ],
      leadServiceEvidence: [
        { lead_id: "lead-b" },
        { lead_id: "lead-a" },
      ],
    }));

    expect(tied.leadId).toBe("lead-a");
  });

  it("does not mutate any source collection", () => {
    const value = input({
      leads: [
        lead("lead-b", "QUALIFIED"),
        lead("lead-a", "QUALIFIED"),
      ],
      quotes: [quote("quote-z", "lead-z", "EXPIRED")],
      jobs: [
        job("job-z", "lead-z", "PAID"),
        job("job-y", "lead-y", "COMPLETED", { total_amount: 0 }),
      ],
      appointments: [
        appointment("appt-z", "lead-z", "job-z", "CANCELLED"),
      ],
      leadServiceEvidence: [
        { lead_id: "lead-b" },
        { lead_id: "lead-a" },
      ],
      reviewRequests: [],
    });

    const before = JSON.stringify(value);

    selectCustomerNextAction(value);

    expect(JSON.stringify(value)).toBe(before);
  });

  it("never lets terminal financial history mask a current operational job", () => {
    const current = job("job-current", "lead-current", "IN_PROGRESS", {
      created_at: "2026-09-24T12:00:00.000Z",
    });

    const base = {
      leads: [
        lead("lead-current", "BOOKED", "2026-09-24T12:00:00.000Z"),
        lead("lead-old", "BOOKED", "2026-09-20T12:00:00.000Z"),
      ],
      appointments: [
        appointment(
          "appt-current",
          "lead-current",
          "job-current",
          "CONFIRMED",
        ),
      ],
    };

    expect(
      selectCustomerNextAction(input({
        ...base,
        jobs: [
          job("job-old-completed", "lead-old", "COMPLETED", {
            total_amount: 250,
            created_at: "2026-09-20T12:00:00.000Z",
          }),
          current,
        ],
      })),
    ).toMatchObject({
      kind: "COMPLETE_JOB",
      jobId: "job-current",
    });

    expect(
      selectCustomerNextAction(input({
        ...base,
        jobs: [
          job("job-old-paid", "lead-old", "PAID", {
            created_at: "2026-09-20T12:00:00.000Z",
          }),
          current,
        ],
      })),
    ).toMatchObject({
      kind: "COMPLETE_JOB",
      jobId: "job-current",
    });
  });

  it("edits an eligible existing draft before falling back to generic lead follow-up", () => {
    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-edit", "QUALIFIED")],
        quotes: [quote("quote-edit", "lead-edit", "DRAFT")],
      })),
    ).toMatchObject({
      kind: "CREATE_OR_EDIT_QUOTE",
      href: "/crm/pipeline/lead-edit",
      leadId: "lead-edit",
    });

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-edit-new", "NEW")],
        quotes: [quote("quote-edit-new", "lead-edit-new", "DRAFT")],
      })).kind,
    ).toBe("CREATE_OR_EDIT_QUOTE");
  });

  it("does not schedule when the same job has a conflicting appointment state", () => {
    const candidate = job(
      "job-conflict",
      "lead-conflict",
      "QUOTE_ACCEPTED",
      { scheduled_at: null },
    );

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-conflict", "BOOKED")],
        jobs: [candidate],
        appointments: [
          appointment(
            "appt-requested",
            "lead-conflict",
            "job-conflict",
            "REQUESTED",
            { scheduled_at: null },
          ),
          appointment(
            "appt-conflicting",
            "lead-conflict",
            "job-conflict",
            "CONFIRMED",
            { scheduled_at: "2026-09-25T08:30:00.000Z" },
          ),
        ],
      })).kind,
    ).not.toBe("SCHEDULE_JOB");
  });

  it("requires an actionable appointment id before recommending completion", () => {
    const invalidAppointment = appointment(
      "",
      "lead-complete-id",
      "job-complete-id",
      "CONFIRMED",
    );

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-complete-id", "BOOKED")],
        jobs: [
          job("job-complete-id", "lead-complete-id", "IN_PROGRESS"),
        ],
        appointments: [invalidAppointment],
      })).kind,
    ).not.toBe("COMPLETE_JOB");
  });

  it("requires an actionable appointment id before recommending confirmation", () => {
    const scheduledAt = "2026-09-25T08:30:00.000Z";

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-confirm-id", "BOOKED")],
        jobs: [
          job("job-confirm-id", "lead-confirm-id", "SCHEDULED", {
            scheduled_at: scheduledAt,
          }),
        ],
        appointments: [
          appointment(
            "",
            "lead-confirm-id",
            "job-confirm-id",
            "REQUESTED",
            { scheduled_at: scheduledAt },
          ),
        ],
      })).kind,
    ).not.toBe("CONFIRM_APPOINTMENT");
  });

  it("never creates navigable actions from records without canonical ids", () => {
    const missingLeadId = lead("lead-missing", "QUALIFIED");
    delete missingLeadId.id;

    expect(
      selectCustomerNextAction(input({
        leads: [missingLeadId],
        leadServiceEvidence: [{ lead_id: "lead-missing" }],
      })).kind,
    ).toBe("NONE");

    const missingJobId = job(
      "job-missing",
      "lead-job-missing",
      "CONFIRMED",
    );
    delete missingJobId.id;

    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-job-missing", "BOOKED")],
        jobs: [missingJobId],
      })).kind,
    ).toBe("NONE");
  });

  it("returns NONE when every record is terminal or unsupported", () => {
    expect(
      selectCustomerNextAction(input({
        leads: [lead("lead-lost", "CLOSED_LOST")],
        quotes: [quote("quote-expired", "lead-lost", "EXPIRED")],
        jobs: [
          job("job-paid", "lead-lost", "PAID"),
          job("job-completed", "lead-lost", "COMPLETED", {
            total_amount: 0,
          }),
        ],
        appointments: [
          appointment("appt-cancelled", "lead-lost", "job-paid", "CANCELLED"),
        ],
        reviewRequests: [{
          id: "review-existing",
          job_id: "job-paid",
          requested_at: "2026-09-24T11:00:00.000Z",
          created_at: "2026-09-24T11:00:00.000Z",
        }],
      })),
    ).toEqual({
      kind: "NONE",
      href: null,
      leadId: null,
      jobId: null,
      appointmentId: null,
    });
  });
});
