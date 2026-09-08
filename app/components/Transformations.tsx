"use client";

import { useRef } from "react";

const results = [
  {
    title: "Intérieur",
    subtitle: "Redonnez vie à votre habitacle.",
    video: "/result-interieur.mp4",
    href: "/devis?service=interieur",
    badge: "Confort",
  },
  {
    title: "Extérieur",
    subtitle: "Retrouvez une carrosserie éclatante.",
    video: "/result-exterieur.mp4",
    href: "/devis?service=exterieur",
    badge: "Brillance",
  },
  {
    title: "Formule Duo",
    subtitle: "La remise à neuf complète AUTO 9.",
    video: "/result-duo.mp4",
    href: "/devis?service=duo",
    badge: "Best Seller",
  },
];

export function Transformations() {
  return (
    <section
      id="transformations"
      className="relative hidden border-t border-white/10 bg-[#050608] px-6 py-28 md:block md:px-12"
    >
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
          Découvrez le résultat
        </p>

        <h2 data-motion-reveal className="mt-5 max-w-5xl text-5xl font-black uppercase tracking-[-0.05em] md:text-7xl">
          Le résultat parle de lui-même.
        </h2>

        <p className="mt-8 max-w-3xl text-xl leading-relaxed text-white/55">
          Choisissez une prestation et découvrez un véritable résultat réalisé
          par AUTO 9.
        </p>

        <div className="mt-20 grid gap-8 lg:grid-cols-3">
          {results.map((item) => (
            <ResultCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ResultCard({
  item,
}: {
  item: {
    title: string;
    subtitle: string;
    video: string;
    href: string;
    badge: string;
  };
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const playVideo = () => {
    const video = videoRef.current;

    if (!video) return;

    video.currentTime = 0;
    void video.play();
  };

  const pauseVideo = () => {
    const video = videoRef.current;

    if (!video) return;

    video.pause();
    video.currentTime = 0;
  };

  return (
    <a
      href={item.href}
      onMouseEnter={playVideo}
      onMouseLeave={pauseVideo}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-black transition-all duration-500 hover:-translate-y-3 hover:border-[#B8C7D1]/70 hover:shadow-[0_0_80px_rgba(184,199,209,.25)]"
    >
      <div className="relative aspect-[9/16] overflow-hidden">
        <video
          ref={videoRef}
          src={item.video}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-110 group-hover:opacity-100"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-black/10 to-transparent" />

        <div className="absolute left-6 top-6 rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)]">
          {item.badge}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8">
          <h3 className="text-5xl font-black uppercase tracking-[-0.05em] transition duration-500 group-hover:-translate-y-2">
            {item.title}
          </h3>

          <p className="mt-4 text-lg text-white/65">{item.subtitle}</p>

          <div className="mt-8 h-px w-14 bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] shadow-[0_18px_45px_rgba(184,199,209,.18)] transition-all duration-500 group-hover:w-28" />

          <span className="mt-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-white transition duration-300 group-hover:translate-x-2 group-hover:text-[#B8C7D1]">
            Découvrir →
          </span>
        </div>
      </div>
    </a>
  );
}
