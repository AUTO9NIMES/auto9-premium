import type { Metadata } from "next";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "Réparation jantes Nîmes | AUTO 9 - Rénovation esthétique jantes",
  description:
    "AUTO 9 propose la réparation esthétique de jantes à Nîmes et alentours : rayures, frottements, éclats légers et remise en valeur sur devis.",
};

const problems = [
  "Jantes frottées contre un trottoir",
  "Rayures visibles sur le bord de jante",
  "Éclats légers ou marques localisées",
  "Aspect terne ou fatigué",
  "Jantes à valoriser avant vente",
  "Préparation esthétique avant livraison client",
];

const steps = [
  {
    title: "Analyse de la jante",
    text: "Un premier diagnostic est réalisé à partir de photos pour vérifier l’état, la zone abîmée et la faisabilité.",
  },
  {
    title: "Préparation de la zone",
    text: "La partie abîmée est nettoyée, préparée et travaillée afin d’obtenir une base plus propre avant finition.",
  },
  {
    title: "Correction esthétique",
    text: "Selon le défaut, la zone est reprise pour atténuer les marques, les frottements ou les petites imperfections.",
  },
  {
    title: "Finition propre",
    text: "L’objectif est de retrouver une jante plus nette, plus présentable et plus cohérente visuellement.",
  },
];

const benefits = [
  "Idéal avant la vente d’un véhicule",
  "Améliore l’aspect général de la voiture",
  "Solution ciblée sur les défauts visibles",
  "Devis adapté selon l’état réel",
  "Possibilité pour particuliers et professionnels",
  "Complément parfait avec un nettoyage premium",
];

const faq = [
  {
    question: "AUTO 9 répare toutes les jantes ?",
    answer:
      "La faisabilité dépend de l’état de la jante, du type de dommage et de la finition. Pour une jante fissurée, voilée ou fortement abîmée, une réparation spécialisée peut être nécessaire.",
  },
  {
    question: "Peut-on faire un devis avec des photos ?",
    answer:
      "Oui, c’est même recommandé. Des photos nettes permettent d’évaluer les rayures, frottements ou éclats avant de proposer une estimation adaptée.",
  },
  {
    question: "La réparation de jantes est-elle utile avant une vente ?",
    answer:
      "Oui. Des jantes propres et moins marquées améliorent fortement la présentation globale du véhicule, notamment avant une mise en vente ou une livraison client.",
  },
  {
    question: "Peut-on combiner avec un nettoyage complet ?",
    answer:
      "Oui. La réparation esthétique de jantes peut être associée à une Formule Duo, un polissage ou une prestation premium pour un rendu plus complet.",
  },
];

