import Link from "next/link";
import { site } from "../lib/site";

export function Header() {
  return (
    <nav className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12">
      <Link href="/" aria-label="Retour à l'accueil AUTO 9">
        <img
          src="/signature-auto9.svg"
          alt="AUTO 9"
          className="h-24 w-auto object-contain md:h-20"
        />
      </Link>

      <div className="hidden items-center gap-9 text-xs font-black uppercase tracking-[0.2em] text-white/75 md:flex">
        <a href="#services" className="transition hover:text-[#bbc9c4]">
          Services
        </a>

        <a href="#realisations" className="transition hover:text-[#bbc9c4]">
          Réalisations
        </a>

        <a href="/professionnels" className="transition hover:text-[#bbc9c4]">
          Professionnels
        </a>

        <a href="#reservation" className="transition hover:text-[#bbc9c4]">
          Réservation
        </a>

        <a href={site.phoneHref} className="transition hover:text-[#bbc9c4]">
          {site.phone}
        </a>

        <Link
          href="/devis"
          className="bg-[linear-gradient(135deg,#f0f3f0,#bbc9c4,#6e8b7b)] text-[#071710] shadow-[0_18px_45px_rgba(184,199,209,.18)] rounded-2xl px-6 py-4 text-[#071710] transition hover:scale-105"
        >
          Devis gratuit
        </Link>
      </div>
    </nav>
  );
}
