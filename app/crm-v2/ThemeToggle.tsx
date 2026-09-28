"use client";

import { useSyncExternalStore } from "react";
import { createBrowserPreference } from "../lib/browser-preference";

type Theme = "dark" | "light";

const STORAGE_KEY = "auto9-crm-v2-theme";

function applyTheme(theme: Theme) {
  const root = document.querySelector<HTMLElement>(".crm-v2-root");
  if (!root) return;
  root.classList.toggle("crm-v2-light", theme === "light");
  root.dataset.theme = theme;
}

const themePreference = createBrowserPreference<Theme>(
  STORAGE_KEY,
  (stored) => stored === "light" ? "light" : "dark",
  applyTheme,
);

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const savedTheme = useSyncExternalStore(
    themePreference.subscribe,
    themePreference.getSnapshot,
    themePreference.getServerSnapshot,
  );
  const theme = savedTheme ?? "dark";
  const ready = savedTheme !== undefined;

  function toggle() {
    themePreference.set(theme === "dark" ? "light" : "dark");
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
