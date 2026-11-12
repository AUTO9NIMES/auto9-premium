import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { PlanningEntry } from "./shared-planning";

const parisOffset = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  timeZoneName: "longOffset",
});

export function googleCalendarFeedKey(businessId: string) {
  const secret = process.env.AUTO9_GOOGLE_CALENDAR_FEED_SECRET?.trim();
  return secret
    ? createHmac("sha256", secret).update("auto9-google-calendar:" + businessId).digest("hex")
    : null;
}

export function hasGoogleCalendarFeedKey(businessId: string, key: string | null) {
  const expected = googleCalendarFeedKey(businessId);
  return Boolean(expected && key && /^[a-f0-9]{64}$/.test(key) &&
    timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(expected, "hex")));
}

function offsetAt(instant: number) {
  const offset = parisOffset.formatToParts(instant).find(part => part.type === "timeZoneName")!.value;
  return Number(offset.slice(3, 6)) * 3_600_000;
}

function parisInstant(date: string, time: string) {
  const local = Date.parse(`${date}T${time}:00Z`);
  const prior = local - offsetAt(local - 86_400_000);
  const later = local - offsetAt(local + 86_400_000);
  // Use the first occurrence in autumn and the prior offset for a spring gap.
  if (prior + offsetAt(prior) === local) return new Date(prior);
  if (later + offsetAt(later) === local) return new Date(later);
  return new Date(prior);
}

function stamp(date: Date) {
  return date.toISOString().replace(/[-:]|\.\d{3}/g, "");
}

function escapeText(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/[;,]/g, "\\$&");
}

function fold(line: string) {
  let result = "";
  let bytes = 0;
  for (const character of line) {
    const size = Buffer.byteLength(character);
    if (bytes + size > 75) {
      result += "\r\n ";
      bytes = 1;
    }
    result += character;
    bytes += size;
  }
  return result;
}

export function renderGoogleCalendarFeed(entries: PlanningEntry[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AUTO 9//Planning CRM//FR",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:AUTO 9",
    "X-WR-TIMEZONE:Europe/Paris",
  ];

  for (const entry of entries) {
    const uid = createHash("sha256").update(entry.id).digest("hex");
    const start = entry.startsAt ? new Date(entry.startsAt) : entry.time ? parisInstant(entry.date, entry.time) : null;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}@auto9nimes.com`,
      `DTSTAMP:${stamp(new Date(entry.updatedAt))}`,
      start ? `DTSTART:${stamp(start)}` : `DTSTART;VALUE=DATE:${entry.date.replaceAll("-", "")}`,
      `SUMMARY:${escapeText(entry.title)}${start ? "" : " (horaire à définir)"}`,
    );
    if (start) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "TRIGGER:-PT1H",
        "DESCRIPTION:Rendez-vous AUTO 9 dans une heure",
        "END:VALARM",
      );
    } else {
      lines.push("TRANSP:TRANSPARENT");
    }
    lines.push("END:VEVENT");
  }

  return [...lines, "END:VCALENDAR", ""].map(fold).join("\r\n");
}
