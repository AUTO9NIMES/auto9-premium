import { describe, expect, it } from "vitest";
import {
  findConflicts,
  matchCustomer,
  parseQuickEvent,
} from "../../app/crm-v2/calendar/quick-add";

// Mardi 10 novembre 2026.
const today = "2026-11-10";

describe("ajout rapide : découpe d'une ligne", () => {
  it("rendez-vous client complet", () => {
    const d = parseQuickEvent(
      "jeudi 12/11 9h Renaud PAUL FEDIERE — Peugeot 308 phase 1 — rénovation d’un phare — 40 € — Nîmes — 07 61 17 28 06",
      today,
    );
    expect(d).toMatchObject({
      date: "2026-11-12",
      time: "09:00",
      timeToDefine: false,
      personal: false,
      price: 40,
      phone: "07 61 17 28 06",
      city: "Nîmes",
      clientName: "Renaud PAUL FEDIERE",
      vehicle: "Peugeot 308 phase 1",
      title: "rénovation d’un phare",
      serviceName: "rénovation d’un phare",
    });
  });

  it("rendez-vous personnel avec heure en 13h30", () => {
    const d = parseQuickEvent("jeu 13h30 visio perso", today);
    expect(d).toMatchObject({ date: "2026-11-12", time: "13:30", personal: true, clientName: null, title: "visio" });
  });

  it("horaire à définir et prix total", () => {
    const d = parseQuickEvent("vendredi 13 novembre Twiice Auto — 3 véhicules — 270 € — horaire à définir", today);
    expect(d).toMatchObject({
      date: "2026-11-13",
      time: null,
      timeToDefine: true,
      price: 270,
      clientName: "Twiice Auto",
      title: "3 véhicules",
    });
  });

  it("rendez-vous personnel chez un concessionnaire, prix nul", () => {
    const d = parseQuickEvent("lundi 16/11 14h30 RDV perso chez Peugeot à Arles 0€", today);
    expect(d).toMatchObject({ date: "2026-11-16", time: "14:30", personal: true, price: 0 });
    expect(d.title).toContain("Peugeot");
  });

  it("dates relatives et jour de la semaine", () => {
    expect(parseQuickEvent("demain 10h test", today).date).toBe("2026-11-11");
    expect(parseQuickEvent("après-demain 10h test", today).date).toBe("2026-11-12");
    expect(parseQuickEvent("mardi 10h test", today).date).toBe("2026-11-10");
    expect(parseQuickEvent("lun 10h test", today).date).toBe("2026-11-16");
    expect(parseQuickEvent("5/1 10h test", today).date).toBe("2027-01-05");
    expect(parseQuickEvent("31/02 10h test", today).date).toBeNull();
  });

  it("ne confond pas le numéro de téléphone, un modèle ou un nombre de véhicules avec un prix ou une heure", () => {
    const d = parseQuickEvent("demain 9h Client Test — Peugeot 308 — 3 véhicules — 0612345678", today);
    expect(d.phone).toBe("06 12 34 56 78");
    expect(d.price).toBeNull();
    expect(d.time).toBe("09:00");
  });
});

describe("ajout rapide : client existant et doublons", () => {
  const customers = [
    { id: "c1", full_name: "Twiice Auto", phone: null },
    { id: "c2", full_name: "Camille Martin", phone: "06 11 22 33 44" },
  ];

  it("reconnaît un client par téléphone ou par nom", () => {
    const byPhone = parseQuickEvent("demain 9h Mme Martin — Duo — 0611223344", today);
    expect(matchCustomer(byPhone, "demain 9h Mme Martin — Duo — 0611223344", customers)?.id).toBe("c2");
    const input = "vendredi 13/11 twiice auto — 3 véhicules — 270€";
    expect(matchCustomer(parseQuickEvent(input, today), input, customers)?.id).toBe("c1");
    const unknown = "demain 9h Inconnu — Duo";
    expect(matchCustomer(parseQuickEvent(unknown, today), unknown, customers)).toBeNull();
  });

  it("signale même heure ou même client le même jour, ignore les annulés", () => {
    const sameDay = [
      { event_time: "09:00:00", title: "Rénovation phare", customer_id: "c9", status: "CONFIRMED" },
      { event_time: "15:00:00", title: "Twiice : 3 véhicules", customer_id: "c1", status: "CONFIRMED" },
      { event_time: "11:00:00", title: "Annulé", customer_id: "c1", status: "CANCELLED" },
    ];
    const conflicts = findConflicts({ date: "2026-11-13", time: "09:00", customerId: "c1", title: "Nouveau" }, sameDay);
    expect(conflicts.map((c) => c.kind)).toEqual(["same_time", "same_customer_day"]);
    expect(findConflicts({ date: "2026-11-13", time: "10:00", customerId: "c2", title: "Autre" }, sameDay)).toEqual([]);
  });
});

import fs from "node:fs";
import path from "node:path";

describe("ajout rapide : branchement sans toucher à l'existant", () => {
  const root = path.resolve(__dirname, "../..");
  const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
  const quickAdd = read("app/crm-v2/calendar/QuickAdd.tsx");
  const actions = read("app/crm-v2/calendar/actions.ts");
  const quickActions = read("app/crm-v2/calendar/quick-actions.ts");

  it("enregistre via l'action existante createCalendarEvent, avec ses noms de champs", () => {
    expect(quickAdd).toContain("action={createCalendarEvent}");
    const create = actions.slice(actions.indexOf("export async function createCalendarEvent"), actions.indexOf("export async function updateCalendarEvent"));
    const read = [...create.matchAll(/formData\.get\("([a-zA-Z]+)"\)/g)].map((m) => m[1]);
    for (const name of ["customerId", "newClientName", "newClientPhone", "newClientCity", "title", "serviceName", "price", "eventDate", "eventTime", "notes"]) {
      expect(read).toContain(name);
      expect(quickAdd).toContain(`name="${name}"`);
    }
  });

  it("la vérification des doublons contrôle l'accès et ne fait que lire", () => {
    expect(quickActions.indexOf("await requireCrmAccess()")).toBeGreaterThan(-1);
    expect(quickActions.indexOf("await requireCrmAccess()")).toBeLessThan(quickActions.indexOf("await supabaseRest"));
    expect(quickActions).toContain('"GET"');
    expect(quickActions).not.toMatch(/"(POST|PATCH|DELETE)"/);
    expect(quickActions).toContain("business_id=eq.${businessId}");
  });
});
