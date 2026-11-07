import Link from "next/link";
import { site } from "../lib/site";

export function Header() {
  return (
    <nav className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12">
      <Link href="/" aria-label="Retour à l'accueil AUTO 9">
        <img
          src="/brand/auto9-logo.webp"
          alt="AUTO 9"
          className="h-[72px] w-auto object-contain md:h-20"
        />
      </Link>

      <div className="hidden items-center gap-9 text-xs font-black uppercase tracking-[0.2em] text-white/75 md:flex">
        <a href="#services" className="bg-[linear-gradient(90deg,var(--accent),var(--accent-soft))] bg-[length:0_1px] bg-[position:0_100%] bg-no-repeat pb-1.5 transition-[background-size,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[length:100%_1px] hover:text-ivory focus-visible:bg-[length:100%_1px] focus-visible:text-ivory motion-reduce:transition-none">
          Services
        </a>

        <a href="#realisations" className="bg-[linear-gradient(90deg,var(--accent),var(--accent-soft))] bg-[length:0_1px] bg-[position:0_100%] bg-no-repeat pb-1.5 transition-[background-size,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[length:100%_1px] hover:text-ivory focus-visible:bg-[length:100%_1px] focus-visible:text-ivory motion-reduce:transition-none">
          Réalisations
        </a>

        <a href="/professionnels" className="bg-[linear-gradient(90deg,var(--accent),var(--accent-soft))] bg-[length:0_1px] bg-[position:0_100%] bg-no-repeat pb-1.5 transition-[background-size,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[length:100%_1px] hover:text-ivory focus-visible:bg-[length:100%_1px] focus-visible:text-ivory motion-reduce:transition-none">
          Professionnels
        </a>

        <a href="#reservation" className="bg-[linear-gradient(90deg,var(--accent),var(--accent-soft))] bg-[length:0_1px] bg-[position:0_100%] bg-no-repeat pb-1.5 transition-[background-size,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[length:100%_1px] hover:text-ivory focus-visible:bg-[length:100%_1px] focus-visible:text-ivory motion-reduce:transition-none">
          Réservation
        </a>

        <a href={site.phoneHref} className="bg-[linear-gradient(90deg,var(--accent),var(--accent-soft))] bg-[length:0_1px] bg-[position:0_100%] bg-no-repeat pb-1.5 transition-[background-size,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[length:100%_1px] hover:text-ivory focus-visible:bg-[length:100%_1px] focus-visible:text-ivory motion-reduce:transition-none">
          {site.phone}
        </a>

        <Link
          href="/devis"
          className="bg-metal text-on-metal shadow-[0_18px_45px_rgba(var(--metal-rgb),.18)] rounded-2xl px-6 py-4 transition hover:scale-105"
        >
          Devis gratuit
        </Link>
      </div>
    </nav>
  );
}
