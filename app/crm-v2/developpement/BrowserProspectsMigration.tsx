"use client";

import { useEffect, useState } from "react";
import { importBrowserProspects } from "./actions";

/*
 * L'ancienne page enregistrait les prospects sur le navigateur. Si ce
 * navigateur en contient encore, on propose de les transférer dans la base.
 */
const KEY = "auto9-crm-development-v1";

export default function BrowserProspectsMigration({ back }: { back: string }) {
  const [payload, setPayload] = useState<{ json: string; count: number } | null>(null);

  useEffect(() => {
    try {
      const store = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (store?.prospectsMigrated || !Array.isArray(store?.prospects) || !store.prospects.length) return;
      const list = store.prospects;
      queueMicrotask(() => setPayload({ json: JSON.stringify(list), count: list.length }));
    } catch {}
  }, []);

  if (!payload) return null;
  return (
    <form
      action={importBrowserProspects}
      onSubmit={() => {
        try {
          const store = JSON.parse(localStorage.getItem(KEY) || "{}");
          localStorage.setItem(KEY, JSON.stringify({ ...store, prospectsMigrated: true }));
        } catch {}
      }}
      className="crm-glass flex flex-wrap items-center justify-between gap-3 rounded-[20px] p-4"
      data-browser-migration
    >
      <p className="text-sm">
        <strong>{payload.count} prospect{payload.count > 1 ? "s" : ""}</strong> enregistré{payload.count > 1 ? "s" : ""} sur ce navigateur (ancienne version de la page).
      </p>
      <input type="hidden" name="payload" value={payload.json} />
      <input type="hidden" name="back" value={back} />
      <button className="crm-btn" data-variant="primary">Les transférer dans la base</button>
    </form>
  );
}
