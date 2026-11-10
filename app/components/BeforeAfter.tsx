import { BeforeAfterSlider } from "./BeforeAfterSlider";

export function BeforeAfter() {
  return (
    <section className="relative overflow-hidden px-5 py-20 text-white sm:px-6 lg:px-8 lg:py-28">

      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.45em] text-accent-soft sm:text-xs">
              Avant / Après
            </p>
            <h2 data-motion-reveal className="mt-5 text-[42px] font-black uppercase leading-[0.96] tracking-[-0.055em] sm:text-[58px] lg:text-[68px]">
              Le résultat
              <br />
              <span className="bg-accent-word bg-clip-text text-transparent">
                parle de lui-même.
              </span>
            </h2>
          </div>

          <p data-motion-words className="max-w-xl text-[15px] leading-7 text-white/48 lg:justify-self-end lg:text-right">
            Deux images, aucun discours inutile : jugez vous-même le résultat que vous pouvez attendre.
          </p>
        </div>

        <div className="mt-10">
          <BeforeAfterSlider
            before={{ src: "/after-1.jpg", alt: "Véhicule avant préparation AUTO 9", label: "Avant" }}
            after={{ src: "/before-1.jpg", alt: "Véhicule après préparation AUTO 9", label: "Après" }}
          />
        </div>
      </div>
    </section>
  );
}
