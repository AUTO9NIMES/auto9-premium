import type { Metadata } from "next";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "Rénovation phares Nîmes | AUTO 9 - Optiques ternis et jaunis",
  description:
    "AUTO 9 propose la rénovation de phares à Nîmes : optiques ternis, jaunis ou opaques, ponçage progressif, polissage et protection pour retrouver clarté et visibilité.",
};

const problems = [
  "Phares jaunis",
  "Optiques ternis",
  "Manque de visibilité",
  "Aspect vieilli",
  "Contrôle technique",
  "Véhicule moins valorisé",
];

const steps = [
  {
    title: "Protection",
    text: "Les contours du phare sont protégés pour travailler proprement sans abîmer la carrosserie.",
  },
  {
    title: "Ponçage progressif",
    text: "L’optique est repris en plusieurs étapes pour retirer l’oxydation et uniformiser la surface.",
  },
  {
    title: "Polissage",
    text: "Le phare est poli pour retrouver de la transparence, de la brillance et une meilleure clarté.",
  },
  {
    title: "Finition",
    text: "Une finition est appliquée pour améliorer le rendu visuel et prolonger le résultat.",
  },
];

const benefits = [
  "Meilleure visibilité de nuit",
  "Aspect plus propre et plus récent",
  "Véhicule mieux présenté à la vente",
  "Alternative économique au remplacement des optiques",
  "Résultat visible immédiatement",
  "Prestation rapide sur devis",
];

const results = [
  {
    name: "Renault",
    before: "/phares/renault-avant.jpg",
    after: "/phares/renault-apres.jpg",
    text: "Optique terne et voilé, puis rendu plus clair après rénovation.",
  },
  {
    name: "Utilitaire",
    before: "/phares/utilitaire-avant.jpg",
    after: "/phares/utilitaire-apres.jpg",
    text: "Phare oxydé et jauni, puis transparence nettement améliorée.",
  },
];

const faq = [
  {
    question: "Combien coûte une rénovation de phares à Nîmes ?",
    answer:
      "AUTO 9 propose la rénovation de phares à partir de 69€, selon l’état des optiques, le véhicule et le niveau de correction nécessaire.",
  },
  {
    question: "Quand faut-il rénover ses phares ?",
    answer:
      "Lorsque les optiques deviennent ternes, jaunes, opaques ou que l’éclairage semble moins efficace de nuit, une rénovation peut améliorer le rendu et la visibilité.",
  },
  {
    question: "La rénovation remplace-t-elle des phares neufs ?",
    answer:
      "Non. Une rénovation améliore fortement l’aspect et la clarté des optiques, mais ne remplace pas un phare cassé, fissuré ou abîmé de l’intérieur.",
  },
  {
    question: "AUTO 9 intervient-il à domicile ?",
    answer:
      "AUTO 9 peut intervenir à domicile ou sur site à Nîmes et alentours selon les conditions d’accès, la météo, l’état du véhicule et les disponibilités.",
  },
];

