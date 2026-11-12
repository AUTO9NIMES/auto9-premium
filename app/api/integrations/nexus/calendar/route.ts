import { timingSafeEqual } from "node:crypto";
import { resolveCurrentBusinessContext } from "../../../../lib/business";
import { loadSharedPlanning } from "../../../../lib/shared-planning";
import { hasSupabaseWriteConfig } from "../../../../lib/supabase";

const headers = { "Cache-Control": "private, no-store" };
const dayMs = 86_400_000;

function monday(value: string | null) {
  if (!value || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value &&
    date.getUTCDay() === 1 ? date : null;
}

export async function GET(request: Request) {
  const json = (data: object, status = 200) => Response.json(data, { headers, status });
  const token = process.env.AUTO9_CALENDAR_TOKEN?.trim();
  if (!token) return json({ error: "Service indisponible" }, 503);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from("Bearer " + token);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return json({ error: "Non autorisé" }, 401);
  }

  const from = monday(new URL(request.url).searchParams.get("week"));
  if (!from) return json({ error: "Semaine invalide" }, 400);
  const to = new Date(+from + 7 * dayMs);
  if (!hasSupabaseWriteConfig()) return json({ error: "Service indisponible" }, 503);

  try {
    const { businessId } = await resolveCurrentBusinessContext();
    const planning = await loadSharedPlanning(
      businessId,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10),
    );
    const entries = planning.map(({ id, title, date, time }) => ({ id, title, date, time }));
    return json({ entries });
  } catch {
    return json({ error: "Planning indisponible" }, 503);
  }
}
