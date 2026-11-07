import Link from "next/link";
import { Suspense } from "react";
import { QuoteConfigurator } from "../components/QuoteConfigurator";

export default function DevisPage() {
  return (
    <main className="min-h-screen bg-[#071710] text-white">
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
