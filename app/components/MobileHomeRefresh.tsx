"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function MobileHomeRefresh() {
  return (
    <div className="md:hidden bg-[#050608] text-white">
      <section className="relative min-h-[760px] overflow-hidden px-5 pb-9 pt-8">
        <div
          className="absolute inset-0 bg-cover bg-[58%_center]"
          style={{
            backgroundImage: "url('/realisations/audi-rs7-face.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,4,6,.94)_0%,rgba(3,4,6,.80)_28%,rgba(3,4,6,.44)_58%,rgba(3,4,6,.10)_100%)]" />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,8,.16)_0%,rgba(5,6,8,.08)_38%,rgba(5,6,8,.46)_74%,#050608_100%)]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_30%,rgba(0,87,255,.10),transparent_42%)]" />

        <div className="relative z-10">
          <p className="pt-20 text-[11px] font-black uppercase tracking-[0.38em] text-[#9fc7ff]">
            Detailing premium à domicile · Nîmes
          </p>

          <h1 className="mt-5 max-w-[340px] text-[48px] font-black uppercase leading-[0.88] tracking-[-0.065em]">
            Retrouvez
            <br />
            la joie du
            <br />
            <span className="text-[#a8c9ef]">neuf.</span>
          </h1>

          <p className="mt-6 max-w-[325px] text-[18px] leading-7 text-white/80">
            Un véhicule propre, sain et soigné, à domicile ou sur votre lieu de
            travail.
          </p>

          <div className="mt-7 grid grid-cols-4 gap-2">
            <MiniFeature icon={<HomeIcon />} label="À domicile" />
            <MiniFeature icon={<WorkIcon />} label="Au travail" />
            <MiniFeature icon={<GarageIcon />} label="Professionnels" />
            <MiniFeature icon={<PinIcon />} label={"30 km\nNîmes"} />
          </div>

          <div className="mt-7 space-y-3">
            <Link
              href="/devis"
              className="flex w-full items-center justify-center gap-4 rounded-full bg-[linear-gradient(135deg,#f2f6f9,#b9d6f6)] px-5 py-5 text-[12px] font-black uppercase tracking-[0.19em] text-[#050608] shadow-[0_18px_50px_rgba(112,171,238,.18)]"
            >
              Configurer ma prestation
              <span className="text-lg">→</span>
            </Link>

            <Link
              href="/professionnels"
              className="flex w-full items-center justify-between rounded-[18px] border border-[#4f8dff]/30 bg-black/45 px-5 py-4 backdrop-blur-md"
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#6ea4ff]">
                  Espace pro
                </p>

                <p className="mt-1 text-[14px] font-bold text-white">
                  Réserver une préparation véhicule
                </p>
              </div>

              <span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-lg text-white">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}


function MiniFeature({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/45 text-[#acd0ff] backdrop-blur">
        {icon}
      </span>
      <span className="mt-2 whitespace-pre-line text-[10px] font-semibold leading-4 text-white/76">
        {label}
      </span>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function WorkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16v13H4V7Zm5 0V4h6v3M4 12h16" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function GarageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 9 12 4l9 5v11H3V9Zm4 3h10v8H7v-8Zm0 3h10" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
