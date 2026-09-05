import Link from "next/link";

const services = [
  {
    name: "Formule Duo",
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

export function Services() {
  return (
    <section id="services" className="relative overflow-hidden bg-[#050608] px-6 py-24 text-white lg:px-8 lg:py-32">
      <div className="pointer-events-none absolute left-1/2 top-24 h-[430px] w-[780px] -translate-x-1/2 rounded-full bg-[#0967ff]/[0.07] blur-[150px]" />

      <div className="relative mx-auto max-w-[1450px]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.46em] text-[#4a94ff]">
            Nos prestations
          </p>

          <h2 className="mt-5 text-[46px] font-black uppercase leading-[0.95] tracking-[-0.055em] lg:text-[64px]">
            Choisissez votre{" "}
            <span className="bg-[linear-gradient(135deg,#ffffff,#87baff)] bg-clip-text text-transparent">
              niveau de soin.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-7 text-white/55">
            Trois formules claires, pensées pour rendre à votre véhicule un aspect propre,
            soigné et valorisant.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.name}
              className="group overflow-hidden rounded-[30px] border border-[#4c91ff]/20 bg-[#07101b] shadow-[0_30px_80px_rgba(0,0,0,.34)] transition duration-500 hover:-translate-y-1.5 hover:border-[#5ca0ff]/45 hover:shadow-[0_34px_90px_rgba(0,78,180,.16)]"
            >
              <div className="relative min-h-[470px] overflow-hidden">
                <img
                  src={service.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                />

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,14,.08)_0%,rgba(4,8,14,.22)_31%,rgba(4,8,14,.78)_69%,#07101b_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,8,14,.74)_0%,rgba(4,8,14,.28)_58%,rgba(4,8,14,.10)_100%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_100%,rgba(0,103,255,.18),transparent_42%)] opacity-70 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative z-10 flex min-h-[470px] flex-col p-7">
                  <div className="flex items-start justify-between gap-5">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#3381ff]/70 bg-[#0756cf]/45 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#d7e9ff] shadow-[0_0_24px_rgba(0,102,255,.20)] backdrop-blur-md">
                      <span className="text-[13px] text-[#c4ddff]">
                        {service.tag === "Best seller" ? "★" : service.tag === "Confort" ? "▣" : "✦"}
                      </span>
                      {service.tag}
                    </span>

                    <div className="shrink-0 rounded-[20px] border border-[#4692ff]/25 bg-[#06111e]/78 px-4 py-3 text-right shadow-[0_12px_32px_rgba(0,0,0,.25)] backdrop-blur-md">
                      <p className="text-[11px] font-medium text-white/55">À partir de</p>
                      <p className="mt-1 text-[34px] font-black tracking-[-0.05em] text-white">
                        {service.price}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-[38px] font-black leading-none tracking-[-0.055em] text-white">
                      {service.name === "Formule Duo" ? (
                        <>
                          Formule{" "}
                          <span className="bg-[linear-gradient(135deg,#ffffff_0%,#91c4ff_75%)] bg-clip-text text-transparent">
                            Duo
                          </span>
                        </>
                      ) : (
                        service.name
                      )}
                    </h3>

                    <p className="mt-4 max-w-[340px] text-[16px] leading-7 text-white/78">
                      {service.text}
                    </p>
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-4 pt-10">
                    {service.highlights.map((item) => (
                      <div key={`${item.title}-${item.subtitle}`} className="flex min-w-0 items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#1976ff]/70 bg-[#06111d]/74 text-[#a9d0ff] shadow-[inset_0_0_20px_rgba(0,93,255,.08)] backdrop-blur-sm transition duration-300 group-hover:border-[#5aa0ff]/80">
                          <ServiceIcon type={item.icon} />
                        </span>

                        <span className="min-w-0 text-[12px] font-medium leading-[1.35] text-white/82">
                          <span className="block">{item.title}</span>
                          <span className={item.subtitle === "OFFERT" ? "block font-black text-[#2e8cff]" : "block"}>
                            {item.subtitle}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <details className="group/details border-t border-[#78adff]/20 bg-[linear-gradient(180deg,#07111d,#08121f)]">
                <summary className="relative flex cursor-pointer list-none items-center justify-between overflow-hidden px-7 py-6 [&::-webkit-details-marker]:hidden">
                  <span className="absolute bottom-0 left-0 h-px w-1/3 bg-[linear-gradient(90deg,#0677ff,transparent)] shadow-[0_0_18px_rgba(0,119,255,.9)] transition-all duration-500 group-open/details:w-full" />

                  <span className="text-[14px] font-extrabold text-[#d7e9ff]">
                    Voir le détail des prestations
                  </span>

                  <span className="grid h-12 w-12 place-items-center rounded-full border border-[#54a1ff]/70 bg-[#09213b] text-[23px] text-white shadow-[0_0_20px_rgba(0,119,255,.25)] transition duration-300 group-hover/details:shadow-[0_0_28px_rgba(0,119,255,.45)] group-open/details:rotate-90">
                    →
                  </span>
                </summary>

                <div className="border-t border-white/[0.06] px-7 pb-7 pt-5">
                  <div className="grid gap-x-6 gap-y-3 xl:grid-cols-2">
                    {service.details.map((detail) => (
                      <p key={detail} className="flex gap-2.5 text-[13px] leading-5 text-white/70">
                        <span className="shrink-0 font-black text-[#4f9cff]">✓</span>
                        <span>{detail}</span>
                      </p>
                    ))}
                  </div>

                  <Link
                    href={service.href}
                    className="mt-6 inline-flex items-center justify-center rounded-full border border-[#3385ff]/55 bg-[#0a58c8]/18 px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.16em] text-white transition duration-300 hover:bg-[#0b66df]/28 hover:border-[#5a9cff]/80"
                  >
                    Choisir cette formule →
                  </Link>
                </div>
              </details>
            </article>
          ))}
        </div>

        <div className="mt-24 border-t border-white/10 pt-20">
          <div className="flex items-end justify-between gap-10">
            <div className="max-w-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.42em] text-[#4a94ff]">
                Expertise & rénovation
              </p>
              <h2 className="mt-5 text-[44px] font-black uppercase leading-[0.98] tracking-[-0.05em] lg:text-[58px]">
                Pour aller plus loin.
              </h2>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-white/52">
                Des prestations ciblées pour restaurer, corriger et valoriser les éléments
                qui méritent une attention particulière.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {premiumServices.map((service) => (
              <Link
                key={service.name}
                href={service.href}
                className="group relative min-h-[330px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0e15] transition duration-500 hover:-translate-y-1 hover:border-[#5a9dff]/35"
              >
                <img
                  src={service.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,12,.10),rgba(4,7,12,.48)_45%,#070b12_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_100%,rgba(0,102,255,.14),transparent_46%)]" />

                <div className="relative z-10 flex min-h-[330px] flex-col justify-end p-7">
                  <span className="mb-auto w-fit rounded-full border border-[#397fff]/40 bg-[#064ab8]/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.19em] text-[#9ec9ff] backdrop-blur">
                    {service.tag}
                  </span>

                  <div className="flex items-end justify-between gap-6">
                    <div>
                      <h3 className="text-[27px] font-black tracking-[-0.04em]">{service.name}</h3>
                      <p className="mt-2 max-w-[330px] text-[13px] leading-5 text-white/62">{service.text}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-white/45">{service.priceLabel}</p>
                      <p className="mt-1 text-[20px] font-black">{service.price}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ServiceIcon({ type }: { type: string }) {
  const common = {
    width: 20,
    height: 20,
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
