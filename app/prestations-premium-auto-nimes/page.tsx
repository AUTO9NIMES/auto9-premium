import type { Metadata } from "next";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title:
    "Prestations premium auto Nîmes | AUTO 9 - Phares, polissage, jantes",
  description:
    "AUTO 9 propose des prestations premium auto à Nîmes : rénovation de phares, polissage voiture, réparation esthétique de jantes et préparation esthétique automobile.",
};

const premiumServices = [
  {
    title: "Rénovation de phares",
    text: "Optiques ternis, jaunis ou opaques : rénovation progressive, polissage et protection pour retrouver de la clarté.",
    href: "/renovation-phares-nimes",
    image: "/phares/porsche-phares.jpg",
  },
  {
    title: "Polissage voiture",
    text: "Correction esthétique de la carrosserie pour réduire les micro-rayures, raviver la brillance et améliorer le rendu visuel.",
    href: "/polissage-voiture-nimes",
    image: "/services/polissage-card.jpg",
  },
  {
    title: "Réparation de jantes",
    text: "Correction esthétique des jantes frottées, rayées ou marquées pour améliorer la présentation globale du véhicule.",
    href: "/reparation-jantes-nimes",
    image: "/services/jantes-card.jpg",
  },
];

const reasons = [
  "Idéal avant une vente ou une livraison client",
  "Valorise fortement la présentation du véhicule",
  "Prestations adaptées à l’état réel",
  "Approche premium et soignée",
  "Possible pour particuliers et professionnels",
  "Devis personnalisé selon les photos et le besoin",
];

const steps = [
  {
    title: "Analyse",
    text: "Vous envoyez les informations ou photos du véhicule pour évaluer l’état général et la prestation adaptée.",
  },
  {
    title: "Conseil",
    text: "AUTO 9 vous oriente vers la solution la plus cohérente : phares, polissage, jantes ou combinaison premium.",
  },
  {
    title: "Prestation",
    text: "L’intervention est réalisée avec une approche propre, organisée et adaptée au niveau de finition attendu.",
  },
  {
    title: "Finition",
    text: "Le véhicule est contrôlé visuellement afin d’obtenir un rendu plus net, plus propre et plus valorisant.",
  },
];

const faq = [
  {
    question: "Quelles sont les prestations premium proposées par AUTO 9 ?",
    answer:
      "AUTO 9 propose notamment la rénovation de phares, le polissage voiture, la réparation esthétique de jantes et les demandes spécifiques sur devis.",
  },
  {
    question: "Faut-il envoyer des photos pour un devis premium ?",
    answer:
      "Oui, c’est recommandé. Les photos permettent d’évaluer l’état du véhicule, les défauts visibles et le niveau de prestation adapté.",
  },
  {
    question: "Ces prestations sont-elles utiles avant une vente ?",
    answer:
      "Oui. Des phares rénovés, une carrosserie plus brillante et des jantes plus propres améliorent fortement la perception du véhicule avant une mise en vente.",
  },
  {
    question: "AUTO 9 travaille aussi avec les professionnels ?",
    answer:
      "Oui. Les prestations premium peuvent être adaptées aux garages, marchands VO, concessions ou professionnels qui souhaitent valoriser leurs véhicules.",
  },
];

export default function PrestationsPremiumAutoNimesPage() {
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
            Prestations premium auto Nîmes
          </p>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
                Les finitions qui changent tout.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/55">
                AUTO 9 propose des prestations premium à Nîmes pour améliorer
                l’aspect général d’un véhicule : rénovation de phares, polissage
                voiture, réparation esthétique de jantes et demandes spécifiques
                sur devis.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/devis-premium"
                  className="w-fit rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
                >
                  Demander un devis premium →
                </a>

                <a
                  href="#prestations"
                  className="w-fit rounded-full border border-white/15 px-8 py-5 text-xs font-black uppercase tracking-[0.25em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
                >
                  Voir les prestations
                </a>
              </div>
            </div>

            <div className="relative min-h-[560px] overflow-hidden rounded-[2rem] border border-[#B8C7D1]/20 bg-white/[0.03]">
              <img
                src="/phares/porsche-phares.jpg"
                alt="Prestations premium AUTO 9 à Nîmes"
                className="absolute inset-0 h-full w-full object-cover brightness-[0.78] contrast-110 saturate-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050608]/65 via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-7">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  AUTO 9 premium
                </p>

                <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em]">
                  Une voiture plus nette, plus brillante, plus valorisée.
                </h2>

                <p className="mt-4 max-w-md leading-relaxed text-white/65">
                  Des prestations ciblées pour améliorer les détails qui
                  comptent : phares, carrosserie, jantes et rendu général.
                </p>
              </div>
            </div>
          </div>

          <div
            id="prestations"
            className="mt-20 scroll-mt-24 grid gap-6 md:grid-cols-3"
          >
            {premiumServices.map((service) => (
              <a
                key={service.title}
                href={service.href}
                className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] transition hover:-translate-y-2 hover:border-[#B8C7D1]/20"
              >
                <div className="relative h-72 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="h-full w-full object-cover brightness-[0.78] contrast-110 saturate-110 transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/20 to-transparent" />
                </div>

                <div className="p-7">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#B8C7D1]">
                    Premium
                  </p>

                  <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.05em]">
                    {service.title}
                  </h2>

                  <p className="mt-5 leading-relaxed text-white/50">
                    {service.text}
                  </p>

                  <span className="mt-7 inline-flex text-xs font-black uppercase tracking-[0.25em] text-white/35 transition group-hover:text-[#B8C7D1]">
                    Découvrir →
                  </span>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-24 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
                Pourquoi le premium ?
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                Parce que les détails vendent la voiture.
              </h2>

              <p className="mt-6 leading-relaxed text-white/50">
                Des phares ternes, des jantes frottées ou une carrosserie
                fatiguée donnent vite une impression de véhicule négligé. Les
                prestations premium permettent de corriger ces détails visibles
                et de renforcer la valeur perçue.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {reasons.map((reason) => (
                <div
                  key={reason}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6"
                >
                  <p className="text-sm font-bold leading-relaxed text-white/65">
                    <span className="text-[#B8C7D1]">✓</span> {reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Déroulé
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Une approche adaptée à chaque véhicule.
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
                Donnez une seconde impression à votre voiture.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Avant une vente, un événement ou simplement pour le plaisir de
                retrouver une voiture plus propre, les prestations premium AUTO
                9 permettent d’améliorer les détails visibles.
              </p>

              <a
                href="/devis-premium"
                className="mt-8 inline-flex rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
              >
                Devis premium →
              </a>
            </div>

            <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
                Professionnels
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                Valorisez vos véhicules avant publication ou livraison.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Pour les garages, marchands VO et concessions, une finition
                premium peut améliorer la présentation d’un véhicule avant
                shooting, annonce ou remise client.
              </p>

              <a
                href="/professionnels"
                className="mt-8 inline-flex rounded-full border border-white/15 px-8 py-5 text-xs font-black uppercase tracking-[0.25em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Offre professionnels →
              </a>
            </div>
          </div>

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Questions fréquentes
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Avant de réserver une prestation premium à Nîmes.
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
              Devis personnalisé
            </p>

            <div className="mt-6 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <h2 className="max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                  Besoin d’une finition premium ?
                </h2>

                <p className="mt-6 max-w-2xl leading-relaxed text-white/55">
                  Envoyez votre demande, ajoutez quelques photos si nécessaire
                  et obtenez une estimation adaptée à l’état réel du véhicule.
                </p>
              </div>

              <a
                href="/devis-premium"
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