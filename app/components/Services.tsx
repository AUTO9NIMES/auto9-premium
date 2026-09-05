const services = [
  {
    name: "Formule Duo",
    tag: "Best seller",
    price: "Dès 169€",
    text: "L’intégralité des formules intérieur + extérieur, avec nettoyage moteur offert.",
    href: "/devis?service=duo",
    featured: true,
    image: "/services/duo-card.png",
    details: [
      "Intégralité de la formule Intérieur",
      "Intégralité de la formule Extérieur",
      "Nettoyage moteur offert",
      "Pour repartir sur un véhicule comme neuf",
    ],
  },
  {
    name: "Intérieur",
    tag: "Confort",
    price: "Dès 89€",
    text: "Habitacle propre, sain et soigné, jusque dans les détails.",
    href: "/devis?service=interieur",
    featured: false,
    image: "/services/interieur-card.jpg",
    details: [
      "Aspiration complète",
      "Nettoyage plastiques",
      "Tableau de bord",
      "Vitres intérieures",
      "Tapis",
      "Parfum ambiance",
    ],
  },
  {
    name: "Extérieur",
    tag: "Brillance",
    price: "Dès 89€",
    text: "Carrosserie, jantes et finitions pour retrouver une vraie brillance.",
    href: "/devis?service=exterieur",
    featured: false,
    image: "/services/exterieur-card.jpg",
    details: [
      "Pré-lavage",
      "Démoustiquage",
      "Lavage microfibre",
      "Jantes",
      "Séchage",
      "Brillant pneus",
    ],
  },
];

const annexServices = [
  {
    name: "Rénovation optiques",
    tag: "Restauration",
    price: "Dès 69€",
    text: "Restauration des optiques ternis, jaunis ou opaques pour retrouver transparence et éclat.",
    href: "/demande-speciale?type=phares",
    image: "/services/phares-card.jpg",
  },
  {
    name: "Rénovation jantes",
    tag: "Esthétique",
    price: "Sur devis",
    text: "Remise en état esthétique des jantes selon leur état, leurs défauts et la finition recherchée.",
    href: "/demande-speciale?type=jantes",
    image: "/services/jantes-card.jpg",
  },
  {
    name: "Polissage",
    tag: "Correction",
    price: "Sur devis",
    text: "Correction des défauts visuels et restauration de la profondeur et de la brillance de la carrosserie.",
    href: "/demande-speciale?type=polissage",
    image: "/services/polissage-card.jpg",
  },
];

const supplements = [
  "Shampoing sièges",
  "Poils animaux",
  "Destructeur d’odeurs habitacle + clim",
  "Nettoyage moteur",
  "Cire hydrophobe",
];

