import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/crm",
  requireCrmAccess: vi.fn(),
  redirect: vi.fn((location: string) => { throw new Error(`redirect:${location}`); }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  redirect: mocks.redirect,
}));

// This replaces only the access-result boundary for presentation tests.
// It does not test sessions, database membership checks, or server enforcement.
vi.mock("../../app/lib/auth/dal", () => ({
  requireCrmAccess: mocks.requireCrmAccess,
  CrmAccessError: class extends Error {
    constructor(public code: string) { super(code); }
  },
}));

import CrmLayout from "../../app/crm/layout";
import LoginPage from "../../app/crm/login/page";
import CrmNavigation from "../../app/crm/components/CrmNavigation";
import Pagination, { MAX_PAGE, normalizePage } from "../../app/crm/components/Pagination";
import { CrmAccessError } from "../../app/lib/auth/dal";

const items = [
  { href: "/crm", label: "Dashboard" },
  { href: "/crm/jobs", label: "Prestations" },
];

function navigationProps(node: ReactNode): unknown[] {
  if (Array.isArray(node)) return node.flatMap(navigationProps);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  if (node.type === CrmNavigation) return [node.props];
  return navigationProps(node.props.children);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/crm";
  mocks.requireCrmAccess.mockResolvedValue({
    role: "owner", userId: "private-user-id", businessId: "private-business-id",
  });
});

describe("CRM current navigation", () => {
  it.each([
    ["/crm", "/crm", "page"],
    ["/crm/jobs", "/crm/jobs", "page"],
    ["/crm/jobs/123", "/crm/jobs", "location"],
    ["/crm/jobs/123/edit", "/crm/jobs", "location"],
    ["/crm/jobs-other", null, null],
    ["/crm/clients", null, null],
    ["/crm-other", null, null],
  ])("exposes current state for %s", (pathname, href, current) => {
    mocks.pathname = pathname;
    const html = renderToStaticMarkup(<CrmNavigation items={items} />);
    const activeLinks = [...html.matchAll(/<a\b[^>]*aria-current="[^"]+"[^>]*>/g)];
    expect(activeLinks).toHaveLength(href ? 1 : 0);
    if (href) {
      expect(activeLinks[0][0]).toContain(`href="${href}"`);
      expect(activeLinks[0][0]).toContain(`aria-current="${current}"`);
    }
    expect(html).toContain('aria-label="Navigation CRM"');
  });
});

describe("CRM shell presentation at the server access-result boundary", () => {
  it.each([
    ["owner", true], ["member", true], ["operator", false],
  ])("filters destinations before rendering for %s", async (role, automation) => {
    mocks.requireCrmAccess.mockResolvedValue({
      role, userId: "private-user-id", businessId: "private-business-id",
    });
    const tree = await CrmLayout({ children: <h1>Contenu</h1> });
    const props = navigationProps(tree);
    expect(props).toEqual([{
      items: [
        { href: "/crm", label: "Dashboard" },
        { href: "/crm/clients", label: "Clients" },
        { href: "/crm/subscriptions", label: "Abonnements" },
        { href: "/crm/revenue", label: "Chiffre d’affaires" },
        { href: "/crm/emails", label: "Emails" },
        { href: "/crm/pipeline", label: "Pipeline" },
        { href: "/crm/jobs", label: "Prestations" },
        { href: "/crm/calendar", label: "Calendrier" },
        ...(automation ? [{ href: "/crm/automation", label: "Automatisations" }] : []),
      ],
    }]);
    const html = renderToStaticMarkup(tree);
    expect(html.includes('href="/crm/automation"')).toBe(automation);
    expect(html).not.toContain("private-user-id");
    expect(html).not.toContain("private-business-id");
    expect(html).toContain('action="/logout" method="post"');
    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html).toContain('href="#crm-content"');
    expect(html).toContain('id="crm-content" tabindex="-1"');
    expect(html.match(/<img\b/g)).toHaveLength(1);
    expect(html).toContain('src="/logo-auto9-transparent.png"');
    expect(html).toContain('aria-label="AUTO9 CRM, dashboard"');
    expect(mocks.requireCrmAccess).toHaveBeenCalledTimes(1);
  });

  it.each([
    new CrmAccessError("UNAUTHENTICATED"),
    new CrmAccessError("FORBIDDEN"),
    new CrmAccessError("UNAVAILABLE"),
  ])("renders children without authenticated chrome on %s", async (error) => {
    mocks.requireCrmAccess.mockRejectedValue(error);
    const tree = await CrmLayout({ children: <h1>Connexion</h1> });
    expect(navigationProps(tree)).toEqual([]);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain("Connexion");
    expect(html).not.toContain("<nav");
    expect(html).not.toContain("<aside");
    expect(html).not.toContain('action="/logout"');
    expect(html).not.toContain("Session sécurisée");
    expect(html.match(/<main\b/g)).toHaveLength(1);
  });

  it("propagates unexpected access failures", async () => {
    const failure = new Error("unexpected service failure");
    mocks.requireCrmAccess.mockRejectedValue(failure);

    await expect(
      CrmLayout({ children: <h1>Contenu</h1> }),
    ).rejects.toBe(failure);
  });
});

