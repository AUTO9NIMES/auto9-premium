import type { ReactNode } from "react";

export default function PolitiqueConfidentialitePage() {
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

      <section className="px-6 py-20 md:px-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
            Données personnelles
          </p>

          <h1 className="mt-6 text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
            Politique de confidentialité
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/55">
            Cette page explique comment AUTO 9 collecte, utilise et protège les
            données personnelles transmises via son site internet.
          </p>

          <div className="mt-14 grid gap-6">
            <PrivacyBlock title="Responsable du traitement">
              <p>Nom commercial : AUTO 9</p>
              <p>Responsable : Nicolas BOUCHER</p>
              <p>Statut juridique : autoentrepreneur</p>
              <p>SIREN / SIRET : 92480308300014</p>
              <p>Adresse : 6 rue Pitot prolongée, 30000 Nîmes, France</p>
              <p>Email de contact : contact.nicolas.auto9@gmail.com</p>
              <p>Téléphone : 06 59 76 29 92</p>
            </PrivacyBlock>

            <PrivacyBlock title="Données collectées">
              <p>
                Les données susceptibles d’être collectées sont celles
                transmises volontairement par l’utilisateur via les formulaires,
                demandes de devis, échanges par email, téléphone ou tout autre
                moyen de contact proposé sur le site.
              </p>

              <ul className="list-inside list-disc space-y-2">
                <li>Nom et prénom</li>
                <li>Adresse email</li>
                <li>Numéro de téléphone</li>
                <li>Ville ou zone d’intervention souhaitée</li>
                <li>Informations liées au véhicule</li>
                <li>Type de prestation demandée</li>
                <li>Message ou demande spécifique</li>
                <li>Photos transmises dans le cadre d’une demande de devis</li>
              </ul>
            </PrivacyBlock>

            <PrivacyBlock title="Finalités d’utilisation">
              <p>Les données personnelles peuvent être utilisées pour :</p>

              <ul className="list-inside list-disc space-y-2">
                <li>Répondre à une demande de contact</li>
                <li>Établir un devis personnalisé</li>
                <li>Organiser une prestation de nettoyage automobile</li>
                <li>Assurer le suivi client avant ou après une prestation</li>
                <li>Recontacter le client concernant sa demande</li>
                <li>Gérer les échanges liés à une réservation</li>
                <li>Améliorer la qualité des services proposés par AUTO 9</li>
              </ul>
            </PrivacyBlock>

            <PrivacyBlock title="Base légale du traitement">
              <p>
                Les données sont traitées dans le cadre de l’exécution de
                mesures précontractuelles ou contractuelles, notamment lorsqu’un
                utilisateur demande un devis, une information, une réservation ou
                une prestation.
              </p>

              <p>
                Certaines données peuvent également être traitées sur la base de
                l’intérêt légitime d’AUTO 9, notamment pour assurer le suivi des
                demandes clients et améliorer la qualité du service.
              </p>
            </PrivacyBlock>

            <PrivacyBlock title="Durée de conservation">
              <p>
                Les données personnelles sont conservées pendant une durée
                limitée, adaptée à la finalité de leur collecte. Les demandes de
                contact ou de devis peuvent être conservées le temps nécessaire
                au suivi de la relation commerciale.
              </p>

              <p>
                L’utilisateur peut demander la suppression de ses données
                personnelles à tout moment, sous réserve des obligations légales
                ou comptables pouvant s’appliquer.
              </p>
            </PrivacyBlock>

            <PrivacyBlock title="Photos transmises">
              <p>
                Dans le cadre d’une demande de devis, l’utilisateur peut être
                amené à transmettre des photos de son véhicule. Ces photos sont
                utilisées uniquement afin d’évaluer l’état du véhicule, de
                comprendre la demande et d’établir une estimation adaptée.
              </p>

              <p>
                Les photos transmises ne sont pas publiées sur le site ou les
                réseaux sociaux sans accord préalable.
              </p>
            </PrivacyBlock>

            <PrivacyBlock title="Partage des données">
              <p>
                AUTO 9 ne vend pas les données personnelles des utilisateurs.
                Certaines informations peuvent être transmises uniquement si cela
                est nécessaire à la réalisation d’une prestation, à une demande
                spécifique du client, à l’intervention d’un partenaire ou à une
                obligation légale.
              </p>
            </PrivacyBlock>

            <PrivacyBlock title="Droits des utilisateurs">
              <p>
                Conformément à la réglementation applicable, l’utilisateur peut
                demander l’accès, la rectification, la suppression ou la
                limitation du traitement de ses données personnelles.
              </p>

              <p>
                Pour exercer ses droits, l’utilisateur peut contacter AUTO 9 à
                l’adresse suivante : contact.nicolas.auto9@gmail.com.
              </p>
            </PrivacyBlock>

            <PrivacyBlock title="Cookies et mesure d’audience">
              <p>
                Le site peut utiliser des cookies nécessaires à son bon
                fonctionnement. Si des outils de mesure d’audience, de publicité,
                de suivi ou de remarketing sont ajoutés, un système
                d’information et de consentement adapté devra être mis en place.
              </p>

              <p>
                L’utilisateur pourra alors accepter, refuser ou modifier ses
                préférences concernant les cookies non nécessaires.
              </p>
            </PrivacyBlock>

            <PrivacyBlock title="Sécurité">
              <p>
                AUTO 9 met en œuvre des mesures raisonnables pour protéger les
                données personnelles transmises via le site contre l’accès non
                autorisé, la perte, l’altération ou l’utilisation abusive.
              </p>
            </PrivacyBlock>

            <PrivacyBlock title="Hébergement">
              <p>
                L’hébergement du site sera complété lorsque le site sera publié
                officiellement.
              </p>

              <p>Hébergeur du site : À compléter</p>
              <p>Adresse de l’hébergeur : À compléter</p>
              <p>Site internet de l’hébergeur : À compléter</p>
            </PrivacyBlock>

            <PrivacyBlock title="Contact">
              <p>
                Pour toute question relative à cette politique de
                confidentialité ou au traitement des données personnelles,
                l’utilisateur peut contacter AUTO 9 :
              </p>

              <p>Email : contact.nicolas.auto9@gmail.com</p>
              <p>Téléphone : 06 59 76 29 92</p>
            </PrivacyBlock>

            <PrivacyBlock title="Mise à jour">
              <p>
                Cette politique de confidentialité peut être modifiée à tout
                moment afin de tenir compte des évolutions légales, techniques ou
                organisationnelles.
              </p>

              <p>Dernière mise à jour : 01/07/2026</p>
            </PrivacyBlock>
          </div>
        </div>
      </section>
    </main>
  );
}

function PrivacyBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 md:p-9">
      <h2 className="text-2xl font-black uppercase tracking-[-0.04em]">
        {title}
      </h2>

      <div className="mt-5 space-y-3 leading-relaxed text-white/55">
        {children}
      </div>
    </article>
  );
}
