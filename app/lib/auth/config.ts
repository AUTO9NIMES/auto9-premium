import "server-only";

export function getAuthConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey?.startsWith("sb_publishable_")) {
    throw new Error("Supabase Auth configuration is missing or invalid.");
  }

  const parsedUrl = new URL(url);

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash ||
    (parsedUrl.pathname !== "/" && parsedUrl.pathname !== "")
  ) {
    throw new Error("Supabase Auth URL is invalid.");
  }

  return { url: parsedUrl.origin, publishableKey };
}
