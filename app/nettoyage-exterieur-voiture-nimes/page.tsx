import type { Metadata } from "next";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title:
    "Nettoyage extérieur voiture Nîmes | AUTO 9 - Lavage carrosserie premium",
  description:
    "AUTO 9 propose le nettoyage extérieur voiture à Nîmes : pré-lavage, lavage carrosserie, jantes, pneus, vitres, séchage microfibre et finition brillante.",
};

const problems = [
  "Carrosserie terne",
  "Jantes encrassées",
  "Traces d’eau",
  "Poussière",
  "Moustiques",
  "Film routier",
];

const steps = [
  {
    title: "Pré-lavage",
    text: "La carrosserie est préparée pour décoller les saletés avant le lavage manuel.",
  },
  {
    title: "Lavage carrosserie",
    text: "Le véhicule est lavé avec méthode pour retrouver une carrosserie propre et plus nette.",
  },
  {
    title: "Jantes et pneus",
    text: "Les jantes, pneus et passages visibles sont repris pour une finition plus complète.",
  },
  {
    title: "Séchage et finition",
    text: "Le séchage microfibre limite les traces et permet une finition plus propre visuellement.",
  },
];

const benefits = [
  "Carrosserie plus propre et plus valorisante",
  "Jantes et pneus mieux présentés",
  "Idéal avant une vente ou un événement",
  "Finition plus soignée qu’un lavage rapide",
  "Adapté aux véhicules du quotidien et de passion",
  "Demande de devis simple et rapide",
];

const faq = [
  {
    question: "Combien coûte un nettoyage extérieur voiture à Nîmes ?",
    answer:
      "Le tarif dépend de la catégorie du véhicule, de son état, du niveau d’encrassement et de la prestation choisie. AUTO 9 propose une formule extérieure avec possibilité d’ajouter des prestations premium sur devis.",
  },
  {
    question: "Le nettoyage extérieur comprend-il les jantes ?",
    answer:
      "Oui, la prestation extérieure comprend le nettoyage des jantes, des pneus et des zones visibles selon l’état du véhicule.",
  },
  {
    question: "Peut-on faire un nettoyage extérieur avant une vente ?",
    answer:
      "Oui. C’est même une excellente idée pour améliorer la présentation du véhicule avant une annonce, une visite client ou une livraison.",
  },
  {
    question: "AUTO 9 peut-il intervenir à domicile ?",
    answer:
      "AUTO 9 peut intervenir à domicile ou sur site à Nîmes et alentours, selon les conditions d’accès, la prestation demandée et les disponibilités.",
  },
];

export default function NettoyageExterieurVoitureNimesPage() {
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
            Nettoyage extérieur voiture Nîmes
          </p>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
                Redonnez de l’éclat à votre carrosserie.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/55">
                AUTO 9 propose le nettoyage extérieur voiture à Nîmes pour les
                véhicules exposés à la poussière, aux traces d’eau, aux jantes
                encrassées et au film routier. Une prestation pensée pour une
                voiture plus propre, plus brillante et mieux présentée.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/devis?service=exterieur"
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
                src="/services/exterieur-card.jpg"
                alt="Nettoyage extérieur voiture à Nîmes par AUTO 9"
                className="absolute inset-0 h-full w-full object-cover brightness-[0.78] contrast-110 saturate-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050608]/65 via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-7">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  Dès 89€
                </p>

                <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em]">
                  Carrosserie, jantes, pneus, vitres et finition.
                </h2>

                <p className="mt-4 max-w-md leading-relaxed text-white/65">
                  Une prestation idéale pour améliorer la présentation d’un
                  véhicule du quotidien, d’un véhicule plaisir ou d’une voiture
                  à vendre.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-20 rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
              Problèmes fréquents
            </p>

            <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
              Votre carrosserie manque de présence ?
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
              Un extérieur repris avec méthode.
            </h2>            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                Parce que l’extérieur donne la première impression.
              </h2>

              <p className="mt-6 leading-relaxed text-white/50">
                Une carrosserie propre, des jantes nettes et des pneus bien
                présentés changent immédiatement la perception du véhicule. Que
                ce soit pour le quotidien, une vente ou un événement, l’extérieur
                compte énormément.
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
                Finition complète
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                Jantes, pneus et détails visibles.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Le nettoyage extérieur ne se limite pas à la carrosserie. Les
                jantes, pneus, vitres extérieures et détails visibles participent
                directement au rendu final.
              </p>

              <a
                href="/devis?service=exterieur"
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
                Besoin aussi de l’intérieur ?
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Pour une remise en valeur complète, la formule Duo combine
                nettoyage intérieur et extérieur. C’est la solution la plus
                cohérente pour repartir sur une voiture propre dans son ensemble.
              </p>

              <a
                href="/devis?service=duo"
                className="mt-8 inline-flex rounded-full border border-white/15 px-8 py-5 text-xs font-black uppercase tracking-[0.25em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Voir la formule Duo →
              </a>
            </div>
          </div>

          <div className="mt-24 rounded-[2rem] border border-[#B8C7D1]/20 bg-[#B8C7D1]/5 p-7 md:p-9">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  Prestation premium
                </p>

                <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
                  Carrosserie terne ou besoin d’un rendu supérieur ?
                </h2>

                <p className="mt-5 max-w-3xl leading-relaxed text-white/55">
                  Pour aller plus loin qu’un nettoyage extérieur, AUTO 9 propose
                  aussi des prestations premium comme le polissage, la
                  rénovation de phares ou les demandes spécifiques sur devis.
                </p>
              </div>

              <a
                href="/devis-premium"
                className="w-fit rounded-full border border-white/15 bg-black/20 px-8 py-5 text-xs font-black uppercase tracking-[0.25em] text-white/70 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Voir les prestations premium →
              </a>
            </div>
          </div>

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Questions fréquentes
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Avant de réserver votre nettoyage extérieur à Nîmes.
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
                  Besoin d’un nettoyage extérieur à Nîmes ?
                </h2>

                <p className="mt-6 max-w-2xl leading-relaxed text-white/55">
                  Décrivez votre véhicule, son état extérieur et la prestation
                  souhaitée pour obtenir une estimation adaptée.
                </p>
              </div>

              <a
                href="/devis?service=exterieur"
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