export function Services() {
  return (
    <section
      id="services"
      className="relative scroll-mt-24 overflow-hidden bg-[#050608] px-6 py-24 text-white md:px-12"
    >
      <div className="absolute left-1/2 top-40 h-96 w-96 -translate-x-1/2 rounded-full bg-[#0057FF]/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.55em] text-[#0057FF]">
          Nos prestations
        </p>

        <div className="mt-6 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <h2 className="max-w-4xl text-5xl font-black uppercase tracking-[-0.05em] md:text-7xl">
            Choisissez votre niveau de soin.
          </h2>

          <a
            href="/devis"
            className="w-fit rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.25em] text-white/70 transition hover:border-[#0057FF] hover:text-[#0057FF]"
          >
            Configurer ma prestation →
          </a>
        </div>

        {/* PRESTATIONS PRINCIPALES */}

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {services.map((service) => (
            <ServiceCard
              key={service.name}
              service={service}
            />
          ))}
        </div>

        {/* EXPERTISE & RÉNOVATION */}

        <div className="relative mt-16 overflow-hidden rounded-[2rem] border border-[#0057FF]/20 bg-[linear-gradient(145deg,rgba(0,87,255,.07),rgba(255,255,255,.02))] p-5 md:p-10">
          <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#0057FF]/12 blur-[100px]" />

          <div className="pointer-events-none absolute -bottom-40 left-1/4 h-72 w-72 rounded-full bg-[#0057FF]/5 blur-[100px]" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#0057FF]">
              Expertise & rénovation
            </p>

            <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <h3 className="max-w-3xl text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
                  Pour aller plus loin.
                </h3>

                <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/45">
                  Des prestations ciblées pour restaurer, corriger et valoriser
                  les éléments qui méritent une attention particulière.
                </p>
              </div>
            </div>

            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {annexServices.map((service) => (
                <AnnexServiceCard
                  key={service.name}
                  service={service}
                />
              ))}
            </div>
          </div>
        </div>

        {/* SUPPLÉMENTS */}

        <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.025] p-7 md:p-9">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#0057FF]">
                Suppléments possibles
              </p>

              <h3 className="mt-4 text-3xl font-black uppercase tracking-[-0.04em] md:text-4xl">
                Personnalisez votre prestation.
              </h3>

              <p className="mt-4 max-w-2xl text-white/45">
                Les options sont détaillées et chiffrées directement dans le
                configurateur.
              </p>
            </div>

            <a
              href="/devis"
              className="w-fit rounded-full bg-[#0057FF] px-7 py-4 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
            >
              Obtenir mon tarif →
            </a>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-5">
            {supplements.map((supplement) => (
              <a
                key={supplement}
                href="/devis"
                className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm font-black text-white/65 transition hover:border-[#0057FF]/60 hover:bg-[#0057FF]/10 hover:text-white"
              >
                <span className="text-[#0057FF]">+</span>{" "}
                {supplement}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ========================================================= */
/* CARTE PRESTATION PRINCIPALE */
/* ========================================================= */

function ServiceCard({
  service,
}: {
  service: {
    name: string;
    tag: string;
    price: string;
    text: string;
    href: string;
    featured: boolean;
    details: string[];
    image: string;
  };
}) {
  return (
    <a
      href={service.href}
      className={`group relative flex h-full min-h-[620px] flex-col overflow-hidden rounded-[2rem] border transition duration-500 hover:-translate-y-3 ${
        service.featured
          ? "border-[#0057FF]/60 bg-[linear-gradient(145deg,rgba(0,87,255,.16),rgba(255,255,255,.035))] shadow-[0_0_70px_rgba(0,87,255,.18)]"
          : "border-white/15 bg-[linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.025))] hover:border-[#0057FF]/45 hover:shadow-[0_0_55px_rgba(0,87,255,.12)]"
      }`}
    >
      <div className="relative h-[320px] overflow-hidden border-b border-white/10">
        <img
          src={service.image}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-100 brightness-[0.98] contrast-110 saturate-125 transition duration-700 group-hover:scale-105 group-hover:brightness-110"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-[#050608]/5 via-[#050608]/18 to-[#050608]/74" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050608]/35 via-[#050608]/5 to-[#050608]/20" />

        {service.featured && (
          <div className="absolute inset-0 bg-[#0057FF]/5" />
        )}

        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-70" />

        <div
          className={`absolute -right-24 -top-24 h-56 w-56 rounded-full blur-[80px] transition duration-500 group-hover:opacity-100 ${
            service.featured
              ? "bg-[#0057FF]/35 opacity-90"
              : "bg-[#0057FF]/20 opacity-0"
          }`}
        />

        {service.featured && (
          <div className="absolute right-6 top-6 rounded-full border border-[#0057FF]/40 bg-[#0057FF]/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white backdrop-blur">
            Le plus choisi
          </div>
        )}

        <div className="absolute inset-0 flex flex-col justify-between p-8">
          <div className="flex min-h-12 items-start justify-between gap-5">
            <p
              className={`text-xs font-black uppercase tracking-[0.25em] ${
                service.featured
                  ? "text-white"
                  : "text-[#0057FF]"
              }`}
            >
              {service.tag}
            </p>
          </div>

          <div>
            <h3 className="max-w-[90%] text-4xl font-black uppercase tracking-[-0.05em] drop-shadow-[0_4px_20px_rgba(0,0,0,.65)]">
              {service.name}
            </h3>

            <p className="mt-5 max-w-md text-base leading-relaxed text-white/80 drop-shadow-[0_3px_15px_rgba(0,0,0,.75)]">
              {service.text}
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col p-8">
        <div className="space-y-0 border-t border-white/10 pt-4">
          {service.details.map((detail) => (
            <p
              key={detail}
              className="border-b border-white/10 py-3 text-sm leading-relaxed text-white/60"
            >
              <span className="text-[#0057FF]">
                ✓
              </span>{" "}

              {detail.includes("offert") ? (
                <>
                  Nettoyage moteur{" "}

                  <span className="ml-2 rounded-full border border-[#0057FF]/40 bg-[#0057FF]/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#0057FF]">
                    Offert
                  </span>
                </>
              ) : (
                detail
              )}
            </p>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between pt-7">
          <span className="relative isolate overflow-hidden rounded-full border border-[#2F7BFF]/55 bg-[radial-gradient(circle_at_center,rgba(0,87,255,.28),rgba(0,87,255,.10)_58%,transparent_85%)] px-5 py-3 text-sm font-black text-white shadow-[0_0_24px_rgba(0,87,255,.34),inset_0_0_18px_rgba(0,87,255,.10)]">
            <span className="pointer-events-none absolute inset-0 -z-10 bg-[#0057FF]/20 blur-lg" />

            <span className="drop-shadow-[0_0_10px_rgba(125,183,255,.95)]">
              {service.price}
            </span>
          </span>

          <span className="text-xs font-black uppercase tracking-[0.25em] text-white/40 transition group-hover:text-[#0057FF]">
            Voir →
          </span>
        </div>
      </div>
    </a>
  );
}

/* ========================================================= */
/* CARTE EXPERTISE / RÉNOVATION */
/* ========================================================= */

function AnnexServiceCard({
  service,
}: {
  service: {
    name: string;
    tag: string;
    price: string;
    text: string;
    href: string;
    image: string;
  };
}) {
  return (
    <a
      href={service.href}
      className="group relative flex min-h-[470px] flex-col overflow-hidden rounded-[1.7rem] border border-white/10 bg-black/30 transition duration-500 hover:-translate-y-2 hover:border-[#0057FF]/60 hover:shadow-[0_0_55px_rgba(0,87,255,.15)]"
    >
      <div className="relative h-[250px] overflow-hidden border-b border-white/10">
        <img
          src={service.image}
          alt={service.name}
          className="h-full w-full object-cover brightness-[0.92] contrast-110 saturate-110 transition duration-700 group-hover:scale-110 group-hover:brightness-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#050608]/85 via-transparent to-black/15" />

        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#0057FF]/25 opacity-0 blur-[70px] transition duration-500 group-hover:opacity-100" />

        <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-white/75 backdrop-blur-md">
          {service.tag}
        </div>

        <div className="absolute bottom-5 left-5 right-5">
          <h4 className="text-2xl font-black uppercase tracking-[-0.04em] drop-shadow-[0_4px_20px_rgba(0,0,0,.9)] md:text-3xl">
            {service.name}
          </h4>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm leading-relaxed text-white/50">
          {service.text}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-6">
          <span className="relative isolate overflow-hidden rounded-full border border-[#2F7BFF]/50 bg-[radial-gradient(circle_at_center,rgba(0,87,255,.27),rgba(0,87,255,.10)_60%,transparent_90%)] px-4 py-2 text-sm font-black text-white shadow-[0_0_22px_rgba(0,87,255,.28)]">
            <span className="pointer-events-none absolute inset-0 -z-10 bg-[#0057FF]/20 blur-lg" />

            <span className="drop-shadow-[0_0_9px_rgba(125,183,255,.9)]">
              {service.price}
            </span>
          </span>

          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35 transition group-hover:text-[#0057FF]">
            Demander →
          </span>
        </div>
      </div>
    </a>
  );
}
