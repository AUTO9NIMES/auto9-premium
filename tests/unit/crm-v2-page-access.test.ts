import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireCrmAccess = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("../../app/lib/auth/dal", async () => {
  class CrmAccessError extends Error {
    constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
      super(code);
    }
  }
  return { CrmAccessError, requireCrmAccess: () => requireCrmAccess() };
});

const root = process.cwd();

function crmV2Pages(dir = path.join(root, "app/crm-v2")): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return crmV2Pages(full);
    return entry.name === "page.tsx" ? [full] : [];
  });
}

describe("CRM V2 : contrôle d'accès dans chaque page", () => {
  const pages = crmV2Pages();

  it("trouve les pages du CRM V2", () => {
    expect(pages.length).toBeGreaterThanOrEqual(11);
  });

  it.each(pages.map((page) => [path.relative(root, page), page]))(
    "%s : page serveur dont la première instruction est le contrôle d'accès",
    (_label, page) => {
      const source = fs.readFileSync(page, "utf8");

      // Une page client ne peut pas vérifier l'accès côté serveur.
      expect(source).not.toMatch(/^\s*["']use client["']/);

      const body = source.slice(source.indexOf("export default async function"));
      expect(body.length, "la page doit être un composant serveur async").toBeGreaterThan(0);

      // Début du corps : « ) {\n » ou « }) {\n » (paramètres déstructurés et typés).
      const bodyStart = body.search(/\)\s*\{\n/);
      expect(bodyStart).toBeGreaterThan(0);
      const firstStatement = body
        .slice(body.indexOf("{\n", bodyStart) + 2)
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.length > 0);

      expect(firstStatement).toMatch(
        /^await (ensureCrmV2Access|ensureCrmAccess|requireCrmAccess)\(/,
      );
    },
  );
});

describe("ensureCrmV2Access", () => {
  afterEach(() => {
    requireCrmAccess.mockReset();
    redirect.mockClear();
  });

  it("renvoie l'accès quand l'utilisateur est membre", async () => {
    const { ensureCrmV2Access } = await import("../../app/crm-v2/access");
    requireCrmAccess.mockResolvedValue({ role: "owner" });

    await expect(ensureCrmV2Access("/crm-v2/revenue")).resolves.toEqual({ role: "owner" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirige vers la connexion, en revenant sur la page demandée", async () => {
    const { ensureCrmV2Access } = await import("../../app/crm-v2/access");
    const { CrmAccessError } = await import("../../app/lib/auth/dal");
    requireCrmAccess.mockRejectedValue(new CrmAccessError("UNAUTHENTICATED"));

    await expect(ensureCrmV2Access("/crm-v2/revenue")).rejects.toThrow(
      "REDIRECT:/crm/login?next=%2Fcrm-v2%2Frevenue",
    );
  });

  it("refuse un compte connecté mais non membre", async () => {
    const { ensureCrmV2Access } = await import("../../app/crm-v2/access");
    const { CrmAccessError } = await import("../../app/lib/auth/dal");
    requireCrmAccess.mockRejectedValue(new CrmAccessError("FORBIDDEN"));

    await expect(ensureCrmV2Access()).rejects.toThrow("REDIRECT:/crm/login?error=access");
  });

  it("laisse remonter toute autre erreur (jamais d'accès par défaut)", async () => {
    const { ensureCrmV2Access } = await import("../../app/crm-v2/access");
    requireCrmAccess.mockRejectedValue(new Error("Supabase indisponible"));

    await expect(ensureCrmV2Access()).rejects.toThrow("Supabase indisponible");
    expect(redirect).not.toHaveBeenCalled();
  });
});
