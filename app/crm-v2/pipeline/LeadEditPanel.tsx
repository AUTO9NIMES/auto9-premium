"use client";

import { useState } from "react";

export default function LeadEditPanel({
  leadId,
  initialFullName,
  initialPhone,
  initialEmail,
  initialCity,
  initialService,
  serviceLockedWithoutRow,
  initialPerformanceDate,
  initialPrice,
  initialNote,
  expectedLeadUpdatedAt,
  expectedCustomerUpdatedAt,
  expectedCreatedAt,
  expectedPerformanceDate,
  expectedServiceId,
  expectedServiceUpdatedAt,
  expectedServiceName,
  action,
  contactAction,
  noteAction,
  serviceNameAction,
  performanceDateAction,
  quoteId,
  expectedPrice,
  canEditPrice,
  priceAction,
  canEditServicePrice,
  serviceId,
  expectedServicePrice,
  servicePriceAction,
  canEditJobPrice,
  jobId,
  expectedJobPrice,
  expectedJobUpdatedAt,
  jobPriceAction,
}: {
  leadId: string;
  initialFullName: string;
  initialPhone: string;
  initialEmail: string;
  initialCity: string;
  initialService: string;
  serviceLockedWithoutRow: boolean;
  initialPerformanceDate: string;
  initialPrice: string;
  initialNote: string;
  expectedLeadUpdatedAt: string;
  expectedCustomerUpdatedAt: string;
  expectedCreatedAt: string;
  expectedPerformanceDate: string;
  expectedServiceId: string;
  expectedServiceUpdatedAt: string;
  expectedServiceName: string;
  action: (formData: FormData) => void | Promise<void>;
  contactAction: (formData: FormData) => void | Promise<void>;
  noteAction: (formData: FormData) => void | Promise<void>;
  serviceNameAction: (formData: FormData) => void | Promise<void>;
  performanceDateAction: (formData: FormData) => void | Promise<void>;
  quoteId: string | null;
  expectedPrice: number | null;
  canEditPrice: boolean;
  priceAction: (formData: FormData) => void | Promise<void>;
  canEditServicePrice: boolean;
  serviceId: string | null;
  expectedServicePrice: number | null;
  servicePriceAction: (formData: FormData) => void | Promise<void>;
  canEditJobPrice: boolean;
  jobId: string | null;
  expectedJobPrice: number | null;
  expectedJobUpdatedAt: string;
  jobPriceAction: (formData: FormData) => void | Promise<void>;
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
            Enregistre les coordonnées, les notes et la prestation séparément. Ainsi, un champ verrouillé n'empêche plus les autres corrections.
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
        <input type="hidden" name="expectedLeadUpdatedAt" value={expectedLeadUpdatedAt} />
        <input type="hidden" name="expectedCustomerUpdatedAt" value={expectedCustomerUpdatedAt} />
        <input type="hidden" name="expectedCreatedAt" value={expectedCreatedAt} />
        <input type="hidden" name="expectedPerformanceDate" value={expectedPerformanceDate} />
        <input type="hidden" name="expectedServiceId" value={expectedServiceId} />
        <input type="hidden" name="expectedServiceUpdatedAt" value={expectedServiceUpdatedAt} />
        <input type="hidden" name="expectedServiceName" value={expectedServiceName} />

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
          Date de prestation (facultative)
          <input
            name="performanceDate"
            type="date"
            defaultValue={initialPerformanceDate}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none"
          />
        </label>

        <label className="text-[10px] uppercase tracking-[0.12em] text-white/35">
          Prestation
          {serviceLockedWithoutRow ? (
            <>
              <input type="hidden" name="serviceName" value="" />
              <div className="mt-1.5 rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white/60">
                {initialService}
              </div>
              <span className="mt-1 block text-[11px] normal-case tracking-normal text-amber-100/65">
                Prestation historique verrouillée. Le profil client et les notes restent modifiables.
              </span>
            </>
          ) : (
          <input
            name="serviceName"
            required
            maxLength={200}
            defaultValue={initialService}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none"
          />
          )}
        </label>

        <label className="text-[10px] uppercase tracking-[0.12em] text-white/35 md:col-span-2">
          Note complémentaire
          <textarea
            name="note"
            maxLength={2000}
            defaultValue={initialNote}
            rows={3}
            className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none"
          />
        </label>

        <div className="grid gap-2 md:col-span-2 sm:grid-cols-3">
          <button
            type="submit"
            formAction={contactAction}
            formNoValidate
            className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20"
          >
            Enregistrer coordonnées
          </button>
          <button
            type="submit"
            formAction={noteAction}
            formNoValidate
            className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20"
          >
            Enregistrer la note
          </button>
          <button
            type="submit"
            className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-xs font-semibold text-white/85 hover:bg-white/10"
          >
            Enregistrer prestation / date
          </button>
        </div>
        <p className="text-[11px] leading-5 text-white/45 md:col-span-2">
          Chaque bouton enregistre uniquement la partie indiquée, sauf « prestation / date »
          qui utilise les règles de validation du dossier.
        </p>
      </form>

      {canEditJobPrice && jobId && (
        <JobPriceForm
          leadId={leadId}
          jobId={jobId}
          expectedJobPrice={expectedJobPrice}
          expectedJobUpdatedAt={expectedJobUpdatedAt}
          initialPrice={initialPrice}
          action={jobPriceAction}
        />
      )}
      {!canEditJobPrice && canEditServicePrice && serviceId && (
        <ServicePriceForm
          leadId={leadId}
          serviceId={serviceId}
          expectedServicePrice={expectedServicePrice}
          expectedServiceUpdatedAt={expectedServiceUpdatedAt}
          initialPrice={initialPrice}
          action={servicePriceAction}
        />
      )}
      {!canEditJobPrice && !canEditServicePrice && canEditPrice && quoteId && (
        <DraftPriceForm
          quoteId={quoteId}
          expectedPrice={expectedPrice}
          initialPrice={initialPrice}
          action={priceAction}
        />
      )}
      {!canEditJobPrice && !canEditServicePrice && !canEditPrice && initialPrice && (
        <p className="mt-4 border-t border-white/10 pt-4 text-xs text-amber-100/60">
          Montant protégé : paiement enregistré, prestation clôturée ou devis déjà engagé.
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


function ServicePriceForm({
  leadId,
  serviceId,
  expectedServicePrice,
  expectedServiceUpdatedAt,
  initialPrice,
  action,
}: {
  leadId: string;
  serviceId: string;
  expectedServicePrice: number | null;
  expectedServiceUpdatedAt: string;
  initialPrice: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="mt-4 space-y-3 border-t border-white/10 pt-4">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="expectedServiceUpdatedAt" value={expectedServiceUpdatedAt} />
      <input
        type="hidden"
        name="expectedServicePrice"
        value={expectedServicePrice === null ? "null" : String(expectedServicePrice)}
      />
      <label className="block text-[10px] uppercase tracking-[0.12em] text-white/55">
        Montant de la prestation (€)
        <input
          name="servicePrice"
          type="number"
          required
          min="0.01"
          max="10000000"
          step="0.01"
          defaultValue={initialPrice}
          className="mt-1.5 w-full rounded-xl border border-cyan-300/20 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-cyan-300/55"
        />
      </label>
      <p className="text-[11px] leading-5 text-white/45">
        Modifiable avant encaissement. Les éventuels devis déjà envoyés restent dans
        leur historique : seul le montant opérationnel du dossier est corrigé.
      </p>
      <button className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20">
        Enregistrer le nouveau montant
      </button>
    </form>
  );
}


function JobPriceForm({
  leadId,
  jobId,
  expectedJobPrice,
  expectedJobUpdatedAt,
  initialPrice,
  action,
}: {
  leadId: string;
  jobId: string;
  expectedJobPrice: number | null;
  expectedJobUpdatedAt: string;
  initialPrice: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="mt-4 space-y-3 border-t border-white/10 pt-4">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="expectedJobUpdatedAt" value={expectedJobUpdatedAt} />
      <input
        type="hidden"
        name="expectedJobPrice"
        value={expectedJobPrice === null ? "null" : String(expectedJobPrice)}
      />
      <label className="block text-[10px] uppercase tracking-[0.12em] text-white/55">
        Montant de la prestation (€)
        <input
          name="jobPrice"
          type="number"
          required
          min="0.01"
          max="10000000"
          step="0.01"
          defaultValue={initialPrice}
          className="mt-1.5 w-full rounded-xl border border-cyan-300/20 bg-[#081019] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-cyan-300/55"
        />
      </label>
      <p className="text-[11px] leading-5 text-white/45">
        Le montant final de la prestation peut être corrigé avant paiement.
        Le devis initial et l'historique restent inchangés.
      </p>
      <button className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20">
        Enregistrer le nouveau montant
      </button>
    </form>
  );
}
