import { NextResponse } from "next/server";

import { acceptQuoteAndCreateJob } from "../../../../lib/crm";

export const runtime = "nodejs";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  context: { params?: Promise<{ quoteId?: string }> | { quoteId?: string } },
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
  const quoteId = params?.quoteId?.trim();

  if (!isValidUuid(quoteId)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Identifiant de devis invalide.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await acceptQuoteAndCreateJob({
      quoteId,
      source: "quote_acceptance_api",
    });

    return NextResponse.json({
      ok: true,
      quote: result.quote,
      lead: result.lead,
      job: result.job,
      appointment: result.appointment,
    });
  } catch (error) {
    console.error("Failed to accept quote via API", {
      quoteId,
      error,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Impossible d’accepter le devis.",
      },
      { status: 500 },
    );
  }
}
