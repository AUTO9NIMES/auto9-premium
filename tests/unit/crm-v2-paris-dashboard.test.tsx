import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ connection: vi.fn(), business: vi.fn(), rest: vi.fn(), metrics: vi.fn(), calendar: vi.fn(), manual: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("../../app/lib/business", () => ({ resolveCurrentBusinessContext: mocks.business }));
vi.mock("../../app/lib/supabase", () => ({ supabaseRest: mocks.rest }));
vi.mock("../../app/lib/crm", () => ({ getCrmDashboardMetrics: mocks.metrics, getCalendarMonth: mocks.calendar }));
vi.mock("../../app/lib/manual-revenue", () => ({ getManualRevenueEntries: mocks.manual }));
import Dashboard from "../../app/crm-v2/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.business.mockResolvedValue({ businessId: "server-business" });
  mocks.rest.mockResolvedValue([]);
  mocks.metrics.mockResolvedValue({ activeLeads: 0, leadsRequiringAttention: 0, customersTotal: 0 });
  mocks.calendar.mockResolvedValue({ items: [] });
  mocks.manual.mockResolvedValue([]);
});
afterEach(() => { vi.restoreAllMocks(); });

function dayCell(html: string, key: string) {
  const href = `href="/crm-v2/calendar?day=${key}"`;
  const position = html.indexOf(href);
  if (position < 0) return "";

  const start = html.lastIndexOf("<a ", position);
  const end = html.indexOf("</a>", position);

  return start >= 0 && end >= 0
    ? html.slice(start, end + 4)
    : "";
}

function event(instant: number, name = "Appointment") {
  return { appointment: { id: name, scheduledAt: new Date(instant).toISOString() }, customer: { fullName: name }, job: { title: "Local fixture" } };
}
function card(html: string, label: string) {
  return html.match(new RegExp(`<a[^>]+href="/crm-v2/revenue"[^>]*>(?:(?!</a>)[\\s\\S])*${label}(?:(?!</a>)[\\s\\S])*</a>`))?.[0] ?? "";
}

