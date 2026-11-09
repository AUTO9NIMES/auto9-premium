import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCrmAccess: vi.fn(),
  supabaseRest: vi.fn(),
  getLeadsList: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../../app/lib/auth/dal", () => ({ requireCrmAccess: mocks.requireCrmAccess }));
vi.mock("../../app/lib/business", () => ({ resolveCurrentBusinessContext: async () => ({ businessId: "biz" }) }));
vi.mock("../../app/lib/supabase", () => ({ supabaseRest: mocks.supabaseRest }));
vi.mock("../../app/lib/crm", async (original) => ({
  ...(await original<typeof import("../../app/lib/crm")>()),
  getLeadsList: mocks.getLeadsList,
}));

import Pipeline from "../../app/crm-v2/pipeline/page";
import {
  BOARD_STEP_KEYS, boardStage, isLate, isProLead, matchesFilter, nextActionLabel, parseBoardFilter,
  type BoardStepKey,
} from "../../app/crm-v2/pipeline/board";

const done = (...keys: BoardStepKey[]) =>
  Object.fromEntries(BOARD_STEP_KEYS.map((key) => [key, keys.includes(key)])) as Record<BoardStepKey, boolean>;

describe("tableau : colonne de chaque dossier", () => {
  it.each([
    [done("NEW"), "NEW"],
    [done("NEW", "CONTACTED"), "NEW"],
    [done("NEW", "CONTACTED", "QUOTE_SENT"), "QUOTE"],
    [done("NEW", "CONTACTED", "QUOTE_SENT", "BOOKED"), "BOOKED"],
    [done("NEW", "BOOKED", "IN_PROGRESS"), "IN_PROGRESS"],
    [done("NEW", "COMPLETED"), "TO_COLLECT"],
    [done("NEW", "COMPLETED", "PAID"), "PAID"],
    // Étapes cochées dans le désordre : la dernière étape faite l'emporte.
    [done("NEW", "PAID"), "PAID"],
  ] as const)("%o → %s", (state, stage) => {
    expect(boardStage(state)).toBe(stage);
  });

  it("propose l'action suivante", () => {
    expect(nextActionLabel("NEW", done("NEW"))).toBe("Contacter");
    expect(nextActionLabel("NEW", done("NEW", "CONTACTED"))).toBe("Envoyer le devis");
    expect(nextActionLabel("TO_COLLECT", done("COMPLETED"))).toBe("Encaisser");
    expect(nextActionLabel("PAID", done("PAID"))).toBe("Demander un avis");
    expect(nextActionLabel("PAID", done("PAID", "REVIEW_REQUESTED"))).toBe("Terminé");
  });

  it("signale les retards : à encaisser, ou devis sans réponse depuis plus de 3 jours", () => {
    const now = Date.parse("2026-11-09T12:00:00Z");
    expect(isLate("TO_COLLECT", null, now)).toBe(true);
    expect(isLate("QUOTE", "2026-11-05T12:00:00Z", now)).toBe(true);
    expect(isLate("QUOTE", "2026-11-07T12:00:00Z", now)).toBe(false);
    expect(isLate("BOOKED", "2026-01-01T00:00:00Z", now)).toBe(false);
  });

  it("reconnaît un garage pro (réservation pro ou association à un garage)", () => {
    expect(isProLead("l1", "website_pro_booking", [])).toBe(true);
    const assigned = [{ lead_id: "l1", event_type: "crm_v3.garage.lead_assigned", event_data: { garage_key: "twiice-auto" } }];
    expect(isProLead("l1", "website", assigned)).toBe(true);
    // Association retirée ensuite (événement plus récent en premier).
    const removed = [{ lead_id: "l1", event_type: "crm_v3.garage.lead_assigned", event_data: { garage_key: "" } }, ...assigned];
    expect(isProLead("l1", "website", removed)).toBe(false);
    expect(isProLead("l1", "website", [])).toBe(false);
  });

  it("filtres", () => {
    expect(parseBoardFilter("pro")).toBe("pro");
    expect(parseBoardFilter("n'importe quoi")).toBe("all");
    expect(matchesFilter("pro", { pro: true, stage: "NEW" })).toBe(true);
    expect(matchesFilter("particulier", { pro: true, stage: "NEW" })).toBe(false);
    expect(matchesFilter("unpaid", { pro: false, stage: "TO_COLLECT" })).toBe(true);
    expect(matchesFilter("unpaid", { pro: false, stage: "PAID" })).toBe(false);
  });
});