export default function RenovationPharesNimesPage() {
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
            Rénovation phares Nîmes
          </p>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
                Redonnez de la clarté à vos phares.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/55">
                AUTO 9 propose la rénovation de phares à Nîmes pour les optiques
                ternis, jaunis ou opaques. Une prestation idéale pour améliorer
                l’esthétique du véhicule, la visibilité et la présentation avant
                vente ou contrôle technique.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/devis-premium?presta=phares"
                  className="w-fit rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
                >
                  Demander mon devis →
                </a>

                <a
                  href="#resultats"
                  className="w-fit rounded-full border border-white/15 px-8 py-5 text-xs font-black uppercase tracking-[0.25em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
                >
                  Voir les résultats
                </a>
              </div>
            </div>

            <div className="relative min-h-[560px] overflow-hidden rounded-[2rem] border border-[#B8C7D1]/20 bg-white/[0.03]">
              <img
                src="/phares/porsche-phares.jpg"
                alt="Phare premium Porsche après rénovation par AUTO 9 à Nîmes"
                className="absolute inset-0 h-full w-full object-cover brightness-[0.82] contrast-110 saturate-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/25 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050608]/45 via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-7">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                  Finition premium
                </p>

                <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em]">
                  Optiques plus clairs, véhicule mieux présenté.
                </h2>

                <p className="mt-4 max-w-md leading-relaxed text-white/65">
                  Une rénovation bien réalisée change immédiatement la face
                  avant du véhicule et renforce l’image de propreté.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-20 rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
              Problèmes fréquents
            </p>

            <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
              Vos optiques ont perdu leur transparence ?
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

          <div className="mt-24 grid gap-10 lg:grid-cols-[0.8fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
                Démonstration vidéo
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                Avant / après sur Mercedes.
              </h2>

              <p className="mt-6 leading-relaxed text-white/50">
                Une vidéo courte permet de voir le changement réel sur un phare
                terni : plus de clarté, plus de transparence et un rendu
                visuellement beaucoup plus propre.
              </p>

              <a
                href="/devis-premium?presta=phares"
                className="mt-8 inline-flex rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
              >
                Rénover mes phares →
              </a>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-[#B8C7D1]/20 bg-black/40 p-3 shadow-[0_0_80px_rgba(184,199,209,.12)]">
              <video
                src="/phares/mercedes-renovation-phares-auto9-nimes.mp4"
                className="h-[680px] w-full rounded-[1.5rem] object-cover md:h-[760px]"
                autoPlay
                muted
                loop
                playsInline
                controls
              />

              <div className="px-3 pb-3 pt-5">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-[#B8C7D1]">
                  Mercedes · Rénovation optique
                </p>

                <p className="mt-3 text-sm leading-relaxed text-white/45">
                  Vidéo courte avant / après réalisée sur une optique ternie.
                </p>
              </div>
            </div>
          </div>          <div id="resultats" className="mt-24 scroll-mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Avant / après
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Des résultats visibles dès la fin de prestation.
            </h2>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              {results.map((result) => (
                <article
                  key={result.name}
                  className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.03]"
                >
                  <div className="grid gap-px bg-white/10 md:grid-cols-2">
                    <div className="relative min-h-[520px] overflow-hidden bg-black">
                      <img
                        src={result.before}
                        alt={`${result.name} avant rénovation de phares AUTO 9`}
                        className="absolute inset-0 h-full w-full object-cover brightness-[0.82] contrast-110"
                      />

                      <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/60 px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-white">
                        Avant
                      </div>
                    </div>

                    <div className="relative min-h-[520px] overflow-hidden bg-black">
                      <img
                        src={result.after}
                        alt={`${result.name} après rénovation de phares AUTO 9`}
                        className="absolute inset-0 h-full w-full object-cover brightness-[0.9] contrast-110 saturate-110"
                      />

                      <div className="absolute left-5 top-5 rounded-full border border-[#B8C7D1]/25 bg-[#B8C7D1]/80 px-5 py-3 text-xs font-black uppercase tracking-[0.25em] text-white">
                        Après
                      </div>
                    </div>
                  </div>

                  <div className="p-7 md:p-8">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
                      {result.name}
                    </p>

                    <h3 className="mt-4 text-3xl font-black uppercase tracking-[-0.04em]">
                      Rénovation de phares AUTO 9.
                    </h3>

                    <p className="mt-4 leading-relaxed text-white/50">
                      {result.text}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Méthode AUTO 9
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Une rénovation progressive, pas un simple coup de polish.
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
                Pourquoi rénover ses phares ?
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                Un détail qui change toute la face avant.
              </h2>

              <p className="mt-6 leading-relaxed text-white/50">
                Des phares ternis donnent immédiatement une impression de
                véhicule fatigué. Une rénovation permet de retrouver un rendu
                plus clair, plus propre et plus valorisant.
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
                Dès 69€
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                Une prestation ciblée, rapide et très visible.
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                La rénovation de phares est l’une des prestations les plus
                parlantes visuellement. Le résultat se voit tout de suite et
                améliore fortement la présentation du véhicule.
              </p>

              <a
                href="/devis-premium?presta=phares"
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
                Besoin de nettoyer toute la voiture ?
              </h2>

              <p className="mt-6 leading-relaxed text-white/55">
                Pour un rendu encore plus cohérent, la rénovation de phares peut
                être combinée avec un nettoyage intérieur, extérieur ou une
                Formule Duo.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/formule-duo-nettoyage-voiture-nimes"
                  className="w-fit rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.22em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
                >
                  Formule Duo →
                </a>

                <a
                  href="/nettoyage-voiture-nimes"
                  className="w-fit rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.22em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
                >
                  Nettoyage auto →
                </a>
              </div>
            </div>
          </div>

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Questions fréquentes
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Avant de réserver votre rénovation de phares à Nîmes.
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
                  Vos phares méritent mieux que le jaunissement.
                </h2>

                <p className="mt-6 max-w-2xl leading-relaxed text-white/55">
                  Envoyez votre demande avec quelques photos de vos optiques
                  pour obtenir une estimation adaptée.
                </p>
              </div>

              <a
                href="/devis-premium?presta=phares"
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
