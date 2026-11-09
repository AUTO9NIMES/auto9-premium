import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCrmAccess: vi.fn(),
  getCustomer360: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("../../app/lib/auth/dal", () => ({ requireCrmAccess: mocks.requireCrmAccess }));
vi.mock("../../app/lib/business", () => ({ resolveCurrentBusinessContext: async () => ({ businessId: "biz" }) }));
vi.mock("../../app/lib/supabase", () => ({ supabaseRest: vi.fn() }));
vi.mock("../../app/lib/crm-storage", () => ({
  createVehiclePhotoSignedUrl: vi.fn(async () => null),
  uploadVehiclePhoto: vi.fn(),
}));
vi.mock("../../app/lib/crm", async (original) => ({
  ...(await original<typeof import("../../app/lib/crm")>()),
  getCustomer360: mocks.getCustomer360,
}));
vi.mock("../../app/crm-v2/clients/[customerId]/planning", async (original) => ({
  ...(await original<typeof import("../../app/crm-v2/clients/[customerId]/planning")>()),
  getCustomer360RenderedAt: async () => Date.parse("2026-11-09T12:00:00Z"),
}));

import CustomerV2Page from "../../app/crm-v2/clients/[customerId]/page";

const customerId = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";

function customer360() {
  return {
    customer: {
      id: customerId,
      business_id: "biz",
      first_name: "Camille",
      last_name: "Martin",
      full_name: "Camille Martin",
      phone: "0600000000",
      email: "camille@example.com",
      city: "Nîmes",
      created_at: "2025-03-14T10:00:00Z",
    },
    vehicles: [],
    leads: [],
    quotes: [],
    jobs: [{ id: jobId, business_id: "biz", customer_id: customerId, status: "COMPLETED", created_at: "2026-10-20T10:00:00Z" }],
    payments: [
      { id: "p1", job_id: jobId, amount: 180, method: "CASH", received_at: "2026-10-21T10:00:00Z" },
    ],
    leadServiceEvidence: [],
    reviewRequests: [],
    subscriptions: [],
    subscriptionBookingRequests: [],
    appointments: [
      { id: "a1", business_id: "biz", customer_id: customerId, job_id: jobId, status: "COMPLETED", scheduled_at: "2026-10-20T08:00:00Z" },
    ],
    activities: [],
  };
}

describe("fiche client 360° — mise en page", () => {
  beforeEach(() => {
    mocks.requireCrmAccess.mockReset().mockResolvedValue({ role: "owner" });
    mocks.getCustomer360.mockReset().mockResolvedValue(customer360());
  });

  const render = async () =>
    renderToStaticMarkup(
      await CustomerV2Page({ params: Promise.resolve({ customerId }), searchParams: Promise.resolve({}) }),
    );

  it("affiche l'en-tête avec initiales, coordonnées et actions de contact", async () => {
    const html = await render();
    const header = html.slice(html.indexOf("data-customer-header"));
    expect(header).toContain(">CM</span>");
    expect(header).toContain("Camille Martin");
    expect(header).toContain('href="tel:0600000000"');
    expect(header).toContain('href="mailto:camille@example.com"');
  });

  it("affiche les 4 chiffres clés à partir des paiements enregistrés et des rendez-vous", async () => {
    const html = await render();
    const kpi = (key: string) => {
      const start = html.indexOf(`data-customer-kpi="${key}"`);
      return html.slice(start, html.indexOf("</div>", html.indexOf("</p>", html.indexOf("</p>", start) + 1) + 1));
    };
    expect(kpi("collected")).toMatch(/180,00/);
    expect(kpi("collected")).toContain("1 paiement enregistré");
    expect(kpi("jobs")).toContain(">1<");
    expect(kpi("last-visit")).toContain("20 oct. 2026");
    expect(kpi("since")).toContain("14 mars 2025");
  });

  it("met la prochaine action en avant juste après les chiffres clés", async () => {
    const html = await render();
    const nextAction = html.indexOf("data-next-action=");
    expect(nextAction).toBeGreaterThan(html.indexOf("data-customer-kpi"));
    expect(nextAction).toBeLessThan(html.indexOf("Vue opérationnelle"));
    expect(html.slice(html.lastIndexOf("<section", nextAction), nextAction)).toContain("crm-hero-card");
  });
});
