"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const services = [
  {
    name: "Formule Duo",
    accentName: "Duo",
    tag: "Best seller",
    price: "169 €",
    text: "Intérieur + extérieur, avec nettoyage moteur offert.",
    href: "/devis?service=duo",
    image: "/services/duo-card.png",
    highlights: [
      { icon: "sparkles", title: "Intérieur", subtitle: "complet" },
      { icon: "car", title: "Extérieur", subtitle: "complet" },
      { icon: "engine", title: "Nettoyage moteur", subtitle: "OFFERT" },
    ],
    details: [
      "Aspiration complète de l’habitacle",
      "Nettoyage des plastiques et du tableau de bord",
      "Nettoyage des vitres intérieures",
      "Nettoyage des tapis",
      "Parfum d’ambiance",
      "Pré-lavage de la carrosserie",
      "Démoustiquage",
      "Décontamination ferreuse",
      "Lavage microfibre",
      "Nettoyage des jantes",
      "Séchage complet",
      "Brillant pneus",
      "Nettoyage moteur offert",
    ],
  },
  {
    name: "Intérieur",
    tag: "Confort",
    price: "89 €",
    text: "Un habitacle propre, sain et soigné jusque dans les détails.",
    href: "/devis?service=interieur",
    image: "/services/interieur-card.jpg",
    highlights: [
      { icon: "seat", title: "Sièges", subtitle: "& tapis" },
      { icon: "air", title: "Dépoussiérage", subtitle: "complet" },
      { icon: "shield", title: "Finitions", subtitle: "soignées" },
    ],
    details: [
      "Aspiration complète",
      "Nettoyage des plastiques",
      "Nettoyage du tableau de bord",
      "Nettoyage des vitres intérieures",
      "Nettoyage des tapis",
      "Parfum d’ambiance",
    ],
  },
  {
    name: "Extérieur",
    tag: "Brillance",
    price: "89 €",
    text: "Une carrosserie propre, brillante et des finitions soignées.",
    href: "/devis?service=exterieur",
    image: "/services/exterieur-card.jpg",
    highlights: [
      { icon: "wash", title: "Lavage", subtitle: "haute pression" },
      { icon: "sparkles", title: "Finition", subtitle: "brillante" },
      { icon: "wheel", title: "Jantes", subtitle: "nettoyées" },
    ],
    details: [
      "Pré-lavage",
      "Démoustiquage",
      "Décontamination ferreuse",
      "Lavage microfibre",
      "Nettoyage des jantes",
      "Séchage complet",
      "Brillant pneus",
    ],
  },
];

