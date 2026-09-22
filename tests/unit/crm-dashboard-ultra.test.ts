import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const dashboard = fs.readFileSync(path.join(root, "app/crm/page.tsx"), "utf8");

describe("canonical CRM Dashboard Ultra", () => {
  it("keeps canonical CRM access control", () => {
    expect(dashboard).toContain("requireCrmAccess");
    expect(dashboard).toContain('redirect("/crm/login")');
  });

  it("loads finance tenant-scoped without the V2 500-payment truncation", () => {
    expect(dashboard).toContain('"payments"');
    expect(dashboard).toContain("business_id=eq.");
    expect(dashboard).toContain("received_at=gte.");
    expect(dashboard).toContain("received_at=lt.");
    expect(dashboard).not.toContain("limit=500");
  });

  it("surfaces monthly payment channels", () => {
    expect(dashboard).toContain("CA encaissé ce mois");
    expect(dashboard).toContain("Espèces");
    expect(dashboard).toContain("Carte + virement");
  });

  it("loads active subscriptions for the current month", () => {
    expect(dashboard).toContain('"crm_subscriptions"');
    expect(dashboard).toContain("next_due_on");
    expect(dashboard).toContain("Abonnements à planifier");
    expect(dashboard).toContain("/crm/subscriptions");
  });

  it("shows the next five canonical calendar appointments", () => {
    expect(dashboard).toContain("getCalendarMonth");
    expect(dashboard).toContain(".slice(0, 5)");
    expect(dashboard).toContain("Prochains rendez-vous");
    expect(dashboard).toContain("/crm/calendar");
  });

  it("links to canonical revenue without CRM-V2 leakage", () => {
    expect(dashboard).toContain("/crm/revenue");
    expect(dashboard).not.toContain("/crm-v2");
  });

  it("does not introduce production mutation surfaces", () => {
    expect(dashboard).not.toContain("RESEND_API_KEY");
    expect(dashboard).not.toContain("automation_outbox");
    expect(dashboard).not.toContain('method: "POST"');
    expect(dashboard).not.toContain('method: "PATCH"');
    expect(dashboard).not.toContain('method: "DELETE"');
  });
});
