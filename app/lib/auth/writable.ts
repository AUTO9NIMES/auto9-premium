import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig } from "./config";

export function privateResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function sameOriginPost(request: NextRequest) {
  const origin = request.headers.get("origin");
  return request.method === "POST" &&
    origin === request.nextUrl.origin &&
    request.headers.get("sec-fetch-site") !== "cross-site";
}

// Only call from Route Handlers where the response can carry cookies.
export async function createWritableAuthClient(request: NextRequest) {
  const store = await cookies();
  const { url, publishableKey } = getAuthConfig();
  const pending = new Map<string, {
    name: string; value: string; options: CookieOptions;
  }>();
  const responseHeaders = new Map<string, string>();
  const secure = request.nextUrl.protocol === "https:";

  const client = createServerClient(url, publishableKey, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure, path: "/" },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll(cookiesToSet, headers) {
        for (const cookie of cookiesToSet) {
          const options = {
            ...cookie.options, httpOnly: true,
            sameSite: "lax" as const, secure, path: "/",
          };
          store.set(cookie.name, cookie.value, options);
          pending.set(cookie.name, { ...cookie, options });
        }
        for (const [name, value] of Object.entries(headers)) {
          responseHeaders.set(name, value);
        }
      },
    },
  });

  return {
    client,
    apply(response: NextResponse) {
      pending.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      responseHeaders.forEach((value, name) => response.headers.set(name, value));
      return privateResponse(response);
    },
  };
}
