import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  business: vi.fn(),
  rest: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("../../app/lib/auth/dal", () => ({
  requireCrmAccess: mocks.auth,
  CrmAccessError: class extends Error {},
}));
vi.mock("../../app/lib/business", () => ({
  resolveCurrentBusinessContext: mocks.business,
}));
vi.mock("../../app/lib/supabase", () => ({
  supabaseRest: mocks.rest,
  hasSupabaseWriteConfig: () => true,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

import { createV2ManualLeadAction } from "../../app/crm-v2/pipeline/new/actions";
import NewV2Dossier from "../../app/crm-v2/pipeline/new/page";

const businessId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const customerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const leadId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const eventId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const key = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

function form(mode: "existing" | "new" = "existing") {
  const data = new FormData();
  const values = {
    intakeMode: mode,
    customerId,
    idempotencyKey: key,
    serviceName: " Nettoyage intérieur ",
    basePrice: "150",
    estimatedTime: "3 heures",
    customerComment: "Sièges en cuir",
    fullName: "Client Test",
    email: "CLIENT@EXAMPLE.INVALID",
    phone: "+33 6 12 34 56 78",
    businessId: "untrusted-tenant",
    performanceDate: "",
    performanceTime: "",
  };
  for (const [name, value] of Object.entries(values)) data.set(name, value);
  return data;
}

const writes = () => mocks.rest.mock.calls.filter(([, method]) => method !== "GET");

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ businessId });
  mocks.business.mockResolvedValue({ businessId });
  mocks.rest.mockImplementation(async (_table, method) =>
    method === "GET"
      ? []
      : { lead_id: leadId, customer_id: customerId, event_id: null, no_op: false },
  );
});

describe("V2 hybrid intake (mocked transport, not database transaction proof)", () => {
  it.each([
    ["existing", "", "", null, null],
    ["existing", "2026-10-05", "", "2026-10-05", null],
    ["existing", "2026-10-05", "14:30", "2026-10-05", "14:30"],
    ["new", "2026-10-05", "14:30", "2026-10-05", "14:30"],
  ] as const)(
    "%s intake with date=%s time=%s uses exactly one tenant-scoped RPC",
    async (mode, date, time, expectedDate, expectedTime) => {
      const input = form(mode);
      input.set("performanceDate", date);
      input.set("performanceTime", time);

      await expect(createV2ManualLeadAction(input)).rejects.toThrow(
        `redirect:/crm-v2/pipeline?created=1&lead=${leadId}`,
      );
      expect(writes()).toHaveLength(1);
      const [endpoint, method, body] = writes()[0];
      expect(endpoint).toBe("rpc/create_manual_dossier_hybrid");
      expect(method).toBe("POST");
      expect(body).toMatchObject({
        p_business_id: businessId,
        p_idempotency_key: key,
        p_service_name: "Nettoyage intérieur",
        p_base_price: 150,
        p_performance_date: expectedDate,
        p_performance_time: expectedTime,
      });
      expect(body).not.toHaveProperty("p_created_at");
      expect(body).not.toHaveProperty("p_scheduled_at");
      if (mode === "existing") {
        expect(body).toMatchObject({
          p_customer_id: customerId,
          p_new_customer_full_name: null,
        });
      } else {
        expect(body).toMatchObject({
          p_customer_id: null,
          p_new_customer_full_name: "Client Test",
          p_new_customer_email: "client@example.invalid",
          p_new_customer_phone: "33612345678",
        });
      }
      expect(mocks.auth.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.rest.mock.invocationCallOrder[0],
      );
    },
  );

  it("accepts an identical RPC replay without another write", async () => {
    mocks.rest.mockResolvedValue({
      lead_id: leadId,
      customer_id: customerId,
      event_id: eventId,
      no_op: true,
    });
    const input = form();
    input.set("performanceDate", "2026-10-05");
    input.set("performanceTime", "14:30");
    await expect(createV2ManualLeadAction(input)).rejects.toThrow(
      `redirect:/crm-v2/pipeline?created=1&lead=${leadId}`,
    );
    expect(writes()).toHaveLength(1);
  });

  it.each([
    ["time without date", "", "14:30"],
    ["invalid date", "2026-02-30", ""],
    ["invalid time", "2026-10-05", "25:00"],
  ])("rejects %s before access and persistence", async (_name, date, time) => {
    const input = form();
    input.set("performanceDate", date);
    input.set("performanceTime", time);
    await expect(createV2ManualLeadAction(input)).rejects.toThrow("error=invalid");
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.rest).not.toHaveBeenCalled();
  });

  it("rejects RPC errors without fallback writes or success revalidation", async () => {
    mocks.rest.mockRejectedValue(new Error("transaction rejected"));
    await expect(createV2ManualLeadAction(form())).rejects.toThrow(
      "error=unavailable",
    );
    expect(writes()).toHaveLength(1);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it.each(["existing", "new"] as const)(
    "renders %s with independent date and time inputs",
    async (mode) => {
      mocks.rest.mockImplementation(async (table) =>
        table === "customers"
          ? [{ id: customerId, business_id: businessId, full_name: "Client Test" }]
          : [],
      );
      const html = renderToStaticMarkup(
        await NewV2Dossier({
          searchParams: Promise.resolve({
            mode,
            ...(mode === "existing" ? { customerId } : {}),
          }),
        }),
      );
      expect(html).toContain('name="performanceDate"');
      expect(html).toContain('name="performanceTime"');
      expect(html).toContain('type="date"');
      expect(html).toContain('type="time"');
      expect(html).not.toContain('name="created_at"');
      expect(html).not.toContain('name="scheduled_at"');
      expect(html).not.toContain('type="datetime-local"');
      expect(writes()).toHaveLength(0);
    },
  );
});
