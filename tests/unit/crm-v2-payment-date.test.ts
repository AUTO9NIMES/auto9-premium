import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  rest: vi.fn(),
  access: vi.fn(),
  redirect: vi.fn((url: string) => {
    const error = new Error("NEXT_REDIRECT:" + url) as Error & { digest: string };
    error.digest = "NEXT_REDIRECT";
    throw error;
  }),
  revalidate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => m.redirect(url) }));
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => m.revalidate(path) }));
vi.mock("../../app/lib/auth/dal", () => ({ requireCrmAccess: () => m.access() }));
vi.mock("../../app/lib/business", () => ({ resolveCurrentBusinessContext: async () => ({ businessId: "biz-1" }) }));
vi.mock("../../app/lib/supabase", () => ({ supabaseRest: (...args: unknown[]) => m.rest(...args) }));
vi.mock("../../app/lib/crm", () => ({ recordJobPayment: vi.fn(), transitionLeadStatus: vi.fn(), updateDraftQuoteAmount: vi.fn() }));

import { parsePaymentDay, paymentDayInstant, paymentReceivedAt } from "../../app/lib/payment-date";
import { getManualRevenueEntries } from "../../app/lib/manual-revenue";
import { correctV2ManualPaymentDate, recordV2ManualPayment } from "../../app/crm-v2/pipeline/actions";
import { parisDateKey } from "../../app/lib/paris-business-calendar";

const LEAD = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-11-09T13:30:00Z");

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  m.rest.mockReset();
  m.access.mockReset().mockResolvedValue({ role: "owner" });
  m.redirect.mockClear();
  m.revalidate.mockClear();
});

describe("date de paiement saisie", () => {
  it.each([["2026-10-15"], ["2026-11-09"], ["2024-02-29"], ["2020-01-01"]])("accepte %s", (day) => {
    expect(parsePaymentDay(day, NOW)).toBe(day);
  });

  it.each([
    ["futur", "2026-11-10"],
    ["avant 2020", "2019-12-31"],
    ["jour inexistant", "2026-02-30"],
    ["pas une année bissextile", "2026-02-29"],
    ["format", "15/10/2026"],
    ["vide", ""],
  ])("refuse : %s", (_label, day) => {
    expect(parsePaymentDay(day, NOW)).toBeNull();
  });

  it("place le jour choisi dans le même jour (et mois) à Paris, hiver comme été", () => {
    expect(parisDateKey(paymentDayInstant("2026-10-31"))).toBe("2026-10-31");
    expect(parisDateKey(paymentDayInstant("2026-07-01"))).toBe("2026-07-01");
    expect(parisDateKey(paymentDayInstant("2026-01-01"))).toBe("2026-01-01");
  });

  it("sans date choisie, garde l'heure d'enregistrement", () => {
    expect(paymentReceivedAt({ step_key: "PAID" }, "2026-11-08T10:00:00Z")).toBe("2026-11-08T10:00:00Z");
    expect(paymentReceivedAt({ payment_received_on: "n'importe quoi" }, "2026-11-08T10:00:00Z")).toBe("2026-11-08T10:00:00Z");
  });
});

