import { NextResponse, type NextRequest } from "next/server";
import { CrmAccessError, requireCrmAccess } from "../../../lib/auth/dal";
import {
  createWritableAuthClient, privateResponse, sameOriginPost,
} from "../../../lib/auth/writable";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOriginPost(request)) {
    return privateResponse(new NextResponse("Requête refusée.", { status: 403 }));
  }

  const back = (error: string) => NextResponse.redirect(
    new URL("/crm/login?error=" + error, request.url), 303,
  );

  if (
    !request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")
  ) {
    return privateResponse(new NextResponse("Requête invalide.", { status: 415 }));
  }

  let form: FormData;
  try {
    // The form uses URL encoding, so a small bounded request is sufficient.
    const reader = request.body?.getReader();
    if (!reader) return privateResponse(back("credentials"));
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        return privateResponse(new NextResponse("Requête trop volumineuse.", { status: 413 }));
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    form = new FormData();
    new URLSearchParams(body).forEach((value, key) => form.append(key, value));
  } catch {
    return privateResponse(back("credentials"));
  }

  const email = form.get("email");
  const password = form.get("password");
  if (
    typeof email !== "string" || typeof password !== "string" ||
    !email.trim() || email.length > 254 ||
    !password || password.length > 1024 ||
    form.getAll("email").length !== 1 || form.getAll("password").length !== 1
  ) {
    return privateResponse(back("credentials"));
  }

  let auth;
  try {
    auth = await createWritableAuthClient(request);
  } catch {
    return privateResponse(back("service"));
  }

  try {
    const { data, error } = await auth.client.auth.signInWithPassword({
      email: email.trim(), password,
    });

    if (error || !data.user) {
      return auth.apply(back("credentials"));
    }

    try {
      // Reads the newly written request-scoped cookie store.
      await requireCrmAccess();
    } catch (error) {
      const { error: logoutError } = await auth.client.auth.signOut({ scope: "local" });
      if (logoutError) return auth.apply(back("service"));
      return auth.apply(back(
        error instanceof CrmAccessError && error.code === "FORBIDDEN"
          ? "access" : "service",
      ));
    }

    return auth.apply(NextResponse.redirect(new URL("/crm", request.url), 303));
  } catch {
    return auth.apply(back("service"));
  }
}
