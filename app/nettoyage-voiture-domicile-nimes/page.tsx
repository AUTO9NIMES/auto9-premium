import type { Metadata } from "next";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title:
    "Nettoyage voiture à domicile Nîmes | AUTO 9 - Lavage auto premium",
  description:
    "AUTO 9 propose le nettoyage voiture à domicile à Nîmes et alentours : intérieur, extérieur, Formule Duo, rénovation de phares, polissage et prestations premium.",
};

const services = [
  {
    title: "Nettoyage intérieur à domicile",
    text: "Aspiration, plastiques, tableau de bord, tapis, vitres intérieures et finitions habitacle directement sur place.",
    href: "/nettoyage-interieur-voiture-nimes",
  },
  {
    title: "Nettoyage extérieur à domicile",
    text: "Pré-lavage, lavage carrosserie, jantes, pneus, vitres extérieures, séchage microfibre et finition brillante.",
    href: "/nettoyage-exterieur-voiture-nimes",
  },
  {
    title: "Formule Duo à domicile",
    text: "La prestation complète intérieur + extérieur pour retrouver une voiture propre dedans comme dehors.",
    href: "/formule-duo-nettoyage-voiture-nimes",
  },
  {
    title: "Prestations premium",
    text: "Rénovation de phares, polissage voiture, réparation de jantes et demandes spécifiques sur devis.",
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

const benefits = [
  "Gain de temps sans déplacement en centre de lavage",
  "Intervention possible à domicile ou sur site selon les conditions",
  "Prestations adaptées à l’état réel du véhicule",
  "Idéal pour les particuliers et professionnels",
  "Demande de devis simple avec photos si besoin",
  "Rendu premium, propre et valorisant",
];

const steps = [
  {
    title: "Demande de devis",
    text: "Vous choisissez la prestation souhaitée et pouvez envoyer quelques photos du véhicule si nécessaire.",
  },
  {
    title: "Organisation du rendez-vous",
    text: "AUTO 9 confirme les conditions d’intervention, le lieu, la prestation et les besoins pratiques.",
  },
  {
    title: "Intervention sur place",
    text: "Le nettoyage est réalisé à domicile ou sur site avec une approche soignée et organisée.",
  },
  {
    title: "Finition AUTO 9",
    text: "Le véhicule est contrôlé visuellement pour livrer un rendu propre, net et agréable à retrouver.",
  },
];

const faq = [
  {
    question: "AUTO 9 fait-il le nettoyage voiture à domicile à Nîmes ?",
    answer:
      "Oui, AUTO 9 propose le nettoyage voiture à domicile à Nîmes et alentours selon la prestation demandée, les disponibilités et les conditions d’intervention.",
  },
  {
    question: "Faut-il prévoir de l’eau ou de l’électricité ?",
    answer:
      "Les besoins peuvent varier selon la prestation. Les informations pratiques sont confirmées avant le rendez-vous pour organiser l’intervention correctement.",
  },
  {
    question: "Combien coûte un nettoyage voiture à domicile à Nîmes ?",
    answer:
      "Le tarif dépend du type de véhicule, de son état, du niveau d’encrassement et de la prestation choisie : intérieur, extérieur, Formule Duo ou prestation premium.",
  },
  {
    question: "Peut-on faire nettoyer une voiture très sale à domicile ?",
    answer:
      "Oui, mais pour un véhicule très sale, il est préférable d’envoyer des photos afin d’adapter le devis, le temps prévu et le niveau de prestation.",
  },
];

export default function NettoyageVoitureDomicileNimesPage() {
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
            Nettoyage voiture à domicile Nîmes
          </p>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
                Votre voiture nettoyée sans vous déplacer.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/55">
                AUTO 9 propose le nettoyage voiture à domicile à Nîmes et
                alentours. Intérieur, extérieur, Formule Duo ou prestation
                premium : l’objectif est simple, vous faire gagner du temps tout
                en retrouvant un véhicule propre, soigné et valorisé.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/devis"
                  className="w-fit rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
                >
                  Demander mon devis →
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
                src="/seo/nettoyage-voiture-nimes-maserati.jpg"
                alt="Nettoyage voiture à domicile à Nîmes par AUTO 9"
                className="absolute inset-0 h-full w-full object-cover brightness-[0.78] contrast-110 saturate-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050608]/65 via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-7">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  AUTO 9 mobile
                </p>

                <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em]">
                  Une prestation premium, directement sur place.
                </h2>

                <p className="mt-4 max-w-md leading-relaxed text-white/65">
                  Une solution pratique pour les véhicules du quotidien, les
                  voitures de passion, les garages et les professionnels.
                </p>
              </div>
            </div>
          </div>

          <div id="prestations" className="mt-20 scroll-mt-24 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <a
                key={service.title}
                href={service.href}
                className="group flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 transition hover:-translate-y-2 hover:border-[#B8C7D1]/20"
              >
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#B8C7D1]">
                  À domicile
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
          </div>          <div className="mt-24 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
                Pourquoi choisir le domicile ?
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                Plus pratique, plus simple, plus efficace.
              </h2>

              <p className="mt-6 leading-relaxed text-white/50">
                Le nettoyage voiture à domicile permet d’éviter les déplacements
                inutiles, les files d’attente en centre de lavage et les pertes
                de temps. AUTO 9 organise l’intervention pour que le véhicule
                soit nettoyé directement sur place.
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

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Déroulé
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Une intervention simple à organiser.
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

          <div className="mt-24 rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
              Zone d’intervention
            </p>

            <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
              Nîmes et alentours.
            </h2>

            <p className="mt-5 max-w-3xl leading-relaxed text-white/50">
              AUTO 9 intervient principalement à Nîmes et dans les communes
              voisines selon la prestation demandée, les disponibilités et les
              conditions d’accès.
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
                Un service pratique pour votre quotidien.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Véhicule familial, voiture du quotidien, habitacle sale, jantes
                encrassées ou carrosserie terne : AUTO 9 vous aide à retrouver
                une voiture plus propre sans vous déplacer.
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
                Intervention possible sur site professionnel.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                AUTO 9 accompagne aussi les professionnels de l’automobile pour
                la préparation esthétique de véhicules, la livraison client ou
                la présentation de parc.
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
              Avant de réserver votre nettoyage à domicile à Nîmes.
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
                  Besoin d’un nettoyage voiture à domicile à Nîmes ?
                </h2>

                <p className="mt-6 max-w-2xl leading-relaxed text-white/55">
                  Décrivez votre véhicule, votre adresse d’intervention et la
                  prestation souhaitée pour obtenir une estimation adaptée.
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
