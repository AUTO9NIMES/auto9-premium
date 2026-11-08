import Link from "next/link";
import type { CSSProperties } from "react";

import { EclipseRing } from "./HeroEclipse";
import eclipse from "./HeroEclipse.module.css";

// Délai d'apparition de chaque bloc de l'intro (voir HeroEclipse.module.css).
const delay = (seconds: number) => ({ "--d": `${seconds}s` }) as CSSProperties;

export function Hero() {
  const tags = [
    "À DOMICILE",
    "AU TRAVAIL",
    "GARAGES",
    "30 KM AUTOUR DE NÎMES",
  ];

  return (
    <div className="relative z-10 flex min-h-[calc(100vh-140px)] items-center justify-center px-6 pb-14 md:px-12">
      {/* data-motion-intro : écarte l'intro générique du site ; l'intro du Hero est dans HeroEclipse.module.css. */}
      <div className={eclipse.introHost} data-motion-intro>
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center text-center">
        <div className="relative isolate flex flex-col items-center">
        <EclipseRing />
        <span className={eclipse.logoGlow}>
          <img
            src="/brand/auto9-logo.webp"
            alt=""
            aria-hidden="true"
            width={420}
            height={288}
            className={`${eclipse.logo} block h-auto w-[180px] xl:w-[220px]`}
            decoding="async"
            fetchPriority="high"
          />
        </span>

        <p
          className={`${eclipse.rise} ${eclipse.kicker} mt-6 text-xs font-black uppercase tracking-[0.6em] text-accent md:text-sm`}
          style={delay(1.05)}
        >
          Detailing premium à domicile · Nîmes
        </p>

        <h1 className="mt-5 text-[clamp(3.2rem,6.2vw,7.4rem)] font-black uppercase leading-[0.9] tracking-[-0.07em] text-white">
          <span className={eclipse.converge} style={delay(0.85)}>
            Retrouvez
          </span>
          <br />
          <span className={eclipse.converge} style={delay(1.05)}>
            la joie du
            {" "}
            <span className={eclipse.sheen}>neuf.</span>
          </span>
        </h1>
        </div>

        <p
          className={`${eclipse.rise} mt-7 max-w-3xl text-xl leading-relaxed text-white/70 md:text-2xl`}
          style={delay(1.55)}
        >
          Nettoyage automobile premium à domicile. Intervention à Nîmes et
          jusqu’à 30 km autour.
        </p>

        <div
          className={`${eclipse.rise} mt-8 flex flex-wrap justify-center gap-3`}
          style={delay(1.7)}
        >
          {tags.map((tag) => (
            <div
              key={tag}
              className="rounded-[1.6rem] border border-white/12 bg-black/35 px-6 py-4 text-[11px] font-black uppercase tracking-[0.28em] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm transition hover:border-accent/45 hover:bg-white/[0.04] md:px-8"
            >
              {tag}
            </div>
          ))}
        </div>

        <div
          className={`${eclipse.rise} mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center`}
          style={delay(1.85)}
        >
          <Link
            href="/devis"
            className="inline-flex min-w-[290px] items-center justify-center rounded-full border border-white/40 bg-metal px-10 py-6 text-sm font-black uppercase tracking-[0.28em] text-on-metal shadow-[0_16px_48px_rgba(var(--metal-rgb),0.18)] transition hover:scale-[1.015] hover:brightness-105"
          >
            Devis gratuit <span className="ml-4 text-xl">→</span>
          </Link>
          <a
            href="#reservation"
            className="inline-flex min-w-[250px] items-center justify-center rounded-full border border-white/14 bg-black/28 px-10 py-6 text-sm font-black uppercase tracking-[0.28em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm transition hover:border-accent/40 hover:bg-white/[0.035]"
          >
            Réserver <span className="ml-4 text-xl">→</span>
          </a>
        </div>
        </div>
      </div>
    </div>
  );
}
