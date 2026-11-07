import Link from "next/link";
import { Suspense } from "react";
import { QuoteConfigurator } from "../components/QuoteConfigurator";
import { SiteMotion } from "../components/SiteMotion";

export default function DevisPage() {
  return (
    <main data-motion-site data-backdrop="deep" className="min-h-screen bg-forest text-white">
      <SiteMotion />
      <div className="border-b border-white/10 px-6 py-6 md:px-12">
        <Link
          href="/"
          className="text-xs font-black uppercase tracking-[0.3em] text-white/50 transition hover:text-[#bbc9c4]"
        >
          ← Retour au site
        </Link>
      </div>

      <Suspense
        fallback={<div className="px-6 py-20 md:px-12">Chargement...</div>}
      >
        <QuoteConfigurator />
      </Suspense>
    </main>
  );
}
