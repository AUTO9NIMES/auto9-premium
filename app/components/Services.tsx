"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./Services.module.css";

type Service = {
  id: string;
  name: string;
  tag: string;
  price: string;
  text: string;
  href: string;
  image: string;
  video: string;
  start: number;
  end: number;
  highlights: { icon: string; title: string; subtitle: string }[];
  details: string[];
};

type PremiumService = {
  id: string;
  tag: string;
  name: string;
  priceLabel: string;
  price: string;
  text: string;
  href: string;
  image: string;
  video: string;
  end: number;
};

const DUO_VIDEO = "https://d2jqrm6oza8nb6.cloudfront.net/datasets/f69de447-243a-45e0-be1a-564f1557f1d4.mov?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiYWJmYTg0NjdhODQ0MjAwYiIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTA3ODYzMX0.JZg_T7SezMYNO1oIAmZ66RHoGi5gaJoPX1pMsDDAGDI";
const EXTERIOR_VIDEO = "https://d2jqrm6oza8nb6.cloudfront.net/datasets/2480bd3e-c2ef-4987-9e29-42acb8069308.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOTU2MTBiZmUyNmEzZjYyZSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTEzMTY0Nn0.6NnhFDLwuHJAp4LAnwmgruJlPpaAgYMJN3aGsdhMhsM";

const services: Service[] = [
  {
    id: "duo",
    name: "Formule Duo",
    tag: "Best seller",
    price: "169 €",
    text: "Intérieur + extérieur, avec nettoyage moteur offert.",
    href: "/devis?service=duo",
    image: "/services/duo-card.png",
    video: DUO_VIDEO,
    start: 0,
    end: 9.95,
    highlights: [
      { icon: "sparkles", title: "Intérieur", subtitle: "complet" },
      { icon: "car", title: "Extérieur", subtitle: "complet" },
      { icon: "engine", title: "Nettoyage moteur", subtitle: "OFFERT" },
    ],
    details: [
      "Aspiration complète de l’habitacle",
      "Nettoyage des plastiques et du tableau de bord",
      "Nettoyage des vitres intérieures",
      "Nettoyage des tapis",
      "Parfum d’ambiance",
      "Pré-lavage de la carrosserie",
      "Démoustiquage",
      "Décontamination ferreuse",
      "Lavage microfibre",
      "Nettoyage des jantes",
      "Séchage complet",
      "Brillant pneus",
      "Nettoyage moteur offert",
    ],
  },
  {
    id: "interieur",
    name: "Intérieur",
    tag: "Confort",
    price: "89 €",
    text: "Un habitacle propre, sain et soigné jusque dans les détails.",
    href: "/devis?service=interieur",
    image: "/services/interieur-card.jpg",
    video: DUO_VIDEO,
    start: 5.25,
    end: 8.75,
    highlights: [
      { icon: "seat", title: "Sièges", subtitle: "& tapis" },
      { icon: "air", title: "Dépoussiérage", subtitle: "complet" },
      { icon: "shield", title: "Finitions", subtitle: "soignées" },
    ],
    details: [
      "Aspiration complète",
      "Nettoyage des plastiques",
      "Nettoyage du tableau de bord",
      "Nettoyage des vitres intérieures",
      "Nettoyage des tapis",
      "Parfum d’ambiance",
    ],
  },
  {
    id: "exterieur",
    name: "Extérieur",
    tag: "Brillance",
    price: "89 €",
    text: "Une carrosserie propre, brillante et des finitions soignées.",
    href: "/devis?service=exterieur",
    image: "/services/exterieur-card.jpg",
    video: EXTERIOR_VIDEO,
    start: 0,
    end: 7.8,
    highlights: [
      { icon: "wash", title: "Lavage", subtitle: "haute pression" },
      { icon: "sparkles", title: "Finition", subtitle: "brillante" },
      { icon: "wheel", title: "Jantes", subtitle: "nettoyées" },
    ],
    details: [
      "Pré-lavage",
      "Démoustiquage",
      "Décontamination ferreuse",
      "Lavage microfibre",
      "Nettoyage des jantes",
      "Séchage complet",
      "Brillant pneus",
    ],
  },
];

