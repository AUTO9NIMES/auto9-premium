import { Footer } from "../components/Footer";
import { Partners } from "../components/Partners";
import { ProContactForm } from "../components/ProContactForm";

const targets = [
  "Garages indépendants",
  "Marchands VO",
  "Mandataires auto",
  "Concessions",
  "Parcs véhicules",
  "Vendeurs professionnels",
];

const benefits = [
  {
    title: "Véhicules mieux présentés",
    text: "Un véhicule propre inspire confiance, valorise l’annonce et facilite la décision d’achat.",
  },
  {
    title: "Gain de temps pour vos équipes",
    text: "AUTO 9 prend en charge la préparation esthétique pendant que vous vous concentrez sur la vente.",
  },
  {
    title: "Image professionnelle renforcée",
    text: "Livrer un véhicule propre, brillant et soigné améliore directement l’expérience client.",
  },
];

const services = [
  {
    name: "Préparation VO",
    price: "Sur devis",
    text: "Nettoyage intérieur et extérieur avant mise en vente ou shooting photo.",
    details: [
      "Aspiration complète",
      "Nettoyage plastiques",
      "Lavage extérieur",
      "Jantes et pneus",
      "Finition présentation",
    ],
  },
  {
    name: "Livraison client",
    price: "Sur devis",
    text: "Préparation esthétique avant remise des clés pour une livraison plus premium.",
    details: [
      "Finition intérieure",
      "Brillance extérieure",
      "Vitres",
      "Parfum ambiance",
      "Contrôle visuel final",
    ],
  },
  {
    name: "Partenariat régulier",
    price: "Volume pro",
    text: "Solution récurrente pour les garages avec plusieurs véhicules à préparer chaque mois.",
    details: [
      "Organisation sur mesure",
      "Tarifs adaptés au volume",
      "Créneaux réguliers",
      "Suivi qualité AUTO 9",
      "Relation long terme",
    ],
  },
];

const steps = [
  "Premier échange sur vos besoins",
  "Définition du volume et du niveau de préparation",
  "Mise en place d’un fonctionnement simple",
  "Préparation des véhicules avec suivi qualité",
];

export default function ProfessionnelsPage() {
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
            Professionnels de l’auto
          </p>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
                Préparation esthétique pour garages & pros auto.
              </h1>

              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/55">
                AUTO 9 accompagne les professionnels de l’automobile dans la
                préparation esthétique de leurs véhicules : mise en vente,
                livraison client, présentation parc VO et image premium.
              </p>
            </div>

            <div className="rounded-[2rem] border border-[#B8C7D1]/20 bg-[#B8C7D1]/5 p-7">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#B8C7D1]">
                Objectif
              </p>

              <p className="mt-4 text-2xl font-black uppercase tracking-[-0.04em]">
                Des véhicules plus propres, mieux présentés, plus faciles à
                vendre.
              </p>

              <a
                href="#demande-partenariat"
                className="mt-7 inline-flex rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-7 py-4 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
              >
                Demander un partenariat →
              </a>
            </div>
          </div>

          <div className="mt-14 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
              Ils nous font confiance
            </p>

            <p className="mt-4 max-w-2xl text-white/45">
              AUTO 9 accompagne déjà des professionnels de l’automobile dans la
              préparation, la mise en valeur et la présentation de leurs
              véhicules.
            </p>

            <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
              <Partners />
            </div>
          </div>

          <div className="mt-16 rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#B8C7D1]">
              Pour qui ?
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {targets.map((target) => (
                <div
                  key={target}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm font-black uppercase tracking-[0.18em] text-white/65"
                >
                  <span className="text-[#B8C7D1]">✓</span> {target}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {benefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 transition hover:-translate-y-2 hover:border-[#B8C7D1]/20"
              >
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#B8C7D1]">
                  AUTO 9
                </p>

                <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.05em]">
                  {benefit.title}
                </h2>

                <p className="mt-5 leading-relaxed text-white/50">
                  {benefit.text}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-24">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
              Offres professionnelles
            </p>

            <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Des prestations adaptées au rythme de votre activité.
            </h2>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {services.map((service) => (
                <article
                  key={service.name}
                  className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.025))] p-8 transition hover:-translate-y-2 hover:border-[#B8C7D1]/20"
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-[#B8C7D1]">
                      {service.price}
                    </p>

                    <h3 className="mt-5 text-3xl font-black uppercase tracking-[-0.05em]">
                      {service.name}
                    </h3>

                    <p className="mt-5 leading-relaxed text-white/50">
                      {service.text}
                    </p>
                  </div>

                  <div className="mt-7 border-t border-white/10 pt-4">
                    {service.details.map((detail) => (
                      <p
                        key={detail}
                        className="border-b border-white/10 py-3 text-sm text-white/55"
                      >
                        <span className="text-[#B8C7D1]">✓</span> {detail}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-24 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
                Process
              </p>

              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                Simple, clair, efficace.
              </h2>

              <p className="mt-6 leading-relaxed text-white/50">
                L’objectif est de mettre en place un fonctionnement fluide :
                vous avez des véhicules à préparer, AUTO 9 intervient avec une
                prestation propre, régulière et cohérente avec votre image.
              </p>
            </div>

            <div className="grid gap-4">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-5 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#B8C7D1]/25 bg-[#B8C7D1]/5 text-sm font-black text-[#B8C7D1]">
                    {index + 1}
                  </div>

                  <p className="pt-3 text-lg font-bold text-white/70">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <ProContactForm />
        </div>
      </section>

      <Footer />
    </main>
  );
}
