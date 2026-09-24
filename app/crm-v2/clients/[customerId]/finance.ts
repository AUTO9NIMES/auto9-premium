import type { Customer360Payment } from "../../../lib/crm";

export type CustomerFinanceSummary = {
  totalCollected: number;
  paymentCount: number;
  latestPayment: Customer360Payment | null;
};

function paymentTime(payment: Customer360Payment): number {
  const value = Date.parse(payment.received_at);
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

export function summarizeCustomerPayments(
  payments: readonly Customer360Payment[],
): CustomerFinanceSummary {
  const totalCollected = payments.reduce((sum, payment) => {
    const amount = Number(payment.amount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  const latestPayment = payments.reduce<Customer360Payment | null>((latest, payment) => {
    if (!latest) return payment;

    const currentTime = paymentTime(payment);
    const latestTime = paymentTime(latest);

    if (currentTime > latestTime) return payment;
    if (currentTime < latestTime) return latest;

    return payment.id.localeCompare(latest.id) > 0 ? payment : latest;
  }, null);

  return {
    totalCollected,
    paymentCount: payments.length,
    latestPayment,
  };
}
