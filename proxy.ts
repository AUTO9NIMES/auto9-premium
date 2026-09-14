import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getAuthConfig } from "./app/lib/auth/config";

const PRIVATE_CACHE = "private, no-cache, no-store, must-revalidate, max-age=0";

function preventCaching(response: NextResponse) {
  response.headers.set("Cache-Control", PRIVATE_CACHE);
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

/**
 * Session transport only. Authorization belongs in requireCrmAccess(),
 * immediately before accessing CRM data, even if this proxy is bypassed.
 */
export async function proxy(request: NextRequest) {
  const pendingCookies = new Map<
    string,
    { name: string; value: string; options: CookieOptions }
  >();
  const pendingHeaders = new Map<string, string>();

  function applySession(response: NextResponse) {
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    pendingHeaders.forEach((value, name) => {
      response.headers.set(name, value);
    });
    return preventCaching(response);
  }

  try {
    const { url, publishableKey } = getAuthConfig();

    const supabase = createServerClient(url, publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            pendingCookies.set(name, { name, value, options });
          });
          Object.entries(headers).forEach(([name, value]) => {
            pendingHeaders.set(name, value);
          });
        },
      },
    });

    // Triggers validation/refresh before response creation.
    // Missing or invalid identity is denied by the DAL before data access.
    await supabase.auth.getClaims();

    return applySession(NextResponse.next({ request }));
  } catch {
    return applySession(
      new NextResponse("Service temporairement indisponible.", {
        status: 503,
      }),
    );
  }
}

export const config = {
  matcher: ["/crm/:path*"],
};
