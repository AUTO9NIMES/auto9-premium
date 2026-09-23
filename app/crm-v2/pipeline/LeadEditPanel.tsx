"use client";

import { useState } from "react";

export default function LeadEditPanel({
  leadId,
  initialFullName,
  initialPhone,
  initialEmail,
  initialCity,
  initialService,
  initialPrice,
  initialNote,
  action,
}: {
  leadId: string;
  initialFullName: string;
  initialPhone: string;
  initialEmail: string;
  initialCity: string;
  initialService: string;
  initialPrice: string;
  initialNote: string;
  action: (formData: FormData) => void | Promise<void>;
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
            Mets à jour les informations reçues par téléphone sans recréer le dossier.
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
          Prestation
          <input
            name="serviceName"
            required
            defaultValue={initialService}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none"
          />
        </label>

        <label className="text-[10px] uppercase tracking-[0.12em] text-white/35">
          Prix (€)
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initialPrice}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none"
          />
        </label>

        <label className="text-[10px] uppercase tracking-[0.12em] text-white/35 md:col-span-2">
          Note complémentaire
          <textarea
            name="note"
            rows={3}
            maxLength={2000}
            defaultValue={initialNote}
            placeholder="Ex. Client préfère un appel avant déplacement, véhicule très sale, siège conducteur taché..."
            className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/20"
          />
        </label>

        <button className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100 md:col-span-2">
          Enregistrer les modifications
        </button>
      </form>
    </div>
  );
}
