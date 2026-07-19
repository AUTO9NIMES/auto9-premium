export function Showcase() {
  return (
    <section className="relative overflow-hidden bg-[#050608] px-6 py-24 text-white md:px-12">
      <div className="absolute right-0 top-24 h-[28rem] w-[28rem] rounded-full bg-[#B8C7D1]/5 blur-[150px]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              L’expérience AUTO 9
            </p>

            <h2 className="mt-6 max-w-4xl text-5xl font-black uppercase tracking-[-0.05em] md:text-7xl">
              Le soin du détail, visible au premier regard.
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/45">
              Chaque véhicule est traité avec précision : prélavage, finitions,
              habitacle, jantes, vitres et détails visibles. L’objectif est
              simple : vous redonner la sensation d’un véhicule propre,
              valorisé et soigné.
            </p>

            <div className="mt-9 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-3xl font-black text-[#B8C7D1]">01</p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-white/45">
                  Analyse
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-3xl font-black text-[#B8C7D1]">02</p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-white/45">
                  Nettoyage
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-3xl font-black text-[#B8C7D1]">03</p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-white/45">
                  Finition
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="/devis"
                className="rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-7 py-4 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
              >
                Configurer ma prestation →
              </a>

              <a
                href="/realisations"
                className="rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.25em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Voir les réalisations
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-[#B8C7D1]/5 blur-[60px]" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025] p-3 shadow-[0_0_80px_rgba(184,199,209,.12)]">
              <div className="relative h-[360px] overflow-hidden rounded-[1.5rem] md:h-[460px] lg:h-[500px]">
                <img
                  src="/hero-audi.jpg"
                  alt="Nettoyage automobile premium AUTO 9"
                  loading="lazy"
                  className="h-full w-full object-cover opacity-90"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white backdrop-blur">
                  Préparation premium
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                    AUTO 9 Nîmes
                  </p>

                  <h3 className="mt-3 text-4xl font-black uppercase tracking-[-0.05em]">
                    Nettoyage mobile haut de gamme.
                  </h3>

                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/55">
                    Une prestation pensée pour les particuliers exigeants, les
                    passionnés et les véhicules à valoriser.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
