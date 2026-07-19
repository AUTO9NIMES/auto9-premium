const premiumServices = [
  {
    title: "Rénovation de phares",
    subtitle: "Optiques ternis ou jaunis",
    price: "Dès 60€",
    description:
      "Redonne clarté, netteté et modernité au regard du véhicule grâce à une restauration esthétique des optiques.",
    icon: <HeadlightIcon />,
  },
  {
    title: "Polissage carrosserie",
    subtitle: "Correction esthétique",
    price: "Sur devis",
    description:
      "Réduction des micro-rayures, amélioration de la brillance et profondeur du vernis pour un rendu beaucoup plus premium.",
    icon: <PolisherIcon />,
  },
  {
    title: "Réparation de jantes",
    subtitle: "Via partenaire spécialisé",
    price: "Sur devis",
    description:
      "Remise en état esthétique des jantes par un spécialiste partenaire, avec suivi AUTO 9 pour une solution clé en main.",
    icon: <WheelIcon />,
  },
];

export function PremiumServices() {
  return (
    <section className="border-t border-white/10 px-6 py-24 md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-5 text-xs font-black uppercase tracking-[0.5em] text-[#B8C7D1]">
              Prestations premium complémentaires
            </p>

            <h2 className="text-4xl font-black tracking-[-0.05em] md:text-6xl">
              Aller plus loin que le nettoyage.
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60">
              Pour les véhicules qui nécessitent plus qu’un simple entretien :
              rénovation d’optiques, polissage carrosserie ou réparation
              esthétique de jantes via partenaire spécialisé.
            </p>
          </div>

          <a
            href="/devis"
            className="inline-flex items-center justify-center rounded-full border border-[#B8C7D1]/25 bg-[#B8C7D1]/5 px-7 py-4 text-sm font-black uppercase tracking-[0.25em] text-white transition hover:border-[#B8C7D1] hover:bg-[#B8C7D1]/20"
          >
            Demander un devis →
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {premiumServices.map((service) => (
            <article
              key={service.title}
              className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8 transition duration-300 hover:border-[#B8C7D1]/25 hover:bg-[linear-gradient(180deg,rgba(184,199,209,0.10),rgba(255,255,255,0.03))]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(184,199,209,0.14),transparent_35%)] opacity-0 transition duration-300 group-hover:opacity-100" />

              <div className="relative">
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#B8C7D1]/20 bg-[#B8C7D1]/5 text-[#B8C7D1]">
                  {service.icon}
                </div>

                <p className="text-xs font-black uppercase tracking-[0.35em] text-white/40">
                  {service.subtitle}
                </p>

                <h3 className="mt-4 text-3xl font-black tracking-[-0.04em]">
                  {service.title}
                </h3>

                <p className="mt-5 text-base leading-relaxed text-white/60">
                  {service.description}
                </p>

                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
                  <span className="text-sm uppercase tracking-[0.3em] text-white/40">
                    Tarif
                  </span>

                  <span className="text-xl font-black text-[#B8C7D1]">
                    {service.price}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeadlightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12c1.5-3 4.2-5 8.5-5H18a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-5.5C8.2 17 5.5 15 4 12Z" />
      <path d="M8 9.5 6 8" />
      <path d="M8.5 12H5" />
      <path d="M8 14.5 6 16" />
    </svg>
  );
}

function PolisherIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="16" r="3.2" />
      <path d="M10.8 13.8 14 10.6c.7-.7 1.8-.7 2.5 0l1 1c.7.7.7 1.8 0 2.5l-3.2 3.2" />
      <path d="M13.8 9.2 17 6h2v2l-3.2 3.2" />
      <path d="M6 16h4" />
    </svg>
  );
}

function WheelIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 4v5.8" />
      <path d="M12 14.2V20" />
      <path d="m5.1 8 5 2.9" />
      <path d="m13.9 13.1 5 2.9" />
      <path d="m18.9 8-5 2.9" />
      <path d="m10.1 13.1-5 2.9" />
    </svg>
  );
}