const ids = {
  a: "11111111-1111-4111-8111-111111111111",
  b: "22222222-2222-4222-8222-222222222222",
  c: "33333333-3333-4333-8333-333333333333",
};

function lead(id: string, fullName: string, status: string, extra: Record<string, unknown> = {}) {
  return {
    lead: { id, business_id: "biz", customer_id: "cust-" + id, source: "website", lifecycle_status: status, created_at: "2026-11-01T10:00:00Z", ...extra },
    customer: { id: "cust-" + id, full_name: fullName, phone: "0600000000", email: null, city: "Nîmes" },
    vehicle: null,
    latestQuote: { id: "q-" + id, status: "DRAFT", total_price: 150, payload_json: { serviceName: "Formule Duo" } },
    latestJob: null,
    latestAppointment: null,
  };
}

describe("page Dossiers clients en vue tableau", () => {
  beforeEach(() => {
    mocks.requireCrmAccess.mockReset().mockResolvedValue({ role: "owner" });
    mocks.supabaseRest.mockReset().mockResolvedValue([]);
    mocks.getLeadsList.mockReset().mockResolvedValue({
      items: [
        lead(ids.a, "Camille Martin", "NEW"),
        lead(ids.b, "Twiice Auto", "COMPLETED", { source: "website_pro_booking" }),
        lead(ids.c, "Client Annulé", "CLOSED_LOST"),
      ],
    });
  });

  const render = async (params: Record<string, string> = {}) =>
    renderToStaticMarkup(await Pipeline({ searchParams: Promise.resolve(params) }));

  it("affiche les 6 colonnes et range chaque dossier ouvert", async () => {
    const html = await render();
    expect(html).toContain('data-pipeline-view="board"');
    for (const key of ["NEW", "QUOTE", "BOOKED", "IN_PROGRESS", "TO_COLLECT", "PAID"]) {
      expect(html).toContain(`data-board-column="${key}"`);
    }
    const column = (key: string) => html.slice(html.indexOf(`data-board-column="${key}"`), html.indexOf("</section>", html.indexOf(`data-board-column="${key}"`)));
    expect(column("NEW")).toContain("Camille Martin");
    expect(column("TO_COLLECT")).toContain("Twiice Auto");
    expect(column("TO_COLLECT")).toContain("Garage pro");
    expect(column("TO_COLLECT")).toContain("Encaisser");
    // Les demandes annulées ne sont pas dans le tableau, mais signalées.
    expect(html).not.toContain(`data-board-card="${ids.c}"`);
    expect(html).toContain("1 demande annulée");
  });

  it("ouvre le dossier demandé à droite avec le panneau complet", async () => {
    const html = await render({ open: ids.b });
    const panel = html.slice(html.indexOf('id="dossier-ouvert"'));
    expect(panel).toContain("Twiice Auto");
    expect(panel).toContain(`id="dossier-${ids.b}"`);
    expect(html).toContain(`data-board-card="${ids.b}" class="crm-glass`);
  });

  it("ouvre le premier dossier par défaut et ignore un identifiant inconnu", async () => {
    const html = await render({ open: "inconnu" });
    expect(html.slice(html.indexOf('id="dossier-ouvert"'))).toContain(`id="dossier-${ids.a}"`);
  });

  it("filtre les garages pro", async () => {
    const html = await render({ filter: "pro" });
    expect(html).toContain(`data-board-card="${ids.b}"`);
    expect(html).not.toContain(`data-board-card="${ids.a}"`);
  });

  it("garde la vue liste complète (y compris les demandes annulées)", async () => {
    const html = await render({ view: "list" });
    expect(html).toContain('data-pipeline-view="list"');
    for (const id of Object.values(ids)) expect(html).toContain(`id="dossier-${id}"`);
  });

  it("vérifie l'accès avant de lire les dossiers", async () => {
    await render();
    expect(mocks.requireCrmAccess.mock.invocationCallOrder[0]).toBeLessThan(mocks.getLeadsList.mock.invocationCallOrder[0]);
  });
});
