import type { Metadata } from "next";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "Nettoyage voiture Nîmes | AUTO 9 - Nettoyage auto premium",
  description:
    "AUTO 9 propose le nettoyage voiture à Nîmes et alentours : nettoyage intérieur, extérieur, formule duo, rénovation de phares et préparation esthétique automobile.",
};

const services = [
  {
    title: "Nettoyage intérieur",
    text: "Aspiration complète, plastiques, tableau de bord, tapis, vitres intérieures et finitions habitacle.",
    href: "/nettoyage-interieur-voiture-nimes",
  },
  {
    title: "Nettoyage extérieur",
    text: "Pré-lavage, lavage carrosserie, jantes, pneus, séchage microfibre et finition brillante.",
    href: "/nettoyage-exterieur-voiture-nimes",
  },
  {
    title: "Formule duo",
    text: "La solution complète intérieur + extérieur pour repartir sur un véhicule propre et valorisé.",
    href: "/formule-duo-nettoyage-voiture-nimes",
  },
  {
    title: "Prestations premium",
    text: "Rénovation de phares, polissage, réparation de jantes et demandes spécifiques sur devis.",
    href: "/prestations-premium-auto-nimes",
  },
];

const zones = [
  "Nîmes",
  "Caissargues",
  "Bouillargues",
  "Marguerittes",
  "Milhaud",
  "Caveirac",
  "Rodilhan",
  "Garons",
  "Manduel",
  "Saint-Gilles",
  "Sommières",
  "Uzès",
];

const reasons = [
  "Intervention à domicile ou sur site selon les besoins",
  "Prestations adaptées à l’état réel du véhicule",
  "Nettoyage soigné avec finitions visibles",
  "Solutions pour particuliers et professionnels",
  "Demande de devis simple et rapide",
  "Approche premium, propre et organisée",
];

const faq = [
  {
    question: "Combien coûte un nettoyage voiture à Nîmes ?",
    answer:
      "Le tarif dépend de la catégorie du véhicule, de son état, du niveau d’encrassement et de la prestation choisie. AUTO 9 propose des formules intérieur, extérieur, duo et des prestations sur devis.",
  },
  {
    question: "AUTO 9 se déplace autour de Nîmes ?",
    answer:
      "Oui, AUTO 9 intervient à Nîmes et dans plusieurs communes autour selon les disponibilités et la prestation demandée.",
  },
  {
    question: "Faut-il prévoir une prise d’eau ou d’électricité ?",
    answer:
      "Les besoins peuvent varier selon la prestation. Les informations pratiques sont confirmées avant le rendez-vous afin d’organiser l’intervention dans les meilleures conditions.",
  },
  {
    question: "Peut-on demander un nettoyage pour un véhicule très sale ?",
    answer:
      "Oui. Pour les véhicules très encrassés, il est conseillé d’envoyer des photos afin d’adapter le devis, le temps prévu et le niveau de prestation.",
  },
];

