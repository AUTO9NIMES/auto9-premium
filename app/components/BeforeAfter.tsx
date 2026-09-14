export function BeforeAfter() {
  return (
    <section className="relative overflow-hidden bg-[#050608] px-5 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
      <div className="pointer-events-none absolute -left-32 top-24 h-[420px] w-[420px] rounded-full bg-[#0c66d8]/10 blur-[150px]" />
      <div className="pointer-events-none absolute -right-32 bottom-8 h-[420px] w-[420px] rounded-full bg-[#4d9bf0]/[0.07] blur-[150px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.45em] text-[#83b9f7] sm:text-xs">
              Avant / Après
            </p>
            <h2 data-motion-reveal className="mt-5 text-[42px] font-black uppercase leading-[0.96] tracking-[-0.055em] sm:text-[58px] lg:text-[68px]">
              Le résultat
              <br />
              <span className="bg-[linear-gradient(135deg,#f2f7fb,#b6d5f2_52%,#6da9ec)] bg-clip-text text-transparent">
                parle de lui-même.
              </span>
            </h2>
          </div>

          <p className="max-w-xl text-[15px] leading-7 text-white/48 lg:justify-self-end lg:text-right">
            Deux images, aucun discours inutile : le soin apporté aux détails se voit directement sur le résultat final.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <figure className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0e14] p-3 shadow-[0_24px_70px_rgba(0,0,0,.3)]">
            <div className="absolute left-6 top-6 z-10 rounded-full border border-white/12 bg-black/55 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/65 backdrop-blur-md">
              Avant
            </div>
            <img
              src="/before-1.jpg"
              alt="Véhicule avant préparation AUTO 9"
              loading="lazy"
              className="aspect-[4/3] w-full rounded-[20px] object-cover transition duration-700 group-hover:scale-[1.015]"
            />
          </figure>

          <figure className="group relative overflow-hidden rounded-[28px] border border-[#65a7ef]/30 bg-[linear-gradient(145deg,#0b1624,#080b10)] p-3 shadow-[0_0_55px_rgba(31,118,222,.12),0_24px_70px_rgba(0,0,0,.34)]">
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#2179df]/14 blur-[65px]" />
            <div className="absolute left-6 top-6 z-10 rounded-full border border-[#78b4f2]/30 bg-[#09203b]/70 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#b7d8fb] backdrop-blur-md">
              Après
            </div>
            <img
              src="/after-1.jpg"
              alt="Véhicule après préparation AUTO 9"
              loading="lazy"
              className="aspect-[4/3] w-full rounded-[20px] object-cover transition duration-700 group-hover:scale-[1.015]"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
