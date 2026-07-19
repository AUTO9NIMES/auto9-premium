import { site } from "../lib/site";

export function Header() {
  return (
    <nav className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12">
      <a href="/" aria-label="Retour à l'accueil AUTO 9">
        <img
          src="/logo-auto9-transparent.png"
          alt="AUTO 9"
          className="h-24 w-auto object-contain md:h-32"
        />
      </a>

      <div className="hidden items-center gap-9 text-xs font-black uppercase tracking-[0.2em] text-white/75 md:flex">
        <a href="#services" className="transition hover:text-[#B8C7D1]">
          Services
        </a>

        <a href="#realisations" className="transition hover:text-[#B8C7D1]">
          Réalisations
        </a>

        <a href="/professionnels" className="transition hover:text-[#B8C7D1]">
          Professionnels
        </a>

        <a href="#reservation" className="transition hover:text-[#B8C7D1]">
          Réservation
        </a>

        <a href={site.phoneHref} className="transition hover:text-[#B8C7D1]">
          {site.phone}
        </a>

        <a
          href={site.whatsapp}
          className="bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] rounded-2xl px-6 py-4 text-[#050608] transition hover:scale-105"
        >
          Devis gratuit
        </a>
      </div>
    </nav>
  );
}
