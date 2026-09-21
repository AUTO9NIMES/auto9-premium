"use client";

import { useMemo, useState } from "react";

type Customer = {
  id?: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type TemplateKey = "appointment" | "review" | "quote" | "subscription" | "thanks";

const templates: Record<TemplateKey, { label: string; subject: string; body: string; cta: string; url: string }> = {
  appointment: {
    label: "Confirmation de rendez-vous",
    subject: "Confirmation de votre rendez-vous AUTO 9",
    body: "Bonjour {{prenom}},\n\nVotre rendez-vous AUTO 9 est bien confirmé.\n\nNous avons hâte de prendre soin de votre véhicule.\n\nÀ très bientôt,\nAUTO 9",
    cta: "Voir AUTO 9",
    url: "https://auto9nimes.com",
  },
  review: {
    label: "Demande d’avis Google",
    subject: "Votre avis compte pour AUTO 9",
    body: "Bonjour {{prenom}},\n\nMerci encore pour votre confiance. J’espère que vous êtes pleinement satisfait(e) de la prestation réalisée sur votre véhicule.\n\nSi vous avez 30 secondes, votre avis Google nous aide énormément à faire connaître AUTO 9.\n\nMerci beaucoup,\nAUTO 9",
    cta: "Laisser un avis",
    url: "https://auto9nimes.com",
  },
  quote: {
    label: "Relance devis",
    subject: "Votre devis AUTO 9",
    body: "Bonjour {{prenom}},\n\nJe me permets de revenir vers vous concernant votre demande auprès d’AUTO 9.\n\nSi vous souhaitez toujours faire réaliser la prestation, je reste disponible pour organiser votre rendez-vous.\n\nÀ bientôt,\nAUTO 9",
    cta: "Réserver",
    url: "https://auto9nimes.com/book-online",
  },
  subscription: {
    label: "Abonnement à planifier",
    subject: "Votre entretien AUTO 9 - prochain rendez-vous",
    body: "Bonjour {{prenom}},\n\nVotre entretien AUTO 9 est à planifier pour ce mois-ci.\n\nVous pouvez choisir directement le jour et l’horaire qui vous conviennent via le lien ci-dessous.\n\nÀ bientôt,\nAUTO 9",
    cta: "Choisir mon créneau",
    url: "https://auto9nimes.com/book-online",
  },
  thanks: {
    label: "Merci après prestation",
    subject: "Merci pour votre confiance",
    body: "Bonjour {{prenom}},\n\nMerci d’avoir confié votre véhicule à AUTO 9.\n\nJ’espère que le résultat vous plaît et que vous avez retrouvé la joie du neuf.\n\nÀ bientôt,\nAUTO 9",
    cta: "Découvrir AUTO 9",
    url: "https://auto9nimes.com",
  },
};

function firstName(customer?: Customer) {
  return customer?.first_name?.trim() || customer?.full_name?.trim().split(/\s+/)[0] || "Client";
}

function replaceVars(text: string, customer?: Customer) {
  return text.replaceAll("{{prenom}}", firstName(customer));
}

export default function EmailEditor({ customers }: { customers: Customer[] }) {
  const [templateKey, setTemplateKey] = useState<TemplateKey>("subscription");
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const base = templates[templateKey];

  const [subjectOverrides, setSubjectOverrides] = useState<Partial<Record<TemplateKey, string>>>({});
  const [bodyOverrides, setBodyOverrides] = useState<Partial<Record<TemplateKey, string>>>({});
  const [ctaOverrides, setCtaOverrides] = useState<Partial<Record<TemplateKey, string>>>({});
  const [urlOverrides, setUrlOverrides] = useState<Partial<Record<TemplateKey, string>>>({});

  const subject = subjectOverrides[templateKey] ?? base.subject;
  const body = bodyOverrides[templateKey] ?? base.body;
  const cta = ctaOverrides[templateKey] ?? base.cta;
  const url = urlOverrides[templateKey] ?? base.url;

  const renderedSubject = replaceVars(subject, selectedCustomer);
  const renderedBody = replaceVars(body, selectedCustomer);

  const mailto = useMemo(() => {
    if (!selectedCustomer?.email) return "#";
    const plain = renderedBody + "\n\n" + cta + " : " + url;
    return `mailto:${selectedCustomer.email}?subject=${encodeURIComponent(renderedSubject)}&body=${encodeURIComponent(plain)}`;
  }, [selectedCustomer?.email, renderedSubject, renderedBody, cta, url]);

  return (
    <div className="grid gap-6 2xl:grid-cols-[0.85fr_1.15fr]">
      <section className="space-y-5 rounded-3xl border border-white/8 bg-[#0b121b] p-5 md:p-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/50">Préparation</p>
          <h2 className="mt-2 text-xl font-semibold">Composer le mail</h2>
        </div>

        <label className="block text-xs text-white/45">
          Modèle
          <select
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value as TemplateKey)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white"
          >
            {Object.entries(templates).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-white/45">
          Client
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white"
          >
            <option value="">Choisir un client</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.full_name}{customer.email ? ` · ${customer.email}` : ""}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-white/45">
          Objet
          <input
            value={subject}
            onChange={(e) => setSubjectOverrides((prev) => ({ ...prev, [templateKey]: e.target.value }))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/30"
          />
        </label>

        <label className="block text-xs text-white/45">
          Message
          <textarea
            rows={12}
            value={body}
            onChange={(e) => setBodyOverrides((prev) => ({ ...prev, [templateKey]: e.target.value }))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/30"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs text-white/45">
            Texte du bouton
            <input
              value={cta}
              onChange={(e) => setCtaOverrides((prev) => ({ ...prev, [templateKey]: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="block text-xs text-white/45">
            Lien du bouton
            <input
              value={url}
              onChange={(e) => setUrlOverrides((prev) => ({ ...prev, [templateKey]: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none"
            />
          </label>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs text-white/35">
          Variable disponible : <span className="text-cyan-200">{"{{prenom}}"}</span> — remplacée automatiquement par le prénom du client.
        </div>

        {selectedCustomer?.email ? (
          <a href={mailto} className="block rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-center text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15">
            Ouvrir dans ma messagerie
          </a>
        ) : (
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3 text-sm text-amber-100/60">
            Sélectionne un client avec une adresse email.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/8 bg-[#0b121b] p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/50">Aperçu client</p>
            <h2 className="mt-2 text-xl font-semibold">Avant envoi</h2>
          </div>
          <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-1 text-[10px] text-emerald-100/60">Modifiable</span>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-[#f4f7fa] shadow-2xl shadow-black/20">
          <div className="bg-[#07111c] px-7 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-sm font-black tracking-[0.18em] text-cyan-100">A9</div>
              <div>
                <p className="text-sm font-bold">AUTO 9</p>
                <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/50">Retrouvez la joie du neuf</p>
              </div>
            </div>
          </div>

          <div className="px-7 py-7 text-[#14202c] md:px-10 md:py-9">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5d7184]">Objet</p>
            <h3 className="mt-2 text-xl font-bold">{renderedSubject}</h3>

            <div className="mt-7 whitespace-pre-line text-[15px] leading-7 text-[#34495c]">
              {renderedBody}
            </div>

            {cta && url && (
              <a href={url} target="_blank" rel="noreferrer" className="mt-8 inline-block rounded-xl bg-[#0a6ea8] px-6 py-3 text-sm font-bold text-white no-underline">
                {cta}
              </a>
            )}

            <div className="mt-10 border-t border-slate-200 pt-5">
              <p className="text-xs font-semibold text-[#14202c]">AUTO 9 · Nîmes</p>
              <p className="mt-1 text-xs text-[#718394]">Nettoyage & préparation automobile premium</p>
              <p className="mt-1 text-xs text-[#0a6ea8]">auto9nimes.com</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
