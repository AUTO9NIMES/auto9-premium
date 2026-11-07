import { Suspense } from "react";

import { Footer } from "../components/Footer";
import { SpecialRequestForm } from "../components/SpecialRequestForm";
import { SiteMotion } from "../components/SiteMotion";

export default function DemandeSpecialePage() {
  return (
    <main data-motion-site data-backdrop="deep" className="min-h-screen bg-forest text-white">
      <SiteMotion />
      <Suspense
        fallback={
          <section className="min-h-screen px-5 py-10 text-white md:px-12 md:py-16">
            <div className="mx-auto max-w-5xl">
              <div className="mt-8 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 md:p-10">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">
                  AUTO 9
                </p>

                <p className="mt-4 text-lg font-bold text-white/60">
                  Chargement de votre demande...
                </p>
              </div>
            </div>
          </section>
        }
      >
        <SpecialRequestForm />
      </Suspense>

      <Footer />
    </main>
  );
}
