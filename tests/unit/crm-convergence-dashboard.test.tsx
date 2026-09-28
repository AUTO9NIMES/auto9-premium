import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), business: vi.fn(), rest: vi.fn(), metrics: vi.fn(), calendar: vi.fn(), activity: vi.fn() }));
vi.mock("../../app/lib/auth/dal", () => ({ requireCrmAccess: mocks.auth, CrmAccessError: class extends Error {} }));
vi.mock("../../app/lib/business", () => ({ resolveCurrentBusinessContext: mocks.business }));
vi.mock("../../app/lib/supabase", () => ({ supabaseRest: mocks.rest }));
vi.mock("../../app/lib/crm", async (original) => ({
  ...await original<typeof import("../../app/lib/crm")>(),
  getCrmDashboardMetrics: mocks.metrics,
  getCalendarMonth: mocks.calendar,
  getRecentActivity: mocks.activity,
}));
import Dashboard from "../../app/crm/page";

const businessId = "00000000-0000-0000-0000-000000000001";
const id = (n: number) => `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`;
const payment = (n: number, amount = 10, received_at = "2026-03-15T10:00:00Z") => ({ id: id(n), business_id: businessId, job_id: id(99), amount, method: "CASH", received_at });
const summary = { customersTotal: 20, activeLeads: 12, leadsRequiringAttention: 7, activeJobs: 3,
  leadsByStatus: { NEW: 2, QUALIFIED: 2, CONTACTED: 2, QUOTE_SENT: 1, BOOKED: 3, IN_PROGRESS: 2, COMPLETED: 50, REVIEW_REQUESTED: 40, CLOSED_LOST: 100 },
  jobsByStatus: { QUOTE_ACCEPTED: 1, SCHEDULED: 1, CONFIRMED: 0, IN_PROGRESS: 1, COMPLETED: 50, CANCELLED: 100, PAID: 500 },
};
const render = async () => renderToStaticMarkup(await Dashboard()).replace(/[\u00a0\u202f]/g, " ");

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
  mocks.auth.mockResolvedValue({ businessId }); mocks.business.mockResolvedValue({ businessId });
  mocks.metrics.mockResolvedValue(summary); mocks.calendar.mockResolvedValue({ items: [] }); mocks.activity.mockResolvedValue([]);
  mocks.rest.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe("canonical dashboard convergence", () => {
  it("authorizes before all privileged reads", async () => {
    mocks.auth.mockRejectedValue(new Error("denied"));
    await expect(Dashboard()).rejects.toThrow();
    expect(mocks.metrics).not.toHaveBeenCalled(); expect(mocks.rest).not.toHaveBeenCalled();
  });

  it("consumes even short server-capped payment pages and scopes each read", async () => {
    mocks.rest.mockImplementation(async (table, _method, _body, query: string) => {
      if (table !== "payments") return [];
      if (query.includes(`id=gt.${id(2)}`)) return [];
      if (query.includes(`id=gt.${id(1)}`)) return [payment(2, 20)];
      return [payment(1)];
    });
    expect(await render()).toContain("30,00 €");
    const calls = mocks.rest.mock.calls.filter(([table]) => table === "payments");
    expect(calls).toHaveLength(3);
    for (const [, method, , query] of calls) {
      expect(method).toBe("GET"); expect(query).toContain(`business_id=eq.${businessId}`);
      expect(query).toContain("order=id.asc"); expect(query).toContain("received_at=gte.");
    }
  });

  it("paginates subscription counts without treating prices as revenue", async () => {
    mocks.rest.mockImplementation(async (table, _method, _body, query: string) => table === "crm_subscriptions" && !query.includes("id=gt.")
      ? [{ id: id(1), business_id: businessId, active: true, next_due_on: "2026-03-20", price: 9999 }] : []);
    const html = await render();
    expect(html).toContain("0,00 €"); expect(html).not.toContain("9999");
    expect(mocks.rest.mock.calls.filter(([table]) => table === "crm_subscriptions")).toHaveLength(2);
  });

  it.each([null, {}, [payment(1), payment(1)], [{ ...payment(1), business_id: id(90) }], [{ ...payment(1), amount: "invalid" }]])(
    "shows unavailable for incomplete or inconsistent payment responses %#", async (response) => {
      mocks.rest.mockImplementation(async (table) => table === "payments" ? response : []);
      expect(await render()).toContain("Encaissements momentanément indisponibles");
    },
  );

  it("discards partial totals when a later page fails", async () => {
    mocks.rest.mockImplementation(async (table, _method, _body, query: string) => {
      if (table !== "payments") return [];
      if (query.includes("id=gt.")) throw new Error("read failed");
      return [payment(1, 25)];
    });
    const html = await render(); expect(html).toContain("Encaissements momentanément indisponibles"); expect(html).not.toContain("25,00 €");
  });

  it("rejects a repeated page instead of duplicating receipts", async () => {
    mocks.rest.mockImplementation(async table => table === "payments" ? [payment(1)] : []);
    expect(await render()).toContain("Encaissements momentanément indisponibles");
  });

  it("attributes receipts to the Paris month, including its UTC boundary and DST", async () => {
    mocks.rest.mockImplementation(async (table, _method, _body, query: string) => table === "payments" && !query.includes("id=gt.")
      ? [payment(1, 10, "2026-02-28T23:30:00Z"), payment(2, 20, "2026-03-29T01:30:00Z"), payment(3, 90, "2026-03-31T22:30:00Z")] : []);
    expect(await render()).toContain("30,00 €");
  });

  it("uses canonical attention and active dossier counts without replaying V2 activity flags", async () => {
    const html = await render();
    expect(html).toMatch(/Demandes à traiter[\s\S]*?>7</);
    expect(html).toMatch(/Dossiers en cours[\s\S]*?>5</);
    expect(mocks.rest.mock.calls.every(([table]) => ["payments", "crm_subscriptions"].includes(table))).toBe(true);
  });

  it("uses a valid existing hero and canonical creation/planning navigation", async () => {
    const html = await render();
    expect(html).toContain("/hero-audi.jpg"); expect(html).toContain('href="/crm/pipeline/new"');
    expect(html).toContain('href="/crm/calendar"'); expect(html).not.toContain("/crm-v2");
  });
});
