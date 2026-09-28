import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const panel = readFileSync("app/crm-v2/pipeline/LeadEditPanel.tsx", "utf8");
const page = readFileSync("app/crm-v2/pipeline/page.tsx", "utf8");

describe("CRM V2 legacy dossier service UI contract (static checks)", () => {
  it("distinguishes engaged dossiers without a service from editable drafts", () => {
    expect(page).toContain("serviceLockedWithoutRow={!serviceSnapshot && (");
    expect(page).toContain(
      "Boolean(item.latestQuote || item.latestJob || item.latestAppointment)",
    );
    expect(page).toContain(
      '!["NEW", "QUALIFIED", "CONTACTED"].includes(item.lead.lifecycle_status)',
    );
  });

  it("submits no service change for a locked legacy dossier", () => {
    expect(panel).toContain("serviceLockedWithoutRow: boolean;");
    expect(panel).toContain("serviceLockedWithoutRow ? (");
    expect(panel).toContain('<input type="hidden" name="serviceName" value="" />');
    expect(panel).toContain("Prestation historique verrouillée.");
    expect(panel).toContain("defaultValue={initialService}");
  });
});
