import "server-only";

import { redirect } from "next/navigation";

import { CrmAccessError, requireCrmAccess } from "../lib/auth/dal";

/*
 * Contrôle d'accès du CRM V2, à appeler en tête de CHAQUE page serveur
 * (pas seulement dans le layout) : un layout n'est pas réexécuté à chaque
 * navigation et n'empêche pas une page de s'afficher (rendu partiel de
 * Next.js). Les données étant lues avec la clé service role, ce contrôle
 * doit précéder toute lecture.
 */
export async function ensureCrmV2Access(next = "/crm-v2") {
  try {
    return await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") {
        redirect(`/crm/login?next=${encodeURIComponent(next)}`);
      }
      if (error.code === "FORBIDDEN") redirect("/crm/login?error=access");
    }
    throw error;
  }
}
