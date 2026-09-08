"use client";

import { useEffect, useRef, useState } from "react";

type ServiceKey = "duo" | "interieur" | "exterieur";

type CinematicConfig = {
  key: ServiceKey;
  title: string;
  subtitle: string;
  src: string;
};

// Temporary Runway-hosted URLs for the live test.
// Replace these with durable /public or Vercel Blob URLs before the final launch.
const cinematics: Record<ServiceKey, CinematicConfig> = {
  duo: {
    key: "duo",
    title: "FORMULE DUO",
    subtitle: "Intérieur × Extérieur",
    src: "https://dnznrvs05pmza.cloudfront.net/seedance_2/cgt-20260909030343-b6slj/A_cinematic_premium_DUO_car_detailing_ad_in_a_dark_modern_studio_with_subtle_blue_accent_lighting__F.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNzU1MDVmNGZkMWEyNDcwMSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTAwNzk1MX0.ffX2fRZN7AUXd2jd92yZoHQcYQFfzBqCq3PyuAVzK8Y",
  },
  interieur: {
    key: "interieur",
    title: "INTÉRIEUR",
    subtitle: "Soin complet de l’habitacle",
    src: "https://dnznrvs05pmza.cloudfront.net/seedance_2_fast/cgt-20260909024635-cbkg6/A_cinematic_premium_interior_car_detailing_commercial_in_a_dark_modern_luxury_studio_with_subtle_blu.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiYjE2ZjMzNmM4ZGQ4MWRiNiIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTAyNzY5Mn0.-MM3REjj3QWgMDIH54eRD36DQTRH2nb0-q9QlGB2LOE",
  },
  exterieur: {
    key: "exterieur",
    title: "EXTÉRIEUR",
    subtitle: "Soin extérieur du véhicule",
    src: "https://dnznrvs05pmza.cloudfront.net/seedance_2_fast/cgt-20260909022900-4xm6r/A_cinematic_premium_car_detailing_commercial_in_a_dark_luxury_studio_with_subtle_blue_accent_lightin.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNDA0OWVjZmM3YTk0MDRiZiIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTA1MzgyMH0.e0wqil2pMxqbjVoPEwRpwIAOtraF8hg7K5H6hVCTTX8",
  },
};

function serviceFromButton(button: HTMLButtonElement): ServiceKey | null {
  const text = (button.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fr-FR");

  if (text.includes("formule duo")) return "duo";
  if (text.includes("intérieur")) return "interieur";
  if (text.includes("extérieur")) return "exterieur";

  return null;
}

function isServiceKey(value: string | null): value is ServiceKey {
  return value === "duo" || value === "interieur" || value === "exterieur";
}

export function ServiceCinematicTest() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const autoStartedRef = useRef(false);
  const [active, setActive] = useState<CinematicConfig | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);

  function startCinematic(serviceKey: ServiceKey) {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) return;

    setActive(cinematics[serviceKey]);
    setVideoReady(false);
    setVideoError(false);
    setPlaying(false);
    setTitleVisible(true);
  }

  function closeCinematic() {
    videoRef.current?.pause();
    setActive(null);
    setVideoReady(false);
    setVideoError(false);
    setPlaying(false);
    setTitleVisible(false);
  }

  useEffect(() => {
    if (autoStartedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const service = params.get("service");

    if (!isServiceKey(service)) return;

    autoStartedRef.current = true;
    startCinematic(service);
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("button");
      if (!(button instanceof HTMLButtonElement)) return;

      const serviceKey = serviceFromButton(button);
      if (!serviceKey) return;

      startCinematic(serviceKey);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeCinematic();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !videoReady || videoError) return;

    const playTimer = window.setTimeout(() => {
      setPlaying(true);
      void videoRef.current?.play().catch(() => {
        setVideoError(true);
        setPlaying(false);
      });
    }, 520);

    const titleTimer = window.setTimeout(() => {
      setTitleVisible(false);
    }, 1120);

    return () => {
      window.clearTimeout(playTimer);
      window.clearTimeout(titleTimer);
    };
  }, [active, videoReady, videoError]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Animation ${active.title}`}
    >
      <video
        key={active.src}
        ref={videoRef}
        src={active.src}
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
        onEnded={closeCinematic}
        onError={() => {
          setVideoError(true);
          setVideoReady(false);
          setPlaying(false);
          setTitleVisible(true);
        }}
        className={`absolute inset-0 h-full w-full object-contain transition duration-700 md:object-cover ${
          playing ? "scale-100 opacity-100" : "scale-[1.015] opacity-0"
        }`}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,.18)_65%,rgba(0,0,0,.62)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/70 to-transparent" />

      <div
        className={`pointer-events-none absolute inset-0 z-10 grid place-items-center px-6 text-center transition-all duration-500 ${
          titleVisible
            ? "translate-y-0 opacity-100 blur-0"
            : "translate-y-2 opacity-0 blur-sm"
        }`}
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.55em] text-[#7DB7FF] drop-shadow-[0_0_18px_rgba(0,87,255,.8)] sm:text-xs">
            AUTO 9
          </p>

          <h2 className="mt-4 text-4xl font-black uppercase tracking-[-0.05em] text-white drop-shadow-[0_0_26px_rgba(0,87,255,.55)] sm:text-6xl lg:text-7xl">
            {active.title}
          </h2>

          <div className="mx-auto mt-4 h-px w-24 bg-[linear-gradient(90deg,transparent,#4D8DFF,transparent)] shadow-[0_0_18px_rgba(77,141,255,.9)]" />

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-white/65 sm:text-sm">
            {active.subtitle}
          </p>
        </div>
      </div>

      {!videoReady && !videoError && (
        <div className="pointer-events-none absolute inset-0 z-[5] grid place-items-center">
          <div className="mt-40 h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#4D8DFF]" />
        </div>
      )}

      {videoError && (
        <div className="absolute inset-x-4 bottom-24 z-20 mx-auto max-w-xl rounded-2xl border border-amber-300/20 bg-black/80 p-4 text-center text-sm text-white/75 backdrop-blur-md sm:bottom-28">
          La vidéo test n’a pas pu se charger depuis Runway. Le déclenchement du plein écran fonctionne bien ; il faudra simplement héberger les fichiers directement sur AUTO 9 pour la version stable.
        </div>
      )}

      <button
        type="button"
        onClick={closeCinematic}
        className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 rounded-full border border-white/15 bg-black/45 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 backdrop-blur-md transition hover:border-[#4D8DFF]/60 hover:bg-black/70 hover:text-white sm:bottom-6 sm:right-6 sm:px-5 sm:py-3 sm:text-xs"
      >
        Passer l’animation
      </button>
    </div>
  );
}
