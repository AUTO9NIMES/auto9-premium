"use client";

import Link from "next/link";

export function RealisationsPreview() {
  return (
    <section
      id="realisations"
      className="relative scroll-mt-24 overflow-hidden bg-[#050608] px-6 py-20 text-white md:px-12 md:py-24"
    >
      <div className="pointer-events-none absolute right-0 top-20 h-96 w-96 rounded-full bg-[#B8C7D1]/5 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-10 left-0 h-80 w-80 rounded-full bg-[#B8C7D1]/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
          Réalisation événement
        </p>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_.75fr] lg:items-center">
          <div>
            <h2 data-motion-reveal className="max-w-4xl text-5xl font-black uppercase tracking-[-0.05em] md:text-7xl">
              AUTO 9 au cœur de la passion auto.
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/45">
              Présent à l’Uzès Dream Car Festival, AUTO 9 accompagne les
              passionnés et les véhicules d’exception avec le même niveau
              d’exigence : soin, finition et sens du détail.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-[#B8C7D1]/25 bg-[#B8C7D1]/5 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#B8C7D1]">
                Uzès Dream Car Festival
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/55">
                Véhicules d’exception
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/55">
                Passion automobile
              </span>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/realisations"
                className="relative z-10 rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] px-7 py-4 text-xs font-black uppercase tracking-[0.25em] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] transition hover:scale-105"
              >
                Voir les réalisations →
              </Link>

              <Link
                href="/devis"
                className="relative z-10 rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.25em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Obtenir mon tarif
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[2rem] border border-[#B8C7D1]/25 bg-[#B8C7D1]/5 p-4 shadow-[0_0_90px_rgba(184,199,209,.14)]">
            <div className="relative overflow-hidden rounded-[1.5rem] bg-black">
              <video
                src="/realisations/uzes-dream-car-festival.mp4"
                controls
                muted
                playsInline
                preload="metadata"
                controlsList="nodownload"
                className="aspect-[9/16] w-full bg-black object-cover"
              >
                Votre navigateur ne peut pas lire cette vidéo.
              </video>
            </div>

            <Link
              href="/realisations"
              className="relative z-10 mt-4 flex w-full items-center justify-center rounded-full border border-white/15 px-6 py-4 text-xs font-black uppercase tracking-[0.22em] text-white/70 transition hover:border-[#B8C7D1] hover:text-white"
            >
              Découvrir toutes les réalisations →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
