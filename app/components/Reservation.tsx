const phoneNumber = "33659762992";
const email = "contact.nicolas.auto9@gmail.com";

const whatsappMessage = encodeURIComponent(
  "Bonjour AUTO 9, je souhaite réserver une prestation de nettoyage automobile. Voici les infos :\n\nNom :\nVéhicule :\nPrestation souhaitée :\nAdresse / secteur :\nDisponibilités :\n\nMerci."
);

const emailSubject = encodeURIComponent("Demande de réservation - AUTO 9");

const emailBody = encodeURIComponent(
  "Bonjour AUTO 9,\n\nJe souhaite réserver une prestation de nettoyage automobile.\n\nVoici les informations :\n\nNom :\nTéléphone :\nVéhicule :\nPrestation souhaitée :\nAdresse / secteur :\nDisponibilités :\n\nMerci."
);

export function Reservation() {
  return (
    <section
      id="reservation"
      className="relative overflow-hidden bg-[#050608] px-6 py-24 text-white sm:px-10 lg:px-20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_30%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-md sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-blue-200">
                Réservation
              </p>

              <h2 className="text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl">
                Prêt à retrouver
                <span className="block text-blue-200">la joie du neuf ?</span>
              </h2>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                Réservez votre prestation AUTO 9 en quelques secondes. Vous
                pouvez nous contacter directement par WhatsApp ou envoyer une
                demande par e-mail si vous êtes sur ordinateur.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <a
                  href={`https://wa.me/${phoneNumber}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center rounded-full bg-[#25D366] px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:scale-[1.02] hover:bg-white"
                >
                  Réserver par WhatsApp
                </a>

                <a
                  href={`mailto:${email}?subject=${emailSubject}&body=${emailBody}`}
                  className="group flex items-center justify-center rounded-full border border-white/20 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:scale-[1.02] hover:bg-blue-100"
                >
                  Réserver par mail
                </a>
              </div>

              <p className="mt-5 text-sm text-white/45">
                Réponse rapide selon disponibilité. Intervention à Nîmes et
                jusqu’à 30 km autour.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-6">
              <h3 className="text-xl font-black uppercase tracking-[0.18em] text-white">
                Infos utiles
              </h3>

              <div className="mt-6 space-y-5 text-sm leading-7 text-white/70">
                <div>
                  <p className="font-bold uppercase tracking-[0.18em] text-blue-200">
                    Par téléphone
                  </p>
                  <a
                    href="tel:+33659762992"
                    className="mt-1 block text-lg font-bold text-white transition hover:text-blue-200"
                  >
                    06 59 76 29 92
                  </a>
                </div>

                <div>
                  <p className="font-bold uppercase tracking-[0.18em] text-blue-200">
                    Par e-mail
                  </p>
                  <a
                    href={`mailto:${email}`}
                    className="mt-1 block break-all text-lg font-bold text-white transition hover:text-blue-200"
                  >
                    {email}
                  </a>
                </div>

                <div>
                  <p className="font-bold uppercase tracking-[0.18em] text-blue-200">
                    Zone d’intervention
                  </p>
                  <p className="mt-1 text-white/70">
                    Nettoyage automobile premium à domicile, à Nîmes et dans les
                    alentours.
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm leading-7 text-white/65">
                  Pour une réservation plus rapide, indiquez le modèle du
                  véhicule, la prestation souhaitée, votre secteur et vos
                  disponibilités.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}