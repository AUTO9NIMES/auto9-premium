import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCrmAccess: vi.fn(),
  resolveCurrentBusinessContext: vi.fn(),
  supabaseRest: vi.fn(),
  revalidatePath: vi.fn(),
  getLeadsList: vi.fn(),
  open: false,
  redirect: vi.fn((url: string): never => {
    throw Object.assign(new Error(url), { digest: "NEXT_REDIRECT" });
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../../app/lib/auth/dal", () => ({ requireCrmAccess: mocks.requireCrmAccess }));
vi.mock("../../app/lib/business", () => ({ resolveCurrentBusinessContext: mocks.resolveCurrentBusinessContext }));
vi.mock("../../app/lib/supabase", () => ({
  supabaseRest: mocks.supabaseRest,
  hasSupabaseWriteConfig: () => true,
  supabaseUrl: "https://example.invalid",
  supabaseServiceRoleKey: "test-only",
}));
vi.mock("../../app/lib/crm", async (original) => {
  const actual = await original<typeof import("../../app/lib/crm")>();
  return {
    ...actual,
    // Observe delegation while still executing the real canonical helper.
    transitionLeadStatus: vi.fn(actual.transitionLeadStatus),
    getLeadsList: mocks.getLeadsList,
  };
});
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  // Render both collapsed/open presentations without a browser or DOM runner.
  useState: () => [mocks.open, vi.fn()],
}));

import {
  transitionLeadStatus, updateCustomerProfile, type LeadLifecycleStatus,
} from "../../app/lib/crm";
import {
  cancelV2Lead, updateV2LeadDetails, updateV2DraftPrice,
} from "../../app/crm-v2/pipeline/actions";
import Pipeline from "../../app/crm-v2/pipeline/page";
import LeadDangerActions from "../../app/crm-v2/pipeline/LeadDangerActions";
import {
  createDraftPriceSnapshot,
} from "../../app/crm-v2/pipeline/LeadEditPanel";

const businessId = "00000000-0000-0000-0000-000000000001";
const leadId = "11111111-1111-4111-8111-111111111111";
const customerId = "22222222-2222-4222-8222-222222222222";
const quoteId = "33333333-3333-4333-8333-333333333333";
const activityId = "44444444-4444-4444-8444-444444444444";
const otherBusiness = "55555555-5555-4555-8555-555555555555";
const read = (file: string) => fs.readFileSync(file, "utf8");
const newMigration = read("supabase/migrations/20260924000100_crm_v2_p0_canonical_hardening.sql");

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

function transitionResult(previousStatus = "NEW", noOp = false) {
  return {
    lead: { id: leadId, business_id: businessId, customer_id: customerId, lifecycle_status: "CLOSED_LOST" },
    activity: noOp ? null : {
      id: activityId, business_id: businessId, customer_id: customerId, lead_id: leadId,
      event_type: "lead.status_changed",
      event_data: { previous_status: previousStatus, new_status: "CLOSED_LOST", comment: "Véhicule vendu" },
    },
  };
}

function item(status: LeadLifecycleStatus = "NEW", quoteStatus = "DRAFT", jobStatus?: string) {
  return {
    lead: { id: leadId, business_id: businessId, customer_id: customerId, source: "website", lifecycle_status: status, notes: "Appeler avant déplacement" },
    customer: { id: customerId, full_name: "Jean Dupont", phone: "0612345678", email: "jean@example.test", city: "Nîmes" },
    vehicle: null,
    latestQuote: { id: quoteId, status: quoteStatus, total_price: 100, payload_json: { serviceName: "Nettoyage intérieur" } },
    latestJob: jobStatus ? { id: "job-id", status: jobStatus, total_amount: 100 } : null,
    latestAppointment: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.supabaseRest.mockReset();
  mocks.open = false;
  mocks.requireCrmAccess.mockReset().mockResolvedValue({ businessId });
  mocks.resolveCurrentBusinessContext.mockReset().mockResolvedValue({ businessId });
  mocks.getLeadsList.mockReset().mockResolvedValue({ items: [item()] });
});