describe("chiffre d'affaires : paiements « Paiement reçu »", () => {
  function activity(rows: Array<Record<string, unknown>>) {
    m.rest.mockImplementation(async (resource: string) => {
      if (resource === "activity_log") return rows;
      if (resource === "lead_services") return [{ lead_id: LEAD, base_price: 150, created_at: "2026-10-01T00:00:00Z" }];
      return [];
    });
  }

  it("compte le paiement dans le mois de la date choisie", async () => {
    activity([
      { lead_id: LEAD, event_type: "crm_v2.step.completed", event_data: { step_key: "PAID", payment_method: "CASH", payment_amount: 150, payment_received_on: "2026-10-20" }, created_at: "2026-11-08T14:55:00Z" },
    ]);
    const [entry] = await getManualRevenueEntries("biz-1", []);
    expect(parisDateKey(entry.receivedAt).slice(0, 7)).toBe("2026-10");
    expect(entry).toMatchObject({ leadId: LEAD, amount: 150, method: "CASH" });
  });

  it("la dernière correction l'emporte sur l'enregistrement d'origine", async () => {
    activity([
      { lead_id: LEAD, event_type: "crm_v2.step.completed", event_data: { step_key: "PAID", payment_method: "CARD_BANK", payment_amount: 150, payment_received_on: "2026-10-20", corrected_from: "2026-11-08T14:55:00Z" }, created_at: "2026-11-09T09:00:00Z" },
      { lead_id: LEAD, event_type: "crm_v2.step.completed", event_data: { step_key: "PAID", payment_method: "CARD_BANK", payment_amount: 150 }, created_at: "2026-11-08T14:55:00Z" },
    ]);
    const entries = await getManualRevenueEntries("biz-1", []);
    expect(entries).toHaveLength(1);
    expect(parisDateKey(entries[0].receivedAt)).toBe("2026-10-20");
    expect(entries[0].method).toBe("BANK_TRANSFER");
  });

  it("une annulation antérieure à l'enregistrement n'efface pas un paiement antidaté", async () => {
    activity([
      { lead_id: LEAD, event_type: "crm_v2.step.completed", event_data: { step_key: "PAID", payment_method: "CASH", payment_amount: 150, payment_received_on: "2026-10-20" }, created_at: "2026-11-08T14:55:00Z" },
      { lead_id: LEAD, event_type: "crm_v2.step.reopened", event_data: { step_key: "PAID" }, created_at: "2026-11-05T09:00:00Z" },
    ]);
    expect(await getManualRevenueEntries("biz-1", [])).toHaveLength(1);
  });

  it("une annulation postérieure retire bien le paiement", async () => {
    activity([
      { lead_id: LEAD, event_type: "crm_v2.step.reopened", event_data: { step_key: "PAID" }, created_at: "2026-11-09T09:00:00Z" },
      { lead_id: LEAD, event_type: "crm_v2.step.completed", event_data: { step_key: "PAID", payment_method: "CASH", payment_amount: 150, payment_received_on: "2026-10-20" }, created_at: "2026-11-08T14:55:00Z" },
    ]);
    expect(await getManualRevenueEntries("biz-1", [])).toHaveLength(0);
  });
});

describe("action : enregistrer un paiement avec sa date", () => {
  beforeEach(() => {
    m.rest.mockImplementation(async (resource: string, method: string) => {
      if (resource === "leads") return [{ id: LEAD, customer_id: "cust-1" }];
      if (resource === "lead_services") return [{ base_price: 150 }];
      if (resource === "activity_log" && method === "POST") return [{ id: "evt" }];
      return [];
    });
  });

  it("enregistre la date choisie", async () => {
    await expect(recordV2ManualPayment(form({ leadId: LEAD, method: "CASH", receivedOn: "2026-10-20" }))).rejects.toThrow("payment=manual_recorded");
    const post = m.rest.mock.calls.find(([resource, method]) => resource === "activity_log" && method === "POST");
    expect(post?.[2]).toMatchObject({ business_id: "biz-1", lead_id: LEAD, event_data: { step_key: "PAID", payment_method: "CASH", payment_amount: 150, payment_received_on: "2026-10-20" } });
  });

  it("sans date, garde le comportement d'avant (heure d'enregistrement)", async () => {
    await expect(recordV2ManualPayment(form({ leadId: LEAD, method: "CASH" }))).rejects.toThrow("payment=manual_recorded");
    const post = m.rest.mock.calls.find(([resource, method]) => resource === "activity_log" && method === "POST");
    expect(post?.[2].event_data).not.toHaveProperty("payment_received_on");
  });

  it("refuse une date dans le futur, sans rien écrire", async () => {
    await expect(recordV2ManualPayment(form({ leadId: LEAD, method: "CASH", receivedOn: "2026-12-01" }))).rejects.toThrow("payment_error=date_invalid");
    expect(m.rest).not.toHaveBeenCalled();
  });
});

