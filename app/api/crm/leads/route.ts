import { NextResponse } from "next/server";

import { getLeadsList, type LeadLifecycleStatus } from "../../../lib/crm";

export const runtime = "nodejs";

const VALID_LEAD_STATUSES = new Set<LeadLifecycleStatus>([
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "QUOTE_SENT",
  "BOOKED",
  "IN_PROGRESS",
  "COMPLETED",
  "REVIEW_REQUESTED",
  "CLOSED_LOST",
]);

const SOURCE_MAX_LENGTH = 100;
const SEARCH_MAX_LENGTH = 100;

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

function isPositiveInteger(value: string | null, allowZero: boolean): boolean {
  if (value === null) {
    return true;
  }

  if (!/^\d+$/.test(value)) {
    return false;
  }

  const numberValue = Number(value);

  if (allowZero) {
    return numberValue >= 0;
  }

  return numberValue > 0;
}

function parseQueryValue(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);

  const rawPage = searchParams.get("page");
  const rawLimit = searchParams.get("limit");
  const rawStatus = searchParams.get("status");
  const rawSource = searchParams.get("source");
  const rawSearch = searchParams.get("search");

  if (rawPage !== null && !isPositiveInteger(rawPage, false)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Paramètre page invalide.",
      },
      { status: 400 },
    );
  }

  if (rawLimit !== null && !isPositiveInteger(rawLimit, false)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Paramètre limit invalide.",
      },
      { status: 400 },
    );
  }

  if (rawLimit !== null && Number(rawLimit) > 100) {
    return NextResponse.json(
      {
        ok: false,
        error: "Paramètre limit invalide.",
      },
      { status: 400 },
    );
  }

  if (rawStatus !== null && !VALID_LEAD_STATUSES.has(rawStatus as LeadLifecycleStatus)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Paramètre status invalide.",
      },
      { status: 400 },
    );
  }

  if (rawSource !== null) {
    const trimmedSource = parseQueryValue(rawSource);

    if (!trimmedSource) {
      return NextResponse.json(
        {
          ok: false,
          error: "Paramètre source invalide.",
        },
        { status: 400 },
      );
    }

    if (trimmedSource.length > SOURCE_MAX_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: "Paramètre source invalide.",
        },
        { status: 400 },
      );
    }
  }

  if (rawSearch !== null) {
    const trimmedSearch = parseQueryValue(rawSearch);

    if (!trimmedSearch) {
      return NextResponse.json(
        {
          ok: false,
          error: "Paramètre search invalide.",
        },
        { status: 400 },
      );
    }

    if (trimmedSearch.length > SEARCH_MAX_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: "Paramètre search invalide.",
        },
        { status: 400 },
      );
    }
  }

  try {
    const result = await getLeadsList({
      page: rawPage ? Number(rawPage) : 1,
      limit: rawLimit ? Number(rawLimit) : 20,
      status: rawStatus ? (rawStatus as LeadLifecycleStatus) : undefined,
      source: rawSource ? rawSource.trim() : undefined,
      search: rawSearch ? rawSearch.trim() : undefined,
    });

    return NextResponse.json({
      ok: true,
      items: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Failed to list CRM leads", {
      error,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Impossible de charger les prospects.",
      },
      { status: 500 },
    );
  }
}
