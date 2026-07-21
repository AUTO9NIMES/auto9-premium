import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "Mentions légales | AUTO 9",
  description:
    "Mentions légales du site AUTO 9, spécialiste du nettoyage automobile à Nîmes.",
  alternates: {
    canonical: "/mentions-legales",
  },
};

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <header className="border-b border-white/10 px-6 py-6 md:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xs font-black uppercase tracking-[0.3em] text-white/50 transition hover:text-[#7DB7FF]"
          >
            ← Retour au site
          </Link>

          <span className="hidden text-[10px] font-black uppercase tracking-[0.3em] text-white/30 sm:block">
            AUTO 9 · Nîmes
          </span>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 py-16 md:px-12 md:py-24">
        <div className="pointer-events-none absolute left-1/2 top-10 h-96 w-96 -translate-x-1/2 rounded-full bg-[#0057FF]/10 blur-[130px]" />

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#7DB7FF]">
              Informations légales
            </p>

            <h1 className="mt-5 text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
              Mentions légales
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/60 md:text-lg">
              Les présentes mentions légales regroupent les informations
              relatives à l’éditeur, à l’hébergement et à l’utilisation du site
              internet AUTO 9.
            </p>

            <p className="mt-4 text-sm text-white/35">
              Dernière mise à jour : 20 juillet 2026
            </p>
          </div>

          <div className="mt-14 grid gap-6">
            <LegalSection number="01" title="Éditeur du site">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoRow label="Nom commercial" value="AUTO 9" />

                <InfoRow label="Entrepreneur" value="Nicolas BOUCHER" />

                <InfoRow
                  label="Statut juridique"
                  value="Entrepreneur individuel — micro-entreprise"
                />

                <InfoRow
                  label="Activité"
                  value="Nettoyage, préparation esthétique et detailing automobile"
                />

                <InfoRow label="SIREN" value="924 803 083" />

                <InfoRow label="SIRET" value="924 803 083 00014" />

                <InfoRow
                  label="Adresse"
                  value="6 rue Pitot prolongée, 30000 Nîmes, France"
                />

                <InfoRow
                  label="Téléphone"
                  value={
                    <a
                      href="tel:+33659762992"
                      className="transition hover:text-[#7DB7FF]"
                    >
                      06 59 76 29 92
                    </a>
                  }
                />

                <InfoRow
                  label="Adresse e-mail"
                  value={
                    <a
                      href="mailto:contact.nicolas.auto9@gmail.com"
                      className="break-all transition hover:text-[#7DB7FF]"
                    >
                      contact.nicolas.auto9@gmail.com
                    </a>
                  }
                />

                <InfoRow label="Site internet" value="auto9nimes.com" />

                <InfoRow
                  label="TVA"
                  value="TVA non applicable, article 293 B du Code général des impôts"
                  fullWidth
                />
              </div>
            </LegalSection>

            <LegalSection number="02" title="Directeur de la publication">
              <p className="max-w-3xl text-sm leading-7 text-white/65 md:text-base">
                Le directeur de la publication et responsable de la rédaction
                du site est :
              </p>

              <p className="mt-5 text-xl font-black uppercase tracking-[-0.02em] text-white">
                Nicolas BOUCHER
              </p>
            </LegalSection>

            <LegalSection number="03" title="Hébergement">
              <p className="max-w-3xl text-sm leading-7 text-white/65 md:text-base">
                Le site internet AUTO 9 est hébergé par :
              </p>

              <address className="mt-6 not-italic">
                <p className="text-xl font-black uppercase tracking-[-0.02em] text-white">
                  Vercel Inc.
                </p>

                <p className="mt-3 text-sm leading-7 text-white/60 md:text-base">
                  440 N Barranca Avenue #4133
                  <br />
                  Covina, CA 91723
                  <br />
                  États-Unis
                </p>

                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-bold text-[#7DB7FF] transition hover:text-white"
                >
                  Consulter le site de l’hébergeur →
                </a>
              </address>
            </LegalSection>

            <LegalSection number="04" title="Propriété intellectuelle">
              <div className="space-y-5 text-sm leading-7 text-white/65 md:text-base">
                <p>
                  L’ensemble du contenu présent sur ce site, notamment les
                  textes, photographies, vidéos, illustrations, éléments
                  graphiques, logos, marques, mises en page et créations
                  visuelles, est protégé par les règles relatives à la propriété
                  intellectuelle.
                </p>

                <p>
                  Sauf mention contraire, ces contenus appartiennent à AUTO 9
                  ou sont utilisés avec l’autorisation de leurs propriétaires.
                  Toute reproduction, représentation, adaptation, diffusion ou
                  exploitation, totale ou partielle, sans autorisation écrite
                  préalable est interdite.
                </p>

                <p>
                  Les marques, noms commerciaux, logos et photographies de
                  véhicules appartenant à des tiers restent la propriété de
                  leurs titulaires respectifs.
                </p>
              </div>
            </LegalSection>

            <LegalSection number="05" title="Responsabilité">
              <div className="space-y-5 text-sm leading-7 text-white/65 md:text-base">
                <p>
                  AUTO 9 s’efforce de fournir des informations exactes,
                  complètes et régulièrement mises à jour. Toutefois, aucune
                  garantie ne peut être donnée concernant l’absence totale
                  d’erreurs, d’omissions ou d’indisponibilités temporaires.
                </p>

                <p>
                  Les tarifs affichés sur le site et dans le configurateur sont
                  des estimations indicatives. Le prix définitif peut être
                  ajusté après examen de l’état réel du véhicule, de son
                  gabarit, de son niveau de salissure et des demandes
                  particulières du client.
                </p>

                <p>
                  AUTO 9 ne pourra être tenue responsable des dommages directs
                  ou indirects résultant de l’utilisation du site, d’une
                  interruption de service ou de l’utilisation d’un site tiers
                  accessible depuis un lien externe.
                </p>
              </div>
            </LegalSection>

            <LegalSection number="06" title="Données personnelles">
              <div className="space-y-5 text-sm leading-7 text-white/65 md:text-base">
                <p>
                  Les informations transmises depuis le configurateur ou les
                  formulaires du site sont utilisées afin de répondre aux
                  demandes de devis, d’étudier les prestations souhaitées et de
                  recontacter les clients.
                </p>

                <p>
                  Les modalités de collecte, d’utilisation, de conservation et
                  d’exercice de vos droits sont détaillées dans la politique de
                  confidentialité du site.
                </p>
              </div>

              <Link
                href="/politique-confidentialite"
                className="mt-7 inline-flex rounded-full border border-[#0057FF]/40 bg-[#0057FF]/10 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-[#7DB7FF] transition hover:border-[#0057FF] hover:bg-[#0057FF]/20 hover:text-white"
              >
                Politique de confidentialité →
              </Link>
            </LegalSection>

            <LegalSection number="07" title="Liens externes">
              <p className="text-sm leading-7 text-white/65 md:text-base">
                Le site peut contenir des liens vers des services ou des sites
                internet exploités par des tiers. AUTO 9 ne contrôle pas leur
                contenu, leur disponibilité ni leurs pratiques en matière de
                confidentialité et ne peut donc être tenue responsable de leur
                utilisation.
              </p>
            </LegalSection>

            <LegalSection number="08" title="Droit applicable">
              <p className="text-sm leading-7 text-white/65 md:text-base">
                Les présentes mentions légales sont soumises au droit français.
                En cas de différend, une solution amiable sera recherchée avant
                toute procédure judiciaire.
              </p>
            </LegalSection>

            <div className="rounded-[2rem] border border-[#0057FF]/25 bg-[#0057FF]/10 p-6 md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#7DB7FF]">
                Une question ?
              </p>

              <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.04em] md:text-4xl">
                Contactez AUTO 9
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
                Pour toute question relative au site ou aux présentes mentions
                légales, vous pouvez nous contacter par téléphone ou par
                e-mail.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="tel:+33659762992"
                  className="flex items-center justify-center rounded-full bg-[#0057FF] px-7 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:scale-[1.02] hover:bg-[#1768FF]"
                >
                  Appeler AUTO 9
                </a>

                <a
                  href="mailto:contact@auto9nimes.com"
                  className="flex items-center justify-center rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/75 transition hover:border-[#7DB7FF] hover:text-[#7DB7FF]"
                >
                  Envoyer un e-mail
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function LegalSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-6 md:p-9">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#0057FF]/35 bg-[#0057FF]/10 text-xs font-black text-[#7DB7FF]">
          {number}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-black uppercase tracking-[-0.035em] text-white md:text-3xl">
            {title}
          </h2>

          <div className="mt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-black/20 p-5 ${
        fullWidth ? "md:col-span-2" : ""
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7DB7FF]">
        {label}
      </p>

      <div className="mt-3 text-sm font-semibold leading-6 text-white/75">
        {value}
      </div>
    </div>
  );
}