const premiumServices = [
  {
    tag: "Restauration",
    name: "Rénovation optiques",
    priceLabel: "À partir de",
    price: "69 €",
    text: "Restauration des optiques ternis, jaunis ou opaques pour retrouver transparence et éclat.",
    href: "/demande-speciale?type=phares",
    image: "/services/phares-card.jpg",
  },
  {
    tag: "Correction",
    name: "Polissage carrosserie",
    priceLabel: "Tarif",
    price: "Sur devis",
    text: "Correction des défauts visuels et restauration de la profondeur et de la brillance de la carrosserie.",
    href: "/demande-speciale?type=polissage",
    image: "/services/polissage-card.jpg",
  },
  {
    tag: "Esthétique",
    name: "Réparation de jantes",
    priceLabel: "Tarif",
    price: "Sur devis",
    text: "Remise en état esthétique des jantes selon leur état, leurs défauts et la finition recherchée.",
    href: "/demande-speciale?type=jantes",
    image: "/services/jantes-card.jpg",
  },
];

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

      <section
        id="services"
        className="relative overflow-hidden px-5 pb-16 pt-6"
      >
        <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-[#0057FF]/10 blur-[110px]" />

        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[#2f7bff]">
            Nos prestations
          </p>

          <h2 className="mt-4 max-w-[340px] text-[39px] font-black uppercase leading-[0.95] tracking-[-0.055em]">
            Choisissez votre niveau de soin.
          </h2>

          <div className="mt-8 space-y-5">
            {services.map((service) => (
              <article
                key={service.name}
                className="group overflow-hidden rounded-[26px] border border-[#5a9dff]/25 bg-[#07101b] shadow-[0_24px_55px_rgba(0,0,0,.34),0_0_0_1px_rgba(46,124,255,.04)] transition-transform duration-200 active:scale-[0.992]"
              >
                <div className="relative min-h-[285px] overflow-hidden">
                  <img
                    src={service.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />

                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,14,.10)_0%,rgba(4,8,14,.28)_30%,rgba(4,8,14,.84)_69%,#07101b_100%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,8,14,.78)_0%,rgba(4,8,14,.34)_58%,rgba(4,8,14,.18)_100%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_100%,rgba(0,103,255,.16),transparent_40%)]" />

                  <div className="relative z-10 flex min-h-[285px] flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#3381ff]/70 bg-[#0756cf]/45 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#d7e9ff] shadow-[0_0_22px_rgba(0,102,255,.20)] backdrop-blur-md">
                        <span className="text-[12px] text-[#beddff]">
                          {service.tag === "Best seller" ? "★" : service.tag === "Confort" ? "▣" : "✦"}
                        </span>
                        {service.tag}
                      </span>

                      <div className="shrink-0 rounded-[18px] border border-[#4692ff]/25 bg-[#06111e]/75 px-3.5 py-2.5 text-right shadow-[0_10px_30px_rgba(0,0,0,.22)] backdrop-blur-md">
                        <p className="text-[10px] font-medium text-white/55">
                          À partir de
                        </p>
                        <p className="mt-0.5 text-[27px] font-black tracking-[-0.045em] text-white">
                          {service.price}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-[31px] font-black leading-none tracking-[-0.05em] text-white">
                        {service.name === "Formule Duo" ? (
                          <>
                            Formule{" "}
                            <span className="bg-[linear-gradient(135deg,#ffffff_0%,#9bc9ff_70%)] bg-clip-text text-transparent">
                              Duo
                            </span>
                          </>
                        ) : (
                          service.name
                        )}
                      </h3>

                      <p className="mt-3 max-w-[285px] text-[15px] leading-6 text-white/78">
                        {service.text}
                      </p>
                    </div>
                  </div>
                </div>

                <details className="group/details border-t border-[#78adff]/20 bg-[linear-gradient(180deg,#07111d,#08121f)]">
                  <summary className="relative flex cursor-pointer list-none items-center justify-between overflow-hidden px-5 py-5 [&::-webkit-details-marker]:hidden">
                    <span className="absolute bottom-0 left-0 h-px w-1/3 bg-[linear-gradient(90deg,#0677ff,transparent)] shadow-[0_0_18px_rgba(0,119,255,.9)]" />

                    <span className="text-[13px] font-extrabold text-[#d7e9ff]">
                      Voir le détail des prestations
                    </span>

                    <span className="grid h-11 w-11 place-items-center rounded-full border border-[#54a1ff]/70 bg-[#09213b] text-[22px] text-white shadow-[0_0_18px_rgba(0,119,255,.28)] transition duration-300 group-open/details:rotate-90 group-active/details:scale-95">
                      →
                    </span>
                  </summary>

                  <div className="border-t border-white/[0.06] px-5 pb-5 pt-4">
                    <div className="space-y-2.5">
                      {service.details.map((detail) => (
                        <p
                          key={detail}
                          className="flex gap-2.5 text-[13px] leading-5 text-white/72"
                        >
                          <span className="mt-[1px] shrink-0 font-black text-[#4f9cff]">
                            ✓
                          </span>
                          <span>{detail}</span>
                        </p>
                      ))}
                    </div>

                    <Link
                      href={service.href}
                      className="mt-5 flex items-center justify-center rounded-full border border-[#3385ff]/55 bg-[#0a58c8]/18 px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] text-white transition active:scale-[0.985]"
                    >
                      Choisir cette formule →
                    </Link>
                  </div>
                </details>
              </article>
            ))}
          </div>

          <div className="mt-10">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#2f7bff]">
              Expertise & rénovation
            </p>

            <h2 className="mt-4 text-[31px] font-black uppercase leading-[0.98] tracking-[-0.045em]">
              Pour aller plus loin.
            </h2>

            <p className="mt-3 max-w-[330px] text-[13px] leading-5 text-white/50">
              Des prestations ciblées pour restaurer, corriger et valoriser les
              éléments qui méritent une attention particulière.
            </p>

            <div className="mt-6 space-y-3">
              {premiumServices.map((service) => (
                <article
                  key={service.name}
                  className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0a0e15]"
                >
                  <div className="relative min-h-[210px] overflow-hidden p-5">
                    <img
                      src={service.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-90"
                    />

                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,13,.82)_0%,rgba(5,8,13,.54)_56%,rgba(5,8,13,.12)_100%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,#0a0e15_100%)]" />

                    <div className="relative z-10 flex min-h-[170px] flex-col justify-between">
                      <div className="flex items-start justify-between gap-4">
                        <span className="inline-flex rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[9px] font-black uppercase tracking-[0.17em] text-white/80 backdrop-blur">
                          {service.tag}
                        </span>

                        <div className="shrink-0 text-right">
                          <p className="text-[9px] text-white/50">
                            {service.priceLabel}
                          </p>
                          <p className="mt-1 max-w-[92px] text-[21px] font-black leading-tight text-white">
                            {service.price}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="max-w-[250px] text-[27px] font-black leading-[1.02] tracking-[-0.045em]">
                          {service.name}
                        </h3>

                        <p className="mt-3 max-w-[290px] text-[13px] leading-5 text-white/66">
                          {service.text}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 p-4">
                    <Link
                      href={service.href}
                      className="flex items-center justify-center rounded-full border border-[#2f7bff]/45 bg-[#0057FF]/12 px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] text-white"
                    >
                      Demander cette prestation →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


function ServiceIcon({ type }: { type: string }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (type === "sparkles") {
    return (
      <svg {...common}>
        <path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z" />
        <path d="m18.5 13.5.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
        <path d="m5 13 .9 2.6L8.5 16l-2.6.9L5 19.5l-.9-2.6L1.5 16l2.6-.4L5 13Z" />
      </svg>
    );
  }

  if (type === "car") {
    return (
      <svg {...common}>
        <path d="M5 16h14l-1.4-6.1A2 2 0 0 0 15.7 8H8.3a2 2 0 0 0-1.9 1.9L5 16Z" />
        <path d="M4 16v3M20 16v3M7 19h10M7.5 13h.01M16.5 13h.01" />
      </svg>
    );
  }

  if (type === "engine") {
    return (
      <svg {...common}>
        <path d="M7 8h8l2 2h3v7h-3l-2 2H7l-2-2H3v-7h2l2-2Z" />
        <path d="M9 5v3M13 5v3M9 13h4" />
      </svg>
    );
  }

  if (type === "seat") {
    return (
      <svg {...common}>
        <path d="M8 4v8a3 3 0 0 0 3 3h5v5" />
        <path d="M8 7h5v5H8M5 20h12" />
      </svg>
    );
  }

  if (type === "air") {
    return (
      <svg {...common}>
        <path d="M4 8h9a2 2 0 1 0-2-2M3 12h14a2 2 0 1 1-2 2M4 16h7" />
      </svg>
    );
  }

  if (type === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 5 6v5c0 4.6 2.9 8 7 10 4.1-2 7-5.4 7-10V6l-7-3Z" />
        <path d="m9.5 12 1.7 1.7 3.5-3.7" />
      </svg>
    );
  }

  if (type === "wash") {
    return (
      <svg {...common}>
        <path d="M7 5h10M8 8h8M5 12c1.2 0 2 .8 2 2s-.8 2-2 2-2-.8-2-2 .8-2 2-2Zm14 0c1.2 0 2 .8 2 2s-.8 2-2 2-2-.8-2-2 .8-2 2-2Z" />
        <path d="M9 14h6M8 19h8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 5v5M18 9l-4 2M18 15l-4-2M12 19v-5M6 15l4-2M6 9l4 2" />
    </svg>
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