describe("action : corriger la date d'un paiement", () => {
  function latest(row: Record<string, unknown> | null) {
    m.rest.mockImplementation(async (resource: string, method: string) => {
      if (resource === "activity_log" && method === "GET") return row ? [row] : [];
      if (resource === "activity_log" && method === "POST") return [{ id: "evt" }];
      return [];
    });
  }

  it("ajoute une correction (mode et montant repris, ancienne date conservée)", async () => {
    latest({ event_type: "crm_v2.step.completed", customer_id: "cust-1", event_data: { step_key: "PAID", payment_method: "CARD_BANK", payment_amount: 150 }, created_at: "2026-11-08T14:55:00Z" });
    await expect(correctV2ManualPaymentDate(form({ leadId: LEAD, receivedOn: "2026-10-20" }))).rejects.toThrow("payment=date_corrected");

    const [, , , query] = m.rest.mock.calls.find(([resource, method]) => resource === "activity_log" && method === "GET")!;
    expect(query).toContain("business_id=eq.biz-1");
    expect(query).toContain(`lead_id=eq.${LEAD}`);

    const post = m.rest.mock.calls.find(([resource, method]) => resource === "activity_log" && method === "POST");
    expect(post?.[2]).toEqual({
      business_id: "biz-1",
      customer_id: "cust-1",
      lead_id: LEAD,
      event_type: "crm_v2.step.completed",
      event_data: {
        step_key: "PAID",
        source: "crm_v2_payment_date_correction",
        payment_method: "CARD_BANK",
        payment_amount: 150,
        payment_received_on: "2026-10-20",
        corrected_from: "2026-11-08T14:55:00Z",
      },
    });
    expect(m.revalidate).toHaveBeenCalledWith("/crm-v2/revenue");
  });

  it("garde la trace d'une correction précédente", async () => {
    latest({ event_type: "crm_v2.step.completed", customer_id: "cust-1", event_data: { step_key: "PAID", payment_method: "CASH", payment_amount: 150, payment_received_on: "2026-10-25" }, created_at: "2026-11-09T09:00:00Z" });
    await expect(correctV2ManualPaymentDate(form({ leadId: LEAD, receivedOn: "2026-10-20" }))).rejects.toThrow("payment=date_corrected");
    const post = m.rest.mock.calls.find(([resource, method]) => resource === "activity_log" && method === "POST");
    expect(post?.[2].event_data.corrected_from).toBe("2026-10-25");
  });

  it.each([
    ["paiement annulé", { event_type: "crm_v2.step.reopened", customer_id: "cust-1", event_data: { step_key: "PAID" }, created_at: "2026-11-09T09:00:00Z" }],
    ["aucun paiement", null],
    ["paiement sans mode (pas « Paiement reçu »)", { event_type: "crm_v2.step.completed", customer_id: "cust-1", event_data: { step_key: "PAID" }, created_at: "2026-11-09T09:00:00Z" }],
  ])("refuse : %s, sans rien écrire", async (_label, row) => {
    latest(row as Record<string, unknown> | null);
    await expect(correctV2ManualPaymentDate(form({ leadId: LEAD, receivedOn: "2026-10-20" }))).rejects.toThrow("payment_error=not_correctable");
    expect(m.rest.mock.calls.some(([, method]) => method === "POST")).toBe(false);
  });

  it.each([["date future", "2026-11-10"], ["date invalide", "2026-13-01"], ["sans date", ""]])("refuse : %s", async (_label, day) => {
    await expect(correctV2ManualPaymentDate(form({ leadId: LEAD, receivedOn: day }))).rejects.toThrow("payment_error=date_invalid");
    expect(m.rest).not.toHaveBeenCalled();
  });

  it("refuse un identifiant de dossier invalide", async () => {
    await expect(correctV2ManualPaymentDate(form({ leadId: "pas-un-uuid", receivedOn: "2026-10-20" }))).rejects.toThrow("payment_error=invalid");
    expect(m.rest).not.toHaveBeenCalled();
  });

  it("exige l'accès au CRM avant toute lecture", async () => {
    m.access.mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(correctV2ManualPaymentDate(form({ leadId: LEAD, receivedOn: "2026-10-20" }))).rejects.toThrow("UNAUTHENTICATED");
    expect(m.rest).not.toHaveBeenCalled();
  });
});

