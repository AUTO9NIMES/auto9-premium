import { renderToString, renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserPreference } from "../../app/lib/browser-preference";

const mocks = vi.hoisted(() => ({
  pathname: "/", query: new URLSearchParams(),
  connection: vi.fn(), business: vi.fn(), rest: vi.fn(), metrics: vi.fn(), calendar: vi.fn(), manual: vi.fn(), historical: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useSearchParams: () => mocks.query }));
vi.mock("../../app/lib/business", () => ({ resolveCurrentBusinessContext: mocks.business }));
vi.mock("../../app/lib/supabase", () => ({ supabaseRest: mocks.rest }));
vi.mock("../../app/lib/crm", () => ({ getCrmDashboardMetrics: mocks.metrics, getCalendarMonth: mocks.calendar }));
vi.mock("../../app/lib/manual-revenue", () => ({ getManualRevenueEntries: mocks.manual }));
vi.mock("../../app/lib/historical-calendar", () => ({ getHistoricalCalendarEntries: mocks.historical }));
import GoogleAnalytics from "../../app/components/GoogleAnalytics";
import ThemeToggle from "../../app/crm-v2/ThemeToggle";
import { SpecialRequestForm } from "../../app/components/SpecialRequestForm";
import Dashboard from "../../app/crm-v2/page";
import { readRequestClock } from "../../app/lib/request-clock";

beforeEach(() => { vi.clearAllMocks(); mocks.query = new URLSearchParams(); mocks.historical.mockResolvedValue([]); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function storageHarness() {
  const data = new Map<string, string>();
  const localStorage = {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { data.set(key, value); }),
    removeItem: vi.fn((key: string) => { data.delete(key); }),
  };
  const events = new EventTarget();
  vi.stubGlobal("window", { localStorage, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) });
  function storage(key: string | null, area: unknown = localStorage) {
    const event = new Event("storage");
    Object.defineProperties(event, { key: { value: key }, storageArea: { value: area }, newValue: { value: "stale" } });
    events.dispatchEvent(event);
  }
  return { data, localStorage, storage };
}

describe("SSR and external browser preferences", () => {
  it("renders analytics and theme without touching browser storage or DOM", () => {
    vi.stubGlobal("window", new Proxy({}, { get() { throw new Error("render-time browser access"); } }));
    vi.stubGlobal("document", new Proxy({}, { get() { throw new Error("render-time DOM access"); } }));
    expect(renderToString(<GoogleAnalytics />)).toBe("");
    expect(renderToString(<ThemeToggle />)).toContain("Activer le thème clair");
    expect(renderToString(<ThemeToggle compact />)).toContain("☀");
  });

  it.each(["accepted", "refused", "invalid", null])("initializes consent %s only on subscription", (stored) => {
    const h = storageHarness();
    if (stored) h.data.set("consent", stored);
    const apply = vi.fn();
    const store = createBrowserPreference("consent", (v) => v === "accepted" || v === "refused" ? v : null, apply);
    expect(store.getServerSnapshot()).toBeUndefined();
    expect(store.getSnapshot()).toBeUndefined();
    expect(h.localStorage.getItem).not.toHaveBeenCalled();
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    expect(store.getSnapshot()).toBe(stored === "invalid" ? null : stored);
    expect(apply).toHaveBeenCalledWith(stored === "invalid" ? null : stored);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getServerSnapshot()).toBeUndefined();
    stop();
  });

  it("publishes same-tab choices, cross-tab withdrawal and storage clear; ignores unrelated stores", () => {
    const h = storageHarness();
    const apply = vi.fn();
    const store = createBrowserPreference("consent", (v) => v === "accepted" ? "accepted" : null, apply);
    const listener = vi.fn(); const stop = store.subscribe(listener);
    store.set("accepted");
    expect(h.data.get("consent")).toBe("accepted");
    expect(store.getSnapshot()).toBe("accepted");
    h.data.delete("consent"); h.storage("other"); h.storage("consent", {});
    expect(store.getSnapshot()).toBe("accepted");
    h.storage("consent"); expect(store.getSnapshot()).toBeNull();
    store.set("accepted"); h.data.clear(); h.storage(null);
    expect(store.getSnapshot()).toBeNull();
    const calls = listener.mock.calls.length; stop();
    h.data.set("consent", "accepted"); h.storage("consent");
    expect(listener).toHaveBeenCalledTimes(calls);
    expect(apply).toHaveBeenLastCalledWith(null);
  });

  it("supports denied storage for this mount and resets safely on a fresh mount", () => {
    const h = storageHarness();
    h.localStorage.getItem.mockImplementation(() => { throw new Error("denied"); });
    h.localStorage.setItem.mockImplementation(() => { throw new Error("denied"); });
    const store = createBrowserPreference("theme", (v) => v === "light" ? "light" : "dark");
    const stop = store.subscribe(vi.fn());
    expect(store.getSnapshot()).toBe("dark");
    store.set("light"); expect(store.getSnapshot()).toBe("light");
    stop(); const stopAgain = store.subscribe(vi.fn());
    expect(store.getSnapshot()).toBe("dark"); stopAgain();
  });

  it("rereads persisted choices on remount without mutating the fixed hydration snapshot", () => {
    const h = storageHarness();
    const store = createBrowserPreference("theme", (v) => v === "light" ? "light" : "dark");
    const stop = store.subscribe(vi.fn()); stop();
    expect(store.getSnapshot()).toBeUndefined();
    h.data.set("theme", "light");
    const stopAgain = store.subscribe(vi.fn());
    expect(store.getSnapshot()).toBe("light"); expect(store.getServerSnapshot()).toBeUndefined(); stopAgain();
  });

  it.each([["", "1 optique"], ["?type=invalid", "1 optique"], ["?type=jantes", "1 jante"], ["?type=polissage", "Véhicule complet"]])("renders correct initial detail for %s", (query, detail) => {
    mocks.query = new URLSearchParams(query);
    expect(renderToString(<SpecialRequestForm />)).toContain(`name="detail" value="${detail}"`);
  });
});

