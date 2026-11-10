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
  isFollowUpDue,
  parseProspectCsv,
  planAction,
  planStatusChange,
} from "../../app/crm-v2/developpement/prospects";
import {
  createProspect,
  importProspectsCsv,
  prospectQuickAction,
  setProspectStatus,
} from "../../app/crm-v2/developpement/actions";
import DevelopmentPage from "../../app/crm-v2/developpement/page";

const today = "2026-11-10";
const id = "11111111-1111-4111-8111-111111111111";

describe("prospection : actions rapides et relances", () => {
  it("mail envoyé : statut « Mail envoyé », relance à J+7, compté comme contact", () => {
    expect(planAction("MAIL_SENT", "A_CONTACTER", today)).toEqual({
      eventType: "MAIL_SENT", status: "MAIL_ENVOYE", nextFollowUpOn: "2026-11-17", clearFollowUp: false, countsAsContact: true,
    });
  });

  it("appel ou relance : « À relancer » à J+7, sans faire reculer un prospect avancé", () => {
    expect(planAction("FOLLOWED_UP", "MAIL_ENVOYE", today)).toMatchObject({ status: "A_RELANCER", nextFollowUpOn: "2026-11-17" });
    expect(planAction("CALLED", "RDV_OBTENU", today)).toMatchObject({ status: null, nextFollowUpOn: "2026-11-17", countsAsContact: true });
  });

  it("STOP : ne plus contacter et plus de relance", () => {
    expect(planAction("STOP", "MAIL_ENVOYE", today)).toMatchObject({ status: "NE_PAS_CONTACTER", clearFollowUp: true, countsAsContact: false });
  });

  it("statut fermé manuel : efface la relance ; statut ouvert : la garde", () => {
    expect(planStatusChange("SANS_SUITE")).toMatchObject({ eventType: "STATUS_CHANGED", clearFollowUp: true });
    expect(planStatusChange("RDV_OBTENU")).toMatchObject({ clearFollowUp: false, nextFollowUpOn: null });
  });

  it("relance due : date passée ou du jour, prospect encore actif", () => {
    expect(isFollowUpDue({ status: "MAIL_ENVOYE", next_follow_up_on: "2026-11-10" }, today)).toBe(true);
    expect(isFollowUpDue({ status: "MAIL_ENVOYE", next_follow_up_on: "2026-11-11" }, today)).toBe(false);
    expect(isFollowUpDue({ status: "NE_PAS_CONTACTER", next_follow_up_on: "2026-11-01" }, today)).toBe(false);
  });
});

describe("prospection : lecture du CSV", () => {
  const csv = "﻿priorite;categorie;nom;raison_sociale;adresse;code_postal;commune;distance_km;effectif;telephone;email;site;statut;notes;entrepreneur_individuel;siege;naf;siret;creation;source_coordonnees\n" +
    '1;Concession;Grands Garages Du Gard;SOC DES GRANDS GARAGES DU GARD;1667 AVENUE DU MARECHAL JUIN 30900 NIMES;30900;Nimes;2.9;100-199;;;;À contacter;"Concession Peugeot; tél. à vérifier";non;oui;45.11Z;33038563400036;1966-01-01;idgarages\n' +
    "2;Carrosserie;Carrosserie Auto Gardoise;PREPA MOTO 30;Che des Canaux;30230;Bouillargues;6.1;6-9;04 66 68 20 33;carrosserieautogardoise@gmail.com;;À contacter;;non;oui;45.20A;123;;\n" +
    ";;;;;;;;;;;;;;;;;;;\n";

  it("lit la liste AUTO 9 : colonnes, guillemets, SIRET, statut, email", () => {
    const r = parseProspectCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.skipped).toBe(1);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({
      name: "Grands Garages Du Gard", category: "Concession", city: "Nimes", distance_km: 2.9, priority: 1,
      siret: "33038563400036", status: "A_CONTACTER", source_notes: "Concession Peugeot; tél. à vérifier", notes: null,
    });
    expect(r.rows[1]).toMatchObject({ siret: null, phone: "04 66 68 20 33", email: "carrosserieautogardoise@gmail.com" });
  });

  it("refuse un fichier sans colonne « nom » ou vide", () => {
    expect(parseProspectCsv("a;b\n1;2").errors).toHaveLength(1);
    expect(parseProspectCsv("").errors).toHaveLength(1);
  });
});