export default function NettoyageVoitureNimesPage() {
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
            Nettoyage voiture Nîmes
          </p>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
                Nettoyage automobile premium à Nîmes.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/55">
                AUTO 9 accompagne les particuliers et professionnels qui veulent
                retrouver un véhicule propre, soigné et valorisé. Nettoyage
                intérieur, extérieur, formule complète, rénovation de phares et
                préparation esthétique : chaque prestation est adaptée à l’état
                réel du véhicule.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/devis"
                  className="w-fit rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
                >
                  Obtenir mon devis →
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
                src="/seo/nettoyage-voiture-nimes-maserati.jpg"
                alt="Nettoyage voiture premium à Nîmes par AUTO 9 sur Maserati"
                className="absolute inset-0 h-full w-full object-cover brightness-[0.78] contrast-110 saturate-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050608]/65 via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-7">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  AUTO 9 en action
                </p>

                <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em]">
                  Nettoyage premium sur véhicules d’exception.
                </h2>

                <p className="mt-4 max-w-md leading-relaxed text-white/65">
                  Une approche soignée pour les véhicules du quotidien, les
                  voitures de passion et les préparations avant événement ou
                  mise en valeur.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <a
                key={service.title}
                href={service.href}
                className="group flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 transition hover:-translate-y-2 hover:border-[#B8C7D1]/20"
              >
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#B8C7D1]">
                  AUTO 9
                </p>

                <h2 className="mt-5 text-2xl font-black uppercase tracking-[-0.04em]">
                  {service.title}
                </h2>

                <p className="mt-5 flex-1 leading-relaxed text-white/50">
                  {service.text}
                </p>

                <span className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-white/35 transition group-hover:text-[#B8C7D1]">
                  Découvrir →
                </span>
              </a>
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] border border-[#B8C7D1]/20 bg-[#B8C7D1]/5 p-7 md:p-9">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  Prestation ciblée
                </p>

                <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
                  Vos phares sont ternis ou jaunis ?
                </h2>

                <p className="mt-5 max-w-3xl leading-relaxed text-white/55">
                  AUTO 9 propose aussi la rénovation de phares à Nîmes :
                  ponçage progressif, polissage et protection anti-UV pour
                  redonner de la clarté aux optiques fatigués.
                </p>
              </div>

              <a
                href="/renovation-phares-nimes"
                className="w-fit rounded-full border border-white/15 bg-black/20 px-8 py-5 text-xs font-black uppercase tracking-[0.25em] text-white/70 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Voir la rénovation phares →
              </a>
            </div>
          </div>          <div className="mt-24 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
                Pourquoi choisir AUTO 9 ?
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                Un nettoyage auto pensé pour le résultat.
              </h2>

              <p className="mt-6 leading-relaxed text-white/50">
                Le but n’est pas simplement de laver une voiture. Le but est de
                la rendre plus propre, plus agréable, plus présentable et plus
                valorisante au quotidien comme à la revente.
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

          <div className="mt-24 rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
              Zone d’intervention
            </p>

            <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
              Nîmes et alentours.
            </h2>

            <p className="mt-5 max-w-3xl leading-relaxed text-white/50">
              AUTO 9 intervient principalement à Nîmes et dans les communes
              voisines selon les disponibilités, la prestation demandée et les
              conditions d’intervention.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {zones.map((zone) => (
                <div
                  key={zone}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm font-black uppercase tracking-[0.18em] text-white/60"
                >
                  <span className="text-[#B8C7D1]">•</span> {zone}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-24 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div className="rounded-[2.5rem] border border-[#B8C7D1]/20 bg-[#B8C7D1]/5 p-8 md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
                Particuliers
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                Votre voiture mérite mieux qu’un lavage rapide.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Habitacle sale, sièges tachés, poussière, traces, jantes
                encrassées ou carrosserie terne : AUTO 9 vous aide à retrouver
                un véhicule propre et agréable.
              </p>

              <a
                href="/devis"
                className="mt-8 inline-flex rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
              >
                Configurer ma prestation →
              </a>
            </div>

            <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
                Professionnels
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                Garages, VO, concessions : valorisez vos véhicules.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                AUTO 9 accompagne aussi les professionnels de l’automobile pour
                la préparation esthétique avant mise en vente, livraison client
                ou présentation de parc.
              </p>

              <a
                href="/professionnels"
                className="mt-8 inline-flex rounded-full border border-white/15 px-8 py-5 text-xs font-black uppercase tracking-[0.25em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                Découvrir l’offre pro →
              </a>
            </div>
          </div>

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Questions fréquentes
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Avant de réserver votre nettoyage auto à Nîmes.
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
                  Besoin d’un nettoyage voiture à Nîmes ?
                </h2>

                <p className="mt-6 max-w-2xl leading-relaxed text-white/55">
                  Décrivez votre véhicule, choisissez votre prestation et
                  obtenez une estimation adaptée à votre besoin.
                </p>
              </div>

              <a
                href="/devis"
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
