"use client";

import { useState } from "react";

export default function LeadEditPanel({
  leadId,
  initialFullName,
  initialPhone,
  initialEmail,
  initialCity,
  initialService,
  initialDateTime,
  initialPrice,
  initialNote,
  action,
  quoteId,
  expectedPrice,
  canEditPrice,
  priceAction,
}: {
  leadId: string;
  initialFullName: string;
  initialPhone: string;
  initialEmail: string;
  initialCity: string;
  initialService: string;
  initialDateTime: string;
  initialPrice: string;
  initialNote: string;
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string | null;
  expectedPrice: number | null;
  canEditPrice: boolean;
  priceAction: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.04] px-3 py-2 text-[11px] font-medium text-cyan-100/75 transition hover:border-cyan-300/35 hover:text-cyan-100"
      >
        Modifier la demande
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.025] p-4 md:min-w-[520px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Modifier la demande</p>
          <p className="mt-1 text-[10px] leading-4 text-white/35">
            Modifie les coordonnées, la prestation et la date réelle du dossier.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-white/35 hover:text-white"
        >
          Fermer ×
        </button>
      </div>

      <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="leadId" value={leadId} />

        <label className="text-[10px] uppercase tracking-[0.12em] text-white/35">
          Nom client
          <input
            name="fullName"
            required
            defaultValue={initialFullName}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none"
          />
        </label>

        <label className="text-[10px] uppercase tracking-[0.12em] text-white/35">
          Téléphone
          <input
            name="phone"
            defaultValue={initialPhone}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none"
          />
        </label>

        <label className="text-[10px] uppercase tracking-[0.12em] text-white/35">
          Email
          <input
            name="email"
            type="email"
            defaultValue={initialEmail}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none"
          />
        </label>

        <label className="text-[10px] uppercase tracking-[0.12em] text-white/35">
          Ville
          <input
            name="city"
            defaultValue={initialCity}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none"
          />
        </label>

        <label className="text-[10px] uppercase tracking-[0.12em] text-white/35">
          Date du dossier / prestation
          <input
            name="dossierDateTime"
            type="datetime-local"
            required
            defaultValue={initialDateTime}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none"
          />
        </label>

        <label className="text-[10px] uppercase tracking-[0.12em] text-white/35">
          Prestation
          <input
            name="serviceName"
            required
            maxLength={200}
            defaultValue={initialService}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none"
          />
        </label>

        <button className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100 md:col-span-2">
          Enregistrer les modifications
        </button>
      </form>

      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="text-xs leading-5 text-white/45">
          La note complémentaire reste en lecture seule pour préserver l&apos;historique du dossier.
        </p>
        <label className="mt-3 block text-[10px] uppercase tracking-[0.12em] text-white/35">
          Note complémentaire
          <textarea
            readOnly
            value={initialNote}
            rows={3}
            className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-[#081019] px-3 py-2 text-xs normal-case tracking-normal text-white/60"
          />
        </label>
      </div>

      {canEditPrice && quoteId ? (
        <DraftPriceForm
          key={quoteId}
          quoteId={quoteId}
          expectedPrice={expectedPrice}
          initialPrice={initialPrice}
          action={priceAction}
        />
      ) : (
        <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-white/45">
          Montant : {initialPrice || "Non renseigné"}{initialPrice ? " €" : ""}. Seul un devis brouillon avant réservation et sans prestation liée peut être modifié.
        </p>
      )}
    </div>
  );
}

export type DraftPriceSnapshot = {
  expectedPrice: number | null;
  price: string;
};

export function createDraftPriceSnapshot(
  expectedPrice: number | null,
  price: string,
): DraftPriceSnapshot {
  return { expectedPrice, price };
}

function DraftPriceForm({
  quoteId,
  expectedPrice,
  initialPrice,
  action,
}: {
  quoteId: string;
  expectedPrice: number | null;
  initialPrice: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [dirtySnapshot, setDirtySnapshot] = useState<DraftPriceSnapshot | null>(null);
  const snapshot = dirtySnapshot ?? createDraftPriceSnapshot(expectedPrice, initialPrice);

  return (
    <form action={action} className="mt-4 space-y-3 border-t border-white/10 pt-4">
      <input type="hidden" name="quoteId" value={quoteId} />
      <input
        type="hidden"
        name="expectedPrice"
        value={snapshot.expectedPrice === null ? "null" : String(snapshot.expectedPrice)}
      />
      <label className="block text-[10px] uppercase tracking-[0.12em] text-white/35">
        Montant du devis brouillon (€)
        <input
          name="price"
          type="number"
          required
          min="0.01"
          max="10000000"
          step="0.01"
          value={snapshot.price}
          onChange={(event) => {
            const price = event.currentTarget.value;
            setDirtySnapshot((current) => ({
              expectedPrice: current ? current.expectedPrice : expectedPrice,
              price,
            }));
          }}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none"
        />
      </label>
      <button className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100">
        Enregistrer le montant du brouillon
      </button>
    </form>
  );
}
