import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (file: string) =>
  fs.readFileSync(path.join(root, file), "utf8");

const revenue = read("app/crm/revenue/page.tsx");
const layout = read("app/crm/layout.tsx");
const migration = read(
  "supabase/migrations/017_payments_financial_close.sql",
);

describe("canonical CRM revenue contract", () => {
  it("uses the canonical CRM route and never links to crm-v2", () => {
    expect(revenue).toContain('data-crm-route="revenue"');
    expect(revenue).toContain('href="/crm/jobs"');
    expect(revenue).not.toContain("/crm-v2");
  });

  it("requires CRM access before loading financial data", () => {
    expect(revenue).toContain("await ensureCrmAccess();");
    expect(revenue).toContain("await requireCrmAccess();");
    expect(revenue).toContain('redirect("/crm/login")');
    expect(revenue).toContain(
      'redirect("/crm/login?error=access")',
    );
  });

  it("scopes payment reads to the current business", () => {
    expect(revenue).toContain(
      "`business_id=eq.${businessId}&order=received_at.desc",
    );
    expect(revenue).toContain(
      "const { businessId } = await resolveCurrentBusinessContext();",
    );
  });

  it("derives revenue from recorded payments and received_at", () => {
    expect(revenue).toContain('"payments"');
    expect(revenue).toContain("payment.amount");
    expect(revenue).toContain("payment.received_at");
    expect(revenue).toContain("monthKey(payment.received_at)");
    expect(revenue).not.toContain("total_amount");
    expect(revenue).not.toContain("quote");
  });

  it("uses the payment-to-job foreign-key contract required by the embedded job select", () => {
    expect(migration).toContain(
      "foreign key (business_id, job_id)",
    );
    expect(migration).toContain(
      "references public.jobs (business_id, id)",
    );
    expect(revenue).toContain(
      "jobs(job_number,title,customer_id)",
    );
  });

  it("keeps payment methods aligned with the database contract", () => {
    for (const method of [
      "CASH",
      "CARD",
      "BANK_TRANSFER",
      "OTHER",
    ]) {
      expect(revenue).toContain(method);
      expect(migration).toContain(method);
    }
  });

  it("adds revenue to canonical CRM navigation", () => {
    expect(layout).toContain(
      '{ href: "/crm/revenue", label: "Chiffre d’affaires" },',
    );
  });

  it("handles financial storage failure without fabricating revenue", () => {
    expect(revenue).toContain("storageUnavailable = true");
    expect(revenue).toContain(
      "Les données financières sont momentanément indisponibles.",
    );
    expect(revenue).toContain(
      "Aucun montant estimé ou reconstruit n&apos;est affiché.",
    );
  });
});
