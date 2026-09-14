import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getAuthConfig } from "./config";

/**
 * Read client for Server Components and the auth DAL.
 * The /crm proxy owns session refresh and outgoing cookies.
 * Do not use this client for sign-in, sign-out or auth mutations:
 * those require an explicit writable response adapter.
 */
export async function createAuthServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getAuthConfig();

  return createServerClient(url, publishableKey, {
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
    },
  });
}
