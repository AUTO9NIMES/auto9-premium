"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "auto9-crm-v2-theme";

function applyTheme(theme: Theme) {
  const root = document.querySelector<HTMLElement>(".crm-v2-root");
  if (!root) return;
  root.classList.toggle("crm-v2-light", theme === "light");
  root.dataset.theme = theme;
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial: Theme = saved === "light" ? "light" : "dark";
    setTheme(initial);
    applyTheme(initial);
    setReady(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Activer le thème clair" : "Activer le thème sombre"}
      title={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
      className={
        compact
          ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-sm text-white/70 transition hover:border-cyan-300/25 hover:text-cyan-100"
          : "mt-4 flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-xs text-white/55 transition hover:border-cyan-300/20 hover:text-white"
      }
    >
      {compact ? (
        <span aria-hidden="true">{ready && theme === "light" ? "☾" : "☀"}</span>
      ) : (
        <>
          <span>{ready && theme === "light" ? "Thème sombre" : "Thème clair"}</span>
          <span aria-hidden="true" className="text-base">
            {ready && theme === "light" ? "☾" : "☀"}
          </span>
        </>
      )}
    </button>
  );
}
