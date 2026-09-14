import { NextResponse } from "next/server";

import { getCustomer360 } from "../../../../lib/crm";

export const runtime = "nodejs";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  if (authorizationHeader !== `Bearer ${expectedApiKey}`) {
    return { authorized: false, unavailable: false } as const;
  }

  return { authorized: true, unavailable: false } as const;
}

export async function GET(
  request: Request,
  context: { params?: Promise<{ customerId?: string }> | { customerId?: string } },
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
  const customerId = params?.customerId?.trim();

  if (!isValidUuid(customerId)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Identifiant client invalide.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await getCustomer360(customerId);

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          error: "Client introuvable.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      customer: result.customer,
      vehicles: result.vehicles,
      leads: result.leads,
      quotes: result.quotes,
      jobs: result.jobs,
      appointments: result.appointments,
      activities: result.activities,
    });
  } catch (error) {
    console.error("Failed to read CRM customer 360", {
      customerId,
      error,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Impossible de charger le client.",
      },
      { status: 500 },
    );
  }
}
