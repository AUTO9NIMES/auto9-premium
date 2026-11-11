import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCrmAccess: vi.fn(),
  ensureCrmV2Access: vi.fn(),
  supabaseRest: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}`, url });
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, usePathname: () => "/crm-v2/developpement" }));
vi.mock("../../app/lib/auth/dal", () => ({ requireCrmAccess: mocks.requireCrmAccess }));
vi.mock("../../app/crm-v2/access", () => ({ ensureCrmV2Access: mocks.ensureCrmV2Access }));
vi.mock("../../app/lib/business", () => ({ resolveCurrentBusinessContext: async () => ({ businessId: "biz" }) }));
vi.mock("../../app/lib/supabase", () => ({ supabaseRest: mocks.supabaseRest }));

import {
  PROSPECT_KEY,
  dueFollowUps,
  filterProspects,
  foldProspects,
  isFollowUpDue,
  planAction,
  planStatusChange,
  type ProspectLogRow,
} from "../../app/crm-v2/developpement/prospects";
import { SEED_PROSPECTS } from "../../app/crm-v2/developpement/seed";
import {
  createProspect,
  importBrowserProspects,
  prospectQuickAction,
  setProspectStatus,
  updateProspect,
} from "../../app/crm-v2/developpement/actions";
import DevelopmentPage from "../../app/crm-v2/developpement/page";

const today = "2026-11-10";
const first = SEED_PROSPECTS[0];
const second = SEED_PROSPECTS[1];
let n = 0;
const ev = (event_type: string, event_data: Record<string, unknown>, created_at: string): ProspectLogRow => ({
  id: `e${++n}`, event_type, event_data, created_at,
});

describe("prospection : liste de départ", () => {
  it("50 pros à moins de 15 km, clés uniques et valides, priorités 1 à 50", () => {
    expect(SEED_PROSPECTS).toHaveLength(50);
    expect(new Set(SEED_PROSPECTS.map((p) => p.key)).size).toBe(50);
    for (const p of SEED_PROSPECTS) {
      expect(p.key).toMatch(PROSPECT_KEY);
      expect(p.distanceKm).toBeLessThanOrEqual(15);
      expect(p.siret).toMatch(/^\d{14}$/);
    }
    expect(SEED_PROSPECTS.map((p) => p.priority)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });
});

describe("prospection : actions rapides et relances", () => {
  it("mail envoyé : « Mail envoyé », relance à J+7, compté comme contact", () => {
    expect(planAction("MAIL_SENT", "A_CONTACTER", today)).toEqual({
      eventType: "MAIL_SENT", status: "MAIL_ENVOYE", nextFollowUpOn: "2026-11-17", clearFollowUp: false, countsAsContact: true,
    });
  });

  it("appel ou relance : « À relancer » à J+7, sans faire reculer un prospect avancé", () => {
    expect(planAction("FOLLOWED_UP", "MAIL_ENVOYE", today)).toMatchObject({ status: "A_RELANCER", nextFollowUpOn: "2026-11-17" });
    expect(planAction("CALLED", "RDV_OBTENU", today)).toMatchObject({ status: null, countsAsContact: true });
  });

  it("STOP et statut fermé : plus de relance", () => {
    expect(planAction("STOP", "MAIL_ENVOYE", today)).toMatchObject({ status: "NE_PAS_CONTACTER", clearFollowUp: true });
    expect(planStatusChange("SANS_SUITE")).toMatchObject({ eventType: "STATUS_CHANGED", clearFollowUp: true });
  });

  it("relance due : date passée ou du jour, prospect encore actif", () => {
    expect(isFollowUpDue({ status: "MAIL_ENVOYE", next_follow_up_on: "2026-11-10" }, today)).toBe(true);
    expect(isFollowUpDue({ status: "MAIL_ENVOYE", next_follow_up_on: "2026-11-11" }, today)).toBe(false);
    expect(isFollowUpDue({ status: "NE_PAS_CONTACTER", next_follow_up_on: "2026-11-01" }, today)).toBe(false);
  });
});

describe("prospection : rejeu du journal d'activité", () => {
  it("applique actions, modifications et ajouts dans l'ordre chronologique", () => {
    const rows = [
      // Volontairement dans le désordre : le rejeu trie par date.
      ev("crm_v3.prospect.action", { prospect_key: first.key, event_type: "FOLLOWED_UP", status: "A_RELANCER", next_follow_up_on: "2026-11-15", counts_as_contact: true }, "2026-11-08T10:00:00Z"),
      ev("crm_v3.prospect.action", { prospect_key: first.key, event_type: "MAIL_SENT", status: "MAIL_ENVOYE", next_follow_up_on: "2026-11-08", counts_as_contact: true }, "2026-11-01T10:00:00Z"),
      ev("crm_v3.prospect.updated", { prospect_key: first.key, fields: { contact_name: "M. Martin", phone: "04 00 00 00 00", notes: "Chef d'atelier" } }, "2026-11-02T10:00:00Z"),
      ev("crm_v3.prospect.action", { prospect_key: second.key, event_type: "STOP", status: "NE_PAS_CONTACTER", clear_follow_up: true }, "2026-11-03T10:00:00Z"),
      ev("crm_v3.prospect.added", { prospect_key: "m-ajout-test", name: "Garage Nouveau", city: "Nîmes", status: "PARTENAIRE" }, "2026-11-04T10:00:00Z"),
    ];
    const list = foldProspects(SEED_PROSPECTS, rows);
    expect(list).toHaveLength(51);
    const a = list.find((p) => p.id === first.key)!;
    expect(a).toMatchObject({ status: "A_RELANCER", next_follow_up_on: "2026-11-15", contact_count: 2, contact_name: "M. Martin", phone: "04 00 00 00 00", notes: "Chef d'atelier", last_contacted_at: "2026-11-08T10:00:00Z" });
    expect(a.history.map((h) => h.event_type)).toEqual(["FOLLOWED_UP", "EDITED", "MAIL_SENT"]);
    expect(list.find((p) => p.id === second.key)).toMatchObject({ status: "NE_PAS_CONTACTER", next_follow_up_on: null });
    expect(list.find((p) => p.id === "m-ajout-test")).toMatchObject({ name: "Garage Nouveau", status: "PARTENAIRE", source: "manuel" });
  });

  it("ignore les événements mal formés, inconnus ou en double", () => {
    const rows = [
      ev("crm_v3.prospect.action", { prospect_key: "s-inconnu-000", event_type: "MAIL_SENT", status: "MAIL_ENVOYE" }, "2026-11-01T10:00:00Z"),
      ev("crm_v3.prospect.action", { prospect_key: first.key, event_type: "PIRATE", status: "PARTENAIRE" }, "2026-11-01T11:00:00Z"),
      ev("crm_v3.prospect.action", { prospect_key: first.key, event_type: "NOTE", status: "PIRATE" }, "2026-11-01T12:00:00Z"),
      ev("crm_v3.prospect.added", { prospect_key: first.key, name: "Doublon" }, "2026-11-01T13:00:00Z"),
      ev("crm_v3.prospect.added", { prospect_key: "../x", name: "Clé invalide" }, "2026-11-01T14:00:00Z"),
    ];
    const list = foldProspects(SEED_PROSPECTS, rows);
    expect(list).toHaveLength(50);
    expect(list.find((p) => p.id === first.key)).toMatchObject({ status: "A_CONTACTER", name: first.name, history: [] });
  });

  it("filtres, recherche sans accents et relances dues", () => {
    const list = foldProspects(SEED_PROSPECTS, [
      ev("crm_v3.prospect.action", { prospect_key: first.key, event_type: "MAIL_SENT", status: "MAIL_ENVOYE", next_follow_up_on: "2026-11-09" }, "2026-11-02T10:00:00Z"),
    ]);
    expect(filterProspects(list, { status: "MAIL_ENVOYE" }).map((p) => p.id)).toEqual([first.key]);
    expect(filterProspects(list, { q: first.name.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "") }).map((p) => p.id)).toContain(first.key);
    expect(dueFollowUps(list, today).map((p) => p.id)).toEqual([first.key]);
  });
});

describe("prospection : actions serveur (journal d'activité)", () => {
  beforeEach(() => {
    mocks.requireCrmAccess.mockReset().mockResolvedValue({ role: "owner" });
    mocks.supabaseRest.mockReset().mockImplementation(async (_t: string, method: string) => (method === "GET" ? [] : { id: "new" }));
  });

  const fd = (entries: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.set(k, v);
    return f;
  };
  const redirectedTo = async (p: Promise<unknown>) => {
    try { await p; } catch (e) { return (e as { url?: string }).url; }
    return undefined;
  };
  const posted = () => mocks.supabaseRest.mock.calls.filter(([, m]) => m === "POST");

  it("action rapide : accès d'abord, puis un événement crm_v3.prospect.action limité à l'entreprise", async () => {
    const url = await redirectedTo(prospectQuickAction(fd({ prospectId: first.key, action: "MAIL_SENT", back: "/crm-v2/developpement?tab=todo" })));
    expect(mocks.requireCrmAccess.mock.invocationCallOrder[0]).toBeLessThan(mocks.supabaseRest.mock.invocationCallOrder[0]);
    const [table, , body] = posted()[0];
    expect(table).toBe("activity_log");
    expect(body).toMatchObject({ business_id: "biz", event_type: "crm_v3.prospect.action", event_data: { prospect_key: first.key, event_type: "MAIL_SENT", status: "MAIL_ENVOYE", counts_as_contact: true } });
    expect((body as { event_data: { next_follow_up_on: string } }).event_data.next_follow_up_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(url).toBe("/crm-v2/developpement?tab=todo&done=MAIL_SENT");
    expect(mocks.supabaseRest.mock.calls[0][3]).toContain("business_id=eq.biz");
  });

  it("refuse une clé, une action ou un statut invalide, et un prospect inconnu", async () => {
    expect(await redirectedTo(prospectQuickAction(fd({ prospectId: "x", action: "MAIL_SENT" })))).toContain("error=invalid");
    expect(await redirectedTo(setProspectStatus(fd({ prospectId: first.key, status: "PIRATE" })))).toContain("error=invalid");
    expect(await redirectedTo(updateProspect(fd({ prospectId: "s-inexistant-000", name: "X" })))).toContain("error=not_found");
    expect(posted()).toHaveLength(0);
  });

  it("le retour reste sur la page (pas de redirection vers un autre site)", async () => {
    expect(await redirectedTo(createProspect(fd({ name: "", back: "https://evil.example/x" })))).toBe("/crm-v2/developpement?error=invalid");
    expect(await redirectedTo(createProspect(fd({ name: "", back: "//evil.example" })))).toBe("/crm-v2/developpement?error=invalid");
  });

  it("ajout manuel : refuse un nom déjà présent, sinon un événement crm_v3.prospect.added", async () => {
    expect(await redirectedTo(createProspect(fd({ name: first.name.toLowerCase() })))).toContain("error=duplicate");
    const url = await redirectedTo(createProspect(fd({ name: "Garage Tout Neuf", city: "Nîmes" })));
    const [, , body] = posted()[0];
    expect(body).toMatchObject({ event_type: "crm_v3.prospect.added", event_data: { name: "Garage Tout Neuf", source: "manuel" } });
    expect((body as { event_data: { prospect_key: string } }).event_data.prospect_key).toMatch(PROSPECT_KEY);
    expect(url).toMatch(/done=CREATED&open=m-/);
  });

  it("reprise du navigateur : ajoute les nouveaux, ignore ceux déjà présents", async () => {
    const payload = JSON.stringify([{ name: "B2P Auto", city: "Caissargues", status: "A contacter" }, { name: first.name }]);
    const url = await redirectedTo(importBrowserProspects(fd({ payload })));
    expect(posted()).toHaveLength(1);
    expect(posted()[0][2]).toMatchObject({ event_data: { name: "B2P Auto", status: "A_CONTACTER", source: "navigateur" } });
    expect(url).toContain("imported=1&skipped=1");
  });
});

describe("prospection : page", () => {
  beforeEach(() => {
    mocks.ensureCrmV2Access.mockReset().mockResolvedValue({ role: "owner" });
    mocks.supabaseRest.mockReset().mockResolvedValue([
      { id: "e1", event_type: "crm_v3.prospect.action", created_at: "2026-11-01T10:00:00Z",
        event_data: { prospect_key: first.key, event_type: "MAIL_SENT", status: "MAIL_ENVOYE", next_follow_up_on: "2026-11-05", counts_as_contact: true } },
    ]);
  });

  const render = async (params: Record<string, string> = {}) =>
    renderToStaticMarkup(await DevelopmentPage({ searchParams: Promise.resolve(params) }));

  it("vérifie l'accès avant de lire le journal, sans lire d'autres événements", async () => {
    await render();
    expect(mocks.ensureCrmV2Access.mock.invocationCallOrder[0]).toBeLessThan(mocks.supabaseRest.mock.invocationCallOrder[0]);
    const [table, , , query] = mocks.supabaseRest.mock.calls[0];
    expect(table).toBe("activity_log");
    expect(query).toContain("business_id=eq.biz");
    expect(query).toContain("event_type=in.(crm_v3.prospect.added,crm_v3.prospect.updated,crm_v3.prospect.action)");
  });

  it("to-do : relance en retard en tête, puis les prochains à contacter", async () => {
    const html = await render();
    const dueList = html.slice(html.indexOf("data-due-list"), html.indexOf("data-to-contact-list"));
    expect(dueList).toContain(first.name.replace(/'/g, "&#x27;"));
    expect(dueList).toContain("Relance en retard");
    expect(dueList).toContain('data-action="MAIL_SENT"');
    expect(html.slice(html.indexOf("data-to-contact-list"))).toContain(second.name.replace(/'/g, "&#x27;"));
    expect(html).not.toContain("data-import");
  });

  it("onglet Prospects : les 50 pros", async () => {
    const html = await render({ tab: "prospects" });
    expect(html.match(/data-prospect-card=/g)).toHaveLength(50);
  });

  it("fiche ouverte avec son historique", async () => {
    const html = await render({ open: first.key });
    expect(html).toContain(`data-open-prospect="${first.key}"`);
    expect(html.slice(html.indexOf("data-prospect-history"))).toContain("Mail envoyé");
  });

  it("signale un journal illisible sans planter", async () => {
    mocks.supabaseRest.mockRejectedValue(new Error("network"));
    expect(await render()).toContain("data-prospects-unavailable");
  });
});

describe("prospection : effets ailleurs dans le CRM", () => {
  it("l'Activité récente de l'ancien CRM exclut les événements de prospection", () => {
    const crm = fs.readFileSync(path.resolve(__dirname, "../../app/lib/crm.ts"), "utf8");
    const fn = crm.slice(crm.indexOf("export async function getRecentActivity"));
    expect(fn.slice(0, fn.indexOf("return (rows"))).toContain("event_type=not.like.crm_v3.prospect.*");
  });

  it("aucune migration ni nouvelle table pour la prospection", () => {
    const dir = path.resolve(__dirname, "../../supabase/migrations");
    expect(fs.readdirSync(dir).some((f) => f.includes("crm_prospects"))).toBe(false);
    const sources = ["data.ts", "actions.ts", "page.tsx"].map((f) => fs.readFileSync(path.resolve(__dirname, "../../app/crm-v2/developpement", f), "utf8")).join("\n");
    expect(sources).not.toContain("crm_prospects");
  });
});
