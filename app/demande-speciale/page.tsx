import { Suspense } from "react";

import { Footer } from "../components/Footer";
import { SpecialRequestForm } from "../components/SpecialRequestForm";

export default function DemandeSpecialePage() {
  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <Suspense
        fallback={
          <section className="min-h-screen bg-[#050608] px-5 py-10 text-white md:px-12 md:py-16">
            <div className="mx-auto max-w-5xl">
              <div className="mt-8 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 md:p-10">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-[#0057FF]">
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
