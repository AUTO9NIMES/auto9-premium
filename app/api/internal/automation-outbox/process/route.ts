import { NextResponse } from "next/server";
import { processAutomationOutbox } from "@/app/lib/automation-outbox-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const result = await processAutomationOutbox();

    const ok = result.settlementFailures === 0;

    return NextResponse.json(
      {
        ok,
        ...result,
      },
      {
        status: ok ? 200 : 500,
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Automation outbox processing failed.",
      },
      { status: 500 },
    );
  }
}
