import Link from "next/link";

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
    <nav aria-label="Pagination" className="flex items-center justify-between border-t border-white/10 pt-5">
      {hasPreviousPage ? (
        <Link href={createHref(currentPage - 1)} className="border border-white/10 px-4 py-2.5 text-xs text-white/60 transition-colors hover:border-[#d8b477] hover:text-[#d8b477]">
          ← Précédent
        </Link>
      ) : <span aria-hidden="true" />}
      <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">Page {currentPage}</span>
      {canGoToNextPage ? (
        <Link href={createHref(currentPage + 1)} className="border border-white/10 px-4 py-2.5 text-xs text-white/60 transition-colors hover:border-[#d8b477] hover:text-[#d8b477]">
          Suivant →
        </Link>
      ) : <span aria-hidden="true" />}
    </nav>
  );
}