describe("étapes : un paiement enregistré ne s'annule jamais par accident", () => {
  function setup(paidEvents: Array<Record<string, unknown>>) {
    m.rest.mockImplementation(async (resource: string, method: string, _body: unknown, query?: string) => {
      if (resource === "leads") return [{ id: LEAD, customer_id: "cust-1" }];
      if (resource === "activity_log" && method === "GET" && String(query).includes("step_key=eq.PAID")) return paidEvents;
      if (resource === "activity_log" && method === "POST") return [{ id: "evt" }];
      return [];
    });
  }
  const activePayment = { event_type: "crm_v2.step.completed", customer_id: "cust-1", event_data: { step_key: "PAID", payment_method: "CARD_BANK", payment_amount: 270 }, created_at: "2026-11-08T14:55:00Z" };
  const posts = () => m.rest.mock.calls.filter(([resource, method]) => resource === "activity_log" && method === "POST");

  it("rouvrir une étape antérieure ne peut pas annuler le paiement sans confirmation", async () => {
    const { toggleV2LeadStep } = await import("../../app/crm-v2/pipeline/actions");
    setup([activePayment]);
    await expect(toggleV2LeadStep(form({ leadId: LEAD, stepKey: "COMPLETED", nextDone: "0" }))).rejects.toThrow("step_error=payment_locked");
    expect(posts()).toHaveLength(0);
  });

  it("« Annuler le paiement » confirmé remet bien l'étape en attente", async () => {
    const { toggleV2LeadStep } = await import("../../app/crm-v2/pipeline/actions");
    setup([activePayment]);
    await expect(toggleV2LeadStep(form({ leadId: LEAD, stepKey: "PAID", nextDone: "0", confirmCancelPayment: "1" }))).rejects.toThrow("step_updated=1");
    expect(posts().map(([, , body]) => (body as { event_type: string; event_data: { step_key: string } }).event_data.step_key)).toContain("PAID");
    expect(posts().every(([, , body]) => (body as { event_type: string }).event_type === "crm_v2.step.reopened")).toBe(true);
  });

  it("sans paiement enregistré, rouvrir une étape reste libre", async () => {
    const { toggleV2LeadStep } = await import("../../app/crm-v2/pipeline/actions");
    setup([{ event_type: "crm_v2.step.reopened", customer_id: "cust-1", event_data: { step_key: "PAID" }, created_at: "2026-11-09T09:00:00Z" }, activePayment]);
    await expect(toggleV2LeadStep(form({ leadId: LEAD, stepKey: "COMPLETED", nextDone: "0" }))).rejects.toThrow("step_updated=1");
    expect(posts().length).toBeGreaterThan(0);
  });

  it("une étape cochée sans mode (cascade) ne masque pas le vrai paiement", async () => {
    setup([
      { event_type: "crm_v2.step.completed", customer_id: "cust-1", event_data: { step_key: "PAID", source: "crm_v2_pipeline" }, created_at: "2026-11-09T10:00:00Z" },
      activePayment,
    ]);
    await expect(correctV2ManualPaymentDate(form({ leadId: LEAD, receivedOn: "2026-10-20" }))).rejects.toThrow("payment=date_corrected");
    expect(posts()[0][2]).toMatchObject({ event_data: { payment_method: "CARD_BANK", payment_amount: 270, payment_received_on: "2026-10-20" } });
  });

  it("cocher une étape reste libre (aucune lecture de paiement nécessaire)", async () => {
    const { toggleV2LeadStep } = await import("../../app/crm-v2/pipeline/actions");
    setup([activePayment]);
    await expect(toggleV2LeadStep(form({ leadId: LEAD, stepKey: "CONTACTED", nextDone: "1" }))).rejects.toThrow("step_updated=1");
  });
});
