export const supabaseUrl = process.env.SUPABASE_URL || "";
export const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function hasSupabaseWriteConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export async function supabaseRest<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  body?: Record<string, unknown> | unknown[] | null,
  query?: string,
): Promise<T | T[] | null> {
  if (!hasSupabaseWriteConfig()) {
    return null;
  }

  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);
  const isRpcCall = path.startsWith("rpc/");
  const effectiveQuery = query
    ? query.includes("select=")
      ? query
      : `${query}&select=*`
    : isRpcCall
      ? ""
      : "select=*";

  url.search = effectiveQuery;

  const headers = new Headers({
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  });

  if (method === "POST" || method === "PATCH" || method === "PUT") {
    headers.set("Prefer", "return=representation");
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase request failed for ${path}: ${response.status} ${response.statusText} ${errorText}`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  const responseData = (await response.json()) as T | T[];

  if (method === "GET" || method === "DELETE") {
    return responseData;
  }

  return Array.isArray(responseData) ? responseData[0] || null : responseData;
}
