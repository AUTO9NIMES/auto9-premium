import type { ReactNode } from "react";

export default function MentionsLegalesPage() {
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
            Informations légales
          </p>

          <h1 className="mt-6 text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
            Mentions légales
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/55">
            Cette page présente les informations légales relatives au site
            internet AUTO 9.
          </p>

          <div className="mt-14 grid gap-6">
            <LegalBlock title="Éditeur du site">
              <p>Propriétaire du site : AUTO 9</p>
              <p>Responsable de publication : Nicolas BOUCHER</p>
              <p>Statut juridique : autoentrepreneur</p>
              <p>SIREN / SIRET : 92480308300014</p>
              <p>Adresse : 6 rue Pitot prolongée, 30000 Nîmes, France</p>
            </LegalBlock>

            <LegalBlock title="Contact">
              <p>Téléphone : 06 59 76 29 92</p>
              <p>Email : contact.nicolas.auto9@gmail.com</p>
            </LegalBlock>

            <LegalBlock title="Activité">
              <p>
                AUTO 9 est une entreprise spécialisée dans le nettoyage de
                véhicules, la préparation esthétique automobile et les
                prestations associées à l’entretien esthétique des véhicules.
              </p>
            </LegalBlock>

            <LegalBlock title="TVA">
              <p>
                TVA non applicable, article 293 B du Code général des impôts.
              </p>
            </LegalBlock>

            <LegalBlock title="Hébergement">
              <p>Hébergeur du site : À compléter</p>
              <p>Adresse de l’hébergeur : À compléter</p>
              <p>Site internet de l’hébergeur : À compléter</p>
            </LegalBlock>

            <LegalBlock title="Nom de domaine">
              <p>Nom de domaine : auto9nimes.com</p>
            </LegalBlock>

            <LegalBlock title="Propriété intellectuelle">
              <p>
                L’ensemble des contenus présents sur ce site, incluant les
                textes, visuels, photographies, vidéos, éléments graphiques,
                logo et identité visuelle, est protégé. Toute reproduction,
                représentation, modification ou diffusion sans autorisation
                préalable est interdite.
              </p>
            </LegalBlock>

            <LegalBlock title="Responsabilité">
              <p>
                AUTO 9 s’efforce de fournir des informations exactes et mises à
                jour sur son site. Toutefois, des erreurs ou omissions peuvent
                survenir. Les tarifs, délais et prestations indiqués peuvent
                varier selon l’état du véhicule, sa catégorie, son niveau
                d’encrassement, son état général et les demandes spécifiques du
                client.
              </p>
            </LegalBlock>

            <LegalBlock title="Données personnelles">
              <p>
                Les informations relatives au traitement des données
                personnelles sont détaillées dans la page Politique de
                confidentialité.
              </p>

              <a
                href="/politique-confidentialite"
                className="mt-5 inline-flex rounded-full border border-[#B8C7D1]/25 bg-[#B8C7D1]/5 px-6 py-3 text-xs font-black uppercase tracking-[0.25em] text-[#B8C7D1] transition hover:bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] hover:text-white"
              >
                Voir la confidentialité →
              </a>
            </LegalBlock>

            <LegalBlock title="Dernière mise à jour">
              <p>Dernière mise à jour : 01/07/2026</p>
            </LegalBlock>
          </div>
        </div>
      </section>
    </main>
  );
}

function LegalBlock({
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
