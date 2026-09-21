"use client";

import { usePathname } from "next/navigation";
import styles from "../crm.module.css";

type NavigationItem = Readonly<{ href: string; label: string }>;

export default function CrmNavigation({ items }: {
  items: readonly NavigationItem[];
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation CRM" className={styles.navigation}>
      {items.map(({ href, label }, itemIndex) => {
        const current = pathname === href
          ? "page"
          : href !== "/crm" && pathname?.startsWith(`${href}/`)
            ? "location"
            : undefined;

        return (
          <a key={href} href={href} aria-current={current} className={styles.navLink}>
            <span className={styles.navIndex} aria-hidden="true">
              {String(itemIndex + 1).padStart(2, "0")}
            </span>
            <span className={styles.navLabel}>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
