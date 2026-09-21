import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../lib/auth/dal";

import styles from "../crm.module.css";

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
    <div className={styles.login}>
      <div className={styles.loginBrand}>
        {/* The visible heading names AUTO9; keep the unchanged artwork decorative. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-auto9-transparent.png" alt="" width={144} height={144} className={styles.loginLogo} />
        <h1 className={styles.loginTitle}>Connexion CRM AUTO9</h1>
      </div>
      {message && <p role="alert" className={styles.error}>{message}</p>}
      <form action="/crm/login/submit" method="post" className={styles.loginForm}>
        <div>
          <label htmlFor="email" className={styles.fieldLabel}>Email</label>
          <input id="email" name="email" type="email" required
            autoComplete="username" maxLength={254}
            className={styles.control} />
        </div>
        <div>
          <label htmlFor="password" className={styles.fieldLabel}>Mot de passe</label>
          <input id="password" name="password" type="password" required
            autoComplete="current-password" maxLength={1024}
            className={styles.control} />
        </div>
        <button type="submit" className={styles.primaryAction}>
          Se connecter
        </button>
      </form>
      {denied && (
        <form action="/logout" method="post" className={styles.deniedLogout}>
          <button type="submit" className={styles.secondaryAction}>
            Se déconnecter
          </button>
        </form>
      )}
    </div>
  );
}
