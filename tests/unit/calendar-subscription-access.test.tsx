import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CalendarSubscriptionPage from "../../app/crm/calendar/subscription/page";

const auth = vi.hoisted(() => ({ access: vi.fn(), getUser: vi.fn() }));
vi.mock("../../app/lib/auth/dal", () => ({
  requireCrmAccess: auth.access,
  CrmAccessError: class extends Error {},
}));
vi.mock("../../app/lib/auth/server", () => ({
  createAuthServerClient: async () => ({ auth: { getUser: auth.getUser } }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AUTO9_CALENDAR_OWNER_EMAIL", "owner@example.com");
  vi.stubEnv("AUTO9_GOOGLE_CALENDAR_FEED_SECRET", "test-only");
  auth.access.mockResolvedValue({ role: "operator", userId: "user", businessId: "auto9" });
});
afterEach(() => vi.unstubAllEnvs());

describe("private calendar link", () => {
  it.each([
    ["owner@example.com", "2026-10-01", "user", true],
    ["operator@example.com", "2026-10-01", "user", false],
    ["owner@example.com", null, "user", false],
    ["owner@example.com", "2026-10-01", "other", false],
  ])("checks verified membership identity (%s, %s, %s)", async (email, email_confirmed_at, id, allowed) => {
    auth.getUser.mockResolvedValue({ data: { user: { id, email, email_confirmed_at } }, error: null });
    const html = renderToStaticMarkup(await CalendarSubscriptionPage());
    expect(html.includes("/api/integrations/google-calendar?key=")).toBe(allowed);
  });

  it("preserves access for CRM owners and members", async () => {
    for (const role of ["owner", "member"]) {
      auth.access.mockResolvedValue({ role, userId: "user", businessId: "auto9" });
      expect(renderToStaticMarkup(await CalendarSubscriptionPage())).toContain("/api/integrations/google-calendar?key=");
    }
    expect(auth.getUser).not.toHaveBeenCalled();
  });
});
