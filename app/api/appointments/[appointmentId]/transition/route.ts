import { NextResponse } from "next/server";

import { transitionAppointmentStatus, type AppointmentTransitionStatus } from "../../../../lib/crm";

export const runtime = "nodejs";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_TARGET_STATUSES = new Set<AppointmentTransitionStatus>([
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
]);

function isValidUuid(value: string | undefined | null): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

function isAuthorized(request: Request) {
  const expectedApiKey = process.env.AUTO9_INTERNAL_API_KEY;

  if (!expectedApiKey) {
    console.error("AUTO9_INTERNAL_API_KEY is missing from server configuration.");
    return { authorized: false, unavailable: true } as const;
  }

  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader) {
    return { authorized: false, unavailable: false } as const;
  }

  const expectedValue = `Bearer ${expectedApiKey}`;

  if (authorizationHeader !== expectedValue) {
    return { authorized: false, unavailable: false } as const;
  }

  return { authorized: true, unavailable: false } as const;
}

export async function POST(
  request: Request,
  context: { params?: Promise<{ appointmentId?: string }> | { appointmentId?: string } },
) {
  const auth = isAuthorized(request);

  if (auth.unavailable) {
    return NextResponse.json(
      {
        ok: false,
        error: "Service temporairement indisponible.",
      },
      { status: 503 },
    );
  }

  if (!auth.authorized) {
    return NextResponse.json(
      {
        ok: false,
        error: "Non autorisé.",
      },
      { status: 401 },
    );
  }

  const params = context.params ? await context.params : undefined;
  const appointmentId = params?.appointmentId?.trim();

  if (!isValidUuid(appointmentId)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Identifiant de rendez-vous invalide.",
      },
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Corps de requête invalide.",
      },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Corps de requête invalide.",
      },
      { status: 400 },
    );
  }

  const payload = body as Record<string, unknown>;

  if (typeof payload.status !== "string" || !VALID_TARGET_STATUSES.has(payload.status as AppointmentTransitionStatus)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Statut de rendez-vous invalide.",
      },
      { status: 400 },
    );
  }

  const targetStatus = payload.status as AppointmentTransitionStatus;

  if (payload.notes !== undefined && typeof payload.notes !== "string") {
    return NextResponse.json(
      {
        ok: false,
        error: "Notes invalides.",
      },
      { status: 400 },
    );
  }

  const notes = payload.notes === undefined ? null : payload.notes.trim() || null;

  try {
    const result = await transitionAppointmentStatus({
      appointmentId,
      targetStatus,
      source: "appointment_lifecycle_api",
      notes,
    });

    return NextResponse.json({
      ok: true,
      appointment: result.appointment,
      job: result.job,
      activity: result.activity,
    });
  } catch (error) {
    console.error("Failed to transition appointment via API", {
      appointmentId,
      targetStatus,
      error,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Impossible de mettre à jour le rendez-vous.",
      },
      { status: 500 },
    );
  }
}
