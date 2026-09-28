import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCrmAccess: vi.fn(),
  resolveCurrentBusinessContext: vi.fn(),
  supabaseRest: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string): never => {
    throw Object.assign(new Error(url), { digest: "NEXT_REDIRECT" });
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("../../app/lib/auth/dal", () => ({
  CrmAccessError: class CrmAccessError extends Error {
    constructor(public code: string) {
      super(code);
    }
  },
  requireCrmAccess: mocks.requireCrmAccess,
}));

vi.mock("../../app/lib/business", () => ({
  resolveCurrentBusinessContext: mocks.resolveCurrentBusinessContext,
}));

vi.mock("../../app/lib/supabase", () => ({
  supabaseRest: mocks.supabaseRest,
  hasSupabaseWriteConfig: () => true,
  supabaseUrl: "https://example.invalid",
  supabaseServiceRoleKey: "test-only",
}));

import { updatePipelineLeadServiceAction } from "../../app/crm/pipeline/actions";
import { updateLeadServiceDetails } from "../../app/lib/crm-service-edit";

const businessId = "00000000-0000-4000-8000-000000000001";
const leadId = "11111111-1111-4111-8111-111111111111";
const customerId = "22222222-2222-4222-8222-222222222222";
const serviceId = "33333333-3333-4333-8333-333333333333";
const updatedAt = "2026-09-26T18:00:00+00:00";

function form(values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    leadId,
    serviceId,
    expectedServiceName: "Lavage intérieur",
    expectedUpdatedAt: updatedAt,
    serviceName: "Detailing intérieur",
    ...values,
  })) {
    data.set(key, value);
  }
  return data;
}

function canonicalActivity() {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    business_id: businessId,
    lead_id: leadId,
    customer_id: customerId,
    event_type: "lead.service_updated",
    event_data: {
      service_id: serviceId,
      previous_service_name: "Lavage intérieur",
      new_service_name: "Detailing intérieur",
    },
  };
}

