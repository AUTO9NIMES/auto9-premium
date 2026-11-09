/*
 * Destination après connexion au CRM.
 *
 * Seuls les chemins internes du CRM sont acceptés (/crm, /crm/…, /crm-v2,
 * /crm-v2/…), avec une éventuelle query simple. Tout le reste (adresse
 * externe, « //domaine », antislash, « .. », page de connexion elle-même)
 * est refusé : la page de connexion ne doit jamais servir à rediriger
 * vers un autre site.
 */
export const DEFAULT_CRM_PATH = "/crm-v2";

const SAFE_CRM_PATH = /^\/crm(?:-v2)?(?:\/[A-Za-z0-9._~%-]+)*\/?(?:\?[A-Za-z0-9._~%=&+-]*)?$/;

export function safeCrmNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path || path.length > 512) return null;
  if (!SAFE_CRM_PATH.test(path)) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (decoded.includes("//") || decoded.includes("\\") || decoded.includes("..")) return null;
  if (/^\/crm\/login(?:[/?]|$)/.test(decoded)) return null;

  return path;
}
