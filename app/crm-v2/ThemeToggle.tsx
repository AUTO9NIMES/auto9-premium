"use client";

import { useSyncExternalStore } from "react";
import { createBrowserPreference } from "../lib/browser-preference";

type Theme = "dark" | "light";

const STORAGE_KEY = "auto9-crm-v2-theme";

// Le thème sombre (fond noir) est rendu par défaut côté serveur ;
// seul un choix explicite « light » ajoute la classe crm-skin-light.
function applyTheme(theme: Theme) {
  const root = document.querySelector<HTMLElement>(".crm-v2-root");
  if (!root) return;
  root.classList.toggle("crm-skin-light", theme === "light");
  root.dataset.theme = theme;
}

const themePreference = createBrowserPreference<Theme>(
  STORAGE_KEY,
  (stored) => (stored === "light" ? "light" : "dark"),
  applyTheme,
);

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="h-4 w-4">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const savedTheme = useSyncExternalStore(
    themePreference.subscribe,
    themePreference.getSnapshot,
    themePreference.getServerSnapshot,
  );
  const theme = savedTheme ?? "dark";
  const nextLabel = theme === "light" ? "Passer en thème sombre" : "Passer en thème clair";

  function toggle() {
    themePreference.set(theme === "light" ? "dark" : "light");
  }

  if (compact) {
    return (
      <button type="button" onClick={toggle} aria-label={nextLabel} title={nextLabel} className="crm-btn h-9 w-9 shrink-0 !p-0">
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
      </button>
    );
  }

  return (
    <button type="button" onClick={toggle} aria-label={nextLabel} className="crm-btn w-full !justify-between !rounded-[14px]">
      <span>{theme === "light" ? "Thème sombre" : "Thème clair"}</span>
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
