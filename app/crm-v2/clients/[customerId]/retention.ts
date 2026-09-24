import type {
  Customer360SubscriptionBookingRequestEvidence,
  Customer360SubscriptionEvidence,
} from "../../../lib/crm";

export type CustomerSubscriptionInsight = {
  subscription: Customer360SubscriptionEvidence;
  latestBookingRequest: Customer360SubscriptionBookingRequestEvidence | null;
};

export type CustomerRetentionSummary = {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  activeDueCount: number;
  pendingBookingRequestCount: number;
  insights: CustomerSubscriptionInsight[];
};

function validId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validDateKey(value: string | null | undefined) {
  if (typeof value !== "string") return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function bookingRequestSortKey(
  request: Customer360SubscriptionBookingRequestEvidence,
) {
  return [
    validDateKey(request.requested_date) ?? "",
    request.requested_time?.trim() ?? "",
    request.created_at?.trim() ?? "",
    request.id?.trim() ?? "",
  ].join("|");
}

function compareBookingRequests(
  left: Customer360SubscriptionBookingRequestEvidence,
  right: Customer360SubscriptionBookingRequestEvidence,
) {
  return bookingRequestSortKey(right).localeCompare(bookingRequestSortKey(left));
}

function compareSubscriptions(
  left: Customer360SubscriptionEvidence,
  right: Customer360SubscriptionEvidence,
) {
  if (left.active !== right.active) {
    return left.active ? -1 : 1;
  }

  const leftDue = validDateKey(left.next_due_on) ?? "9999-99-99";
  const rightDue = validDateKey(right.next_due_on) ?? "9999-99-99";
  const dueComparison = leftDue.localeCompare(rightDue);

  if (dueComparison !== 0) {
    return dueComparison;
  }

  return left.id.localeCompare(right.id);
}

export function summarizeCustomerRetention(
  subscriptions: readonly Customer360SubscriptionEvidence[],
  bookingRequests: readonly Customer360SubscriptionBookingRequestEvidence[],
  today: string,
): CustomerRetentionSummary {
  const todayKey = validDateKey(today);

  const requestsBySubscription = new Map<
    string,
    Customer360SubscriptionBookingRequestEvidence[]
  >();

  for (const request of bookingRequests) {
    if (!validId(request.subscription_id)) continue;

    const current = requestsBySubscription.get(request.subscription_id) ?? [];
    current.push(request);
    requestsBySubscription.set(request.subscription_id, current);
  }

  const insights = subscriptions
    .filter((subscription) => validId(subscription.id))
    .map((subscription) => {
      const relatedRequests = requestsBySubscription.get(subscription.id) ?? [];
      const latestBookingRequest =
        [...relatedRequests].sort(compareBookingRequests)[0] ?? null;

      return {
        subscription,
        latestBookingRequest,
      };
    })
    .sort((left, right) =>
      compareSubscriptions(left.subscription, right.subscription),
    );

  const activeSubscriptions = insights.filter(
    ({ subscription }) => subscription.active,
  ).length;

  const activeDueCount =
    todayKey === null
      ? 0
      : insights.filter(({ subscription }) => {
          if (!subscription.active) return false;

          const dueKey = validDateKey(subscription.next_due_on);
          return dueKey !== null && dueKey.slice(0, 7) === todayKey.slice(0, 7);
        }).length;

  const pendingBookingRequestCount = bookingRequests.filter(
    (request) =>
      validId(request.subscription_id) &&
      request.status === "REQUESTED" &&
      insights.some(
        ({ subscription }) => subscription.id === request.subscription_id,
      ),
  ).length;

  return {
    totalSubscriptions: insights.length,
    activeSubscriptions,
    pausedSubscriptions: insights.length - activeSubscriptions,
    activeDueCount,
    pendingBookingRequestCount,
    insights,
  };
}
