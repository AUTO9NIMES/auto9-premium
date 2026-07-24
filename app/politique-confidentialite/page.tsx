import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "Politique de confidentialité | AUTO 9",
  description:
    "Politique de confidentialité et protection des données personnelles du site AUTO 9 à Nîmes.",
  alternates: {
    canonical: "/politique-confidentialite",
  },
};

export default function PolitiqueConfidentialitePage() {
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
              Protection de vos données
            </p>

            <h1 className="mt-5 text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
              Politique de confidentialité
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/60 md:text-lg">
              AUTO 9 accorde une attention particulière à la protection des
              informations personnelles communiquées par ses clients et
              prospects. Cette page explique quelles données sont collectées,
              pourquoi elles sont utilisées et comment exercer vos droits.
            </p>

            <p className="mt-4 text-sm text-white/35">
              Dernière mise à jour : 20 juillet 2026
            </p>
          </div>

          <div className="mt-14 grid gap-6">
            <PrivacySection number="01" title="Responsable du traitement">
              <p className="text-sm leading-7 text-white/65 md:text-base">
                Le responsable du traitement des données personnelles
                collectées depuis le site est :
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <InfoRow label="Nom commercial" value="AUTO 9" />

                <InfoRow label="Responsable" value="Nicolas BOUCHER" />

                <InfoRow
                  label="Statut"
                  value="Entrepreneur individuel — micro-entreprise"
                />

                <InfoRow label="SIRET" value="924 803 083 00014" />

                <InfoRow
                  label="Adresse"
                  value="6 rue Pitot prolongée, 30000 Nîmes, France"
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

                <InfoRow label="Site internet" value="auto9nimes.com" />
              </div>
            </PrivacySection>

            <PrivacySection number="02" title="Données collectées">
              <p className="text-sm leading-7 text-white/65 md:text-base">
                Lorsque vous utilisez le configurateur, envoyez une demande de
                devis ou contactez AUTO 9, les catégories de données suivantes
                peuvent être collectées :
              </p>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <DataCard
                  title="Identité et contact"
                  items={[
                    "Nom et prénom",
                    "Numéro de téléphone",
                    "Adresse e-mail, lorsqu’elle est communiquée",
                    "Ville ou secteur d’intervention",
                  ]}
                />

                <DataCard
                  title="Informations sur le véhicule"
                  items={[
                    "Type et catégorie du véhicule",
                    "Marque, modèle ou informations complémentaires",
                    "État général et niveau de salissure",
                    "Photos transmises volontairement",
                  ]}
                />

                <DataCard
                  title="Informations sur la demande"
                  items={[
                    "Prestation et options sélectionnées",
                    "Lieu souhaité pour l’intervention",
                    "Créneau ou date souhaitée",
                    "Commentaires et demandes particulières",
                    "Estimation tarifaire obtenue",
                  ]}
                />

                <DataCard
                  title="Données techniques"
                  items={[
                    "Adresse IP et journaux techniques éventuels",
                    "Informations relatives au navigateur et à l’appareil",
                    "Date et heure de la demande",
                    "Informations nécessaires à la sécurité du site",
                  ]}
                />
              </div>

              <div className="mt-6 rounded-2xl border border-[#0057FF]/25 bg-[#0057FF]/10 p-5">
                <p className="text-sm leading-7 text-white/70">
                  Les photos du véhicule sont facultatives. Il est recommandé
                  de ne pas transmettre de photographie montrant une personne,
                  un document d’identité, une adresse, une plaque
                  d’immatriculation non nécessaire ou tout autre élément
                  personnel sans rapport avec la demande.
                </p>
              </div>
            </PrivacySection>

            <PrivacySection
              number="03"
              title="Finalités et bases juridiques"
            >
              <p className="text-sm leading-7 text-white/65 md:text-base">
                Les données sont uniquement utilisées pour les objectifs
                décrits ci-dessous.
              </p>

              <div className="mt-7 overflow-hidden rounded-2xl border border-white/10">
                <PurposeRow
                  purpose="Répondre aux demandes de renseignements et de devis"
                  legalBasis="Mesures précontractuelles prises à votre demande"
                />

                <PurposeRow
                  purpose="Évaluer l’état du véhicule et proposer une prestation adaptée"
                  legalBasis="Mesures précontractuelles prises à votre demande"
                />

                <PurposeRow
                  purpose="Organiser un rendez-vous et réaliser la prestation"
                  legalBasis="Exécution du contrat ou mesures précontractuelles"
                />

                <PurposeRow
                  purpose="Assurer le suivi client, la facturation et la comptabilité"
                  legalBasis="Exécution du contrat et obligations légales"
                />

                <PurposeRow
                  purpose="Prévenir les abus, les erreurs et les atteintes à la sécurité du site"
                  legalBasis="Intérêt légitime d’AUTO 9 à sécuriser son activité"
                  last
                />
              </div>

              <p className="mt-6 text-sm leading-7 text-white/55">
                Les données collectées pour une demande de devis ne sont pas
                utilisées pour envoyer automatiquement des communications
                commerciales sans base juridique appropriée.
              </p>
            </PrivacySection>

            <PrivacySection
              number="04"
              title="Caractère obligatoire des informations"
            >
              <div className="space-y-5 text-sm leading-7 text-white/65 md:text-base">
                <p>
                  Les champs signalés comme nécessaires dans le configurateur
                  doivent être renseignés afin qu’AUTO 9 puisse étudier la
                  demande et recontacter le client.
                </p>

                <p>
                  À défaut de disposer des informations indispensables,
                  notamment le nom, le numéro de téléphone, le véhicule et la
                  prestation souhaitée, AUTO 9 pourra être dans l’impossibilité
                  de répondre correctement à la demande.
                </p>

                <p>
                  Les commentaires, les photographies et les informations
                  complémentaires restent facultatifs, sauf lorsqu’ils sont
                  indispensables à l’évaluation d’une prestation particulière.
                </p>
              </div>
            </PrivacySection>

            <PrivacySection
              number="05"
              title="Destinataires et prestataires"
            >
              <p className="text-sm leading-7 text-white/65 md:text-base">
                Les données sont accessibles uniquement aux personnes et
                prestataires ayant besoin d’en connaître pour traiter la
                demande.
              </p>

              <div className="mt-7 grid gap-4 md:grid-cols-3">
                <ProviderCard
                  name="AUTO 9"
                  role="Traitement des demandes, préparation des devis, prise de rendez-vous et suivi client."
                />

                <ProviderCard
                  name="Vercel"
                  role="Hébergement du site, fonctionnement technique et stockage des photographies via Vercel Blob."
                />

                <ProviderCard
                  name="Resend"
                  role="Transmission par e-mail des demandes envoyées depuis le configurateur."
                />
              </div>

              <p className="mt-6 text-sm leading-7 text-white/55">
                Les données ne sont ni vendues ni louées à des tiers. Elles
                peuvent toutefois être communiquées lorsqu’une obligation
                légale l’impose ou lorsque cela est nécessaire à la défense des
                droits d’AUTO 9.
              </p>
            </PrivacySection>

            <PrivacySection
              number="06"
              title="Transferts hors de l’Union européenne"
            >
              <div className="space-y-5 text-sm leading-7 text-white/65 md:text-base">
                <p>
                  Certains prestataires techniques utilisés par AUTO 9 sont
                  établis aux États-Unis ou peuvent faire intervenir des
                  infrastructures situées en dehors de l’Espace économique
                  européen.
                </p>

                <p>
                  Lorsque des données sont transférées vers un pays situé en
                  dehors de l’Espace économique européen, ces transferts doivent
                  être encadrés par un mécanisme reconnu par la réglementation,
                  notamment une décision d’adéquation, le cadre de protection
                  des données applicable ou les clauses contractuelles types de
                  la Commission européenne.
                </p>

                <p>
                  Les politiques de confidentialité et accords de traitement
                  des données des prestataires concernés peuvent être
                  consultés sur leurs sites officiels.
                </p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center rounded-full border border-white/15 px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-white/70 transition hover:border-[#7DB7FF] hover:text-[#7DB7FF]"
                >
                  Confidentialité Vercel
                </a>

                <a
                  href="https://resend.com/legal/privacy-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center rounded-full border border-white/15 px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-white/70 transition hover:border-[#7DB7FF] hover:text-[#7DB7FF]"
                >
                  Confidentialité Resend
                </a>
              </div>
            </PrivacySection>

            <PrivacySection number="07" title="Durées de conservation">
              <p className="text-sm leading-7 text-white/65 md:text-base">
                AUTO 9 conserve les informations uniquement pendant la durée
                nécessaire à l’objectif pour lequel elles ont été collectées.
              </p>

              <div className="mt-7 grid gap-4">
                <RetentionRow
                  data="Demandes de renseignements et de devis sans prestation réalisée"
                  duration="Jusqu’à 3 ans à compter du dernier contact provenant du prospect"
                />

                <RetentionRow
                  data="Photographies transmises avec une demande sans prestation réalisée"
                  duration="Pendant le traitement de la demande, puis au maximum 12 mois après le dernier contact, sauf nécessité particulière"
                />

                <RetentionRow
                  data="Données relatives aux clients et au suivi des prestations"
                  duration="Pendant la relation commerciale, puis pendant les délais nécessaires à la gestion des éventuelles réclamations"
                />

                <RetentionRow
                  data="Factures et pièces justificatives comptables"
                  duration="10 ans conformément aux obligations comptables applicables"
                />

                <RetentionRow
                  data="Journaux techniques et données de sécurité"
                  duration="Pendant une durée limitée déterminée selon les besoins de sécurité et les réglages des prestataires"
                />
              </div>

              <p className="mt-6 text-sm leading-7 text-white/55">
                Certaines informations peuvent être archivées plus longtemps
                lorsqu’une obligation légale l’impose ou lorsqu’elles sont
                nécessaires à la constatation, à l’exercice ou à la défense
                d’un droit en justice.
              </p>
            </PrivacySection>

            <PrivacySection number="08" title="Vos droits">
              <p className="text-sm leading-7 text-white/65 md:text-base">
                Selon votre situation et la base juridique du traitement, vous
                pouvez notamment exercer les droits suivants :
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <RightCard
                  title="Accès"
                  text="Obtenir la confirmation que vos données sont traitées et en recevoir une copie."
                />

                <RightCard
                  title="Rectification"
                  text="Faire corriger ou compléter des informations inexactes ou incomplètes."
                />

                <RightCard
                  title="Effacement"
                  text="Demander la suppression de vos données lorsque les conditions légales sont réunies."
                />

                <RightCard
                  title="Limitation"
                  text="Demander que l’utilisation de vos données soit temporairement limitée."
                />

                <RightCard
                  title="Opposition"
                  text="Vous opposer à certains traitements fondés sur l’intérêt légitime."
                />

                <RightCard
                  title="Portabilité"
                  text="Recevoir certaines données dans un format structuré lorsque ce droit est applicable."
                />
              </div>

              <div className="mt-7 rounded-2xl border border-[#0057FF]/25 bg-[#0057FF]/10 p-6">
                <p className="text-sm leading-7 text-white/70">
                  Pour exercer vos droits, envoyez votre demande à :
                </p>

                <a
                  href="mailto:contact.nicolas.auto9@gmail.com"
                  className="mt-3 inline-flex break-all text-lg font-black text-[#7DB7FF] transition hover:text-white"
                >
                  contact.nicolas.auto9@gmail.com
                </a>

                <p className="mt-4 text-sm leading-7 text-white/55">
                  La demande doit permettre de vous identifier suffisamment.
                  Un justificatif d’identité ne sera demandé qu’en cas de doute
                  raisonnable sur votre identité et uniquement lorsque cela est
                  nécessaire.
                </p>
              </div>
            </PrivacySection>

            <PrivacySection number="09" title="Réclamation auprès de la CNIL">
              <p className="text-sm leading-7 text-white/65 md:text-base">
                En cas de difficulté non résolue concernant l’utilisation de
                vos données personnelles, vous disposez du droit d’introduire
                une réclamation auprès de la Commission nationale de
                l’informatique et des libertés.
              </p>

              <a
                href="https://www.cnil.fr/fr/plaintes"
                target="_blank"
                rel="noreferrer"
                className="mt-7 inline-flex rounded-full border border-[#0057FF]/40 bg-[#0057FF]/10 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-[#7DB7FF] transition hover:border-[#0057FF] hover:bg-[#0057FF]/20 hover:text-white"
              >
                Accéder au site de la CNIL →
              </a>
            </PrivacySection>

            <PrivacySection number="10" title="Sécurité">
              <div className="space-y-5 text-sm leading-7 text-white/65 md:text-base">
                <p>
                  AUTO 9 met en œuvre des mesures raisonnables afin de protéger
                  les données contre la perte, la destruction, l’accès non
                  autorisé, l’altération ou la divulgation.
                </p>

                <p>
                  L’accès aux demandes reçues et aux outils techniques est
                  limité aux personnes autorisées. Les échanges avec le site
                  sont protégés par le protocole HTTPS lorsque le site est
                  consulté depuis son adresse officielle.
                </p>

                <p>
                  Malgré les précautions prises, aucune transmission ou méthode
                  de stockage informatique ne peut garantir une sécurité
                  absolue.
                </p>
              </div>
            </PrivacySection>

            <PrivacySection number="11" title="Cookies et traceurs">
              <div className="space-y-5 text-sm leading-7 text-white/65 md:text-base">
                <p>
                  Le site peut utiliser des éléments techniques strictement
                  nécessaires à son fonctionnement, à sa sécurité ou à la
                  conservation temporaire des choix effectués pendant la
                  navigation.
                </p>

                <p>
                  Si des outils de mesure d’audience, de publicité ou des
                  traceurs non strictement nécessaires sont ajoutés au site, un
                  dispositif d’information et de recueil du consentement sera
                  mis en place avant leur activation lorsque la réglementation
                  l’exige.
                </p>

                <p>
                  Vous pouvez également configurer votre navigateur afin de
                  limiter ou supprimer les cookies. Le blocage de certains
                  éléments strictement nécessaires peut toutefois perturber le
                  fonctionnement du site.
                </p>
              </div>
            </PrivacySection>

            <PrivacySection number="12" title="Mise à jour de cette politique">
              <p className="text-sm leading-7 text-white/65 md:text-base">
                Cette politique peut être modifiée afin de tenir compte d’une
                évolution du site, des services utilisés ou de la
                réglementation. La date de dernière mise à jour est indiquée en
                haut de la page.
              </p>
            </PrivacySection>

            <div className="rounded-[2rem] border border-[#0057FF]/25 bg-[#0057FF]/10 p-6 md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#7DB7FF]">
                Besoin d’une précision ?
              </p>

              <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.04em] md:text-4xl">
                Contactez AUTO 9
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
                Pour toute question relative à vos données personnelles ou à
                cette politique de confidentialité, contactez directement AUTO
                9.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="mailto:contact.nicolas.auto9@gmail.com"
                  className="flex items-center justify-center rounded-full bg-[#0057FF] px-7 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:scale-[1.02] hover:bg-[#1768FF]"
                >
                  Envoyer un e-mail
                </a>

                <a
                  href="tel:+33659762992"
                  className="flex items-center justify-center rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.2em] text-white/75 transition hover:border-[#7DB7FF] hover:text-[#7DB7FF]"
                >
                  Appeler AUTO 9
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

function PrivacySection({
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
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7DB7FF]">
        {label}
      </p>

      <div className="mt-3 text-sm font-semibold leading-6 text-white/75">
        {value}
      </div>
    </div>
  );
}

function DataCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="text-base font-black uppercase tracking-[-0.02em] text-white">
        {title}
      </h3>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-sm leading-6 text-white/60"
          >
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7DB7FF]"
            />

            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function PurposeRow({
  purpose,
  legalBasis,
  last = false,
}: {
  purpose: string;
  legalBasis: string;
  last?: boolean;
}) {
  return (
    <div
      className={`grid gap-3 bg-black/20 p-5 md:grid-cols-2 md:gap-8 ${
        last ? "" : "border-b border-white/10"
      }`}
    >
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
          Objectif
        </p>

        <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
          {purpose}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7DB7FF]">
          Base juridique
        </p>

        <p className="mt-2 text-sm leading-6 text-white/60">
          {legalBasis}
        </p>
      </div>
    </div>
  );
}

function ProviderCard({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7DB7FF]">
        Prestataire
      </p>

      <h3 className="mt-3 text-xl font-black uppercase tracking-[-0.03em]">
        {name}
      </h3>

      <p className="mt-4 text-sm leading-6 text-white/55">
        {role}
      </p>
    </article>
  );
}

function RetentionRow({
  data,
  duration,
}: {
  data: string;
  duration: string;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-5 md:grid-cols-[1fr_.85fr] md:gap-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
          Données concernées
        </p>

        <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
          {data}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7DB7FF]">
          Durée
        </p>

        <p className="mt-2 text-sm leading-6 text-white/60">
          {duration}
        </p>
      </div>
    </div>
  );
}

function RightCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="text-base font-black uppercase tracking-[-0.02em] text-[#7DB7FF]">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-white/55">
        {text}
      </p>
    </article>
  );
}
