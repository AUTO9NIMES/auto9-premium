import Link from "next/link";
import styles from "../crm.module.css";

type QueryValue = string | undefined;

export const MAX_PAGE = 10000;

export function normalizePage(value: string | string[] | undefined): number {
  if (Array.isArray(value) || typeof value !== "string") {
    return 1;
  }

  const normalized = value.trim();

  if (!/^\d+$/.test(normalized) || Number(normalized) < 1) {
    return 1;
  }

  return Math.min(Number(normalized), MAX_PAGE);
}

export default function Pagination({
  basePath,
  currentPage,
  hasNextPage,
  query,
}: {
  basePath: string;
  currentPage: number;
  hasNextPage: boolean;
  query?: Record<string, QueryValue>;
}) {
  const createHref = (page: number) => {
    const params = new URLSearchParams();

    Object.entries(query || {}).forEach(([key, value]) => {
      const normalized = value?.trim();
      if (normalized) {
        params.set(key, normalized);
      }
    });

    params.set("page", String(page));
    return `${basePath}?${params.toString()}`;
  };

  const hasPreviousPage = currentPage > 1;
  const canGoToNextPage = hasNextPage && currentPage < MAX_PAGE;

  if (!hasPreviousPage && !canGoToNextPage) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className={styles.pagination}>
      {hasPreviousPage ? (
        <Link href={createHref(currentPage - 1)} className={styles.secondaryAction}>
          ← Précédent
        </Link>
      ) : <span aria-hidden="true" />}
      <span className={styles.meta}>Page {currentPage}</span>
      {canGoToNextPage ? (
        <Link href={createHref(currentPage + 1)} className={styles.secondaryAction}>
          Suivant →
        </Link>
      ) : <span aria-hidden="true" />}
    </nav>
  );
}
