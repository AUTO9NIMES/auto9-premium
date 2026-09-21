import { describe, expect, it } from "vitest";

import {
  hasCanonicalPaidJob,
  hasCanonicalRescheduledJob,
  hasCanonicalReviewRequest,
  hasCanonicalScheduledJob,
  hasCanonicalStartedJob,
} from "../../app/lib/crm-lifecycle-invariants";

const businessId = "business-1";
const jobId = "job-1";
const scheduledAt = "2026-10-03T11:30:00+00:00";

describe("CRM lifecycle invariants", () => {
  describe("scheduled job", () => {
    const appointment = {
      business_id: businessId,
      job_id: jobId,
      status: "REQUESTED",
      scheduled_at: scheduledAt,
    };
    const job = {
      business_id: businessId,
      id: jobId,
      status: "SCHEDULED",
      scheduled_at: scheduledAt,
    };

    it("accepts the canonical requested/scheduled pair", () => {
      expect(
        hasCanonicalScheduledJob({
          appointment,
          job,
          activity: null,
          businessId,
          jobId,
        }),
      ).toBe(true);
    });

    it.each([
      [{ ...appointment, business_id: "other-business" }, job],
      [{ ...appointment, job_id: "other-job" }, job],
      [{ ...appointment, status: "CONFIRMED" }, job],
      [{ ...appointment, scheduled_at: null }, job],
      [appointment, { ...job, business_id: "other-business" }],
      [appointment, { ...job, id: "other-job" }],
      [appointment, { ...job, status: "CONFIRMED" }],
      [appointment, { ...job, scheduled_at: "2026-10-03T12:30:00+00:00" }],
    ])("rejects an inconsistent scheduled pair", (candidateAppointment, candidateJob) => {
      expect(
        hasCanonicalScheduledJob({
          appointment: candidateAppointment,
          job: candidateJob,
          activity: null,
          businessId,
          jobId,
        }),
      ).toBe(false);
    });

    it("rejects a non-record activity", () => {
      expect(
        hasCanonicalScheduledJob({
          appointment,
          job,
          activity: "invalid",
          businessId,
          jobId,
        }),
      ).toBe(false);
    });
  });

  describe("rescheduled job", () => {
    const appointment = {
      id: "appointment-1",
      business_id: businessId,
      job_id: jobId,
      status: "REQUESTED",
      requested_at: "2026-09-20T10:00:00+00:00",
      scheduled_at: scheduledAt,
    };
    const job = {
      business_id: businessId,
      id: jobId,
      status: "SCHEDULED",
      scheduled_at: scheduledAt,
    };
    const activity = {
      business_id: businessId,
      job_id: jobId,
      event_type: "appointment.rescheduled",
    };

    it("accepts a real REQUESTED/SCHEDULED reschedule with its activity", () => {
      expect(
        hasCanonicalRescheduledJob({
          appointment,
          job,
          activity,
          businessId,
          jobId,
          noOp: false,
        }),
      ).toBe(true);
    });

    it("accepts a real CONFIRMED/CONFIRMED reschedule", () => {
      expect(
        hasCanonicalRescheduledJob({
          appointment: { ...appointment, status: "CONFIRMED" },
          job: { ...job, status: "CONFIRMED" },
          activity,
          businessId,
          jobId,
          noOp: false,
        }),
      ).toBe(true);
    });

    it("accepts a no-op only without an activity", () => {
      expect(
        hasCanonicalRescheduledJob({
          appointment,
          job,
          activity: null,
          businessId,
          jobId,
          noOp: true,
        }),
      ).toBe(true);
    });

    it("rejects divergent appointment and job schedules", () => {
      expect(
        hasCanonicalRescheduledJob({
          appointment,
          job: { ...job, scheduled_at: "2026-10-03T12:30:00+00:00" },
          activity,
          businessId,
          jobId,
          noOp: false,
        }),
      ).toBe(false);
    });

    it("rejects mixed lifecycle states", () => {
      expect(
        hasCanonicalRescheduledJob({
          appointment: { ...appointment, status: "CONFIRMED" },
          job,
          activity,
          businessId,
          jobId,
          noOp: false,
        }),
      ).toBe(false);
    });

    it("rejects an activity for a no-op", () => {
      expect(
        hasCanonicalRescheduledJob({
          appointment,
          job,
          activity,
          businessId,
          jobId,
          noOp: true,
        }),
      ).toBe(false);
    });

    it("rejects a real reschedule without its activity", () => {
      expect(
        hasCanonicalRescheduledJob({
          appointment,
          job,
          activity: null,
          businessId,
          jobId,
          noOp: false,
        }),
      ).toBe(false);
    });

    it.each([
      { ...activity, business_id: "other-business" },
      { ...activity, job_id: "other-job" },
      { ...activity, event_type: "appointment.confirmed" },
    ])("rejects an inconsistent reschedule activity", (candidateActivity) => {
      expect(
        hasCanonicalRescheduledJob({
          appointment,
          job,
          activity: candidateActivity,
          businessId,
          jobId,
          noOp: false,
        }),
      ).toBe(false);
    });
  });

  describe("started job", () => {
    const job = {
      id: jobId,
      business_id: businessId,
      status: "IN_PROGRESS",
      started_at: "2026-10-03T11:35:00+00:00",
    };

    it("accepts a canonical started job", () => {
      expect(
        hasCanonicalStartedJob({
          job,
          activity: null,
          businessId,
          jobId,
        }),
      ).toBe(true);
    });

    it.each([
      { ...job, id: "other-job" },
      { ...job, business_id: "other-business" },
      { ...job, status: "CONFIRMED" },
      { ...job, started_at: null },
    ])("rejects an inconsistent started job", (candidateJob) => {
      expect(
        hasCanonicalStartedJob({
          job: candidateJob,
          activity: null,
          businessId,
          jobId,
        }),
      ).toBe(false);
    });
  });

  describe("paid job", () => {
    const payment = {
      id: "payment-1",
      business_id: businessId,
      job_id: jobId,
      amount: 168,
      method: "CARD",
      received_at: "2026-10-03T13:00:00+00:00",
    };
    const job = {
      id: jobId,
      business_id: businessId,
      status: "PAID",
    };

    it("accepts every supported payment method", () => {
      for (const method of ["CASH", "CARD", "BANK_TRANSFER", "OTHER"]) {
        expect(
          hasCanonicalPaidJob({
            payment: { ...payment, method },
            job,
            activity: null,
            businessId,
            jobId,
          }),
        ).toBe(true);
      }
    });

    it.each([
      { ...payment, business_id: "other-business" },
      { ...payment, job_id: "other-job" },
      { ...payment, id: null },
      { ...payment, amount: "168" },
      { ...payment, method: "CRYPTO" },
      { ...payment, received_at: null },
    ])("rejects an inconsistent payment", (candidatePayment) => {
      expect(
        hasCanonicalPaidJob({
          payment: candidatePayment,
          job,
          activity: null,
          businessId,
          jobId,
        }),
      ).toBe(false);
    });

    it("rejects a job that is not paid", () => {
      expect(
        hasCanonicalPaidJob({
          payment,
          job: { ...job, status: "COMPLETED" },
          activity: null,
          businessId,
          jobId,
        }),
      ).toBe(false);
    });
  });

  describe("review request", () => {
    const reviewRequest = {
      id: "review-1",
      business_id: businessId,
      job_id: jobId,
      requested_at: "2026-10-03T13:05:00+00:00",
    };
    const lead = {
      business_id: businessId,
      lifecycle_status: "REVIEW_REQUESTED",
    };

    it("accepts a canonical review request", () => {
      expect(
        hasCanonicalReviewRequest({
          reviewRequest,
          lead,
          activity: null,
          businessId,
          jobId,
        }),
      ).toBe(true);
    });

    it.each([
      { ...reviewRequest, business_id: "other-business" },
      { ...reviewRequest, job_id: "other-job" },
      { ...reviewRequest, id: null },
      { ...reviewRequest, requested_at: null },
    ])("rejects an inconsistent review request", (candidateReviewRequest) => {
      expect(
        hasCanonicalReviewRequest({
          reviewRequest: candidateReviewRequest,
          lead,
          activity: null,
          businessId,
          jobId,
        }),
      ).toBe(false);
    });

    it("rejects a lead outside REVIEW_REQUESTED", () => {
      expect(
        hasCanonicalReviewRequest({
          reviewRequest,
          lead: { ...lead, lifecycle_status: "COMPLETED" },
          activity: null,
          businessId,
          jobId,
        }),
      ).toBe(false);
    });
  });
});
