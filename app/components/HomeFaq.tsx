/*
 * FAQ de l'accueil : réponses reprises à l'identique des pages de prestations (déjà publiées).
 * Accordéon natif <details> (accessible, sans JavaScript), ouverture animée là où le navigateur le permet.
 */
const faq = [
  {
    question: "AUTO 9 fait-il le nettoyage voiture à domicile à Nîmes ?",
    answer:
      "Oui, AUTO 9 propose le nettoyage voiture à domicile à Nîmes et alentours selon la prestation demandée, les disponibilités et les conditions d’intervention.",
  },
  {
    question: "AUTO 9 se déplace autour de Nîmes ?",
    answer: "Oui, AUTO 9 intervient à Nîmes et dans plusieurs communes autour selon les disponibilités et la prestation demandée.",
  },
  {
    question: "Faut-il prévoir une prise d’eau ou d’électricité ?",
    answer:
      "Les besoins peuvent varier selon la prestation. Les informations pratiques sont confirmées avant le rendez-vous afin d’organiser l’intervention dans les meilleures conditions.",
  },
  {
    question: "Combien coûte un nettoyage voiture à Nîmes ?",
    answer:
      "Le tarif dépend de la catégorie du véhicule, de son état, du niveau d’encrassement et de la prestation choisie. AUTO 9 propose des formules intérieur, extérieur, duo et des prestations sur devis.",
  },
  {
    question: "Peut-on demander un nettoyage pour un véhicule très sale ?",
    answer:
      "Oui. Pour les véhicules très encrassés, il est conseillé d’envoyer des photos afin d’adapter le devis, le temps prévu et le niveau de prestation.",
  },
  {
    question: "AUTO 9 travaille aussi avec les professionnels ?",
    answer:
      "Oui. Les prestations premium peuvent être adaptées aux garages, marchands VO, concessions ou professionnels qui souhaitent valoriser leurs véhicules.",
  },
];

export function HomeFaq() {
  return (
    <section id="faq" className="relative scroll-mt-24 px-5 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[11px] font-black uppercase tracking-[0.45em] text-accent sm:text-xs">Questions fréquentes</p>
          <h2 data-motion-reveal className="mt-5 text-[40px] font-black uppercase leading-[0.96] tracking-[-0.055em] sm:text-[54px] lg:text-[64px]">
            Tout ce qu’il faut{" "}
            <span className="bg-accent-word bg-clip-text text-transparent">savoir.</span>
          </h2>
          <p className="mt-6 max-w-sm text-[15px] leading-7 text-white/50">
            Une autre question ? Le configurateur vous donne une estimation en quelques instants.
          </p>
        </div>

        <div className="grid gap-3">
          {faq.map((item) => (
            <details
              key={item.question}
              className="faq-item group rounded-[1.4rem] border border-white/10 bg-[rgba(10,11,11,.62)] px-6 backdrop-blur-xl transition-colors duration-300 open:border-accent/45 hover:border-white/20"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-[15px] font-bold text-white/90 marker:hidden sm:text-base [&::-webkit-details-marker]:hidden">
                {item.question}
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-lg text-white/70 transition duration-300 group-open:rotate-45 group-open:border-accent group-open:bg-accent/15 group-open:text-accent-soft"
                >
                  +
                </span>
              </summary>
              <p className="pb-6 pr-12 text-[15px] leading-7 text-white/55">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
