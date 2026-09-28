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

import { updatePipelineLeadNoteAction } from "../../app/crm/pipeline/actions";

const businessId = "00000000-0000-4000-8000-000000000001";
const leadId = "11111111-1111-4111-8111-111111111111";
const customerId = "22222222-2222-4222-8222-222222222222";
const updatedAt = "2026-09-26T18:00:00+00:00";

function form(values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    leadId,
    expectedNotes: "Avant",
    note: "Après",
    ...values,
  })) {
    data.set(key, value);
  }
  return data;
}

function existingLead(notes = "Avant") {
  return {
    id: leadId,
    customer_id: customerId,
    notes,
    updated_at: updatedAt,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCrmAccess.mockReset().mockResolvedValue({ businessId });
  mocks.resolveCurrentBusinessContext.mockReset().mockResolvedValue({ businessId });
  mocks.supabaseRest.mockReset();
});

describe("Main CRM pipeline commercial note", () => {
  it("authorizes before any database access", async () => {
    mocks.requireCrmAccess.mockRejectedValue(new Error("denied"));

    await expect(updatePipelineLeadNoteAction(form()))
      .rejects.toThrow("/crm/pipeline?error=unavailable");

    expect(mocks.resolveCurrentBusinessContext).not.toHaveBeenCalled();
    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });

  it("rejects malformed IDs without a database call", async () => {
    await expect(updatePipelineLeadNoteAction(form({ leadId: "invalid" })))
      .rejects.toThrow("/crm/pipeline?error=invalid");

    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });

  it("rejects an overlong note before persistence", async () => {
    await expect(updatePipelineLeadNoteAction(form({ note: "x".repeat(2001) })))
      .rejects.toThrow("note_error=invalid");

    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });

  it("does not write when the lead is absent from the current tenant", async () => {
    mocks.supabaseRest.mockResolvedValueOnce([]);

    await expect(updatePipelineLeadNoteAction(form()))
      .rejects.toThrow("note_error=not_found");

    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
    expect(mocks.supabaseRest).toHaveBeenCalledWith(
      "leads",
      "GET",
      null,
      `business_id=eq.${businessId}&id=eq.${leadId}&select=id,customer_id,notes,updated_at&limit=1`,
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a stale displayed note without updating anything", async () => {
    mocks.supabaseRest.mockResolvedValueOnce([existingLead("Modifiée ailleurs")]);

    await expect(updatePipelineLeadNoteAction(form()))
      .rejects.toThrow("note_error=conflict");

    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not write when the note is already unchanged", async () => {
    mocks.supabaseRest.mockResolvedValueOnce([existingLead()]);

    await expect(updatePipelineLeadNoteAction(form({ note: "Avant" })))
      .rejects.toThrow("note=noop");

    expect(mocks.supabaseRest).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("writes only the tenant-owned lead with an optimistic version guard", async () => {
    mocks.supabaseRest
      .mockResolvedValueOnce([existingLead()])
      .mockResolvedValueOnce(existingLead("Après"));

    await expect(updatePipelineLeadNoteAction(form()))
      .rejects.toThrow("note=updated");

    expect(mocks.supabaseRest).toHaveBeenCalledTimes(2);
    expect(mocks.supabaseRest).toHaveBeenNthCalledWith(
      2,
      "leads",
      "PATCH",
      expect.objectContaining({ notes: "Après" }),
      expect.stringContaining(
        `business_id=eq.${businessId}&id=eq.${leadId}&updated_at=eq.${encodeURIComponent(updatedAt)}`,
      ),
    );

    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/crm/pipeline/${leadId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/crm/clients/${customerId}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/crm-v2/clients/${customerId}`);
  });

  it("detects a concurrent change between GET and PATCH", async () => {
    mocks.supabaseRest
      .mockResolvedValueOnce([existingLead()])
      .mockResolvedValueOnce(null);

    await expect(updatePipelineLeadNoteAction(form()))
      .rejects.toThrow("note_error=conflict");

    expect(mocks.supabaseRest).toHaveBeenCalledTimes(2);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not claim success when persistence fails", async () => {
    mocks.supabaseRest
      .mockResolvedValueOnce([existingLead()])
      .mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(updatePipelineLeadNoteAction(form()))
      .rejects.toThrow("note_error=unavailable");

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