const premiumServices: PremiumService[] = [
  {
    id: "phares",
    tag: "Restauration",
    name: "Rénovation phares",
    priceLabel: "À partir de",
    price: "69 €",
    text: "Restauration des optiques ternis ou opaques pour retrouver transparence et éclat.",
    href: "/demande-speciale?type=phares",
    image: "/services/phares-card.jpg",
    video: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/5066f38b-598e-4ca5-8db0-e004d62a3006.mov?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMDgzNzM5NzdiOTE3YTQ1ZCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTExMzcxOX0.AMH1SiQGiiDvkQz0LBwuV31821nWkXOp4HIVbQaVouA",
    end: 4.9,
  },
  {
    id: "polissage",
    tag: "Correction",
    name: "Polissage carrosserie",
    priceLabel: "Tarif",
    price: "Sur devis",
    text: "Correction des défauts visuels et restauration de la profondeur et de la brillance de la carrosserie.",
    href: "/demande-speciale?type=polissage",
    image: "/services/polissage-card.jpg",
    video: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/b1dd8971-1f8e-43ce-834e-1d49ecbca853.mov?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiY2Q5YzZjOTBjOGE3NTg2ZCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTE0NTQ4OH0.-MRyk-BpCs4QjqwyfthY0U3PgUyaGjvGhIolYiSDSvM",
    end: 6.8,
  },
  {
    id: "jantes",
    tag: "Esthétique",
    name: "Rénovation jantes",
    priceLabel: "Tarif",
    price: "Sur devis",
    text: "Remise en état esthétique des jantes selon leur état, leurs défauts et la finition recherchée.",
    href: "/demande-speciale?type=jantes",
    image: "/services/jantes-card.jpg",
    video: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/66680976-2afb-4cdf-923f-6d8ffc040697.mov?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMzUyN2Q3MjA0YTg2Mzg3NCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTE1MzgyNH0.Qmq6GkgxP-tDTjwxmLNaNw92x27ConIjL9sK5y8FpKg",
    end: 6.8,
  },
];

