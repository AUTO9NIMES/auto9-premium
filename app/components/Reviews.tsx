"use client";

import { useRef } from "react";

const reviews = [
  {
    name: "Cece Lorenzo",
    initial: "C",
    meta: "Visité en janvier",
    text: "Merci à Nicolas pour la prestation effectuée, enfin un vrai professionnel disponible rapidement. J’ai eu l’occasion de travailler avec d’autres prestataires et je t’enverrai toutes mes voitures désormais. À bientôt !",
  },
  {
    name: "Juline Chahbouni",
    initial: "J",
    meta: "Visité en décembre 2025",
    text: "Ma voiture redevenue comme neuve. Avec 3 enfants je pensais pas que c’était possible. Il a fait des miracles. Et l’odeur qui reste à la fin, une merveille. Je recommande.",
  },
  {
    name: "TWIICE AUTO - SALON",
    initial: "T",
    meta: "Partenaire professionnel",
    text: "Nicolas est un professionnel passionné, sérieux, réactif et extrêmement méticuleux : le meilleur de la région pour tout type de préparation. Nous recommandons +++",
  },
];

export function Reviews() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;

    el.scrollBy({
      left: direction === "right" ? el.clientWidth * 0.82 : -el.clientWidth * 0.82,
      behavior: "smooth",
    });
  };

  return (
    <section className="relative overflow-hidden bg-[#050608] px-5 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
      <div className="pointer-events-none absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#0b6cff]/10 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#56a0ff] sm:text-[11px]">
            Avis clients
          </p>

          <h2 className="mt-4 text-[38px] font-black leading-[0.96] tracking-[-0.05em] sm:text-[48px] lg:text-[64px]">
            Ils nous font{" "}
            <span className="bg-[linear-gradient(135deg,#dcecff,#6aa8ff)] bg-clip-text text-transparent">
              confiance.
            </span>
          </h2>

          <p className="mt-5 max-w-xl text-[15px] leading-6 text-white/60 sm:text-base">
            Des retours authentiques de clients particuliers et professionnels
            après leur prestation AUTO 9.
          </p>
        </div>

        <div className="mt-8 flex items-center gap-4 sm:mt-10">
          <GoogleG />

          <div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
              <span className="text-[38px] font-black leading-none tracking-[-0.05em] sm:text-[44px]">
                5,0
              </span>
              <Stars className="mb-1" />
            </div>

            <p className="mt-1 text-[13px] font-medium text-white/55 sm:text-sm">
              Avis Google vérifiés
            </p>
          </div>
        </div>

        <div className="relative mt-8 sm:mt-10">
          <div
            ref={scrollerRef}
            className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {reviews.map((review) => (
              <article
                key={review.name}
                className="w-[86%] shrink-0 snap-center rounded-[24px] bg-[linear-gradient(145deg,#ffffff,#f3f5f8)] p-5 text-[#111318] shadow-[0_22px_60px_rgba(0,0,0,.32)] sm:w-[420px] sm:p-6 lg:w-[calc((100%-32px)/3)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#3159c8,#5279e7)] text-[18px] font-bold text-white shadow-sm">
                      {review.initial}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-extrabold text-[#181a1f]">
                        {review.name}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-[#7c818b]">
                        {review.meta}
                      </p>
                    </div>
                  </div>

                  <span className="text-xl leading-none text-[#8b9099]">⋮</span>
                </div>

                <Stars className="mt-5" />

                <p className="mt-4 text-[14px] leading-[1.58] text-[#30343b] sm:text-[15px]">
                  “{review.text}”
                </p>

                <div className="mt-6 flex items-center gap-2 border-t border-black/[0.06] pt-4">
                  <GoogleG small />
                  <div className="leading-tight">
                    <p className="text-[10px] text-[#8b9099]">Publié sur</p>
                    <p className="text-[13px] font-semibold text-[#202124]">
                      Google
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between sm:mt-6">
            <div className="flex gap-2">
              {reviews.map((review, index) => (
                <span
                  key={review.name}
                  className={
                    index === 0
                      ? "h-2 w-2 rounded-full bg-[#4b9bff]"
                      : "h-2 w-2 rounded-full bg-white/20"
                  }
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => scroll("left")}
                aria-label="Avis précédent"
                className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/[0.03] text-lg text-white transition hover:bg-white/[0.08]"
              >
                ←
              </button>

              <button
                type="button"
                onClick={() => scroll("right")}
                aria-label="Avis suivant"
                className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/[0.03] text-lg text-white transition hover:bg-white/[0.08]"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <a
          href="https://share.google/pRkmz18Y7YlOHJPS2"
          target="_blank"
          rel="noreferrer"
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(135deg,#f5f8fb,#bcd9fb)] px-5 py-4.5 text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#080a0d] shadow-[0_18px_50px_rgba(91,154,228,.14)] sm:mt-8 sm:w-fit sm:px-8"
        >
          <GoogleG small />
          Voir les avis Google
          <span className="text-lg leading-none">→</span>
        </a>
      </div>
    </section>
  );
}

function Stars({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-[2px] text-[19px] leading-none text-[#fbbc04] ${className}`}
      aria-label="5 étoiles sur 5"
    >
      <span>★</span>
      <span>★</span>
      <span>★</span>
      <span>★</span>
      <span>★</span>
    </div>
  );
}

function GoogleG({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-white font-black shadow-sm ${
        small ? "h-8 w-8 text-[20px]" : "h-14 w-14 text-[34px] sm:h-16 sm:w-16 sm:text-[39px]"
      }`}
      aria-label="Google"
    >
      <span className="bg-[conic-gradient(from_-45deg,#4285f4_0deg_95deg,#34a853_95deg_180deg,#fbbc05_180deg_265deg,#ea4335_265deg_360deg)] bg-clip-text text-transparent">
        G
      </span>
    </span>
  );
}

