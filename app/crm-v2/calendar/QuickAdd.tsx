"use client";

import WaitingSubmit from "../../crm/components/WaitingSubmit";

import { useEffect, useMemo, useState } from "react";
import { createCalendarEvent } from "./actions";
import { listCalendarEventsOnDay, type SameDayEvent } from "./quick-actions";
import {
  PERSONAL_TITLE_PREFIX,
  TIME_TO_DEFINE_NOTE,
  TIME_TO_DEFINE_PLACEHOLDER,
  findConflicts,
  matchCustomer,
  parseQuickEvent,
  type QuickCustomer,
} from "./quick-add";

type Draft = {
  personal: boolean;
  date: string;
  time: string;
  timeToDefine: boolean;
  customerId: string;
  clientName: string;
  phone: string;
  city: string;
  title: string;
  price: string;
  notes: string;
};

const field = "crm-field mt-1 block w-full rounded-xl px-3 py-2.5 text-sm";
const label = "crm-eyebrow block";

export default function QuickAdd({ customers, today }: { customers: QuickCustomer[]; today: string }) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [checked, setChecked] = useState<{ date: string; rows: SameDayEvent[] | null } | null>(null);
  const [force, setForce] = useState(false);

  const prepare = () => {
    const parsed = parseQuickEvent(text, today);
    const customer = parsed.personal ? null : matchCustomer(parsed, text, customers);
    setForce(false);
    setDraft({
      personal: parsed.personal,
      date: parsed.date ?? today,
      time: parsed.time ?? "",
      timeToDefine: parsed.timeToDefine || !parsed.time,
      customerId: customer?.id ?? "",
      clientName: customer ? "" : parsed.clientName ?? "",
      phone: customer ? "" : parsed.phone ?? "",
      city: customer ? "" : parsed.city ?? "",
      title: parsed.title,
      price: parsed.price === null ? "" : String(parsed.price),
      notes: [parsed.vehicle, parsed.notes].filter(Boolean).join(" · "),
    });
  };

  const date = draft?.date;
  useEffect(() => {
    if (!date) return;
    let alive = true;
    listCalendarEventsOnDay(date)
      .then((rows) => { if (alive) setChecked({ date, rows }); })
      .catch(() => { if (alive) setChecked({ date, rows: null }); });
    return () => { alive = false; };
  }, [date]);
  const sameDay: SameDayEvent[] | null | "loading" = !date || checked?.date !== date ? "loading" : checked.rows;

  const conflicts = useMemo(() => {
    if (!draft || !Array.isArray(sameDay)) return [];
    return findConflicts(
      {
        date: draft.date,
        time: draft.timeToDefine ? null : draft.time,
        customerId: draft.personal ? null : draft.customerId || null,
        title: draft.personal ? PERSONAL_TITLE_PREFIX + draft.title : draft.title,
      },
      sameDay,
    );
  }, [draft, sameDay]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const selected = customers.find((c) => c.id === draft?.customerId);
  const finalTitle = draft ? (draft.personal ? PERSONAL_TITLE_PREFIX : "") + draft.title.trim() : "";
  const finalNotes = draft ? [draft.timeToDefine ? TIME_TO_DEFINE_NOTE : "", draft.notes.trim()].filter(Boolean).join(" · ") : "";
  const ready = Boolean(draft && draft.title.trim() && draft.date && (draft.timeToDefine || draft.time)
    && (draft.personal || draft.customerId || draft.clientName.trim()));

  return (
    <section className="crm-glass rounded-[22px] p-4 md:p-5" data-quick-add>
      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) prepare(); }}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <label htmlFor="quick-add-input" className="crm-eyebrow shrink-0 sm:w-28">+ RDV rapide</label>
        <input
          id="quick-add-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="jeu 9h Renaud Fédière — 308 — phare — 40€ — 07 61 17 28 06 — Nîmes"
          className={field + " mt-0"}
          autoComplete="off"
        />
        <button type="submit" className="crm-btn shrink-0" data-variant="primary" disabled={!text.trim()}>
          Préparer
        </button>
      </form>
      <p className="crm-muted mt-2 text-xs">
        Une ligne : jour, heure, client, véhicule, prestation, prix, téléphone. Ajoutez « perso » pour un RDV personnel, ou « horaire à définir ».
      </p>

      {draft && (
        <form action={createCalendarEvent} className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-2" style={{ borderColor: "var(--crm-line)" }} data-quick-add-draft>
          <div className="flex flex-wrap gap-2 md:col-span-2" role="radiogroup" aria-label="Type de rendez-vous">
            {([false, true] as const).map((personal) => (
              <button
                key={String(personal)}
                type="button"
                role="radio"
                aria-checked={draft.personal === personal}
                onClick={() => set("personal", personal)}
                className="crm-btn"
                data-variant={draft.personal === personal ? "primary" : undefined}
              >
                {personal ? "Perso (sans dossier)" : "Client"}
              </button>
            ))}
          </div>

          {!draft.personal && (
            <>
              <label className={label}>
                Client existant
                <select className={field} value={draft.customerId} onChange={(e) => set("customerId", e.target.value)} name="customerId">
                  <option value="">Nouveau client</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </label>
              {selected ? (
                <p className="crm-chip self-end" data-quick-add-match>Client reconnu : {selected.full_name}</p>
              ) : (
                <>
                  <label className={label}>Nom du nouveau client<input className={field} name="newClientName" value={draft.clientName} onChange={(e) => set("clientName", e.target.value)} /></label>
                  <label className={label}>Téléphone<input className={field} name="newClientPhone" value={draft.phone} onChange={(e) => set("phone", e.target.value)} /></label>
                  <label className={label}>Ville<input className={field} name="newClientCity" value={draft.city} onChange={(e) => set("city", e.target.value)} /></label>
                </>
              )}
            </>
          )}

          <label className={label}>Titre / prestation<input className={field} value={draft.title} onChange={(e) => set("title", e.target.value)} required /></label>
          <label className={label}>Prix (€)<input className={field} name="price" inputMode="decimal" value={draft.price} onChange={(e) => set("price", e.target.value)} /></label>
          <label className={label}>Date<input className={field} type="date" name="eventDate" value={draft.date} onChange={(e) => set("date", e.target.value)} required /></label>
          <div>
            <label className={label}>
              Heure
              <input className={field} type="time" value={draft.timeToDefine ? "" : draft.time} disabled={draft.timeToDefine} onChange={(e) => set("time", e.target.value)} />
            </label>
            <label className="crm-muted mt-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={draft.timeToDefine} onChange={(e) => set("timeToDefine", e.target.checked)} />
              Horaire à définir
            </label>
          </div>
          <label className={label + " md:col-span-2"}>Notes<input className={field} value={draft.notes} onChange={(e) => set("notes", e.target.value)} /></label>

          <input type="hidden" name="title" value={finalTitle} />
          <input type="hidden" name="serviceName" value={draft.personal ? "" : draft.title.trim()} />
          <input type="hidden" name="eventTime" value={draft.timeToDefine ? TIME_TO_DEFINE_PLACEHOLDER : draft.time} />
          <input type="hidden" name="notes" value={finalNotes} />

          <div className="md:col-span-2" aria-live="polite" data-quick-add-conflicts>
            {sameDay === "loading" ? (
              <p className="crm-muted text-xs">Vérification des doublons…</p>
            ) : sameDay === null ? (
              <p className="crm-chip" data-tone="warning">Doublons non vérifiés : vérifiez le jour dans le calendrier.</p>
            ) : conflicts.length ? (
              <div className="grid gap-1.5">
                {conflicts.map((c) => <p key={c.label} className="crm-chip" data-tone="warning">Doublon possible · {c.label}</p>)}
                <label className="crm-muted flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> Créer quand même
                </label>
              </div>
            ) : (
              <p className="crm-chip">Aucun doublon ce jour-là</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 md:col-span-2">
            <WaitingSubmit className="crm-btn" data-variant="primary" disabled={!ready || (conflicts.length > 0 && !force)}>
              Confirmer le rendez-vous
            </WaitingSubmit>
            <button type="button" className="crm-btn" onClick={() => setDraft(null)}>Annuler</button>
            {!draft.personal && (
              <p className="crm-muted self-center text-xs">Un RDV client crée aussi son dossier, comme le formulaire habituel.</p>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
