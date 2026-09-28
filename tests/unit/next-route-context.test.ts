import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ appointment: vi.fn(), customer: vi.fn(), job: vi.fn(), quote: vi.fn(), publicQuote: vi.fn() }));
vi.mock("../../app/lib/crm", () => ({
  transitionAppointmentStatus: mocks.appointment,
  getCustomer360: mocks.customer,
  getJobDetails: mocks.job,
  acceptQuoteAndCreateJob: mocks.quote,
  acceptPublicQuoteByToken: mocks.publicQuote,
}));
import { POST as appointment } from "../../app/api/appointments/[appointmentId]/transition/route";
import { GET as customer } from "../../app/api/crm/customers/[customerId]/route";
import { GET as job } from "../../app/api/crm/jobs/[jobId]/route";
import { POST as quote } from "../../app/api/quotes/[quoteId]/accept/route";
import { POST as publicQuote } from "../../app/api/quotes/share/[token]/accept/route";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const token = "ABCDEF0123456789ABCDEF0123456789";
const routes = [
  { path: "appointments/[appointmentId]/transition", key: "appointmentId", method: "POST", mock: mocks.appointment,
    invoke: (r: Request, value: string) => appointment(r, { params: Promise.resolve({ appointmentId: value }) }) },
  { path: "crm/customers/[customerId]", key: "customerId", method: "GET", mock: mocks.customer,
    invoke: (r: Request, value: string) => customer(r, { params: Promise.resolve({ customerId: value }) }) },
  { path: "crm/jobs/[jobId]", key: "jobId", method: "GET", mock: mocks.job,
    invoke: (r: Request, value: string) => job(r, { params: Promise.resolve({ jobId: value }) }) },
  { path: "quotes/[quoteId]/accept", key: "quoteId", method: "POST", mock: mocks.quote,
    invoke: (r: Request, value: string) => quote(r, { params: Promise.resolve({ quoteId: value }) }) },
];
function request(method: string, authorization: string | null = "Bearer unit-only-key", body = JSON.stringify({ status: "CONFIRMED", notes: " note ", businessId: "client-tenant-must-not-be-forwarded" })) {
  return new Request("https://unit.invalid/api/test", { method,
    headers: authorization ? { authorization } : {}, ...(method === "POST" ? { body } : {}) });
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("AUTO9_INTERNAL_API_KEY", "unit-only-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
  for (const mock of Object.values(mocks)) mock.mockResolvedValue({ customer: { id }, job: { id }, quote: { id }, appointment: { id }, lead: { id }, activity: { id } });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("Next 16 dynamic route contracts", () => {
  it.each([...routes, { path: "quotes/share/[token]/accept", key: "token" }])("$path exposes required Promise params", ({ path, key }) => {
    const source = readFileSync(`app/api/${path}/route.ts`, "utf8");
    expect(source).toContain(`context: { params: Promise<{ ${key}: string }> }`);
    expect(source).toContain("const params = await context.params;");
  });

  describe.each(routes)("$path behavior", route => {
    it("preserves missing-server-configuration 503 before privileged calls", async () => {
      vi.stubEnv("AUTO9_INTERNAL_API_KEY", "");
      expect((await route.invoke(request(route.method), id)).status).toBe(503);
      expect(route.mock).not.toHaveBeenCalled();
    });
    it.each([null, "Bearer wrong-key"])("preserves unauthorized 401 (%s)", async authorization => {
      expect((await route.invoke(request(route.method, authorization), id)).status).toBe(401);
      expect(route.mock).not.toHaveBeenCalled();
    });
    it("preserves malformed-id 400", async () => {
      expect((await route.invoke(request(route.method), "invalid")).status).toBe(400);
      expect(route.mock).not.toHaveBeenCalled();
    });
    it("awaits and trims the ID, then delegates once without client tenant data", async () => {
      const response = await route.invoke(request(route.method), ` ${id} `);
      expect(response.status).toBe(200); expect((await response.json()).ok).toBe(true);
      const expected = route.key === "appointmentId" ? { appointmentId: id, targetStatus: "CONFIRMED", source: "appointment_lifecycle_api", notes: "note" }
        : route.key === "quoteId" ? { quoteId: id, source: "quote_acceptance_api" } : id;
      expect(route.mock).toHaveBeenCalledExactlyOnceWith(expected);
    });
    it("preserves domain failure 500", async () => {
      route.mock.mockRejectedValue(new Error("unit failure"));
      expect((await route.invoke(request(route.method), id)).status).toBe(500);
      expect(route.mock).toHaveBeenCalledOnce();
    });
  });

  it.each(routes.filter(route => route.method === "GET"))("$path preserves not-found 404", async route => {
    route.mock.mockResolvedValue(null);
    expect((await route.invoke(request(route.method), id)).status).toBe(404);
  });
  it.each(["not-json", JSON.stringify({ status: "PAID" }), JSON.stringify({ status: "CONFIRMED", notes: 42 })])("preserves appointment body validation (%s)", async body => {
    expect((await appointment(request("POST", "Bearer unit-only-key", body), { params: Promise.resolve({ appointmentId: id }) })).status).toBe(400);
    expect(mocks.appointment).not.toHaveBeenCalled();
  });
  it("public acceptance uses only normalized token and preserves 303", async () => {
    const response = await publicQuote(request("POST", null), { params: Promise.resolve({ token: ` ${token} ` }) });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`https://unit.invalid/devis/${token.toLowerCase()}`);
    expect(mocks.publicQuote).toHaveBeenCalledExactlyOnceWith(token.toLowerCase());
  });
  it("public acceptance hides RPC failures behind the existing 303", async () => {
    mocks.publicQuote.mockRejectedValue(new Error("private detail"));
    const response = await publicQuote(request("POST", null), { params: Promise.resolve({ token }) });
    expect(response.status).toBe(303); expect(await response.text()).not.toContain("private detail");
  });
  it("public acceptance rejects malformed tokens without RPC", async () => {
    expect((await publicQuote(request("POST", null), { params: Promise.resolve({ token: "invalid" }) })).status).toBe(400);
    expect(mocks.publicQuote).not.toHaveBeenCalled();
  });
});
