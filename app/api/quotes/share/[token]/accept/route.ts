import { NextResponse } from "next/server";

import { acceptPublicQuoteByToken } from "../../../../../lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_REGEX = /^[0-9a-f]{32}$/i;

// Customer-facing acceptance. The high-entropy share token carried in the URL
// is the capability — no internal API key, and the browser never supplies
// business/quote/lead/customer/job identifiers.
export async function POST(
  request: Request,
  context: { params?: Promise<{ token?: string }> | { token?: string } },
) {
  const params = context.params ? await context.params : undefined;
  const token = params?.token?.trim().toLowerCase();

  const quoteUrl = token && TOKEN_REGEX.test(token)
    ? new URL(`/devis/${token}`, request.url)
    : null;

  if (!token || !TOKEN_REGEX.test(token)) {
    return NextResponse.json(
      { ok: false, error: "Lien de devis invalide." },
      { status: 400 },
    );
  }

  try {
    await acceptPublicQuoteByToken(token);
  } catch {
    // Token may be invalid/rotated, or the quote may not be in an acceptable
    // state. Never leak SQL/RPC/internal detail to the customer.
    if (quoteUrl) {
      return NextResponse.redirect(quoteUrl, 303);
    }

    return NextResponse.json(
      { ok: false, error: "Impossible d’accepter ce devis." },
      { status: 500 },
    );
  }

  if (quoteUrl) {
    return NextResponse.redirect(quoteUrl, 303);
  }

  return NextResponse.json({ ok: true });
}
