import { NextResponse, type NextRequest } from "next/server";
import {
  createWritableAuthClient, privateResponse, sameOriginPost,
} from "../lib/auth/writable";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOriginPost(request)) {
    return privateResponse(new NextResponse("Requête refusée.", { status: 403 }));
  }

  try {
    const auth = await createWritableAuthClient(request);
    const { error } = await auth.client.auth.signOut({ scope: "local" });
    if (error) {
      return auth.apply(new NextResponse(
        "Déconnexion indisponible. Réessayez.", { status: 503 },
      ));
    }
    return auth.apply(NextResponse.redirect(
      new URL("/crm/login", request.url), 303,
    ));
  } catch {
    return privateResponse(new NextResponse(
      "Déconnexion indisponible. Réessayez.", { status: 503 },
    ));
  }
}
