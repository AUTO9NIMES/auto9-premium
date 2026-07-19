import type { Metadata } from "next";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "Polissage voiture Nîmes | AUTO 9 - Brillance et correction carrosserie",
  description:
    "AUTO 9 propose le polissage voiture à Nîmes : correction légère, brillance, micro-rayures, voile terne, préparation avant vente et finition premium sur devis.",
};

const problems = [
  "Micro-rayures",
  "Voile terne",
  "Manque de brillance",
  "Traces de lavage",
  "Carrosserie fatiguée",
  "Préparation avant vente",
];

const steps = [
  {
    title: "Inspection",
    text: "L’état de la carrosserie est observé pour adapter le niveau de correction et éviter les promesses irréalistes.",
  },
  {
    title: "Préparation",
    text: "Le véhicule est nettoyé et préparé avant polissage pour travailler sur une surface propre.",
  },
  {
    title: "Polissage",
    text: "La carrosserie est travaillée à la machine pour améliorer la brillance et réduire les défauts visibles.",
  },
  {
    title: "Finition",
    text: "Une finition est réalisée pour révéler le rendu final et valoriser la profondeur de la peinture.",
  },
];

const benefits = [
  "Brillance nettement améliorée",
  "Carrosserie plus valorisante",
  "Réduction des micro-rayures visibles",
  "Idéal avant vente ou événement",
  "Rendu plus premium sur véhicule passion",
  "Prestation adaptée à l’état réel du véhicule",
];

const services = [
  {
    title: "Polissage one-step",
    text: "Une passe de correction et finition pour améliorer rapidement le rendu global du véhicule.",
  },
  {
    title: "Préparation avant vente",
    text: "Une solution idéale pour rendre une voiture plus attirante avant shooting, annonce ou visite client.",
  },
  {
    title: "Véhicule premium",
    text: "Une approche plus soignée pour les véhicules de passion, véhicules foncés ou carrosseries sensibles.",
  },
];

const faq = [
  {
    question: "Combien coûte un polissage voiture à Nîmes ?",
    answer:
      "Le polissage est réalisé sur devis, car le tarif dépend de la taille du véhicule, de l’état de la carrosserie, du niveau de correction attendu et du temps nécessaire.",
  },
  {
    question: "Un polissage enlève-t-il toutes les rayures ?",
    answer:
      "Non. Le polissage peut réduire fortement les micro-rayures et améliorer la brillance, mais les rayures profondes ou les défauts traversant le vernis ne disparaissent pas toujours.",
  },
  {
    question: "Faut-il laver la voiture avant un polissage ?",
    answer:
      "La carrosserie doit être propre et préparée avant le polissage. AUTO 9 adapte la préparation selon l’état du véhicule et la prestation choisie.",
  },
  {
    question: "Le polissage est-il utile avant une vente ?",
    answer:
      "Oui. Un véhicule plus brillant, mieux présenté et visuellement plus propre inspire davantage confiance lors d’une vente ou d’une présentation.",
  },
];

export default function PolissageVoitureNimesPage() {
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
            Polissage voiture Nîmes
          </p>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
                Redonnez de la profondeur à votre carrosserie.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/55">
                AUTO 9 propose le polissage voiture à Nîmes pour améliorer la
                brillance, réduire les micro-rayures visibles et valoriser la
                carrosserie. Une prestation premium idéale avant une vente, un
                événement ou pour redonner du cachet à un véhicule de passion.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/devis-premium?presta=polissage"
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

            <div className="relative min-h-[560px] overflow-hidden rounded-[2rem] border border-[#B8C7D1]/20 bg-white/[0.03]">
              <img
                src="/services/polissage-card.jpg"
                alt="Polissage voiture premium à Nîmes par AUTO 9"
                className="absolute inset-0 h-full w-full object-cover brightness-[0.8] contrast-110 saturate-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/25 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050608]/55 via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-7">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  Sur devis
                </p>

                <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em]">
                  Brillance, correction légère et finition premium.
                </h2>

                <p className="mt-4 max-w-md leading-relaxed text-white/65">
                  Une prestation pensée pour améliorer le rendu visuel et
                  redonner de la présence à la carrosserie.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-20 rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
              Problèmes fréquents
            </p>

            <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
              Votre peinture manque de profondeur ?
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
              Un polissage sérieux commence par une vraie observation.
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
                Pourquoi faire polir sa voiture ?
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                Parce qu’une carrosserie brillante change toute la perception.
              </h2>

              <p className="mt-6 leading-relaxed text-white/50">
                Une peinture terne ou marquée donne rapidement une impression de
                véhicule fatigué. Le polissage permet d’améliorer la profondeur,
                la brillance et la présentation globale de la voiture.
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

          <div className="mt-24 grid gap-6 md:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.title}
                className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 transition hover:-translate-y-2 hover:border-[#B8C7D1]/20"
              >
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  Polissage
                </p>

                <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em]">
                  {service.title}
                </h2>

                <p className="mt-5 leading-relaxed text-white/50">
                  {service.text}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-24 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div className="rounded-[2.5rem] border border-[#B8C7D1]/20 bg-[#B8C7D1]/5 p-8 md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
                Sur devis
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                Chaque carrosserie demande une approche différente.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Un véhicule noir micro-rayé, une peinture claire légèrement
                terne ou une voiture premium avant événement ne demandent pas le
                même temps de travail. C’est pour ça que le polissage se chiffre
                après analyse.
              </p>

              <a
                href="/devis-premium?presta=polissage"
                className="mt-8 inline-flex rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
              >
                Demander mon devis →
              </a>
            </div>

            <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 md:p-10">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
                Préparation complète
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                Associez le polissage à un nettoyage complet.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Pour un rendu cohérent, le polissage peut être combiné avec une
                Formule Duo, un nettoyage extérieur ou une rénovation de phares.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/formule-duo-nettoyage-voiture-nimes"
                  className="w-fit rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.22em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
                >
                  Formule Duo →
                </a>

                <a
                  href="/renovation-phares-nimes"
                  className="w-fit rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.22em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
                >
                  Phares →
                </a>
              </div>
            </div>
          </div>

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Questions fréquentes
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Avant de réserver votre polissage voiture à Nîmes.
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
              Devis premium
            </p>

            <div className="mt-6 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <h2 className="max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                  Votre carrosserie mérite plus qu’un simple lavage.
                </h2>

                <p className="mt-6 max-w-2xl leading-relaxed text-white/55">
                  Envoyez votre demande avec quelques photos du véhicule pour
                  obtenir une estimation adaptée au niveau de correction souhaité.
                </p>
              </div>

              <a
                href="/devis-premium?presta=polissage"
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
