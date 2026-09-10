export function Hero() {
  const tags = [
    "À DOMICILE",
    "AU TRAVAIL",
    "GARAGES",
    "30 KM AUTOUR DE NÎMES",
  ];

  return (
    <div className="relative z-10 flex min-h-[calc(100vh-170px)] items-center px-6 pb-16 pt-8 md:px-12 md:pb-20">
      <div className="max-w-6xl" data-motion-intro>
        <p className="text-xs font-black uppercase tracking-[0.6em] text-[#9fbdd1] md:text-sm">
          Detailing premium à domicile · Nîmes
        </p>

        <h1 className="mt-8 max-w-5xl text-6xl font-black uppercase leading-[0.88] tracking-[-0.07em] text-white md:text-8xl lg:text-[9rem]">
          Retrouvez
          <br />
          la joie du
          <br />
          <span className="bg-[linear-gradient(135deg,#d8e6ef_0%,#a9c4d8_35%,#8fb3ca_65%,#c9dbe7_100%)] bg-clip-text text-transparent">
            neuf.
          </span>
        </h1>

        <p className="mt-9 max-w-3xl text-xl leading-relaxed text-white/68 md:text-2xl">
          Nettoyage automobile premium à domicile. Intervention à Nîmes et
          jusqu’à 30 km autour.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          {tags.map((tag) => (
            <div
              key={tag}
              className="rounded-[1.6rem] border border-white/12 bg-black/35 px-7 py-5 text-[11px] font-black uppercase tracking-[0.28em] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm transition hover:border-[#9fbdd1]/45 hover:bg-white/[0.04] md:px-9"
            >
              {tag}
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center">
          <a
            href="/devis"
            className="inline-flex min-w-[290px] items-center justify-center rounded-full border border-[#d8e2ea]/35 bg-[linear-gradient(135deg,#eef3f7_0%,#c7d3dc_35%,#aebdca_65%,#dfe7ed_100%)] px-10 py-6 text-sm font-black uppercase tracking-[0.28em] text-black shadow-[0_16px_48px_rgba(140,170,195,0.18)] transition hover:scale-[1.015] hover:brightness-105"
          >
            Devis gratuit <span className="ml-4 text-xl">→</span>
          </a>

          <a
            href="#reservation"
            className="inline-flex min-w-[250px] items-center justify-center rounded-full border border-white/14 bg-black/28 px-10 py-6 text-sm font-black uppercase tracking-[0.28em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm transition hover:border-[#9fbdd1]/40 hover:bg-white/[0.035]"
          >
            Réserver <span className="ml-4 text-xl">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
