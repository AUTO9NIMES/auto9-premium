"use client";

import Link from "next/link";

const editorial = [
  { src: "/realisations/IMG_4685.jpeg", label: "Finition", className: "md:col-span-2 md:row-span-2" },
  { src: "/realisations/IMG_4688.jpeg", label: "Détail", className: "" },
  { src: "/realisations/IMG_4691.jpeg", label: "Passion", className: "" },
];

export function RealisationsPreview() {
  return (
    <section
      id="realisations"
      className="relative scroll-mt-24 overflow-hidden border-t border-white/[0.06] bg-[#050608] px-5 py-20 text-white sm:px-6 md:px-12 md:py-32"
    >
      <div className="pointer-events-none absolute -right-28 top-20 h-[32rem] w-[32rem] rounded-full bg-[#2F7BFF]/[0.07] blur-[160px]" />
      <div className="pointer-events-none absolute -left-28 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[#B8C7D1]/[0.045] blur-[150px]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div data-motion-reveal>
            <p className="text-[10px] font-black uppercase tracking-[0.48em] text-[#72AAFF] sm:text-xs">
              Réalisations AUTO 9
            </p>
            <h2 className="mt-5 max-w-4xl text-4xl font-black uppercase leading-[.95] tracking-[-0.055em] sm:text-5xl md:text-7xl">
              Le détail fait toute <span className="text-[#BBD7FF]">la différence.</span>
            </h2>
          </div>

          <div data-motion-reveal className="lg:pb-2">
            <p className="max-w-xl text-base leading-7 text-white/52 md:text-lg">
              Des véhicules du quotidien aux modèles d’exception, chaque intervention est traitée avec la même exigence : précision, finition et respect du véhicule.
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-3 md:mt-16 md:grid-cols-3 md:grid-rows-2 md:gap-4">
          {editorial.map((item, index) => (
            <Link
              href="/realisations"
              key={item.src}
              data-motion-reveal
              data-motion-delay={index * 70}
              className={`group relative min-h-[240px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0B111A] md:min-h-[220px] ${item.className}`}
            >
              <img
                src={item.src}
                alt="Réalisation AUTO 9"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-[.82] transition duration-700 ease-out group-hover:scale-[1.035] group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050608]/90 via-[#050608]/8 to-transparent" />
              <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-700 group-hover:opacity-100 bg-[linear-gradient(115deg,transparent_28%,rgba(185,214,255,.10)_48%,transparent_68%)]" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 sm:p-6">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.28em] text-[#9FC7FF]">{item.label}</p>
                  <p className="mt-2 text-lg font-black uppercase tracking-[-.025em] sm:text-xl">Voir la réalisation</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/35 text-lg backdrop-blur-md transition duration-300 group-hover:translate-x-1 group-hover:border-[#72AAFF]/60 group-hover:bg-[#125DE0]/25">→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[.72fr_1.28fr]">
          <div data-motion-reveal className="rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(47,123,255,.12),transparent_55%),#0B111A] p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[.32em] text-[#72AAFF]">Événement</p>
            <h3 className="mt-4 text-3xl font-black uppercase tracking-[-.045em] sm:text-4xl">Uzès Dream Car Festival</h3>
            <p className="mt-4 text-sm leading-6 text-white/52 sm:text-base">AUTO 9 au contact de véhicules d’exception, dans un univers où la présentation et le détail comptent autant que la mécanique.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['35 véhicules', 'Événement auto', 'Préparation esthétique'].map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/[.035] px-3 py-2 text-[9px] font-black uppercase tracking-[.16em] text-white/55">{tag}</span>
              ))}
            </div>
          </div>

          <div data-motion-reveal className="group relative overflow-hidden rounded-[1.5rem] border border-[#2F7BFF]/25 bg-black shadow-[0_0_80px_rgba(47,123,255,.08)]">
            <video
              src="/realisations/uzes-dream-car-festival.mp4"
              controls
              muted
              playsInline
              preload="metadata"
              controlsList="nodownload"
              className="aspect-video h-full min-h-[260px] w-full object-cover opacity-90 transition duration-700 group-hover:opacity-100"
            >
              Votre navigateur ne peut pas lire cette vidéo.
            </video>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/15" />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/40">Une sélection de travaux, événements et transformations réalisés par AUTO 9.</p>
          <Link
            href="/realisations"
            className="group inline-flex items-center justify-center gap-3 rounded-full border border-[#4D8DFF]/35 bg-[#125DE0]/10 px-6 py-3.5 text-[10px] font-black uppercase tracking-[.22em] text-[#C3DDFF] transition duration-300 hover:-translate-y-0.5 hover:border-[#72AAFF]/70 hover:bg-[#125DE0]/18"
          >
            Voir toutes les réalisations <span className="transition duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