export function Services() {
  const [cinematic, setCinematic] = useState<Service | null>(null);
  const cinematicRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!cinematic) return;
    const video = cinematicRef.current;
    if (!video) return;

    const startPlayback = () => {
      video.currentTime = cinematic.start;
      void video.play().catch(() => undefined);
    };

    if (video.readyState >= 1) startPlayback();
    else video.addEventListener("loadedmetadata", startPlayback, { once: true });

    return () => video.removeEventListener("loadedmetadata", startPlayback);
  }, [cinematic]);

  useEffect(() => {
    if (!cinematic) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCinematic(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [cinematic]);

  const loopCinematic = () => {
    const video = cinematicRef.current;
    if (!video || !cinematic) return;
    if (video.currentTime >= cinematic.end) {
      video.currentTime = cinematic.start;
      void video.play().catch(() => undefined);
    }
  };

  return (
    <section id="services" className={styles.section} aria-labelledby="services-title">
      <div className={styles.container}>
        <header className={styles.heading} data-motion-reveal>
          <p className={styles.eyebrow}>Nos prestations</p>
          <h2 id="services-title">Choisissez votre <span>niveau de soin.</span></h2>
          <p className={styles.intro}>Trois formules claires, pensées pour rendre à votre véhicule un aspect propre, soigné et valorisant.</p>
        </header>

        <div className={styles.grid}>
          {services.map((service, index) => (
            <article data-motion-reveal data-motion-delay={index * 90} key={service.id} className={`${styles.card} ${service.id === "duo" ? styles.featured : ""}`}>
              <button type="button" className={styles.cinematicTrigger} onClick={() => setCinematic(service)} aria-label={`Voir ${service.name} en action`}>
                <div className={styles.overview}>
                  <div className={styles.photo}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={service.image} alt={service.name} loading="lazy" />
                    <span className={styles.playBadge}><span>▶</span> Voir le soin en action</span>
                  </div>
                  <div className={styles.copy}>
                    <span className={styles.tag}>{service.tag}</span>
                    <h3>{service.name}</h3>
                    <p className={styles.description}>{service.text}</p>
                    <div className={styles.price}><span>À partir de</span><strong>{service.price}</strong></div>
                  </div>
                </div>
              </button>
              <Link href={service.href} className={styles.action}>Choisir cette formule <span aria-hidden="true">→</span></Link>
              <details className={styles.details}>
                <summary>Voir le détail des prestations <span aria-hidden="true">+</span></summary>
                <div className={styles.expanded}>
                  <div className={styles.highlights}>
                    {service.highlights.map((item) => (
                      <div key={item.title}><ServiceIcon type={item.icon} /><span>{item.title} <strong>{item.subtitle}</strong></span></div>
                    ))}
                  </div>
                  <ul>{service.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
                </div>
              </details>
            </article>
          ))}
        </div>

        <header className={styles.premiumHeading} data-motion-reveal>
          <div><p className={styles.eyebrow}>Expertise & rénovation</p><h2>Pour aller plus loin.</h2></div>
          <p className={styles.intro}>Trois prestations ciblées, présentées dans le même univers que nos formules principales. Survolez l’image pour voir la rénovation en action.</p>
        </header>

        <div className={styles.grid}>
          {premiumServices.map((service, index) => (
            <article data-motion-reveal data-motion-delay={index * 90} key={service.id} className={`${styles.card} ${styles.premium}`}>
              <div className={styles.overview}>
                <PremiumMedia service={service} />
                <div className={styles.copy}>
                  <span className={styles.tag}>{service.tag}</span>
                  <h3>{service.name}</h3>
                  <p className={styles.description}>{service.text}</p>
                  <div className={styles.price}><span>{service.priceLabel}</span><strong>{service.price}</strong></div>
                </div>
              </div>
              <Link href={service.href} className={styles.action}>Demander cette prestation <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      </div>

      {cinematic && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={`${cinematic.name} en action`} onMouseDown={() => setCinematic(null)}>
          <div className={styles.modalCard} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className={styles.closeButton} onClick={() => setCinematic(null)} aria-label="Fermer">×</button>
            <video ref={cinematicRef} className={styles.modalVideo} src={cinematic.video} muted autoPlay playsInline preload="metadata" onTimeUpdate={loopCinematic} />
            <div className={styles.modalShade} />
            <div className={styles.modalTitle}>
              <span>{cinematic.tag}</span>
              <strong>{cinematic.name}</strong>
              <em>À partir de {cinematic.price}</em>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PremiumMedia({ service }: { service: PremiumService }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  const start = () => {
    setActive(true);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  };

  const stop = () => {
    setActive(false);
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  const loop = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime >= service.end) video.currentTime = 0;
  };

  return (
    <div className={styles.photo} onMouseEnter={start} onMouseLeave={stop} onFocus={start} onBlur={stop} tabIndex={0}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={service.image} alt={service.name} loading="lazy" className={active ? styles.mediaHidden : ""} />
      <video ref={videoRef} className={`${styles.hoverVideo} ${active ? styles.hoverVideoActive : ""}`} src={service.video} muted playsInline preload="metadata" onTimeUpdate={loop} />
      <span className={styles.hoverHint}>Survolez pour voir en action</span>
    </div>
  );
}

function ServiceIcon({ type }: { type: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (type === "sparkles") return <svg {...common}><path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z" /><path d="m18.5 13.5.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" /><path d="m5 13 .9 2.6L8.5 16l-2.6.9L5 19.5l-.9-2.6L1.5 16l2.6-.4L5 13Z" /></svg>;
  if (type === "car") return <svg {...common}><path d="M5 16h14l-1.4-6.1A2 2 0 0 0 15.7 8H8.3a2 2 0 0 0-1.9 1.9L5 16Z" /><path d="M4 16v3M20 16v3M7 19h10M7.5 13h.01M16.5 13h.01" /></svg>;
  if (type === "engine") return <svg {...common}><path d="M7 8h8l2 2h3v7h-3l-2 2H7l-2-2H3v-7h2l2-2Z" /><path d="M9 5v3M13 5v3M9 13h4" /></svg>;
  if (type === "seat") return <svg {...common}><path d="M8 4v8a3 3 0 0 0 3 3h5v5" /><path d="M8 7h5v5H8M5 20h12" /></svg>;
  if (type === "air") return <svg {...common}><path d="M4 8h9a2 2 0 1 0-2-2M3 12h14a2 2 0 1 1-2 2M4 16h7" /></svg>;
  if (type === "shield") return <svg {...common}><path d="M12 3 5 6v5c0 4.6 2.9 8 7 10 4.1-2 7-5.4 7-10V6l-7-3Z" /><path d="m9.5 12 1.7 1.7 3.5-3.7" /></svg>;
  if (type === "wash") return <svg {...common}><path d="M7 5h10M8 8h8M5 12c1.2 0 2 .8 2 2s-.8 2-2 2-2-.8-2-2 .8-2 2-2Zm14 0c1.2 0 2 .8 2 2s-.8 2-2 2-2-.8-2-2 .8-2 2-2Z" /><path d="M9 14h6M8 19h8" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.2" /><path d="M12 5v5M18 9l-4 2M18 15l-4-2M12 19v-5M6 15l4-2M6 9l4 2" /></svg>;
}