describe("CRM login presentation preserves its native form contract", () => {
  beforeEach(() => {
    mocks.requireCrmAccess.mockRejectedValue(new CrmAccessError("UNAUTHENTICATED"));
  });

  it("renders one decorative official logo, visible labels and original field constraints", async () => {
    const login = await LoginPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(await CrmLayout({ children: login }));
    expect(html).toContain('action="/crm/login/submit" method="post"');
    expect(html).toMatch(/<label[^>]*for="email"[^>]*>Email<\/label>/);
    expect(html).toMatch(/<label[^>]*for="password"[^>]*>Mot de passe<\/label>/);
    for (const [name, type, autocomplete, limit] of [
      ["email", "email", "username", "254"],
      ["password", "password", "current-password", "1024"],
    ]) {
      const input = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0];
      expect(input).toContain(`type="${type}"`);
      expect(input).toContain(`autoComplete="${autocomplete}"`);
      expect(input).toContain(`maxLength="${limit}"`);
      expect(input).toContain('required=""');
    }
    expect(html.match(/<img\b/g)).toHaveLength(1);
    expect(html).toContain('src="/logo-auto9-transparent.png" alt="" width="144" height="144"');
    expect(html).not.toContain("<nav");
    expect(html).not.toContain('role="alert"');
  });

  it.each([
    ["credentials", "Connexion impossible. Vérifiez vos identifiants."],
    ["access", "Accès CRM non autorisé."],
    ["service", "Service temporairement indisponible."],
  ])("keeps the %s error contract", async (error, message) => {
    const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ error }) }));
    expect(html).toContain('role="alert"');
    expect(html).toContain(message);
  });

  it("keeps denied-session logout available", async () => {
    mocks.requireCrmAccess.mockRejectedValue(new CrmAccessError("FORBIDDEN"));
    const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Accès CRM non autorisé.");
    expect(html).toContain('action="/logout" method="post"');
  });

  it("keeps the authorized redirect", async () => {
    mocks.requireCrmAccess.mockResolvedValue({ role: "owner" });
    await expect(LoginPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/crm");
    expect(mocks.redirect).toHaveBeenCalledWith("/crm");
  });
});

describe("pagination presentation preserves navigation", () => {
  it("preserves filters and previous/next destinations", () => {
    const html = renderToStaticMarkup(<Pagination basePath="/crm/clients" currentPage={2} hasNextPage query={{ q: "  Jean Dupont  ", empty: " " }} />);
    expect(html).toContain('href="/crm/clients?q=Jean+Dupont&amp;page=1"');
    expect(html).toContain('href="/crm/clients?q=Jean+Dupont&amp;page=3"');
    expect(html).not.toContain("empty=");
    expect(html).toContain("Page 2");
  });

  it("keeps visibility and the page cap", () => {
    expect(renderToStaticMarkup(<Pagination basePath="/crm/jobs" currentPage={1} hasNextPage={false} />)).toBe("");
    const html = renderToStaticMarkup(<Pagination basePath="/crm/jobs" currentPage={MAX_PAGE} hasNextPage />);
    expect(html).toContain(`page=${MAX_PAGE - 1}`);
    expect(html).not.toContain("Suivant");
    expect(normalizePage("999999")).toBe(MAX_PAGE);
    expect(normalizePage(["2", "3"])).toBe(1);
  });
});
