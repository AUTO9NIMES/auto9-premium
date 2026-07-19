export function Footer() {
  const links = [
    { label: "Configurateur", href: "/devis" },
    { label: "Réserver", href: "/#reservation" },
    { label: "Réalisations", href: "/realisations" },
    { label: "Devis premium", href: "/devis-premium" },
    {
      label: "Prestations premium Nîmes",
      href: "/prestations-premium-auto-nimes",
    },
    { label: "Professionnels", href: "/professionnels" },
    { label: "Nettoyage voiture Nîmes", href: "/nettoyage-voiture-nimes" },
    {
      label: "Nettoyage à domicile Nîmes",
      href: "/nettoyage-voiture-domicile-nimes",
    },
    {
      label: "Nettoyage intérieur Nîmes",
      href: "/nettoyage-interieur-voiture-nimes",
    },
    {
      label: "Nettoyage extérieur Nîmes",
      href: "/nettoyage-exterieur-voiture-nimes",
    },
    {
      label: "Formule Duo Nîmes",
      href: "/formule-duo-nettoyage-voiture-nimes",
    },
    { label: "Rénovation phares Nîmes", href: "/renovation-phares-nimes" },
    { label: "Polissage voiture Nîmes", href: "/polissage-voiture-nimes" },
    { label: "Réparation jantes Nîmes", href: "/reparation-jantes-nimes" },
  ];

  return (
    <footer className="border-t border-white/10 bg-[#050608] px-6 py-20 text-white md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-[#B8C7D1]/20 bg-[#B8C7D1]/5 p-8 md:p-12">
          <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
            Une dernière envie ?
          </p>

          <div className="mt-5 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <h2 className="max-w-3xl text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
              Retrouvez la joie du neuf.
            </h2>

            <a
              href="/devis"
              className="w-fit rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-8 py-5 text-xs font-black uppercase tracking-[0.25em] transition hover:scale-105"
            >
              Obtenir mon devis →
            </a>
          </div>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <img
              src="/logo-auto9.png"
              alt="AUTO 9"
              className="h-16 w-auto opacity-95"
            />

            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/45">
              Nettoyage automobile premium à domicile, à Nîmes et alentours.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <a
              href="https://www.instagram.com/auto9_nimes"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[2rem] border border-white/10 bg-white/[0.025] p-7 transition hover:-translate-y-1 hover:border-[#E1306C]/60"
            >
              <div className="flex items-center gap-5">
                <InstagramIcon />

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-white">
                    Instagram
                  </p>

                  <p className="mt-3 text-lg text-white/40">@auto9_nimes</p>
                </div>
              </div>
            </a>

            <a
              href="https://www.tiktok.com/@auto9_nimes"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[2rem] border border-white/10 bg-white/[0.025] p-7 transition hover:-translate-y-1 hover:border-[#25F4EE]/60"
            >
              <div className="flex items-center gap-5">
                <TikTokIcon />

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-white">
                    TikTok
                  </p>

                  <p className="mt-3 text-lg text-white/40">@auto9_nimes</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
            Navigation
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/10 bg-white/[0.025] px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/50 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/30">
                © 2026 AUTO 9 · @auto9_nimes
              </p>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
                <a
                  href="/mentions-legales"
                  className="text-xs uppercase tracking-[0.22em] text-white/30 transition hover:text-[#B8C7D1]"
                >
                  Mentions légales
                </a>

                <a
                  href="/politique-confidentialite"
                  className="text-xs uppercase tracking-[0.22em] text-white/30 transition hover:text-[#B8C7D1]"
                >
                  Confidentialité
                </a>
              </div>
            </div>

            <p className="group text-xs uppercase tracking-[0.28em] text-white/25">
              Crafted with passion by{" "}
              <span className="font-bold text-[#B8C7D1] transition group-hover:text-white">
                NOX
              </span>
              {" & "}
              <span className="font-bold text-white transition group-hover:text-[#B8C7D1]">
                NICO
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8">
      <defs>
        <linearGradient id="instagramGradient" x1="0" y1="24" x2="24" y2="0">
          <stop stopColor="#FEDA75" />
          <stop offset="0.35" stopColor="#FA7E1E" />
          <stop offset="0.65" stopColor="#D62976" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>

      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        fill="none"
        stroke="url(#instagramGradient)"
        strokeWidth="2"
      />

      <circle
        cx="12"
        cy="12"
        r="4"
        fill="none"
        stroke="url(#instagramGradient)"
        strokeWidth="2"
      />

      <circle cx="17.4" cy="6.6" r="1.2" fill="#D62976" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
      <path
        d="M15 3c.4 2.5 1.9 4.1 4.3 4.4v3.1c-1.6.1-3-.4-4.3-1.3v6.2c0 3.3-2.2 5.6-5.5 5.6A5.1 5.1 0 0 1 4.2 16c0-3.1 2.4-5.3 5.6-5.3.4 0 .7 0 1 .1v3.2c-.3-.1-.6-.1-.9-.1-1.4 0-2.3.8-2.3 2 0 1.1.9 1.9 2 1.9 1.3 0 2.1-.8 2.1-2.4V3H15Z"
        fill="#25F4EE"
      />

      <path
        d="M16.2 3c.4 2.2 1.8 3.6 4 3.9v2.3c-1.3 0-2.7-.4-4-1.3v6.6c0 3.3-2.2 5.6-5.5 5.6-1.7 0-3.2-.8-4.1-1.9.9.7 2 1.1 3.3 1.1 3.3 0 5.5-2.3 5.5-5.6V3h.8Z"
        fill="#FE2C55"
      />

      <path
        d="M15 3c.4 2.5 1.9 4.1 4.3 4.4v3.1c-1.6.1-3-.4-4.3-1.3v6.2c0 3.3-2.2 5.6-5.5 5.6A5.1 5.1 0 0 1 4.2 16c0-3.1 2.4-5.3 5.6-5.3.4 0 .7 0 1 .1v3.2c-.3-.1-.6-.1-.9-.1-1.4 0-2.3.8-2.3 2 0 1.1.9 1.9 2 1.9 1.3 0 2.1-.8 2.1-2.4V3H15Z"
        fill="white"
        opacity="0.88"
      />
    </svg>
  );
}
