import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../lib/auth/dal";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirect("/crm/login?error=access");
    }
    throw new Error("Service CRM temporairement indisponible.");
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">
        CRM AUTO9 — accès autorisé
      </h1>
      <form action="/logout" method="post">
        <button type="submit" className="rounded border px-4 py-2">
          Se déconnecter
        </button>
      </form>
    </>
  );
}
