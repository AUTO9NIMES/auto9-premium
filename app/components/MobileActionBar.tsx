"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { site } from "../lib/site";

/*
 * Barre d'action mobile : apparaît une fois le haut de page dépassé, s'efface quand le footer
 * (qui a ses propres boutons) arrive à l'écran. Mobile uniquement, respecte la zone de geste iOS.
 */
export function MobileActionBar() {
  const [pastTop, setPastTop] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastTop(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const footer = document.querySelector("footer");
    const observer =
      footer && "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), {
            rootMargin: "0px 0px -10% 0px",
          })
        : null;
    if (footer) observer?.observe(footer);

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, []);

  const visible = pastTop && !footerVisible;

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-[translate,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none md:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 rounded-full border border-white/12 bg-forest/80 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.55)] backdrop-blur-xl">
        <Link
          href="/devis"
          className="flex h-12 flex-1 items-center justify-center rounded-full bg-metal text-[11px] font-black uppercase tracking-[0.2em] text-on-metal"
        >
          Devis gratuit →
        </Link>

        <a
          href={site.phoneHref}
          aria-label="Appeler AUTO 9"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-ivory"
        >
          <PhoneIcon />
        </a>

        <a
          href={site.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contacter AUTO 9 sur WhatsApp"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-ivory"
        >
          <WhatsAppIcon />
        </a>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L4 20.4l1.3-4a8.4 8.4 0 1 1 15.2-4.6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 8.2c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.4.5c-.1.1-.2.3 0 .5.4.7 1 1.4 1.8 1.9.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.7-.1l1.6.8c.3.1.4.3.4.6 0 .8-.6 1.5-1.4 1.7-.8.2-2.6-.2-4.4-1.8-1.8-1.6-2.8-3.7-2.6-4.7.1-.4.3-.7.4-.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M6.6 4.5 8.9 4c.5-.1 1 .2 1.2.7l1 2.5c.2.5.1 1-.3 1.3L9.5 9.7a11.8 11.8 0 0 0 4.8 4.8l1.2-1.3c.4-.4.9-.5 1.3-.3l2.5 1c.5.2.8.7.7 1.2l-.5 2.3c-.1.6-.6 1-1.2 1A14.8 14.8 0 0 1 5.6 5.7c0-.6.4-1.1 1-1.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
