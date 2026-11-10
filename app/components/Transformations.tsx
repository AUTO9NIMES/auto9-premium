"use client";

import { useEffect, useRef, useState } from "react";
import { DesktopVideo } from "./DesktopVideo";

const results = [
  {
    title: "Intérieur",
    subtitle: "Redonnez vie à votre habitacle.",
    video: "/media/transformations-v2/interieur.mp4",
    badge: "Confort",
  },
  {
    title: "Extérieur",
    subtitle: "Retrouvez une carrosserie éclatante.",
    video: "/media/transformations-v2/exterieur.mp4",
    badge: "Brillance",
  },
  {
    title: "Formule Duo",
    subtitle: "Votre véhicule remis à neuf, dedans comme dehors.",
    video: "/media/transformations-v2/duo.mp4",
    badge: "Best Seller",
  },
];

export function Transformations() {
  const [opened, setOpened] = useState<(typeof results)[number] | null>(null);

  return (
    <section
      id="transformations"
      className="relative hidden px-6 py-28 md:block md:px-12"
    >
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.55em] text-accent">
          Découvrez le résultat
        </p>

        <h2 data-motion-reveal className="mt-5 max-w-5xl text-5xl font-black uppercase tracking-[-0.05em] md:text-7xl">
          Avant / après en conditions réelles.
        </h2>

        <p className="mt-8 max-w-3xl text-xl leading-relaxed text-white/55">
          Voyez le résultat en vidéo avant de réserver.
        </p>

        <div className="mt-20 grid gap-8 lg:grid-cols-3">
          {results.map((item) => (
            <ResultCard key={item.title} item={item} onOpen={() => setOpened(item)} />
          ))}
        </div>
      </div>

      <VideoLightbox item={opened} onClose={() => setOpened(null)} />
    </section>
  );
}

/* Vidéo en grand, sur le site : fenêtre modale native (Échap, focus géré), son et contrôles. */
function VideoLightbox({
  item,
  onClose,
}: {
  item: (typeof results)[number] | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (item && !element.open) element.showModal();
    if (!item && element.open) element.close();
  }, [item]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-label={item ? `Vidéo ${item.title}` : undefined}
      className="m-auto w-[min(92vw,460px)] overflow-visible bg-transparent p-0 text-white backdrop:bg-black/80 backdrop:backdrop-blur-md"
    >
      {item && (
        <div className="relative">
          <video
            key={item.video}
            src={item.video}
            controls
            autoPlay
            playsInline
            className="aspect-[9/16] max-h-[86vh] w-full rounded-[24px] border border-white/12 bg-black object-contain shadow-[0_40px_120px_rgba(0,0,0,.6)]"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la vidéo"
            className="absolute -right-3 -top-3 grid h-11 w-11 place-items-center rounded-full border border-white/40 bg-metal text-lg font-black text-on-metal shadow-[0_10px_30px_rgba(0,0,0,.5)]"
          >
            ✕
          </button>
        </div>
      )}
    </dialog>
  );
}

function ResultCard({
  item,
  onOpen,
}: {
  item: {
    title: string;
    subtitle: string;
    video: string;
    badge: string;
  };
  onOpen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const playVideo = () => {
    const video = videoRef.current;

    if (!video) return;

    video.currentTime = 0;
    void video.play().catch(() => undefined);
  };

  const pauseVideo = () => {
    const video = videoRef.current;

    if (!video) return;

    video.pause();
    video.currentTime = 0;
  };

  return (
    <div
      onMouseEnter={playVideo}
      onMouseLeave={pauseVideo}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-black transition-all duration-500 hover:-translate-y-3 hover:border-metal-mid/70 hover:shadow-[0_0_80px_rgba(var(--metal-rgb),.25)]"
    >
      <div className="relative aspect-[9/16] overflow-hidden">
        <DesktopVideo
          ref={videoRef}
          src={item.video}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-110 group-hover:opacity-100"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-forest via-black/10 to-transparent" />

        <div className="absolute left-6 top-6 rounded-full bg-metal px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-on-metal shadow-[0_18px_45px_rgba(var(--metal-rgb),.18)]">
          {item.badge}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8">
          <h3 className="text-5xl font-black uppercase tracking-[-0.05em] transition duration-500 group-hover:-translate-y-2">
            {item.title}
          </h3>

          <p className="mt-4 text-lg text-white/65">{item.subtitle}</p>

          <div className="mt-8 h-px w-14 bg-metal shadow-[0_18px_45px_rgba(var(--metal-rgb),.18)] transition-all duration-500 group-hover:w-28" />

          <span className="mt-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-white transition duration-300 group-hover:translate-x-2 group-hover:text-metal-mid">
            Voir la vidéo →
          </span>
        </div>
      </div>

      {/* Toute la carte est cliquable : la vidéo s'ouvre en grand, sur le site. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Voir la vidéo ${item.title}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
    </div>
  );
}
