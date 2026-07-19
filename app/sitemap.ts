import type { MetadataRoute } from "next";

const baseUrl = "https://auto9nimes.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/nettoyage-voiture-nimes",
    "/nettoyage-voiture-domicile-nimes",
    "/nettoyage-interieur-voiture-nimes",
    "/nettoyage-exterieur-voiture-nimes",
    "/formule-duo-nettoyage-voiture-nimes",
    "/prestations-premium-auto-nimes",
    "/renovation-phares-nimes",
    "/polissage-voiture-nimes",
    "/reparation-jantes-nimes",
    "/professionnels",
    "/realisations",
    "/devis",
    "/devis-premium",
    "/mentions-legales",
    "/politique-confidentialite",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority:
      route === ""
        ? 1
        : route === "/nettoyage-voiture-nimes" ||
            route === "/nettoyage-voiture-domicile-nimes"
          ? 0.9
          : route === "/prestations-premium-auto-nimes" ||
              route === "/renovation-phares-nimes" ||
              route === "/polissage-voiture-nimes" ||
              route === "/reparation-jantes-nimes"
            ? 0.85
            : 0.8,
  }));
}
