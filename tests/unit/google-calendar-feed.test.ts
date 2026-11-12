import { afterEach, describe, expect, it, vi } from "vitest";
import { googleCalendarFeedKey, hasGoogleCalendarFeedKey, renderGoogleCalendarFeed } from "../../app/lib/google-calendar-feed";
import type { PlanningEntry } from "../../app/lib/shared-planning";

const entry: PlanningEntry = {
  id: "calendar:123",
  title: "Rénovation, intérieur",
  date: "2026-07-15",
  time: "09:00",
  startsAt: null,
  updatedAt: "2026-06-02T15:20:00Z",
};

function unfold(feed: string) {
  return feed.replaceAll("\r\n ", "");
}

afterEach(() => vi.unstubAllEnvs());

describe("Google Calendar feed", () => {
  it("scopes access to a business and allows revoking old URLs", () => {
    vi.stubEnv("AUTO9_GOOGLE_CALENDAR_FEED_SECRET", "test-secret");
    const key = googleCalendarFeedKey("auto9");
    expect(hasGoogleCalendarFeedKey("auto9", key)).toBe(true);
    expect(hasGoogleCalendarFeedKey("other", key)).toBe(false);
    expect(hasGoogleCalendarFeedKey("auto9", "wrong")).toBe(false);
    vi.stubEnv("AUTO9_GOOGLE_CALENDAR_FEED_SECRET", "rotated-test-secret");
    expect(hasGoogleCalendarFeedKey("auto9", key)).toBe(false);
  });

  it("preserves identity across moves and converts Paris summer and winter times", () => {
    const summer = unfold(renderGoogleCalendarFeed([entry]));
    const winter = unfold(renderGoogleCalendarFeed([{ ...entry, date: "2026-12-15" }]));
    expect(summer).toContain("DTSTART:20260715T070000Z");
    expect(winter).toContain("DTSTART:20261215T080000Z");
    expect(summer.match(/^UID:.+$/m)?.[0]).toBe(winter.match(/^UID:.+$/m)?.[0]);
    expect(summer).not.toContain(entry.id);
    expect(unfold(renderGoogleCalendarFeed([]))).not.toContain("VEVENT");
  });

  it("uses the exact appointment instant and keeps untimed entries transparent", () => {
    const feed = unfold(renderGoogleCalendarFeed([
      { ...entry, startsAt: "2026-07-15T09:03:15+02:00" },
      { ...entry, time: null },
    ]));
    expect(feed).toContain("DTSTART:20260715T070315Z");
    expect(feed).toContain("DTSTART;VALUE=DATE:20260715");
    expect(feed).toContain("TRANSP:TRANSPARENT");
  });

  it("escapes injected content and folds long lines at UTF-8 boundaries", () => {
    const title = "É".repeat(75) + ", test;\r\nATTENDEE:other@example.com";
    const feed = renderGoogleCalendarFeed([{ ...entry, title }]);
    expect(feed.split("\r\n").every(line => Buffer.byteLength(line) <= 75)).toBe(true);
    expect(unfold(feed)).toContain("SUMMARY:" + "É".repeat(75) + "\\, test\\;\\nATTENDEE:other@example.com");
    expect(unfold(feed)).not.toContain("\r\nATTENDEE:");
  });
});
