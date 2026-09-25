import { describe, expect, it } from "vitest";

import type {
  Customer360SubscriptionBookingRequestEvidence,
  Customer360SubscriptionEvidence,
} from "../../app/lib/crm";
import { summarizeCustomerRetention } from "../../app/crm/clients/[customerId]/retention";

function subscription(
  overrides: Partial<Customer360SubscriptionEvidence> = {},
): Customer360SubscriptionEvidence {
  return {
    id: "subscription-a",
    customer_id: "customer-a",
    service_name: "Detailing",
    price: 120,
    frequency_months: 1,
    next_due_on: "2026-09-24",
    active: true,
    created_at: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

function request(
  overrides: Partial<Customer360SubscriptionBookingRequestEvidence> = {},
): Customer360SubscriptionBookingRequestEvidence {
  return {
    id: "request-a",
    subscription_id: "subscription-a",
    requested_date: "2026-09-25",
    requested_time: "10:00:00",
    status: "REQUESTED",
    created_at: "2026-09-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("summarizeCustomerRetention", () => {
  it("returns an empty summary without inventing retention state", () => {
    expect(summarizeCustomerRetention([], [], "2026-09-24")).toEqual({
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      pausedSubscriptions: 0,
      activeDueCount: 0,
      pendingBookingRequestCount: 0,
      insights: [],
    });
  });

  it("counts active and paused subscriptions separately", () => {
    const result = summarizeCustomerRetention(
      [
        subscription(),
        subscription({
          id: "subscription-b",
          active: false,
          next_due_on: "2026-09-10",
        }),
      ],
      [],
      "2026-09-24",
    );

    expect(result.totalSubscriptions).toBe(2);
    expect(result.activeSubscriptions).toBe(1);
    expect(result.pausedSubscriptions).toBe(1);
  });

  it("matches the subscription domain by counting active passages due this month", () => {
    const result = summarizeCustomerRetention(
      [
        subscription({ id: "previous-month", next_due_on: "2026-08-31" }),
        subscription({ id: "month-start", next_due_on: "2026-09-01" }),
        subscription({ id: "today", next_due_on: "2026-09-24" }),
        subscription({ id: "later-this-month", next_due_on: "2026-09-30" }),
        subscription({ id: "next-month", next_due_on: "2026-10-01" }),
        subscription({
          id: "paused",
          active: false,
          next_due_on: "2026-09-10",
        }),
      ],
      [],
      "2026-09-24",
    );

    expect(result.activeDueCount).toBe(3);
  });

  it("does not classify malformed dates as due", () => {
    const result = summarizeCustomerRetention(
      [subscription({ next_due_on: "not-a-date" })],
      [],
      "2026-09-24",
    );

    expect(result.activeDueCount).toBe(0);
  });

  it("fails closed for an invalid reference date", () => {
    const result = summarizeCustomerRetention(
      [subscription({ next_due_on: "2026-01-01" })],
      [],
      "invalid",
    );

    expect(result.activeDueCount).toBe(0);
  });

  it("selects the latest booking request without mutating backend order", () => {
    const older = request({
      id: "older",
      requested_date: "2026-09-25",
      requested_time: "09:00:00",
    });
    const newer = request({
      id: "newer",
      requested_date: "2026-09-26",
      requested_time: "08:00:00",
    });
    const source = [older, newer];

    const result = summarizeCustomerRetention(
      [subscription()],
      source,
      "2026-09-24",
    );

    expect(result.insights[0]?.latestBookingRequest?.id).toBe("newer");
    expect(source.map((item) => item.id)).toEqual(["older", "newer"]);
  });

  it("never attaches a booking request to a different subscription", () => {
    const result = summarizeCustomerRetention(
      [
        subscription({ id: "subscription-a" }),
        subscription({ id: "subscription-b" }),
      ],
      [
        request({
          id: "request-b",
          subscription_id: "subscription-b",
        }),
      ],
      "2026-09-24",
    );

    const a = result.insights.find(
      ({ subscription: item }) => item.id === "subscription-a",
    );
    const b = result.insights.find(
      ({ subscription: item }) => item.id === "subscription-b",
    );

    expect(a?.latestBookingRequest).toBeNull();
    expect(b?.latestBookingRequest?.id).toBe("request-b");
  });

  it("ignores orphan booking requests in pending counts", () => {
    const result = summarizeCustomerRetention(
      [subscription()],
      [
        request(),
        request({
          id: "orphan",
          subscription_id: "other-subscription",
        }),
      ],
      "2026-09-24",
    );

    expect(result.pendingBookingRequestCount).toBe(1);
  });

  it("does not count confirmed or cancelled requests as pending", () => {
    const result = summarizeCustomerRetention(
      [subscription()],
      [
        request({ id: "pending" }),
        request({ id: "confirmed", status: "CONFIRMED" }),
        request({ id: "cancelled", status: "CANCELLED" }),
      ],
      "2026-09-24",
    );

    expect(result.pendingBookingRequestCount).toBe(1);
  });

  it("orders active subscriptions first and then by next due date", () => {
    const result = summarizeCustomerRetention(
      [
        subscription({
          id: "paused",
          active: false,
          next_due_on: "2026-01-01",
        }),
        subscription({
          id: "later",
          next_due_on: "2026-11-01",
        }),
        subscription({
          id: "earlier",
          next_due_on: "2026-10-01",
        }),
      ],
      [],
      "2026-09-24",
    );

    expect(result.insights.map(({ subscription: item }) => item.id)).toEqual([
      "earlier",
      "later",
      "paused",
    ]);
  });

  it("does not mutate subscription order", () => {
    const source = [
      subscription({ id: "later", next_due_on: "2026-11-01" }),
      subscription({ id: "earlier", next_due_on: "2026-10-01" }),
    ];

    summarizeCustomerRetention(source, [], "2026-09-24");

    expect(source.map((item) => item.id)).toEqual(["later", "earlier"]);
  });

  it("ignores subscriptions without a canonical id", () => {
    const result = summarizeCustomerRetention(
      [
        subscription({ id: "" }),
        subscription({ id: "canonical" }),
      ],
      [],
      "2026-09-24",
    );

    expect(result.totalSubscriptions).toBe(1);
    expect(result.insights[0]?.subscription.id).toBe("canonical");
  });
});
