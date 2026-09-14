import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../lib/auth/dal";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let authorized = false;
  let unavailable = false;
  let denied = false;

  try {
    await requireCrmAccess();
    authorized = true;
  } catch (error) {
    if (error instanceof CrmAccessError) {
      denied = error.code === "FORBIDDEN";
      unavailable = error.code === "UNAVAILABLE";
    } else {
      unavailable = true;
    }
  }

  if (authorized) redirect("/crm");

  const params = await searchParams;
  const message = unavailable
    ? "Service temporairement indisponible."
    : denied || params.error === "access"
      ? "Accès CRM non autorisé."
      : params.error === "credentials"
        ? "Connexion impossible. Vérifiez vos identifiants."
        : params.error === "service"
          ? "Service temporairement indisponible."
          : null;

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Connexion CRM AUTO9</h1>
      {message && <p role="alert" className="mb-4">{message}</p>}
      <form action="/crm/login/submit" method="post" className="space-y-4">
        <div>
          <label htmlFor="email" className="block">Email</label>
          <input id="email" name="email" type="email" required
            autoComplete="username" maxLength={254}
            className="w-full rounded border border-gray-500 bg-transparent p-2" />
        </div>
        <div>
          <label htmlFor="password" className="block">Mot de passe</label>
          <input id="password" name="password" type="password" required
            autoComplete="current-password" maxLength={1024}
            className="w-full rounded border border-gray-500 bg-transparent p-2" />
        </div>
        <button type="submit" className="rounded bg-white px-4 py-2 text-black">
          Se connecter
        </button>
      </form>
      {denied && (
        <form action="/logout" method="post" className="mt-6">
          <button type="submit" className="rounded border px-4 py-2">
            Se déconnecter
          </button>
        </form>
      )}
    </>
  );
}
