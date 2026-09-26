"use client";

import { useState } from "react";
import type { LeadLifecycleStatus } from "../../lib/crm";

export default function LeadDangerActions({
  leadId,
  lifecycleStatus,
  hasOperationalHistory = false,
  cancelAction,
  deleteAction,
}: {
  leadId: string;
  lifecycleStatus: LeadLifecycleStatus;
  hasOperationalHistory?: boolean;
  cancelAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  const canCancel = !hasOperationalHistory &&
    ["NEW", "QUALIFIED", "CONTACTED", "QUOTE_SENT"].includes(lifecycleStatus);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canCancel && !showCancel && (
        <button
          type="button"
          onClick={() => setShowCancel(true)}
          className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-3 py-2 text-[11px] font-medium text-amber-100/70 transition hover:border-amber-300/30 hover:text-amber-100"
        >
          Annuler la demande
        </button>
      )}

      {canCancel && showCancel && (
        <div className="w-full rounded-2xl border border-amber-300/15 bg-amber-300/[0.035] p-3 md:min-w-[360px]">
          <p className="text-xs font-semibold text-amber-100">
            Annuler la demande
          </p>
          <p className="mt-1 text-[10px] leading-4 text-white/35">
            Le client restera dans la base. Ajoute un commentaire si tu veux garder la raison de l&apos;annulation.
          </p>
          <form action={cancelAction} className="mt-3 space-y-2">
            <input type="hidden" name="leadId" value={leadId} />
            <textarea
              name="comment"
              rows={3}
              maxLength={1000}
              placeholder="Ex. Client a vendu le véhicule / ne souhaite plus donner suite..."
              className="w-full resize-none rounded-xl border border-white/10 bg-[#081019] px-3 py-2 text-xs text-white outline-none placeholder:text-white/20 focus:border-amber-300/30"
            />
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-[10px] font-semibold text-amber-100">
                Confirmer l&apos;annulation
              </button>
              <button
                type="button"
                onClick={() => setShowCancel(false)}
                className="rounded-lg border border-white/8 px-3 py-2 text-[10px] text-white/45"
              >
                Retour
              </button>
            </div>
          </form>
        </div>
      )}

      {!confirmDelete ? (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="rounded-xl border border-red-300/12 bg-red-300/[0.025] px-3 py-2 text-[11px] font-medium text-red-100/55 transition hover:border-red-300/25 hover:text-red-100"
        >
          Supprimer
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-300/15 bg-red-300/[0.035] p-2">
          <span className="px-1 text-[10px] text-red-100/65">Supprimer définitivement ?</span>
          <form action={deleteAction}>
            <input type="hidden" name="leadId" value={leadId} />
            <button className="rounded-lg bg-red-300/10 px-3 py-2 text-[10px] font-semibold text-red-100">
              Oui, supprimer
            </button>
          </form>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="rounded-lg border border-white/8 px-3 py-2 text-[10px] text-white/45"
          >
            Non
          </button>
        </div>
      )}
    </div>
  );
}
