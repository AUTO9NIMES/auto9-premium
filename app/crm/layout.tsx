import type { Metadata } from "next";

import { CrmAccessError, requireCrmAccess } from "../lib/auth/dal";
import { canAccessAutomation } from "../lib/auth/roles";
import CrmNavigation from "./components/CrmNavigation";
import styles from "./crm.module.css";

export const metadata: Metadata = {
  title: "CRM AUTO9",
  robots: { index: false, follow: false },
};

const navigation = [
  { href: "/crm", label: "Dashboard" },
  { href: "/crm/clients", label: "Clients" },
  { href: "/crm/subscriptions", label: "Abonnements" },
  { href: "/crm/revenue", label: "Chiffre d’affaires" },
  { href: "/crm/emails", label: "Emails" },
  { href: "/crm/pipeline", label: "Pipeline" },
  { href: "/crm/jobs", label: "Prestations" },
  { href: "/crm/calendar", label: "Calendrier" },
  { href: "/crm/automation", label: "Automatisations" },
];

export default async function CrmLayout({ children }: {
  children: React.ReactNode;
}) {
  let access;

  try {
    access = await requireCrmAccess();
  } catch (error) {
    if (!(error instanceof CrmAccessError)) {
      throw error;
    }

    // Presentation only: each page/action keeps its own authorization checks.
    // Login and access-error flows must remain renderable without CRM chrome.
    return (
      <div className={styles.root}>
        <main className={styles.guestContent}>{children}</main>
      </div>
    );
  }

  const visibleNavigation = navigation.filter(
    (item) => item.href !== "/crm/automation" || canAccessAutomation(access.role),
  );

  return (
    <div className={styles.root}>
      <a href="#crm-content" className={styles.skipLink}>Aller au contenu</a>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <a href="/crm" className={styles.brand} aria-label="AUTO9 CRM, dashboard">
            {/* Serve the unchanged 500px artwork directly, including on high-density screens. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-auto9-transparent.png" alt="" width={96} height={96} className={styles.brandLogo} />
            <span className={styles.brandLabel}>CRM interne</span>
          </a>
          <CrmNavigation items={visibleNavigation} />
          <form action="/logout" method="post" className={styles.logout}>
            <button type="submit" className={styles.quietAction}>Se déconnecter</button>
          </form>
        </aside>
        <main id="crm-content" tabIndex={-1} className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
