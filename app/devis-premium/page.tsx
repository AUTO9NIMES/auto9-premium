import { Suspense } from "react";
import { PremiumQuoteConfigurator } from "../components/PremiumQuoteConfigurator";

export default function DevisPremiumPage() {
  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <div className="border-b border-white/10 px-6 py-6 md:px-12">
        <a
          href="/"
          className="text-xs font-black uppercase tracking-[0.3em] text-white/50 transition hover:text-[#B8C7D1]"
        >
          ← Retour au site
        </a>
      </div>

      <Suspense
        fallback={<div className="px-6 py-20 md:px-12">Chargement...</div>}
      >
        <PremiumQuoteConfigurator />
      </Suspense>
    </main>
  );
}
