import { NextResponse } from "next/server";

import { getJobDetails } from "../../../../lib/crm";

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
  context: { params?: Promise<{ jobId?: string }> | { jobId?: string } },
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
  const jobId = params?.jobId?.trim();

  if (!isValidUuid(jobId)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Identifiant de prestation invalide.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await getJobDetails(jobId);

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          error: "Prestation introuvable.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("Failed to read CRM job details", {
      jobId,
      error,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Impossible de charger la prestation.",
      },
      { status: 500 },
    );
  }
}
