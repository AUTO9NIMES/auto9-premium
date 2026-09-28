// Pure business-calendar projection. Never depends on the host TZ.
const parisDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function parisDateKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  if (!Number.isFinite(date.getTime())) return "";

  const parts = parisDateFormatter.formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}
