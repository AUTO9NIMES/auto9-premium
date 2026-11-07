import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Choisissez",
    text: "Sélectionnez votre véhicule, votre formule et les options qui correspondent à vos besoins.",
  },
  {
    number: "02",
    title: "Réservez",
    text: "Indiquez votre créneau souhaité et transmettez votre demande en quelques instants.",
  },
  {
    number: "03",
    title: "On intervient",
    text: "AUTO 9 confirme le créneau et réalise la préparation directement sur le lieu convenu.",
  },
];

const trustItems = [
  {
    title: "Mobile à Nîmes",
    text: "Intervention à Nîmes et jusqu’à 30 km autour, selon disponibilité.",
  },
  {
    title: "Tarif clair",
    text: "Une estimation est affichée avant l’envoi de votre demande de réservation.",
  },
  {
    title: "Créneau confirmé",
    text: "Votre demande est vérifiée puis confirmée par AUTO 9 selon le planning.",
  },
  {
    title: "Finition soignée",
    text: "Chaque véhicule est préparé avec une attention portée aux détails et aux finitions.",
  },
];

export function HomeConfidence() {
  return (
    <section className="relative overflow-hidden bg-[#071710] px-5 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
      <div className="pointer-events-none absolute left-1/2 top-20 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-[#20b53e]/[0.08] blur-[170px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-4xl">
          <p className="text-[11px] font-black uppercase tracking-[0.45em] text-[#9fdbab] sm:text-xs">
            Simple du début à la fin
          </p>
          <h2 data-motion-reveal className="mt-5 text-[42px] font-black uppercase leading-[0.96] tracking-[-0.055em] sm:text-[58px] lg:text-[72px]">
            Trois étapes.
            <br />
            <span className="bg-[linear-gradient(135deg,#f3f7fb_0%,#b7d3ee_48%,#6fa9e8_100%)] bg-clip-text text-transparent">
              Zéro prise de tête.
            </span>
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="relative overflow-hidden rounded-[28px] border border-[#71d585]/20 bg-[linear-gradient(145deg,rgba(22,73,45,.96),rgba(19,63,33,.98))] p-7 shadow-[0_22px_60px_rgba(0,0,0,.3)]"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#24cb45]/10 blur-[70px]" />
              <p className="relative text-xs font-black tracking-[0.3em] text-[#90d89e]">{step.number}</p>
              <h3 className="relative mt-8 text-2xl font-black uppercase tracking-[-0.04em]">{step.title}</h3>
              <p className="relative mt-4 text-sm leading-7 text-white/52">{step.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-16 overflow-hidden rounded-[30px] border border-[#71d585]/22 bg-[radial-gradient(circle_at_90%_0%,rgba(31,138,127,.12),transparent_36%),linear-gradient(145deg,#101d12,#080b10)] p-7 shadow-[0_26px_80px_rgba(0,0,0,.35)] sm:p-9 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.42em] text-[#9fdbab] sm:text-xs">
                Réassurance AUTO 9
              </p>
              <h3 className="mt-5 text-3xl font-black uppercase leading-[1.02] tracking-[-0.05em] sm:text-4xl">
                Tout est pensé pour que ce soit simple, clair et propre.
              </h3>
              <Link
                href="/devis"
                className="mt-7 inline-flex items-center gap-4 rounded-full border border-[#92d8a0]/45 bg-[linear-gradient(135deg,#21ae3d,#2bda4e)] px-6 py-4 text-[11px] font-black uppercase tracking-[0.22em] shadow-[0_0_30px_rgba(30,139,131,.2)] transition hover:brightness-110"
              >
                Configurer ma prestation <span className="text-lg">→</span>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {trustItems.map((item) => (
                <div key={item.title} className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-[#84d895]/35 bg-[#24cb45]/10 text-[12px] font-black text-[#afdcb8]">✓</span>
                    <p className="text-sm font-black uppercase tracking-[-0.02em] text-white/88">{item.title}</p>
                  </div>
                  <p className="mt-3 text-[13px] leading-6 text-white/45">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
