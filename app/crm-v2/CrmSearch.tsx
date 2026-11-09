"use client";

import { useEffect, useRef } from "react";

/*
 * Recherche rapide : envoie vers la liste des clients (recherche existante).
 * Raccourci : ⌘K / Ctrl+K pour placer le curseur dans le champ.
 */
export default function CrmSearch({ id }: { id: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        // Deux champs existent (ordinateur / mobile) : seul le visible réagit.
        if (!inputRef.current?.offsetParent) return;
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form action="/crm-v2/clients" method="get" role="search" className="relative">
      <label htmlFor={id} className="sr-only">Rechercher un client</label>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 crm-faint">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        id={id}
        name="search"
        type="search"
        placeholder="Rechercher…"
        autoComplete="off"
        className="w-full rounded-[14px] border py-2.5 pl-9 pr-12 text-[13px] outline-none transition"
        style={{ background: "var(--crm-glass-strong)", borderColor: "var(--crm-glass-border)", color: "var(--crm-ink)" }}
      />
      <kbd className="crm-chip pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 !px-2 !py-1 !text-[10px]">⌘K</kbd>
    </form>
  );
}
