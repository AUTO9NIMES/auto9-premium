import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), business: vi.fn(), rest: vi.fn(), revalidate: vi.fn() }));
vi.mock("../../app/lib/auth/dal", () => ({ requireCrmAccess: mocks.auth, CrmAccessError: class extends Error {} }));
vi.mock("../../app/lib/business", () => ({ resolveCurrentBusinessContext: mocks.business }));
vi.mock("../../app/lib/supabase", () => ({ supabaseRest: mocks.rest, hasSupabaseWriteConfig: () => true }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
import { createManualLeadAction } from "../../app/crm/pipeline/actions";
import NewDossier from "../../app/crm/pipeline/new/page";

const businessId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const customerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const leadId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const vehicleId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const idempotencyKey = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
function form(mode = "existing") {
  const result = new FormData();
  Object.entries({ intakeMode: mode, customerId, vehicleId, idempotencyKey, serviceName: " Nettoyage intérieur ",
    basePrice: "150", estimatedTime: "3 heures", customerComment: "Sièges en cuir", fullName: "Client Test",
    email: "CLIENT@EXAMPLE.INVALID", phone: "", businessId: "untrusted-client-tenant" }).forEach(([key, value]) => result.set(key, value));
  return result;
}
const writes = () => mocks.rest.mock.calls.filter(([, method]) => method !== "GET");

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ businessId }); mocks.business.mockResolvedValue({ businessId });
  mocks.rest.mockImplementation(async (_table, method) => method === "GET" ? [] : { lead_id: leadId, customer_id: customerId, no_op: false });
});

describe("canonical dossier creation convergence (mocked transport, not database rollback proof)", () => {
  it.each(["existing", "new"])("keeps %s intake on one canonical mutation with server tenant and retry key", async mode => {
    await expect(createManualLeadAction(form(mode))).rejects.toThrow(`redirect:/crm/pipeline/${leadId}`);
    expect(writes()).toHaveLength(1);
    const [endpoint, method, body] = writes()[0];
    expect(endpoint).toBe(mode === "existing" ? "rpc/create_manual_lead" : "rpc/create_manual_lead_with_customer");
    expect(method).toBe("POST");
    expect(body).toMatchObject({ p_business_id: businessId, p_idempotency_key: idempotencyKey,
      p_service_name: "Nettoyage intérieur", p_base_price: 150, p_estimated_time: "3 heures", p_customer_comment: "Sièges en cuir" });
    if (mode === "existing") expect(body).toMatchObject({ p_customer_id: customerId, p_vehicle_id: vehicleId });
    else expect(body).toMatchObject({ p_full_name: "Client Test", p_email: "client@example.invalid" });
    expect(body).not.toHaveProperty("p_created_at");
    expect(mocks.auth.mock.invocationCallOrder[0]).toBeLessThan(mocks.rest.mock.invocationCallOrder[0]);
    expect(mocks.revalidate).toHaveBeenCalledExactlyOnceWith("/crm/pipeline");
  });

  it("preserves optional price, duration, vehicle and note", async () => {
    const input = form();
    for (const name of ["basePrice", "estimatedTime", "vehicleId", "customerComment"]) input.set(name, "");
    await expect(createManualLeadAction(input)).rejects.toThrow(`redirect:/crm/pipeline/${leadId}`);
    expect(writes()[0][2]).toMatchObject({ p_base_price: null, p_estimated_time: null, p_vehicle_id: null, p_customer_comment: null });
  });

  it("replays new-customer submissions with scoped reads and no independent persistence", async () => {
    mocks.rest.mockImplementation(async table => table === "customers" ? [{ id: customerId }] : [{ id: leadId }]);
    await expect(createManualLeadAction(form("new"))).rejects.toThrow(`redirect:/crm/pipeline/${leadId}`);
    expect(writes()).toHaveLength(0);
    expect(mocks.rest).toHaveBeenCalledTimes(2);
    for (const [, , , query] of mocks.rest.mock.calls) {
      expect(query).toContain(`business_id=eq.${businessId}`);
      expect(query).toContain(`idempotency_key=eq.${idempotencyKey}`);
    }
    expect(mocks.rest.mock.calls[1][3]).toContain(`customer_id=eq.${customerId}`);
  });

  it("accepts canonical existing-customer no_op without an independent audit write", async () => {
    mocks.rest.mockResolvedValue({ lead_id: leadId, no_op: true });
    await expect(createManualLeadAction(form())).rejects.toThrow(`redirect:/crm/pipeline/${leadId}`);
    expect(writes()).toHaveLength(1); expect(mocks.revalidate).toHaveBeenCalledOnce();
  });

  it("RPC rejection has no fallback mutation or success revalidation", async () => {
    mocks.rest.mockRejectedValue(new Error("transaction rejected"));
    await expect(createManualLeadAction(form())).rejects.toThrow("error=unavailable");
    expect(writes()).toHaveLength(1); expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("rejects an invalid customer identity before privileged access", async () => {
    const input = form(); input.set("customerId", "invalid");
    await expect(createManualLeadAction(input)).rejects.toThrow("error=invalid");
    expect(mocks.rest).not.toHaveBeenCalled(); expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("rejects unauthorized action and page before reading customer data", async () => {
    mocks.auth.mockRejectedValue(new Error("denied"));
    await expect(createManualLeadAction(form())).rejects.toThrow("error=unavailable");
    await expect(NewDossier({ searchParams: Promise.resolve({ customerId }) })).rejects.toThrow();
    expect(mocks.rest).not.toHaveBeenCalled();
  });

  it.each(["existing", "new"])("renders the %s creation form with unchanged intake fields and no conflated date", async mode => {
    mocks.rest.mockImplementation(async table => table === "customers" ? [{ id: customerId, business_id: businessId, full_name: "Client Test" }] : []);
    const html = renderToStaticMarkup(await NewDossier({ searchParams: Promise.resolve({ mode, ...(mode === "existing" ? { customerId } : {}) }) }));
    for (const name of ["intakeMode", "idempotencyKey", "serviceName", "basePrice", "estimatedTime", "customerComment"]) {
      expect(html).toContain(`name="${name}"`);
    }
    expect(html).toContain("Créer le dossier"); expect(html).toContain("après validation du devis");
    expect(html).not.toContain("datetime-local"); expect(html).not.toContain('name="created_at"');
    expect(html).not.toContain("/crm-v2"); expect(writes()).toHaveLength(0);
  });
});
