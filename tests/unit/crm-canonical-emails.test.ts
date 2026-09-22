import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("canonical CRM emails", () => {
  const page = read("app/crm/emails/page.tsx");
  const editor = read("app/crm/emails/EmailEditor.tsx");
  const layout = read("app/crm/layout.tsx");

  it("uses the canonical CRM authorization boundary", () => {
    expect(page).toContain("requireCrmAccess");
    expect(page).toContain('redirect("/crm/login")');
    expect(page).toContain('redirect("/crm/login?error=access")');
  });

  it("loads customers through the canonical tenant-aware CRM reader", () => {
    expect(page).toContain("getCustomersList");
    expect(page).toContain("page: 1, limit: 100");
  });

  it("loads active subscriptions inside the current business tenant", () => {
    expect(page).toContain("resolveCurrentBusinessContext");
    expect(page).toContain('"crm_subscriptions"');
    expect(page).toContain("business_id=eq.");
    expect(page).toContain("active=eq.true");
    expect(page).toContain("booking_token");
  });

  it("keeps exactly the five manual communication templates", () => {
    for (const key of [
      "appointment",
      "review",
      "quote",
      "subscription",
      "thanks",
    ]) {
      expect(editor).toContain(`${key}: {`);
    }
  });

  it("uses a private booking token for subscription messages", () => {
    expect(editor).toContain(
      "https://auto9nimes.com/reservation-abonnement/${selectedSubscription.booking_token}",
    );
    expect(editor).toContain("selectedSubscription?.booking_token");
    expect(editor).not.toContain('"https://auto9nimes.com/book-online"');
  });

  it("forces the canonical private booking URL for subscription messages", () => {
    expect(editor).toContain('templateKey === "subscription"');
    expect(editor).toContain("? privateSubscriptionUrl");
    expect(editor).toContain(": urlOverrides[templateKey] ?? privateSubscriptionUrl");
    expect(editor).toContain('readOnly={templateKey === "subscription"}');
    expect(editor).toContain('if (templateKey === "subscription") return;');
  });

  it("is manual mailto composition rather than a Resend or outbox sender", () => {
    expect(editor).toContain("mailto:");
    expect(page).not.toContain("Resend");
    expect(editor).not.toContain("Resend");
    expect(page).not.toContain("automation_outbox");
    expect(editor).not.toContain("automation_outbox");
    expect(page).not.toContain("emails.send");
    expect(editor).not.toContain("emails.send");
  });

  it("contains no crm-v2 route leak", () => {
    expect(page).not.toContain("/crm-v2");
    expect(editor).not.toContain("/crm-v2");
  });

  it("is exposed from the canonical navigation", () => {
    expect(layout).toContain(
      '{ href: "/crm/emails", label: "Emails" }',
    );
  });
});
