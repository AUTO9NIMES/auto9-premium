import { describe, expect, it } from "vitest";

import {
  computeProTotal,
  resolveProPack,
  selectProAddons,
} from "../../app/lib/pro-offer";

describe("offre professionnels : packs et suppléments", () => {
  it("prix des packs : Standard 100 €, Premium 170 €, Signature 250 €", () => {
    expect(computeProTotal(resolveProPack("standard"), [])).toBe(100);
    expect(computeProTotal(resolveProPack("premium"), [])).toBe(170);
    expect(computeProTotal(resolveProPack("signature"), [])).toBe(250);
  });

  it("Standard garde le nom historique enregistré dans le CRM", () => {
    expect(resolveProPack("standard").name).toBe("Prépa livraison");
  });

  it("pack absent ou inconnu : retombe sur Standard (anciens formulaires)", () => {
    expect(resolveProPack(undefined).id).toBe("standard");
    expect(resolveProPack("gratuit").id).toBe("standard");
  });

  it("Standard : les 3 suppléments sont facturés", () => {
    expect(computeProTotal(resolveProPack("standard"), ["sieges", "plastiques", "polissage"])).toBe(175);
  });

  it("Premium : sièges inclus (non facturés), plastiques et polissage facturés", () => {
    const pack = resolveProPack("premium");
    expect(selectProAddons(pack, ["sieges"])).toEqual([]);
    expect(computeProTotal(pack, ["sieges", "plastiques", "polissage"])).toBe(215);
  });

  it("Signature : sièges et plastiques inclus, seul le polissage est facturé", () => {
    const pack = resolveProPack("signature");
    expect(computeProTotal(pack, ["sieges", "plastiques"])).toBe(250);
    expect(computeProTotal(pack, ["sieges", "plastiques", "polissage"])).toBe(280);
  });

  it("ignore les suppléments inconnus et les doublons", () => {
    expect(computeProTotal(resolveProPack("standard"), ["polissage", "polissage", "inconnu"])).toBe(130);
  });
});