function response(status: string) {
  return {
    status,
    customer_id: customerId,
    service: {
      id: serviceId,
      business_id: businessId,
      lead_id: leadId,
      service_name: "Detailing intérieur",
    },
    activity: status === "no_op" ? null : canonicalActivity(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCrmAccess.mockReset().mockResolvedValue({ businessId });
  mocks.resolveCurrentBusinessContext.mockReset().mockResolvedValue({ businessId });
  mocks.supabaseRest.mockReset();
});

describe("Main CRM service edit", () => {
  it("authorizes before accessing the database", async () => {
    mocks.requireCrmAccess.mockRejectedValue(new Error("denied"));

    await expect(updatePipelineLeadServiceAction(form()))
      .rejects.toThrow("/crm/pipeline?error=unavailable");

    expect(mocks.resolveCurrentBusinessContext).not.toHaveBeenCalled();
    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });

  it("rejects malformed service IDs without persistence", async () => {
    await expect(updatePipelineLeadServiceAction(form({ serviceId: "invalid" })))
      .rejects.toThrow("service_error=invalid");

    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });

  it("rejects malformed timestamps and overlong labels", async () => {
    await expect(updatePipelineLeadServiceAction(form({ expectedUpdatedAt: "invalid" })))
      .rejects.toThrow("service_error=invalid");

    await expect(updatePipelineLeadServiceAction(form({ serviceName: "x".repeat(201) })))
      .rejects.toThrow("service_error=invalid");

    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });

  it("passes tenant identity and optimistic version to the RPC", async () => {
    mocks.supabaseRest.mockResolvedValue(response("updated"));

    await expect(updatePipelineLeadServiceAction(form({
      business_id: "client-supplied-business",
      customerId: "client-supplied-customer",
      activity: "client-supplied-activity",
    })))
      .rejects.toThrow("service=updated");

    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
    expect(mocks.supabaseRest).toHaveBeenCalledWith(
      "rpc/update_lead_service_details",
      "POST",
      {
        p_business_id: businessId,
        p_lead_id: leadId,
        p_service_id: serviceId,
        p_expected_service_name: "Lavage intérieur",
        p_expected_updated_at: updatedAt,
        p_service_name: "Detailing intérieur",
        p_source: "crm_pipeline_ui",
      },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/crm/pipeline/${leadId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/crm/clients/${customerId}`);
  });

  it.each(["conflict", "blocked", "not_found", "invalid"])(
    "does not claim success for RPC status %s",
    async (status) => {
      mocks.supabaseRest.mockResolvedValue({ status });

      await expect(updatePipelineLeadServiceAction(form()))
        .rejects.toThrow(`service_error=${status}`);

      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("does not revalidate for an unchanged service", async () => {
    mocks.supabaseRest.mockResolvedValue(response("no_op"));

    await expect(updatePipelineLeadServiceAction(form()))
      .rejects.toThrow("service=no_op");

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a success response with inconsistent ownership", async () => {
    mocks.supabaseRest.mockResolvedValue({
      ...response("updated"),
      service: {
        ...response("updated").service,
        business_id: "99999999-9999-4999-8999-999999999999",
      },
    });

    await expect(updateLeadServiceDetails({
      leadId,
      serviceId,
      expectedServiceName: "Lavage intérieur",
      expectedUpdatedAt: updatedAt,
      serviceName: "Detailing intérieur",
    })).rejects.toThrow("inconsistent ownership");
  });

  it("rejects an updated response without its audit event", async () => {
    mocks.supabaseRest.mockResolvedValue({
      ...response("updated"),
      activity: null,
    });

    await expect(updatePipelineLeadServiceAction(form()))
      .rejects.toThrow("service_error=unavailable");

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not claim success when the RPC fails", async () => {
    mocks.supabaseRest.mockRejectedValue(new Error("Database unavailable"));

    await expect(updatePipelineLeadServiceAction(form()))
      .rejects.toThrow("service_error=unavailable");

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  const invalidActivityFields: Array<[string, Record<string, unknown>]> = [
    ["wrong business_id", { business_id: "99999999-9999-4999-8999-999999999999" }],
    ["wrong lead_id", { lead_id: serviceId }],
    ["wrong customer_id", { customer_id: leadId }],
    ["wrong event_type", { event_type: "lead.status_changed" }],
    ["missing activity ID", { id: undefined }],
    ["empty activity ID", { id: "" }],
    ["blank activity ID", { id: "   " }],
    ["non-string activity ID", { id: 123 }],
    ...[
      ["wrong service_id", { service_id: leadId }],
      ["wrong previous_service_name", { previous_service_name: "Another service" }],
      ["wrong new_service_name", { new_service_name: "Another service" }],
    ].map(([name, fields]) => [name, {
      event_data: { ...canonicalActivity().event_data, ...(fields as Record<string, unknown>) },
    }] as [string, Record<string, unknown>]),
    ["missing event_data", { event_data: undefined }],
    ["null event_data", { event_data: null }],
    ["array event_data", { event_data: [] }],
    ["string event_data", { event_data: "invalid" }],
    ["incomplete event_data", { event_data: {} }],
  ];

  it.each(invalidActivityFields)("rejects updated responses with %s without success side effects", async (_name, fields) => {
    mocks.supabaseRest.mockResolvedValue({
      ...response("updated"),
      activity: { ...canonicalActivity(), ...fields },
    });

    // Response validation cannot roll back an RPC that has already completed.
    // It must prevent success presentation and further client-side side effects.
    await expect(updatePipelineLeadServiceAction(form()))
      .rejects.toThrow("service_error=unavailable");
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(`/crm/pipeline/${leadId}?service_error=unavailable`);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
  });

  it.each([canonicalActivity(), {}, [], "invalid", undefined])("rejects no_op with non-null activity %j", async (activity) => {
    mocks.supabaseRest.mockResolvedValue({ ...response("no_op"), activity });

    await expect(updatePipelineLeadServiceAction(form()))
      .rejects.toThrow("service_error=unavailable");
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(`/crm/pipeline/${leadId}?service_error=unavailable`);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
  });

  it.each(["id", "business_id", "lead_id"] as const)("retains no_op service ownership validation for %s", async (field) => {
    const result = response("no_op");
    mocks.supabaseRest.mockResolvedValue({ ...result, service: { ...result.service, [field]: "wrong-owner" } });

    await expect(updatePipelineLeadServiceAction(form()))
      .rejects.toThrow("service_error=unavailable");
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(`/crm/pipeline/${leadId}?service_error=unavailable`);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
  });
});