describe("request-time dashboard clock", () => {
  it("waits for a request boundary and samples afresh on each invocation", async () => {
    let resolve!: () => void;
    mocks.connection.mockImplementationOnce(() => new Promise<void>((done) => { resolve = done; }));
    const now = vi.spyOn(Date, "now").mockReturnValue(100);
    const pending = readRequestClock(); expect(now).not.toHaveBeenCalled();
    resolve(); expect(await pending).toBe(100);
    now.mockReturnValue(200); expect(await readRequestClock()).toBe(200);
    expect(mocks.connection).toHaveBeenCalledTimes(2);
  });

  it("excludes before, includes at/after, sorts and limits upcoming events without mutating them", async () => {
    const cutoff = Date.parse("2026-09-28T10:00:00Z");
    // Data retrieval advances the clock: cutoff must be sampled after it finishes.
    let time = cutoff - 1000;
    vi.spyOn(Date, "now").mockImplementation(() => time);
    const items = [3, -1, 0, 2, 1, 6, 5, 4].map((offset) => ({
      appointment: { id: `event-${offset}`, scheduledAt: new Date(cutoff + offset).toISOString() },
      customer: { fullName: `Customer ${offset}` }, job: { title: `Event ${offset}` },
    }));
    const original = JSON.stringify(items);
    mocks.business.mockResolvedValue({ businessId: "server-business" });
    mocks.rest.mockResolvedValue([]);
    mocks.metrics.mockResolvedValue({ activeLeads: 0, leadsRequiringAttention: 0, customersTotal: 0 });
    mocks.calendar.mockResolvedValue({ items });
    mocks.manual.mockImplementation(async () => { time = cutoff; return []; });
    const html = renderToStaticMarkup(await Dashboard());
    expect(html).not.toContain("Customer -1");
    for (const offset of [0, 1, 2, 3, 4]) expect(html).toContain(`Customer ${offset}`);
    expect(html).not.toContain("Customer 5"); expect(html).not.toContain("Customer 6");
    expect(html.indexOf("Customer 0")).toBeLessThan(html.indexOf("Customer 1"));
    expect(JSON.stringify(items)).toBe(original);
    expect(mocks.calendar).toHaveBeenCalledWith({ month: "2026-09" });
    expect(mocks.connection).toHaveBeenCalledTimes(2);
    expect(mocks.rest).toHaveBeenCalledTimes(5);
    for (const call of mocks.rest.mock.calls) expect(call[3]).toContain("business_id=eq.server-business");
    expect(mocks.manual).toHaveBeenCalledWith("server-business", []);
  });
});
