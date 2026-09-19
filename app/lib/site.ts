export const site = {
  name: "AUTO 9",
  slogan: "Retrouvez la joie du neuf.",
  baseline: "Detailing premium à Nîmes — à domicile, garages & événements auto.",
  phone: "06 59 76 29 92",
  phoneHref: "tel:0659762992",
  whatsapp: "https://wa.me/33659762992",
  booking: "https://www.auto9nimes.com/book-online",
};

// Canonical absolute public origin for customer-facing links. Derived from the
// canonical booking URL so request Host / X-Forwarded-Host are never trusted.
export const siteOrigin = new URL(site.booking).origin;

export function publicQuoteUrl(token: string): string {
  return `${siteOrigin}/devis/${token}`;
}
