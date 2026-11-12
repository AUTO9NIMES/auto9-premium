import { resolveCurrentBusinessContext } from "../../../lib/business";
import { hasGoogleCalendarFeedKey, renderGoogleCalendarFeed } from "../../../lib/google-calendar-feed";
import { parisDateKey } from "../../../lib/paris-business-calendar";
import { loadSharedPlanning } from "../../../lib/shared-planning";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!process.env.AUTO9_GOOGLE_CALENDAR_FEED_SECRET?.trim() || !key || !/^[a-f0-9]{64}$/.test(key)) {
    return new Response(null, { status: 404, headers });
  }

  try {
    const { businessId } = await resolveCurrentBusinessContext();
    if (!hasGoogleCalendarFeedKey(businessId, key)) {
      return new Response(null, { status: 404, headers });
    }

    const [year, month] = parisDateKey(new Date()).split("-").map(Number);
    const from = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(year, month + 11, 1)).toISOString().slice(0, 10);
    const entries = await loadSharedPlanning(businessId, from, to, true);

    return new Response(renderGoogleCalendarFeed(entries), {
      headers: { ...headers, "Content-Type": "text/calendar; charset=utf-8" },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
