import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { Payment } from "../../app/lib/crm";
import { summarizeCustomerPayments } from "../../app/crm-v2/clients/[customerId]/finance";

function payment(
  id: string,
  amount: number,
  receivedAt: string,
  method: Payment["method"] = "CARD",
): Payment {
  return {
    id,
    business_id: "11111111-1111-4111-8111-111111111111",
    job_id: "22222222-2222-4222-8222-222222222222",
    amount,
    method,
    idempotency_key: "33333333-3333-4333-8333-333333333333",
    received_at: receivedAt,
    created_at: receivedAt,
  };
}

describe("CRM V2 Customer 360 finance summary", () => {
  it("computes collected revenue only from payment amounts", () => {
    const result = summarizeCustomerPayments([
      payment("a", 120, "2026-09-20T10:00:00.000Z"),
      payment("b", 80.5, "2026-09-21T10:00:00.000Z"),
    ]);

    expect(result.totalCollected).toBe(200.5);
    expect(result.paymentCount).toBe(2);
  });

  it("selects the latest payment without mutating source order", () => {
    const newer = payment("b", 80, "2026-09-22T10:00:00.000Z", "CASH");
    const older = payment("a", 120, "2026-09-20T10:00:00.000Z");
    const source = [newer, older];
    const before = source.map((item) => item.id);

    const result = summarizeCustomerPayments(source);

    expect(result.latestPayment).toBe(newer);
    expect(source.map((item) => item.id)).toEqual(before);
  });

  it("returns an empty financial summary when there are no payments", () => {
    expect(summarizeCustomerPayments([])).toEqual({
      totalCollected: 0,
      paymentCount: 0,
      latestPayment: null,
    });
  });
});

describe("CRM V2 Customer 360 finance source contract", () => {
  const root = process.cwd();
  const crm = fs.readFileSync(path.join(root, "app/lib/crm.ts"), "utf8");
  const page = fs.readFileSync(
    path.join(root, "app/crm-v2/clients/[customerId]/page.tsx"),
    "utf8",
  );

  it("extends the canonical Customer 360 result with payments", () => {
    expect(crm).toContain("payments: Customer360Payment[];");
    expect(crm).toContain("leadServiceEvidence: Customer360LeadServiceEvidence[];");
    expect(crm).toContain("reviewRequests: Customer360ReviewRequestEvidence[];");
    expect(crm).toContain(
      "select=id,job_id,amount,method,received_at,created_at",
    );
    const customer360Start = crm.indexOf("export async function getCustomer360(");
    const customer360End = crm.indexOf(
      "const LEAD_DETAILS_MAX_ITEMS",
      customer360Start,
    );
    expect(customer360Start).toBeGreaterThanOrEqual(0);
    expect(customer360End).toBeGreaterThan(customer360Start);

    const customer360 = crm.slice(customer360Start, customer360End);

    expect(customer360).not.toContain("idempotency_key");
    expect(customer360).toContain(
      "select=id,job_id,amount,method,received_at,created_at",
    );
    expect(customer360).toContain(
      'business_id=eq.${businessId}&lead_id=in.(${leadIds.join(",")})&select=lead_id',
    );
    expect(customer360).toContain(
      "select=id,job_id,requested_at,created_at",
    );
    expect(crm).toContain('"payments",');
    expect(crm).toContain('job_id=in.(${jobIds.join(",")})');
    expect(crm).toContain("business_id=eq.${businessId}");
    expect(crm).toContain("order=received_at.desc,id.desc");
    expect(crm).toContain("payments,");
  });

  it("derives customer finance from canonical payments", () => {
    expect(page).toContain("summarizeCustomerPayments(result.payments)");
    expect(page).toContain("finance.totalCollected");
    expect(page).toContain("finance.paymentCount");
    expect(page).toContain("finance.latestPayment");
    expect(page).toContain("Montants calculés uniquement à partir des paiements enregistrés.");
  });

  it("does not derive collected revenue from jobs or quotes", () => {
    expect(page).not.toMatch(
      /result\.(?:jobs|quotes)\.reduce\([\s\S]*?(?:total_amount|total_price)/,
    );
  });
});
