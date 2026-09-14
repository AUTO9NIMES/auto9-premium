import { Suspense } from "react";
import { QuoteConfigurator } from "../components/QuoteConfigurator";
import "./configurator-v2.css";

export default function DevisPage() {
  return (
    <main className="configurator-v2 min-h-screen bg-[#050608] text-white">
      <div className="relative z-10 border-b border-white/10 px-6 py-6 md:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a
            href="/"
            className="text-xs font-black uppercase tracking-[0.3em] text-white/50 transition hover:text-[#B8C7D1]"
          >
            ← Retour au site
          </a>

          <span className="rounded-full border border-[#5e9ff5]/20 bg-[#0c2038]/55 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#9bc7ff] backdrop-blur">
            Configurateur AUTO 9
          </span>
        </div>
      </div>

      <section className="preview-hero">
        <p className="preview-kicker">Votre prestation, simplement</p>
        <h1 className="preview-title">
          Configurez votre <span>AUTO 9.</span>
        </h1>
        <p className="preview-copy">
          Choisissez votre véhicule, votre formule et vos options. Le prix se met
          à jour en direct et votre récapitulatif reste visible jusqu’à la demande
          de créneau.
        </p>
        <div className="preview-pills" aria-label="Avantages du configurateur">
          <span>Prix en direct</span>
          <span>6 étapes rapides</span>
          <span>Photos possibles</span>
          <span>Créneau à confirmer</span>
        </div>
      </section>

      <Suspense
        fallback={<div className="px-6 py-20 md:px-12">Chargement...</div>}
      >
        <QuoteConfigurator />
      </Suspense>
    </main>
  );
}
