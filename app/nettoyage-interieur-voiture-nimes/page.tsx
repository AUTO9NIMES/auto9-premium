import type { Metadata } from "next";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title:
    "Nettoyage intérieur voiture Nîmes | AUTO 9 - Habitacle propre et soigné",
  description:
    "AUTO 9 propose le nettoyage intérieur voiture à Nîmes : aspiration, plastiques, tableau de bord, tapis, vitres, sièges, poils d’animaux, odeurs et habitacle encrassé.",
};

const problems = [
  "Poussière",
  "Tapis sales",
  "Plastiques ternes",
  "Sièges tachés",
  "Poils d’animaux",
  "Odeurs persistantes",
];

const steps = [
  {
    title: "Aspiration complète",
    text: "Habitacle, tapis, moquettes, coffres et zones accessibles sont aspirés avec soin.",
  },
  {
    title: "Nettoyage des plastiques",
    text: "Tableau de bord, console centrale, contre-portes et détails intérieurs sont travaillés.",
  },
  {
    title: "Finitions habitacle",
    text: "Vitres intérieures, seuils, zones de contact et finitions visuelles sont reprises.",
  },
  {
    title: "Options ciblées",
    text: "Shampoing sièges, poils d’animaux ou traitement odeurs peuvent être ajoutés selon l’état.",
  },
];

const benefits = [
  "Habitacle plus sain et agréable",
  "Meilleure sensation de propreté au quotidien",
  "Idéal avant une vente ou une restitution",
  "Adapté aux véhicules familiaux et professionnels",
  "Options disponibles selon l’état réel",
  "Demande de devis simple et rapide",
];

const faq = [
  {
    question: "Combien coûte un nettoyage intérieur voiture à Nîmes ?",
    answer:
      "Le tarif dépend de la catégorie du véhicule, de son état et des options nécessaires. AUTO 9 propose une formule intérieur avec possibilité d’ajouter shampoing sièges, traitement odeurs ou poils d’animaux.",
  },
  {
    question: "Peut-on nettoyer un intérieur très sale ?",
    answer:
      "Oui. Pour un intérieur très encrassé, il est conseillé d’envoyer des photos afin d’adapter le temps prévu, les produits utilisés et le devis.",
  },
  {
    question: "Le shampoing des sièges est-il inclus ?",
    answer:
      "Le shampoing des sièges peut être proposé en option selon la prestation choisie et l’état des textiles.",
  },
  {
    question: "AUTO 9 intervient-il à domicile ?",
    answer:
      "AUTO 9 peut intervenir à domicile ou sur site à Nîmes et alentours, selon les conditions d’accès, la prestation demandée et les disponibilités.",
  },
];

export default function NettoyageInterieurVoitureNimesPage() {
  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <div className="border-b border-white/10 px-6 py-6 md:px-12">
        <a
          href="/"
          className="text-xs font-black uppercase tracking-[0.3em] text-white/50 transition hover:text-[#B8C7D1]"
        >
          ← Retour au site
        </a>
      </div>

      <section className="relative overflow-hidden px-6 py-24 md:px-12">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#B8C7D1]/5 blur-[130px]" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[#B8C7D1]/5 blur-[130px]" />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
            Nettoyage intérieur voiture Nîmes
          </p>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
                Retrouvez un habitacle propre et agréable.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/55">
                AUTO 9 propose le nettoyage intérieur voiture à Nîmes pour les
                habitacles poussiéreux, tachés, encombrés ou encrassés. Une
                prestation pensée pour retrouver une vraie sensation de propre à
                bord.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/devis?service=interieur"
                  className="w-fit rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
                >
                  Demander mon devis →
                </a>

                <a
                  href="/realisations"
                  className="w-fit rounded-full border border-white/15 px-8 py-5 text-xs font-black uppercase tracking-[0.25em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
                >
                  Voir les réalisations
                </a>
              </div>
            </div>

            <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-[#B8C7D1]/20 bg-white/[0.03]">
              <img
                src="/services/interieur-card.jpg"
                alt="Nettoyage intérieur voiture à Nîmes par AUTO 9"
                className="absolute inset-0 h-full w-full object-cover brightness-[0.78] contrast-110 saturate-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050608]/65 via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-7">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  Dès 89€
                </p>

                <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em]">
                  Aspiration, plastiques, tapis, vitres et finitions.
                </h2>

                <p className="mt-4 max-w-md leading-relaxed text-white/65">
                  Une prestation adaptée aux véhicules du quotidien, véhicules
                  familiaux, utilitaires et véhicules à préparer avant vente.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-20 rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
              Problèmes fréquents
            </p>

            <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
              Votre intérieur a besoin d’un vrai nettoyage ?
            </h2>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {problems.map((problem) => (
                <div
                  key={problem}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm font-black uppercase tracking-[0.18em] text-white/60"
                >
                  <span className="text-[#B8C7D1]">•</span> {problem}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Méthode AUTO 9
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Un intérieur repris étape par étape.
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

          <div className="mt-24 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
                Pourquoi choisir AUTO 9 ?
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                Parce que l’intérieur change tout.
              </h2>

              <p className="mt-6 leading-relaxed text-white/50">
                C’est l’endroit où vous passez du temps. Un habitacle propre
                change immédiatement la sensation à bord et valorise le véhicule
                au quotidien comme à la revente.
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
          </div>

          <div className="mt-24 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div className="rounded-[2.5rem] border border-[#B8C7D1]/20 bg-[#B8C7D1]/5 p-8 md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
                Options utiles
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                Sièges, poils, odeurs : on adapte.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Selon l’état du véhicule, AUTO 9 peut proposer des options
                ciblées comme le shampoing des sièges, le traitement des odeurs
                ou la gestion des poils d’animaux.
              </p>

              <a
                href="/devis?service=interieur"
                className="mt-8 inline-flex rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
              >
                Configurer ma prestation →
              </a>
            </div>

            <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
                Nettoyage complet
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                Besoin aussi de l’extérieur ?
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Pour une remise en valeur plus globale, la formule Duo combine
                nettoyage intérieur et extérieur pour repartir sur une voiture
                plus propre dans son ensemble.
              </p>

              <a
                href="/devis?service=duo"
                className="mt-8 inline-flex rounded-full border border-white/15 px-8 py-5 text-xs font-black uppercase tracking-[0.25em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Voir la formule Duo →
              </a>
            </div>
          </div>

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Questions fréquentes
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Avant de réserver votre nettoyage intérieur à Nîmes.
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
              Devis rapide
            </p>

            <div className="mt-6 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <h2 className="max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                  Besoin d’un nettoyage intérieur à Nîmes ?
                </h2>

                <p className="mt-6 max-w-2xl leading-relaxed text-white/55">
                  Décrivez votre véhicule, son état et les options souhaitées
                  pour obtenir une estimation adaptée.
                </p>
              </div>

              <a
                href="/devis?service=interieur"
                className="w-fit rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
              >
                Demander mon devis →
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