describe("prospection : actions serveur", () => {
  beforeEach(() => {
    mocks.requireCrmAccess.mockReset().mockResolvedValue({ role: "owner" });
    mocks.supabaseRest.mockReset();
  });

  const fd = (entries: Record<string, string | File>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.set(k, v);
    return f;
  };
  const redirectedTo = async (p: Promise<unknown>) => {
    try { await p; } catch (e) { return (e as { url?: string }).url; }
    return undefined;
  };

  it("action rapide : contrôle d'accès d'abord, puis RPC atomique avec la relance J+7", async () => {
    mocks.supabaseRest.mockImplementation(async (table: string) => (table === "crm_prospects" ? [{ status: "A_CONTACTER" }] : {}));
    const url = await redirectedTo(prospectQuickAction(fd({ prospectId: id, action: "MAIL_SENT", back: "/crm-v2/developpement?tab=todo" })));
    expect(mocks.requireCrmAccess.mock.invocationCallOrder[0]).toBeLessThan(mocks.supabaseRest.mock.invocationCallOrder[0]);
    const rpc = mocks.supabaseRest.mock.calls.find(([t]) => t === "rpc/crm_prospect_apply_action");
    expect(rpc?.[2]).toMatchObject({ p_business_id: "biz", p_prospect_id: id, p_event_type: "MAIL_SENT", p_status: "MAIL_ENVOYE", p_counts_as_contact: true });
    expect(rpc?.[2].p_next_follow_up_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(url).toBe("/crm-v2/developpement?tab=todo&done=MAIL_SENT");
  });

  it("refuse une action ou un identifiant invalide sans toucher la base", async () => {
    expect(await redirectedTo(prospectQuickAction(fd({ prospectId: "x", action: "MAIL_SENT" })))).toContain("error=invalid");
    expect(await redirectedTo(setProspectStatus(fd({ prospectId: id, status: "PIRATE" })))).toContain("error=invalid");
    expect(mocks.supabaseRest).not.toHaveBeenCalled();
  });

  it("le retour reste sur la page (pas de redirection vers un autre site)", async () => {
    expect(await redirectedTo(createProspect(fd({ name: "", back: "https://evil.example/x" })))).toBe("/crm-v2/developpement?error=invalid");
    expect(await redirectedTo(createProspect(fd({ name: "", back: "//evil.example" })))).toBe("/crm-v2/developpement?error=invalid");
  });

  it("import CSV : lots via la RPC, compte des ajouts et des doublons", async () => {
    mocks.supabaseRest.mockResolvedValue(1);
    const file = new File(["nom;commune;siret\nGarage A;Nimes;12345678900011\nGarage B;Arles;\n"], "pros.csv", { type: "text/csv" });
    const url = await redirectedTo(importProspectsCsv(fd({ file, back: "/crm-v2/developpement" })));
    const call = mocks.supabaseRest.mock.calls[0];
    expect(call[0]).toBe("rpc/crm_import_prospects");
    expect(call[2]).toMatchObject({ p_business_id: "biz", p_source: "csv" });
    expect(call[2].p_rows).toHaveLength(2);
    expect(url).toBe("/crm-v2/developpement?imported=1&skipped=1");
  });
});

describe("prospection : page", () => {
  const row = (over: Record<string, unknown>) => ({
    id, siret: null, name: "Garage Test", legal_name: null, category: "Carrosserie", address: null, postal_code: null,
    city: "Nimes", distance_km: 3, headcount: null, contact_name: null, phone: "04 66 00 00 00", email: null, website: null,
    priority: 1, status: "MAIL_ENVOYE", next_follow_up_on: "2026-11-01", last_contacted_at: null, contact_count: 1,
    notes: null, source: "csv", source_notes: null, ...over,
  });

  beforeEach(() => {
    mocks.ensureCrmV2Access.mockReset().mockResolvedValue({ role: "owner" });
    mocks.supabaseRest.mockReset().mockImplementation(async (_t: string, _m: string, _b: unknown, query: string) => {
      if (query.includes("select=status,category,city")) return [{ status: "MAIL_ENVOYE", category: "Carrosserie", city: "Nimes" }, { status: "A_CONTACTER", category: "Garage", city: "Arles" }];
      if (query.includes("next_follow_up_on=lte.")) return [row({})];
      if (query.includes("status=eq.A_CONTACTER")) return [row({ id: "22222222-2222-4222-8222-222222222222", name: "Garage Neuf", status: "A_CONTACTER", next_follow_up_on: null })];
      return [];
    });
  });

  const render = async (params: Record<string, string> = {}) =>
    renderToStaticMarkup(await DevelopmentPage({ searchParams: Promise.resolve(params) }));

  it("vérifie l'accès avant de lire les prospects", async () => {
    await render();
    expect(mocks.ensureCrmV2Access.mock.invocationCallOrder[0]).toBeLessThan(mocks.supabaseRest.mock.invocationCallOrder[0]);
  });

  it("affiche la to-do : relances en retard et prochains à contacter, avec les boutons rapides", async () => {
    const html = await render();
    expect(html).toContain('data-kpi="due"');
    const dueList = html.slice(html.indexOf("data-due-list"), html.indexOf("data-to-contact-list"));
    expect(dueList).toContain("Garage Test");
    expect(dueList).toContain("Relance en retard");
    expect(dueList).toContain('data-action="MAIL_SENT"');
    expect(html.slice(html.indexOf("data-to-contact-list"))).toContain("Garage Neuf");
  });

  it("signale clairement une table pas encore créée", async () => {
    mocks.supabaseRest.mockRejectedValue(new Error("relation does not exist"));
    const html = await render();
    expect(html).toContain("data-prospects-unavailable");
    expect(html).toContain("20261110120000_crm_prospects.sql");
  });
});

describe("prospection : migration", () => {
  const sql = fs.readFileSync(path.resolve(__dirname, "../../supabase/migrations/20261110120000_crm_prospects.sql"), "utf8");

  it("données réservées au serveur du CRM", () => {
    for (const table of ["crm_prospects", "crm_prospect_events"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security;`);
      expect(sql).toContain(`revoke all on table public.${table} from anon, authenticated;`);
    }
    expect(sql).toMatch(/revoke all on function public\.crm_import_prospects\([^)]*\)\s+from public, anon, authenticated;/);
    expect(sql).toMatch(/revoke all on function public\.crm_prospect_apply_action\([^)]*\)\s+from public, anon, authenticated;/);
  });

  it("chaque écriture est limitée à l'entreprise courante", () => {
    expect(sql).toContain("where id = p_prospect_id and business_id = p_business_id");
    expect(sql).toContain("unique (business_id, siret)");
  });
});