export default function ReparationJantesNimesPage() {
  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <div className="border-b border-white/10 px-6 py-6 md:px-12">
        <a
          href="/prestations-premium-auto-nimes"
          className="text-xs font-black uppercase tracking-[0.3em] text-white/50 transition hover:text-[#B8C7D1]"
        >
          ← Retour aux prestations premium
        </a>
      </div>

      <section className="relative overflow-hidden px-6 py-24 md:px-12">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#B8C7D1]/5 blur-[130px]" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[#B8C7D1]/5 blur-[130px]" />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
            Réparation jantes Nîmes
          </p>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
                Redonnez de l’allure à vos jantes.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/55">
                Une jante frottée, rayée ou marquée peut vite gâcher l’aspect
                général d’un véhicule. AUTO 9 propose la réparation esthétique
                de jantes à Nîmes et alentours pour atténuer les défauts
                visibles et retrouver une présentation plus propre.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/devis-premium?presta=jantes"
                  className="w-fit rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
                >
                  Demander un devis →
                </a>

                <a
                  href="/prestations-premium-auto-nimes"
                  className="w-fit rounded-full border border-white/15 px-8 py-5 text-xs font-black uppercase tracking-[0.25em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
                >
                  Voir le premium
                </a>
              </div>
            </div>

            <div className="relative min-h-[560px] overflow-hidden rounded-[2rem] border border-[#B8C7D1]/20 bg-white/[0.03]">
              <img
                src="/services/jantes-card.jpg"
                alt="Réparation esthétique de jantes à Nîmes par AUTO 9"
                className="absolute inset-0 h-full w-full object-cover brightness-[0.78] contrast-110 saturate-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050608]/65 via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-7">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  Finition esthétique
                </p>

                <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em]">
                  Une jante propre change toute la voiture.
                </h2>

                <p className="mt-4 max-w-md leading-relaxed text-white/65">
                  Un détail visible qui peut transformer la perception du
                  véhicule, surtout avant une vente, un événement ou une
                  livraison client.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {problems.map((problem) => (
              <div
                key={problem}
                className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7"
              >
                <p className="text-sm font-bold leading-relaxed text-white/65">
                  <span className="text-[#B8C7D1]">✓</span> {problem}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-24 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
                Pourquoi réparer ?
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                Les jantes font partie des premiers détails visibles.
              </h2>

              <p className="mt-6 leading-relaxed text-white/50">
                Une carrosserie propre avec des jantes rayées ou frottées donne
                tout de suite une impression moins soignée. Une correction
                esthétique permet de retrouver un rendu plus net, plus propre et
                plus valorisant.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6"
                >
                  <p className="text-sm font-bold leading-relaxed text-white/65">
                    <span className="text-[#B8C7D1]">✓</span> {benefit}
                  </p>
                </div>
              ))}
            </div>
          </div>          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Déroulé
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Une prestation adaptée à l’état de la jante.
            </h2>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 transition hover:-translate-y-2 hover:border-[#B8C7D1]/20"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#B8C7D1]/25 bg-[#B8C7D1]/5 text-sm font-black text-[#B8C7D1]">
                    {index + 1}
                  </div>

                  <h3 className="mt-6 text-2xl font-black uppercase tracking-[-0.04em]">
                    {step.title}
                  </h3>

                  <p className="mt-5 leading-relaxed text-white/50">
                    {step.text}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-24 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div className="rounded-[2.5rem] border border-[#B8C7D1]/20 bg-[#B8C7D1]/5 p-8 md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
                Particuliers
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                Une finition idéale avant la revente.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Avant une mise en vente, les jantes comptent énormément dans la
                première impression. Des jantes moins marquées donnent un aspect
                plus propre, plus entretenu et plus rassurant.
              </p>

              <a
                href="/devis-premium?presta=jantes"
                className="mt-8 inline-flex rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
              >
                Demander un devis →
              </a>
            </div>

            <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
                Professionnels
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                Un vrai plus pour vos véhicules en stock.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Pour les garages, marchands VO ou concessions, une jante
                présentable peut aider à valoriser un véhicule avant publication,
                shooting photo ou livraison client.
              </p>

              <a
                href="/professionnels"
                className="mt-8 inline-flex rounded-full border border-white/15 px-8 py-5 text-xs font-black uppercase tracking-[0.25em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Offre professionnels →
              </a>
            </div>
          </div>

          <div className="mt-24 rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
              Prestations complémentaires
            </p>

            <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
              Complétez avec une finition premium.
            </h2>

            <p className="mt-5 max-w-3xl leading-relaxed text-white/50">
              La réparation esthétique de jantes peut être combinée avec un
              nettoyage complet, un polissage ou une rénovation de phares pour
              améliorer l’aspect général du véhicule.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/formule-duo-nettoyage-voiture-nimes"
                className="rounded-full border border-white/10 bg-black/20 px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/50 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Formule Duo
              </a>

              <a
                href="/polissage-voiture-nimes"
                className="rounded-full border border-white/10 bg-black/20 px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/50 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Polissage voiture
              </a>

              <a
                href="/renovation-phares-nimes"
                className="rounded-full border border-white/10 bg-black/20 px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/50 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Rénovation phares
              </a>

              <a
                href="/prestations-premium-auto-nimes"
                className="rounded-full border border-white/10 bg-black/20 px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/50 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Prestations premium
              </a>
            </div>
          </div>

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Questions fréquentes
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Avant de demander une réparation de jantes à Nîmes.
            </h2>

            <div className="mt-12 grid gap-5">
              {faq.map((item) => (
                <article
                  key={item.question}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 md:p-8"
                >
                  <h3 className="text-2xl font-black uppercase tracking-[-0.04em]">
                    {item.question}
                  </h3>

                  <p className="mt-4 leading-relaxed text-white/50">
                    {item.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-24 rounded-[2.5rem] border border-[#B8C7D1]/20 bg-[linear-gradient(145deg,rgba(184,199,209,.14),rgba(255,255,255,.035))] p-8 md:p-12">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
              Devis sur photos
            </p>

            <div className="mt-6 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <h2 className="max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                  Une jante frottée ou rayée ?
                </h2>

                <p className="mt-6 max-w-2xl leading-relaxed text-white/55">
                  Envoyez quelques photos nettes de la jante abîmée pour obtenir
                  un premier avis et une estimation adaptée.
                </p>
              </div>

              <a
                href="/devis-premium?presta=jantes"
                className="w-fit rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
              >
                Envoyer ma demande →
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}