describe("Paris business calendar, independent of process TZ", () => {
  it.each([
    ["2026-03-31T21:59:59.999Z", "2026-03-31", 31],
    ["2026-03-31T22:00:00.000Z", "2026-04-01", 30],
    ["2026-04-01T00:00:00.000Z", "2026-04-01", 30],
    ["2026-12-31T22:59:59.999Z", "2026-12-31", 31],
    ["2026-12-31T23:00:00.000Z", "2027-01-01", 31],
    ["2027-01-01T00:00:00.000Z", "2027-01-01", 31],
    ["2026-03-29T00:59:59.999Z", "2026-03-29", 31],
    ["2026-03-29T01:00:00.000Z", "2026-03-29", 31],
    ["2026-10-25T00:59:59.999Z", "2026-10-25", 31],
    ["2026-10-25T01:00:00.000Z", "2026-10-25", 31],
    ["2028-02-29T22:59:59.999Z", "2028-02-29", 29],
  ])("uses Paris date for %s => %s", async (instant, dateKey, days) => {
    const time = Date.parse(instant); vi.spyOn(Date, "now").mockReturnValue(time);
    mocks.calendar.mockResolvedValue({ items: [event(time)] });
    const html = renderToStaticMarkup(await Dashboard());
    expect(mocks.calendar).toHaveBeenCalledWith({ month: dateKey.slice(0, 7) });
    expect(dayCell(html, dateKey)).toContain("border-cyan-300/35");
    expect(dayCell(html, dateKey)).toContain("1 RDV");
    expect([...html.matchAll(/href="\/crm-v2\/calendar\?day=/g)]).toHaveLength(days);
    expect(mocks.connection).toHaveBeenCalledTimes(2);
    expect(mocks.rest).toHaveBeenCalledTimes(2);
    for (const call of mocks.rest.mock.calls) expect(call[3]).toContain("business_id=eq.server-business");
  });

  it.each([
    ["2026-03-29T00:59:00Z", "01:59"], ["2026-03-29T01:00:00Z", "03:00"],
    ["2026-10-25T00:59:00Z", "02:59"], ["2026-10-25T01:00:00Z", "02:00"],
  ])("renders the business appointment time across DST: %s", async (instant, time) => {
    const value = Date.parse(instant); vi.spyOn(Date, "now").mockReturnValue(value);
    mocks.calendar.mockResolvedValue({ items: [event(value)] });
    expect(renderToStaticMarkup(await Dashboard())).toContain(`>${time}</p>`);
  });

  it("uses the same Paris month for subscriptions, payments and manual revenue", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-03-31T22:30:00Z"));
    const payments = [
      { method: "CASH", amount: 10, received_at: "2026-03-31T21:59:59Z" },
      { method: "CASH", amount: 20, received_at: "2026-03-31T22:00:00Z" },
      { method: "CARD", amount: 30, received_at: "2026-04-30T21:59:59Z" },
      { method: "CARD", amount: 40, received_at: "2026-04-30T22:00:00Z" },
      { method: "CASH", amount: 1000, received_at: "invalid" },
    ];
    mocks.rest.mockImplementation(async (resource: string) => resource === "payments" ? payments : [
      { next_due_on: "2026-03-31", active: true }, { next_due_on: "2026-04-01", active: true }, { next_due_on: "2026-04-30", active: true },
    ]);
    mocks.manual.mockResolvedValue([
      { method: "CASH", amount: 5, receivedAt: "2026-03-31T22:00:00Z" },
      { method: "BANK_TRANSFER", amount: 7, receivedAt: "2026-04-30T21:59:59Z" },
      { method: "CASH", amount: 50, receivedAt: "2026-04-30T22:00:00Z" },
    ]);
    const html = renderToStaticMarkup(await Dashboard());
    expect(card(html, "CA espèces")).toMatch(/25\s*€/);
    expect(card(html, "CA carte \\+ virement")).toMatch(/37\s*€/);
    expect(html).toContain("2 abonnements à planifier ce mois-ci");
    expect(mocks.manual).toHaveBeenCalledWith("server-business", payments);
    expect(mocks.rest).toHaveBeenCalledWith("crm_subscriptions", "GET", null, "business_id=eq.server-business&active=eq.true&select=next_due_on,active");
    expect(mocks.rest).toHaveBeenCalledWith("payments", "GET", null, "business_id=eq.server-business&order=received_at.desc&limit=500&select=id,business_id,job_id,amount,method,idempotency_key,received_at,created_at");
  });

  it("keeps one month snapshot while refreshing the inclusive cutoff after reads", async () => {
    const start = Date.parse("2026-03-31T21:59:59.999Z"), finish = start + 2;
    let now = start; vi.spyOn(Date, "now").mockImplementation(() => now);
    const items = [-1, 2, 0, 1, 3, 4, 5].map((offset) => event(finish + offset, `Cutoff ${offset}`));
    const original = JSON.stringify(items);
    mocks.calendar.mockResolvedValue({ items });
    mocks.manual.mockImplementation(async () => { now = finish; return []; });
    const html = renderToStaticMarkup(await Dashboard());
    expect(mocks.calendar).toHaveBeenCalledWith({ month: "2026-03" });
    expect(dayCell(html, "2026-03-31")).toContain("border-cyan-300/35");
    expect(html).not.toContain("Cutoff -1");
    for (const i of [0, 1, 2, 3, 4]) expect(html).toContain(`Cutoff ${i}`);
    expect(html).not.toContain("Cutoff 5");
    expect(html.indexOf("Cutoff 0")).toBeLessThan(html.indexOf("Cutoff 1"));
    expect(JSON.stringify(items)).toBe(original);
    expect(mocks.connection).toHaveBeenCalledTimes(2);
  });
});
