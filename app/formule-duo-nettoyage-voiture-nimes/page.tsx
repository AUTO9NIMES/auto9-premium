import type { Metadata } from "next";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title:
    "Formule Duo nettoyage voiture Nîmes | AUTO 9 - Intérieur + extérieur",
  description:
    "AUTO 9 propose la Formule Duo nettoyage voiture à Nîmes : nettoyage intérieur et extérieur complet, aspiration, plastiques, carrosserie, jantes, pneus, vitres et finitions.",
};

const included = [
  "Aspiration complète",
  "Nettoyage plastiques",
  "Tapis et moquettes",
  "Vitres intérieures",
  "Pré-lavage extérieur",
  "Lavage carrosserie",
  "Jantes et pneus",
  "Séchage microfibre",
];

const steps = [
  {
    title: "Diagnostic du véhicule",
    text: "L’état intérieur et extérieur est pris en compte pour adapter le temps, la méthode et les finitions.",
  },
  {
    title: "Nettoyage intérieur",
    text: "Aspiration, plastiques, tapis, vitres intérieures et zones de contact sont repris avec soin.",
  },
  {
    title: "Nettoyage extérieur",
    text: "Pré-lavage, lavage carrosserie, jantes, pneus, vitres extérieures et séchage microfibre.",
  },
  {
    title: "Finition AUTO 9",
    text: "Contrôle visuel final pour livrer un véhicule propre, cohérent et agréable à retrouver.",
  },
];

const benefits = [
  "La prestation la plus complète pour repartir sur une voiture propre",
  "Intérieur et extérieur traités dans le même rendez-vous",
  "Idéal avant une vente, une restitution ou un événement",
  "Meilleur rendu global qu’une prestation seule",
  "Très adapté aux véhicules familiaux et véhicules du quotidien",
  "Demande de devis simple et rapide",
];

const faq = [
  {
    question: "Que comprend la Formule Duo AUTO 9 ?",
    answer:
      "La Formule Duo combine le nettoyage intérieur et le nettoyage extérieur : aspiration, plastiques, tapis, vitres, pré-lavage, lavage carrosserie, jantes, pneus, séchage et finitions.",
  },
  {
    question: "Combien coûte une Formule Duo à Nîmes ?",
    answer:
      "Le tarif dépend de la catégorie du véhicule, de son état et des options nécessaires. AUTO 9 propose une estimation adaptée via le configurateur de devis.",
  },
  {
    question: "La Formule Duo convient-elle à une voiture très sale ?",
    answer:
      "Oui, mais pour un véhicule très encrassé, il est conseillé d’envoyer des photos afin d’adapter le devis, le temps prévu et les options éventuelles.",
  },
  {
    question: "Peut-on ajouter des options à la Formule Duo ?",
    answer:
      "Oui. Selon l’état du véhicule, il est possible d’ajouter des options comme le shampoing des sièges, la rénovation de phares ou une prestation premium sur devis.",
  },
];

export default function FormuleDuoNettoyageVoitureNimesPage() {
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
            Formule Duo nettoyage voiture Nîmes
          </p>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
                Intérieur + extérieur : la remise au propre complète.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/55">
                La Formule Duo AUTO 9 combine le nettoyage intérieur et le
                nettoyage extérieur pour retrouver un véhicule propre, agréable
                et mieux présenté. C’est la solution idéale pour repartir sur une
                voiture vraiment transformée.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/devis?service=duo"
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
                src="/services/duo-card.png"
                alt="Formule Duo nettoyage voiture intérieur et extérieur à Nîmes par AUTO 9"
                className="absolute inset-0 h-full w-full object-cover brightness-[0.78] contrast-110 saturate-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050608]/65 via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-7">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  Dès 169€
                </p>

                <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em]">
                  Une voiture propre dedans comme dehors.
                </h2>

                <p className="mt-4 max-w-md leading-relaxed text-white/65">
                  Une formule complète pour les véhicules du quotidien, les
                  véhicules familiaux, les voitures à vendre ou les préparations
                  avant événement.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-20 rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
              Inclus dans la Formule Duo
            </p>

            <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
              Une prestation complète pour un rendu global.
            </h2>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {included.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm font-black uppercase tracking-[0.18em] text-white/60"
                >
                  <span className="text-[#B8C7D1]">✓</span> {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Méthode AUTO 9
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Une remise au propre en plusieurs étapes.
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
                Pourquoi choisir la Formule Duo ?
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                Parce que le rendu complet change tout.
              </h2>

              <p className="mt-6 leading-relaxed text-white/50">
                Un intérieur propre donne envie de reprendre le volant. Un
                extérieur soigné valorise immédiatement le véhicule. Ensemble,
                les deux donnent une vraie sensation de voiture remise à neuf.
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
                Meilleur choix
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                La formule la plus cohérente pour transformer une voiture.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Quand l’intérieur et l’extérieur sont traités ensemble, le rendu
                final est beaucoup plus fort. C’est le choix idéal pour un
                véhicule familial, un véhicule à vendre ou une voiture qui n’a
                pas été nettoyée en profondeur depuis longtemps.
              </p>

              <a
                href="/devis?service=duo"
                className="mt-8 inline-flex rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
              >
                Configurer ma Formule Duo →
              </a>
            </div>

            <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
                Besoin ciblé ?
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                Intérieur seul ou extérieur seul selon votre besoin.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Si votre besoin est plus précis, AUTO 9 propose aussi des pages
                dédiées au nettoyage intérieur et au nettoyage extérieur à
                Nîmes.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/nettoyage-interieur-voiture-nimes"
                  className="w-fit rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.22em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
                >
                  Intérieur →
                </a>

                <a
                  href="/nettoyage-exterieur-voiture-nimes"
                  className="w-fit rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.22em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
                >
                  Extérieur →
                </a>
              </div>
            </div>
          </div>

          <div className="mt-24 rounded-[2rem] border border-[#B8C7D1]/20 bg-[#B8C7D1]/5 p-7 md:p-9">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  Options premium
                </p>

                <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
                  Besoin d’aller plus loin ?
                </h2>

                <p className="mt-5 max-w-3xl leading-relaxed text-white/55">
                  Selon l’état du véhicule, la Formule Duo peut être complétée
                  par des options ou prestations premium : shampoing sièges,
                  rénovation de phares, polissage ou demande spécifique sur
                  devis.
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
              Avant de réserver votre Formule Duo à Nîmes.
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
                  Besoin d’une Formule Duo à Nîmes ?
                </h2>

                <p className="mt-6 max-w-2xl leading-relaxed text-white/55">
                  Décrivez votre véhicule, son état et vos besoins pour obtenir
                  une estimation adaptée.
                </p>
              </div>

              <a
                href="/devis?service=duo"
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
