/*
 * Offre professionnels (/professionnels) — source unique des packs, suppléments et prix.
 * Importée par le formulaire (affichage) ET par /api/probooking (calcul faisant foi).
 * Un supplément listé dans `includes` d'un pack est compris dans ce pack : il n'est ni
 * sélectionnable ni facturé.
 */

export const PRO_ADDONS = [
  { id: "sieges", name: "Sièges", price: 30 },
  { id: "plastiques", name: "Rénovation plastiques", price: 15 },
  { id: "polissage", name: "Polissage 1 élément", price: 30 },
] as const;

export type ProAddonId = (typeof PRO_ADDONS)[number]["id"];

export const PRO_PACKS = [
  {
    id: "standard",
    // Nom historique conservé : c'est lui qui est enregistré dans le CRM.
    name: "Prépa livraison",
    label: "Pack Standard",
    price: 100,
    summary: "Intérieur + extérieur",
    includes: [] as ProAddonId[],
  },
  {
    id: "premium",
    name: "Pack Premium",
    label: "Pack Premium",
    price: 170,
    summary: "Standard + sellerie, vapeur, cire 2 mois",
    includes: ["sieges"] as ProAddonId[],
  },
  {
    id: "signature",
    name: "Pack Signature",
    label: "Pack Signature",
    price: 250,
    summary: "Premium + lustrage, protection 6 mois, coffret",
    includes: ["sieges", "plastiques"] as ProAddonId[],
  },
] as const;

export type ProPackId = (typeof PRO_PACKS)[number]["id"];
export type ProPack = (typeof PRO_PACKS)[number];

/** Pack demandé, ou Standard si l'identifiant est absent ou inconnu (anciens formulaires). */
export function resolveProPack(packId: unknown): ProPack {
  return PRO_PACKS.find((pack) => pack.id === packId) ?? PRO_PACKS[0];
}

export function isAddonIncluded(pack: ProPack, addonId: string) {
  return (pack.includes as readonly string[]).includes(addonId);
}

/** Suppléments facturables : connus du catalogue, dédoublonnés, hors suppléments inclus dans le pack. */
export function selectProAddons(pack: ProPack, addonIds: readonly string[]) {
  return PRO_ADDONS.filter((addon) => addonIds.includes(addon.id) && !isAddonIncluded(pack, addon.id));
}

export function computeProTotal(pack: ProPack, addonIds: readonly string[]) {
  return pack.price + selectProAddons(pack, addonIds).reduce((sum, addon) => sum + addon.price, 0);
}
