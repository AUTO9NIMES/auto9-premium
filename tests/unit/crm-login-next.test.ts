import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_CRM_PATH, safeCrmNextPath } from "../../app/lib/auth/next-path";

describe("destination après connexion au CRM", () => {
  it("ouvre le CRM V2 par défaut", () => {
    expect(DEFAULT_CRM_PATH).toBe("/crm-v2");
  });

  it.each([
    "/crm",
    "/crm/",
    "/crm/pipeline",
    "/crm-v2",
    "/crm-v2/revenue",
    "/crm-v2/clients/11111111-1111-4111-8111-111111111111",
    "/crm-v2/calendar?day=2026-11-09",
    "/crm-v2/clients?search=Jean%20Dupont",
  ])("accepte la page interne %s", (path) => {
    expect(safeCrmNextPath(path)).toBe(path);
  });

  it.each([
    ["adresse externe", "https://evil.example/crm"],
    ["protocole relatif", "//evil.example/crm"],
    ["double barre après /crm", "/crm//evil.example"],
    ["double barre encodée", "/crm/%2F%2Fevil.example"],
    ["antislash", "/crm\\evil"],
    ["antislash encodé", "/crm/%5Cevil"],
    ["remontée de dossier", "/crm/../admin"],
    ["remontée encodée", "/crm/%2e%2e/admin"],
    ["autre section du site", "/devis"],
    ["préfixe trompeur", "/crm-v2evil"],
    ["préfixe trompeur bis", "/crmx"],
    ["page de connexion", "/crm/login"],
    ["page de connexion avec query", "/crm/login?next=/crm"],
    ["javascript:", "javascript:alert(1)"],
    ["fragment", "/crm-v2#x"],
    ["encodage invalide", "/crm/%E0%A4%A"],
    ["vide", ""],
    ["trop long", "/crm-v2/" + "a".repeat(600)],
  ])("refuse : %s", (_label, path) => {
    expect(safeCrmNextPath(path)).toBeNull();
  });

  it("refuse tout ce qui n'est pas une chaîne", () => {
    expect(safeCrmNextPath(undefined)).toBeNull();
    expect(safeCrmNextPath(null)).toBeNull();
    expect(safeCrmNextPath(["/crm-v2"])).toBeNull();
  });
});

// ---------- Route POST /crm/login/submit ----------

const auth = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  access: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("../../app/lib/auth/writable", () => ({
  sameOriginPost: () => true,
  privateResponse: (response: Response) => response,
  createWritableAuthClient: async () => ({
    client: { auth: { signInWithPassword: auth.signIn, signOut: auth.signOut } },
    apply: (response: Response) => response,
  }),
}));
vi.mock("../../app/lib/auth/dal", () => ({
  CrmAccessError: class CrmAccessError extends Error {
    constructor(public code: string) { super(code); }
  },
  requireCrmAccess: () => auth.access(),
}));

async function submit(fields: Record<string, string | string[]>) {
  const { POST } = await import("../../app/crm/login/submit/route");
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) body.append(key, v);
  }
  const request = new Request("https://www.auto9nimes.com/crm/login/submit", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await POST(request as any);
  return new URL(response.headers.get("location") ?? "", "https://www.auto9nimes.com");
}

describe("route de connexion : retour à la page demandée", () => {
  beforeEach(() => {
    auth.signIn.mockReset().mockResolvedValue({ data: { user: { id: "u" } }, error: null });
    auth.signOut.mockReset().mockResolvedValue({ error: null });
    auth.access.mockReset().mockResolvedValue({ role: "owner" });
  });

  it("renvoie vers la page demandée après connexion", async () => {
    const to = await submit({ email: "a@b.fr", password: "x", next: "/crm-v2/revenue" });
    expect(to.origin + to.pathname).toBe("https://www.auto9nimes.com/crm-v2/revenue");
  });

  it("ouvre le CRM V2 sans page demandée", async () => {
    const to = await submit({ email: "a@b.fr", password: "x" });
    expect(to.pathname).toBe("/crm-v2");
  });

  it("ignore une adresse extérieure glissée dans le formulaire", async () => {
    for (const next of ["https://evil.example", "//evil.example", "/crm//evil.example"]) {
      const to = await submit({ email: "a@b.fr", password: "x", next });
      expect(to.origin).toBe("https://www.auto9nimes.com");
      expect(to.pathname).toBe("/crm-v2");
    }
  });

  it("ignore un paramètre next en double", async () => {
    const to = await submit({ email: "a@b.fr", password: "x", next: ["/crm-v2/revenue", "/crm/pipeline"] });
    expect(to.pathname).toBe("/crm-v2");
  });

  it("garde la page demandée en cas d'identifiants incorrects", async () => {
    auth.signIn.mockResolvedValue({ data: { user: null }, error: new Error("bad") });
    const to = await submit({ email: "a@b.fr", password: "x", next: "/crm-v2/calendar" });
    expect(to.pathname).toBe("/crm/login");
    expect(to.searchParams.get("error")).toBe("credentials");
    expect(to.searchParams.get("next")).toBe("/crm-v2/calendar");
  });
});