// These execute the real actions/domain helpers with only transport/auth mocked.
// RPC responses are fixtures, not a database simulator: lifecycle, atomicity and
// concurrency enforcement still require separate database integration testing.
describe("V2 cancellation at the canonical RPC boundary", () => {
  it.each(["NEW", "QUALIFIED", "CONTACTED", "QUOTE_SENT"])("handles canonical %s -> CLOSED_LOST", async (status) => {
    mocks.supabaseRest.mockResolvedValue(transitionResult(status));
    await expect(cancelV2Lead(form({ leadId, comment: " Véhicule vendu ", business_id: otherBusiness })))
      .rejects.toThrow("/crm-v2/pipeline?lead_cancelled=1");
    expect(mocks.supabaseRest).toHaveBeenCalledExactlyOnceWith("rpc/transition_lead_status", "POST", {
      p_business_id: businessId, p_lead_id: leadId, p_target_status: "CLOSED_LOST", p_source: "crm_v2", p_comment: "Véhicule vendu",
    });
    expect(mocks.requireCrmAccess.mock.invocationCallOrder[0]).toBeLessThan(mocks.supabaseRest.mock.invocationCallOrder[0]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/crm/clients/${customerId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/crm-v2/clients/${customerId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/crm/pipeline/${leadId}`);
  });

  it.each(["BOOKED", "IN_PROGRESS", "COMPLETED", "REVIEW_REQUESTED"])("does not fall back to PATCH after canonical rejection of %s", async (status) => {
    mocks.supabaseRest.mockRejectedValue(new Error(`Lead status ${status} is not manually transitionable`));
    await expect(cancelV2Lead(form({ leadId, comment: "Motif" }))).rejects.toThrow("lead_error=unavailable");
    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
    expect(mocks.supabaseRest.mock.calls[0][0]).toBe("rpc/transition_lead_status");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not add an independent history write for either a transition or its replay", async () => {
    mocks.supabaseRest.mockResolvedValueOnce(transitionResult()).mockResolvedValueOnce(transitionResult("CLOSED_LOST", true));
    for (let i = 0; i < 2; i++) {
      await expect(cancelV2Lead(form({ leadId, comment: "Véhicule vendu" }))).rejects.toThrow("lead_cancelled=1");
    }
    expect(mocks.supabaseRest.mock.calls.map(([path]) => path)).toEqual(["rpc/transition_lead_status", "rpc/transition_lead_status"]);
  });

  it("returns canonical customer linkage and reason intact", async () => {
    mocks.supabaseRest.mockResolvedValue(transitionResult());
    const result = await transitionLeadStatus({ leadId, targetStatus: "CLOSED_LOST", comment: "Véhicule vendu" });
    expect(result.activity).toMatchObject({ customer_id: customerId, event_type: "lead.status_changed", event_data: { comment: "Véhicule vendu" } });
  });

  it("preserves the original RPC signature for callers without a comment", async () => {
    mocks.supabaseRest.mockResolvedValue(transitionResult());
    await transitionLeadStatus({ leadId, targetStatus: "CLOSED_LOST" });
    expect(mocks.supabaseRest.mock.calls[0][2]).not.toHaveProperty("p_comment");
  });

  it("fails closed for a tenant-mismatched RPC result", async () => {
    const result = transitionResult();
    result.lead.business_id = otherBusiness;
    mocks.supabaseRest.mockResolvedValue(result);
    await expect(cancelV2Lead(form({ leadId }))).rejects.toThrow("lead_error=unavailable");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects invalid UUIDs without contacting persistence", async () => {
    await expect(cancelV2Lead(form({ leadId: "invalid" }))).rejects.toThrow("lead_error=invalid");
    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });
});

describe("STEP275 regression A: canonical cancellation delegation", () => {
  // Route-aware fixtures let the existing bypass reach its writes instead of
  // failing early because a GET was given an RPC-shaped response. All transport
  // is mocked; these fixtures do not simulate database transactions or policy.
  function transport(options: { rejectRpc?: boolean; replay?: boolean } = {}) {
    mocks.supabaseRest.mockImplementation(async (path, method) => {
      if (path === "rpc/transition_lead_status" && method === "POST") {
        if (options.rejectRpc) throw new Error("Canonical transition rejected");
        return transitionResult(options.replay ? "CLOSED_LOST" : "CONTACTED", options.replay);
      }
      if (path === "leads" && method === "GET") {
        return [{ id: leadId, customer_id: customerId, lifecycle_status: options.replay ? "CLOSED_LOST" : "CONTACTED" }];
      }
      if (path === "crm_calendar_events" && method === "DELETE") return null;
      if (path === "leads" && method === "PATCH") return transitionResult().lead;
      if (path === "activity_log" && method === "POST") return transitionResult().activity;
      throw new Error(`Unexpected test transport: ${method} ${path}`);
    });
  }

  const rpcCalls = () => mocks.supabaseRest.mock.calls.filter(([path]) => path === "rpc/transition_lead_status");
  const independentWrites = () => mocks.supabaseRest.mock.calls.filter(([path, method]) =>
    !String(path).startsWith("rpc/") && ["POST", "PATCH", "PUT", "DELETE"].includes(method),
  );

  it("calls the real canonical helper once with server tenant, lead and comment", async () => {
    transport();
    await expect(cancelV2Lead(form({ leadId, comment: " Véhicule vendu ", business_id: otherBusiness })))
      .rejects.toThrow("/crm-v2/pipeline?lead_cancelled=1");
    expect.soft(transitionLeadStatus).toHaveBeenCalledExactlyOnceWith({
      leadId, targetStatus: "CLOSED_LOST", source: "crm_v2", comment: "Véhicule vendu",
    });
    expect.soft(rpcCalls()).toEqual([["rpc/transition_lead_status", "POST", {
      p_business_id: businessId, p_lead_id: leadId, p_target_status: "CLOSED_LOST",
      p_source: "crm_v2", p_comment: "Véhicule vendu",
    }]]);
    expect(mocks.resolveCurrentBusinessContext).toHaveBeenCalled();
    expect(mocks.requireCrmAccess.mock.invocationCallOrder[0]).toBeLessThan(mocks.supabaseRest.mock.invocationCallOrder[0]);
  });

  it.each([
    ["crm_calendar_events", "DELETE"], ["leads", "PATCH"], ["activity_log", "POST"],
  ])("never performs independent %s %s during cancellation", async (path, method) => {
    transport();
    await expect(cancelV2Lead(form({ leadId, comment: "Motif" }))).rejects.toThrow("lead_cancelled=1");
    expect(mocks.supabaseRest.mock.calls.filter(([actualPath, actualMethod]) => actualPath === path && actualMethod === method)).toEqual([]);
  });

  it("propagates canonical rejection without fallback persistence", async () => {
    transport({ rejectRpc: true });
    await expect.soft(cancelV2Lead(form({ leadId, comment: "Motif" }))).rejects.toThrow("lead_error=unavailable");
    expect.soft(rpcCalls()).toHaveLength(1);
    expect.soft(independentWrites()).toEqual([]);
    expect.soft(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("delegates both first submission and replay without independent activity", async () => {
    for (const replay of [false, true]) {
      transport({ replay });
      await expect(cancelV2Lead(form({ leadId, comment: "Motif" }))).rejects.toThrow("lead_cancelled=1");
    }
    expect.soft(transitionLeadStatus).toHaveBeenCalledTimes(2);
    expect.soft(rpcCalls()).toHaveLength(2);
    expect.soft(independentWrites()).toEqual([]);
  });
});

// Architecture checks only: inspect the final CREATE OR REPLACE body for each
// signature in numeric migration order. No SQL is executed and no transactional,
// PostgREST resolution or deployed-schema guarantee is inferred from this scan.
describe("STEP275 regression B: effective migration-chain contract", () => {
  const migrations = fs.readdirSync("supabase/migrations")
    .filter((file) => /^\d+_.*\.sql$/.test(file))
    .sort((a, b) => {
      const left = BigInt(a.split("_")[0]);
      const right = BigInt(b.split("_")[0]);
      return left < right ? -1 : left > right ? 1 : a.localeCompare(b);
    });
  const definitions = migrations.flatMap((file) => {
    const sql = read(`supabase/migrations/${file}`).replace(/\/\*[\s\S]*?\*\/|--[^\n]*/g, "");
    // Fail closed if the chain begins dropping these functions: this small
    // scanner intentionally supports the repository's replacement-only history.
    if (/drop\s+function[^;]*(transition_lead_status|mark_quote_as_sent|issue_quote_share_token)/i.test(sql)) {
      throw new Error(`Unsupported function drop in migration scan: ${file}`);
    }
    return [...sql.matchAll(/create\s+or\s+replace\s+function\s+public\.(\w+)\s*\(([\s\S]*?)\)\s*returns\s+[\s\S]*?\bas\s+(\$(?:[a-z_]\w*)?\$)([\s\S]*?)\3\s*;/gi)]
      .map((match) => ({ file, name: match[1], parameters: match[2].split(",").map((parameter) => parameter.trim()), body: match[4] }));
  });
  function effective(name: string, types: string[]) {
    const matches = definitions.filter((definition) => definition.name === name &&
      definition.parameters.map((parameter) => parameter.split(/\s+/)[1].toLowerCase()).join(",") === types.join(","));
    const latest = matches[matches.length - 1];
    if (!latest) throw new Error(`Missing effective SQL signature: ${name}(${types})`);
    return latest;
  }
  const four = effective("transition_lead_status", ["uuid", "uuid", "text", "text"]);
  const five = effective("transition_lead_status", ["uuid", "uuid", "text", "text", "text"]);

  it("prohibits generic CONTACTED -> QUOTE_SENT in the final four-argument body", () => {
    // Check the explicit rejection guard, not comments or the enum whitelist.
    // This contract allows an unconditional rejection or migration 031's
    // cancellation-only guard within the CONTACTED branch.
    const branch = four.body.match(/elsif\s+v_lead\.lifecycle_status\s*=\s*'CONTACTED'\s+then([\s\S]*?)(?=elsif\s+v_lead\.lifecycle_status)/i)?.[1];
    expect(branch, `CONTACTED branch missing from ${four.file}`).toBeDefined();
    expect(branch?.trim(), `Effective definition from ${four.file} must reject generic quote sending`)
      .toMatch(/^(?:if\s+v_target_status\s*(?:<>\s*'CLOSED_LOST'|=\s*'QUOTE_SENT')\s+then\s+)?raise\s+exception\s+using\s+errcode\s*=\s*'23514'/i);
  });

  it("STEP276 fails closed for operational history before any lead write", () => {
    const guardStart = four.body.indexOf("if v_target_status = 'CLOSED_LOST' then");
    const guardEnd = four.body.indexOf("if v_lead.lifecycle_status = 'NEW' then", guardStart);
    const guard = four.body.slice(guardStart, guardEnd);
    expect(guardStart).toBeGreaterThan(four.body.indexOf("if v_lead.lifecycle_status = v_target_status then"));
    expect(guard).toMatch(/exists \(\s*select 1 from public\.jobs\s+where business_id = p_business_id and lead_id = v_lead\.id/);
    expect(guard).toMatch(/or exists \(\s*select 1 from public\.appointments\s+where business_id = p_business_id and lead_id = v_lead\.id/);
    // All child states are protected, not just a subset of job/appointment states.
    expect(guard).not.toMatch(/\bstatus\s*(?:=|in|not)/i);
    expect(guard).toContain("errcode = '23514'");
    expect(guardEnd).toBeLessThan(four.body.indexOf("update public.leads"));
    expect(four.body).not.toMatch(/(?:update|delete from) public\.(?:jobs|appointments|crm_calendar_events|payments)/);
    expect(four.body).not.toMatch(/(?:if|elsif) v_lead\.lifecycle_status = '(?:BOOKED|IN_PROGRESS|COMPLETED|REVIEW_REQUESTED)'/);
    expect(four.body).toContain("Lead status %s is not manually transitionable");
  });

  it("preserves three-/four-argument SQL calls and the explicit five-argument wrapper", () => {
    expect(four.parameters).toEqual([
      "p_business_id uuid", "p_lead_id uuid", "p_target_status text", "p_source text default 'internal'",
    ]);
    expect(five.parameters).toEqual([
      "p_business_id uuid", "p_lead_id uuid", "p_target_status text", "p_source text", "p_comment text",
    ]);
    expect(five.body).toMatch(/public\.transition_lead_status\(\s*p_business_id,\s*p_lead_id,\s*p_target_status,\s*p_source\s*\)/);
    expect(five.body).toContain("v_result->'activity'->>'id' is not null");
  });

  it("preserves canonical quote-send and share paths in their effective definitions", () => {
    const send = effective("mark_quote_as_sent", ["uuid", "uuid", "text"]);
    const share = effective("issue_quote_share_token", ["uuid", "uuid"]);
    for (const definition of [send, share]) {
      expect(definition.body, definition.file).toMatch(/update public\.quotes\s+set status = 'SENT'/);
      expect(definition.body, definition.file).toMatch(/update public\.leads\s+set lifecycle_status = 'QUOTE_SENT'/);
      expect(definition.body, definition.file).toContain("v_lead.lifecycle_status <> 'CONTACTED'");
      expect(definition.body, definition.file).toContain("and lifecycle_status = 'CONTACTED'");
    }
  });
});

describe("customer profile omission contract and isolated save", () => {
  it.each([
    [undefined, false, null],
    [null, true, null],
    ["1985-04-03", true, "1985-04-03"],
  ] as const)("sends the correct preservation flag for birthDate=%s", async (birthDate, provided, value) => {
    mocks.supabaseRest.mockResolvedValue({ customer: { id: customerId }, changed_fields: [], no_op: true });
    await updateCustomerProfile({ customerId, fullName: "Jean Dupont", birthDate });
    expect(mocks.supabaseRest).toHaveBeenCalledWith("rpc/update_customer_profile", "POST", expect.objectContaining({
      p_business_id: businessId, p_customer_id: customerId, p_birth_date: value, p_birth_date_provided: provided,
    }));
  });

  it("saves only the linked tenant customer and ignores forged propagation fields", async () => {
    mocks.supabaseRest.mockResolvedValueOnce([{ customer_id: customerId }])
      .mockResolvedValueOnce({ customer: { id: customerId }, changed_fields: ["city"], no_op: false });
    await expect(updateV2LeadDetails(form({
      leadId, fullName: "Jean Dupont", phone: "0612345678", email: "jean@example.test", city: "Nîmes",
      customerId: "forged", business_id: otherBusiness, birthDate: "", price: "1", serviceName: "Forged", note: "Forged",
    }))).rejects.toThrow("edit_updated=1");
    expect(mocks.supabaseRest).toHaveBeenNthCalledWith(1, "leads", "GET", null, `business_id=eq.${businessId}&id=eq.${leadId}&select=customer_id&limit=1`);
    expect(mocks.supabaseRest).toHaveBeenNthCalledWith(2, "rpc/update_customer_profile", "POST", expect.objectContaining({
      p_business_id: businessId, p_customer_id: customerId, p_full_name: "Jean Dupont", p_email: "jean@example.test", p_city: "Nîmes", p_birth_date_provided: false,
    }));
    expect(mocks.supabaseRest).toHaveBeenCalledTimes(2);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/crm/clients/${customerId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/crm/jobs/[jobId]", "page");
  });

  it("does not update a customer when the lead is outside the tenant or absent", async () => {
    mocks.supabaseRest.mockResolvedValue([]);
    await expect(updateV2LeadDetails(form({ leadId, fullName: "Jean" }))).rejects.toThrow("edit_error=not_found");
    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not continue with other writes if the canonical profile RPC fails", async () => {
    mocks.supabaseRest.mockResolvedValueOnce([{ customer_id: customerId }]).mockRejectedValueOnce(new Error("tenant rejection"));
    await expect(updateV2LeadDetails(form({ leadId, fullName: "Jean" }))).rejects.toThrow("edit_error=unavailable");
    expect(mocks.supabaseRest).toHaveBeenCalledTimes(2);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("draft-price save delegates financial authority", () => {
  const priceForm = () => form({ quoteId, expectedPrice: "100", price: "125,50", business_id: otherBusiness });

  it.each(["updated", "no_op"])("handles %s for the exact displayed quote and expected price", async (status) => {
    mocks.supabaseRest.mockResolvedValue({ status, quote_id: quoteId, lead_id: leadId, total_price: 125.5 });
    await expect(updateV2DraftPrice(priceForm())).rejects.toThrow("price_updated=1");
    expect(mocks.supabaseRest).toHaveBeenCalledExactlyOnceWith("rpc/update_draft_quote_amount", "POST", {
      p_business_id: businessId, p_quote_id: quoteId, p_expected_total_price: 100, p_total_price: 125.5,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/crm/pipeline/${leadId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/crm/clients/[customerId]", "page");
  });

  it.each(["conflict", "invalid_lifecycle", "not_found", "invalid_amount"])("surfaces canonical %s without another write", async (status) => {
    mocks.supabaseRest.mockResolvedValue({ status, quote_id: quoteId });
    await expect(updateV2DraftPrice(priceForm())).rejects.toThrow(`price_error=${status}`);
    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each(["SENT", "ACCEPTED", "EXPIRED", "COMPLETED job", "PAID job"])("honors the RPC lock for %s without any propagation", async () => {
    mocks.supabaseRest.mockResolvedValue({ status: "invalid_lifecycle", quote_id: quoteId });
    await expect(updateV2DraftPrice(priceForm())).rejects.toThrow("price_error=invalid_lifecycle");
    expect(mocks.supabaseRest.mock.calls.map(([path]) => path)).toEqual(["rpc/update_draft_quote_amount"]);
  });

  it.each(["", "0", "-1", "1.001", "Infinity", "10000000.01"])("rejects invalid new amount %s before persistence", async (price) => {
    const data = priceForm(); data.set("price", price);
    await expect(updateV2DraftPrice(data)).rejects.toThrow("price_error=invalid_amount");
    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });

  it("requires the expected amount field instead of treating missing input as null", async () => {
    const data = priceForm(); data.delete("expectedPrice");
    await expect(updateV2DraftPrice(data)).rejects.toThrow("price_error=invalid_amount");
    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });

  it("supports an explicitly displayed legacy null amount", async () => {
    mocks.supabaseRest.mockResolvedValue({ status: "updated", quote_id: quoteId, lead_id: leadId });
    const data = priceForm(); data.set("expectedPrice", "null");
    await expect(updateV2DraftPrice(data)).rejects.toThrow("price_updated=1");
    expect(mocks.supabaseRest.mock.calls[0][2].p_expected_total_price).toBeNull();
  });
});

describe("V2 authorization and rendered presentation", () => {
  it.each([cancelV2Lead, updateV2LeadDetails, updateV2DraftPrice])("authorizes before any mutation for %s", async (action) => {
    mocks.requireCrmAccess.mockRejectedValue(new Error("denied"));
    await expect(action(form({ leadId, quoteId }))).rejects.toThrow("denied");
    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });

  it("authorizes the page before either privileged reader", async () => {
    mocks.requireCrmAccess.mockRejectedValue(new Error("denied"));
    await expect(Pipeline({ searchParams: Promise.resolve({}) })).rejects.toThrow("denied");
    expect(mocks.getLeadsList).not.toHaveBeenCalled();
    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });

  it.each([
    ["NEW", true], ["QUALIFIED", true], ["CONTACTED", true], ["QUOTE_SENT", true],
    ["BOOKED", false], ["IN_PROGRESS", false], ["COMPLETED", false], ["REVIEW_REQUESTED", false], ["CLOSED_LOST", false],
  ] as const)("shows cancellation controls for %s only when eligible", (lifecycleStatus, eligible) => {
    const props = { leadId, lifecycleStatus, cancelAction: vi.fn(), deleteAction: vi.fn() };
    expect(renderToStaticMarkup(<LeadDangerActions {...props} />).includes("Annuler la demande")).toBe(eligible);
    mocks.open = true;
    const expanded = renderToStaticMarkup(<LeadDangerActions {...props} />);
    expect(expanded.includes('name="comment"')).toBe(eligible);
    expect(expanded.includes("Confirmer l" )).toBe(eligible);
  });

  it.each(["lead.cancelled", "lead.status_changed"])("renders %s cancellation history", async (event_type) => {
    mocks.getLeadsList.mockResolvedValue({ items: [item("CLOSED_LOST")] });
    mocks.supabaseRest.mockResolvedValue([{ lead_id: leadId, event_type, event_data: { new_status: "CLOSED_LOST", comment: "Véhicule vendu" }, created_at: "2026-09-24T10:00:00Z" }]);
    const html = renderToStaticMarkup(await Pipeline({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Véhicule vendu");
    expect(html).toContain("Annulée le");
  });

  it("renders independent profile and readonly service/note presentation", async () => {
    mocks.open = true;
    mocks.supabaseRest.mockResolvedValue([]);
    const html = renderToStaticMarkup(await Pipeline({ searchParams: Promise.resolve({}) }));
    const forms = html.match(/<form\b[\s\S]*?<\/form>/g) ?? [];
    const profile = forms.find(value => value.includes('name="fullName"'))!;
    expect(profile).toBeTruthy();
    expect(profile).not.toContain('name="price"');
    expect(html).toMatch(/<input[^>]*readOnly=""[^>]*value="Nettoyage intérieur"/i);
    expect(html).toMatch(/<textarea[^>]*readOnly=""[^>]*>Appeler avant déplacement<\/textarea>/i);
    expect(html).not.toMatch(/name="(?:serviceName|note)"/);
    expect(html).toContain("temporairement en lecture seule");
    expect(mocks.requireCrmAccess.mock.invocationCallOrder[0]).toBeLessThan(mocks.getLeadsList.mock.invocationCallOrder[0]);
  });

  it("captures the expected amount together with a dirty price draft", () => {
    expect(createDraftPriceSnapshot(100, "120")).toEqual({
      expectedPrice: 100,
      price: "120",
    });
  });

  it("preserves an explicit legacy null expected amount in a dirty snapshot", () => {
    const firstDirtySnapshot = createDraftPriceSnapshot(null, "1");
    const nextDirtySnapshot = {
      expectedPrice: firstDirtySnapshot.expectedPrice,
      price: "12",
    };

    expect(nextDirtySnapshot).toEqual({
      expectedPrice: null,
      price: "12",
    });
  });


  it("represents a refreshed pristine same-quote snapshot coherently", () => {
    expect(createDraftPriceSnapshot(150, "150")).toEqual({
      expectedPrice: 150,
      price: "150",
    });
  });

  it("represents a replacement quote snapshot atomically", () => {
    expect(createDraftPriceSnapshot(200, "200")).toEqual({
      expectedPrice: 200,
      price: "200",
    });
  });

  it.each([
    ["NEW", "SENT", undefined], ["NEW", "ACCEPTED", undefined], ["NEW", "EXPIRED", undefined],
    ["QUOTE_SENT", "DRAFT", undefined], ["BOOKED", "DRAFT", undefined],
    ["NEW", "DRAFT", "COMPLETED"], ["NEW", "DRAFT", "PAID"],
  ] as const)("hides the price form for lead=%s quote=%s job=%s", async (status, quoteStatus, jobStatus) => {
    mocks.open = true;
    mocks.getLeadsList.mockResolvedValue({ items: [item(status, quoteStatus, jobStatus)] });
    mocks.supabaseRest.mockResolvedValue([]);
    const html = renderToStaticMarkup(await Pipeline({ searchParams: Promise.resolve({}) }));
    expect(html).not.toContain('name="price"');
    expect(html).toContain('name="fullName"');
  });

  it.each([
    ["conflict", "Le montant a changé"], ["invalid_lifecycle", "Ce devis est verrouillé"],
    ["not_found", "Ce devis est introuvable"], ["unavailable", "Le montant n’a pas pu"],
  ])("distinguishes %s in the rendered page", async (price_error, message) => {
    mocks.supabaseRest.mockResolvedValue([]);
    expect(renderToStaticMarkup(await Pipeline({ searchParams: Promise.resolve({ price_error }) }))).toContain(message);
  });
});

// Architecture checks only. These inspect SQL; they neither execute it nor
// establish transaction rollback, row-lock behavior or the deployed DB state.
describe("one additive migration preserves canonical SQL authority", () => {
  const sql = newMigration.replace(/--[^\n]*/g, "");
  const profile = sql.slice(0, sql.indexOf("create or replace function public.transition_lead_status"));
  const transition = sql.slice(sql.indexOf("create or replace function public.transition_lead_status"));

  it("adds two explicit overloads in one transaction without replacing old signatures", () => {
    expect(sql.trim()).toMatch(/^begin;[\s\S]*commit;$/);
    expect(sql.match(/create or replace function/g)).toHaveLength(2);
    expect(sql).not.toMatch(/\bdrop\b|\bdefault\b/i);
    expect(sql.match(/security invoker/g)).toHaveLength(2);
    expect(sql.match(/from public, anon, authenticated;/g)).toHaveLength(2);
    expect(sql.match(/to service_role;/g)).toHaveLength(2);
  });

  it("preserves omitted birth date from the tenant row under lock and delegates all writes", () => {
    expect(profile).toMatch(/select birth_date into v_birth_date[\s\S]*where business_id = p_business_id and id = p_customer_id[\s\S]*for update;/);
    expect(profile).toContain("case when p_birth_date_provided then p_birth_date else v_birth_date end");
    expect(profile.indexOf("for update;")).toBeLessThan(profile.indexOf("return public.update_customer_profile("));
    expect(profile).toMatch(/if not found then[\s\S]*raise exception/);
    expect(profile).not.toMatch(/update public\.customers|insert into|delete from/);
    const canonical = read("supabase/migrations/20260922000100_customer_profile_birth_date.sql");
    expect(canonical).toContain("birth_date = v_birth_date");
    expect(canonical).toContain("'customer.profile_updated'");
    expect(canonical).toContain("delete from public.customer_identifiers");
  });

  it("delegates lifecycle rules and enriches only the newly returned canonical event", () => {
    expect(transition).toMatch(/v_result := public.transition_lead_status\(\s*p_business_id, p_lead_id, p_target_status, p_source\s*\);/);
    expect(transition).toContain("v_result->'activity'->>'id' is not null");
    expect(transition).toContain("v_result->'lead'->>'lifecycle_status' = 'CLOSED_LOST'");
    expect(transition).toContain("jsonb_build_object('comment', v_comment)");
    expect(transition).toContain("and id = (v_result->'activity'->>'id')::uuid");
    expect(transition).toContain("and event_type = 'lead.status_changed'");
    expect(transition).toContain("where business_id = p_business_id");
    expect(transition).not.toMatch(/insert into|update public\.leads|exception when/i);
  });

  it("retains the existing eligible-status rules, customer-linked event and no-op contract", () => {
    const canonical = read("supabase/migrations/031_quote_sent_lifecycle_invariant.sql").split("create or replace function public.mark_quote_as_sent")[0];
    for (const status of ["NEW", "QUALIFIED", "CONTACTED", "QUOTE_SENT"]) {
      expect(canonical).toContain(`v_lead.lifecycle_status = '${status}'`);
    }
    for (const status of ["BOOKED", "IN_PROGRESS", "COMPLETED", "REVIEW_REQUESTED"]) {
      expect(canonical).not.toContain(`v_lead.lifecycle_status = '${status}'`);
    }
    expect(canonical).toContain("Lead status %s is not manually transitionable");
    expect(canonical).toMatch(/if v_lead.lifecycle_status = v_target_status then[\s\S]*'activity', null/);
    expect(canonical).toMatch(/insert into public.activity_log[\s\S]*customer_id[\s\S]*v_lead.customer_id[\s\S]*'lead.status_changed'/);
  });

  it("keeps draft/conflict/job protections in the unchanged amount RPC", () => {
    const canonical = read("supabase/migrations/030_quote_draft_amount_update.sql");
    expect(canonical).toContain("if v_quote.status <> 'DRAFT'");
    expect(canonical).toContain("v_lead.lifecycle_status not in ('NEW', 'QUALIFIED', 'CONTACTED')");
    expect(canonical).toMatch(/from public.jobs[\s\S]*quote_id = v_quote.id/);
    expect(canonical).toContain("v_quote.total_price is distinct from p_expected_total_price");
    expect(canonical).toContain("'quote.amount_updated'");
    expect(canonical).not.toMatch(/update public.jobs/);
  });
});


describe("STEP276 cancellation presentation", () => {
  it.each(["NEW", "QUALIFIED", "CONTACTED", "QUOTE_SENT"] as const)("hides cancellation for %s with operational history", (lifecycleStatus) => {
    for (const open of [false, true]) {
      mocks.open = open;
      const html = renderToStaticMarkup(<LeadDangerActions leadId={leadId} lifecycleStatus={lifecycleStatus}
        hasOperationalHistory cancelAction={vi.fn()} deleteAction={vi.fn()} />);
      expect(html).not.toContain("Annuler la demande");
      expect(html).not.toContain('name="comment"');
    }
  });
});
