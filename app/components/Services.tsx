"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Services.module.css";

const DUO_VIDEO = "https://d2jqrm6oza8nb6.cloudfront.net/datasets/10dc8e99-a159-45a1-b805-fead3eb3f136.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNzFhYTFkZmRlZjg3NmQ3OCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTY0MzAwNX0.sQxZu3qBLddnVyFbHcHRor02agyY-b3ow-qJNite7o0";
const INTERIOR_VIDEO = "https://d2jqrm6oza8nb6.cloudfront.net/datasets/667f3763-bfe6-46c3-bb6b-8023878e3e05.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiODdlMTI4YjYwNGEzN2E4OCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTYxOTM4Mn0.R-bsG4dt0ootWMdtudvYjpN7SX341t2yd_-Ob7lC0kc";
const EXTERIOR_VIDEO = "https://d2jqrm6oza8nb6.cloudfront.net/datasets/872f9f84-e3be-43dd-a024-f14146295a2e.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZTNlZDZkZWNhZTZmOGEzYSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTYxMzgwNH0.KMPFlqIQmCLCV9QpOt8YU-jaw-MsZaqCPqrvD-ksf3w";

const services = [
  {
    name: "Formule Duo",
    tag: "Best seller",
    price: "169 €",
    text: "Intérieur + extérieur, avec nettoyage moteur offert.",
    href: "/devis?service=duo",
    image: "/services/duo-card.png",
    video: DUO_VIDEO,
    videoStart: 0,
    videoDuration: 4,
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
    name: "Intérieur",
    tag: "Confort",
    price: "89 €",
    text: "Un habitacle propre, sain et soigné jusque dans les détails.",
    href: "/devis?service=interieur",
    image: "/services/interieur-card.jpg",
    video: INTERIOR_VIDEO,
    videoStart: 0,
    videoDuration: 4,
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
    name: "Extérieur",
    tag: "Brillance",
    price: "89 €",
    text: "Une carrosserie propre, brillante et des finitions soignées.",
    href: "/devis?service=exterieur",
    image: "/services/exterieur-card.jpg",
    video: EXTERIOR_VIDEO,
    videoStart: 0,
    videoDuration: 4,
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

const premiumServices = [
  {
    id: "phares",
    tag: "Restauration",
    name: "Rénovation phares",
    price: "À partir de 69 €",
    text: "Restauration des optiques ternis ou opaques pour retrouver transparence, éclat et une finition protégée.",
    href: "/demande-speciale?type=phares",
    cta: "Demander cette prestation",
    video: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/2c2b25d9-ecd1-40b3-9e29-c22fb0ddf2bc.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMjVhZjE1YjQzNGZjZGVjMSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTQ3Mjk0OH0.l0sjsML6kxw2kGKvcbLn2cyXH2JtlaN0ncdejBgp1Jk",
    end: 4.9,
  },
  {
    id: "polissage",
    tag: "Correction",
    name: "Polissage carrosserie",
    price: "Sur devis",
    text: "Correction des défauts visuels pour retrouver profondeur, netteté des reflets et brillance de la peinture.",
    href: "/demande-speciale?type=polissage",
    cta: "Demander un devis",
    video: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/ed292b25-6a1d-415a-8937-ff950758fade.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMjcxNzAzYWFlZjgwYzg0YyIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTQ3NDA5MH0.nWZomkHeOyqDillHq-2lITGzV_hgG5fLjyavCYX4vws",
    end: 6.5,
  },
  {
    id: "jantes",
    tag: "Esthétique",
    name: "Rénovation jantes",
    price: "Sur devis",
    text: "Remise en état esthétique des jantes selon leurs défauts pour retrouver une finition nette et homogène.",
    href: "/demande-speciale?type=jantes",
    cta: "Demander un devis",
    video: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/cb12d5f0-5865-467b-a0df-568e56eaac5f.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiODFkZDEwZTg1OTA3N2Q0ZiIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTQzMDI0OH0.IcupEXOMnPKtLYdEjOFkZTUYnTTl8Hbmxo-ZDGoirQU",
    end: 6.8,
  },
];

type MainService = (typeof services)[number];

export function Services() {
  const router = useRouter();
  const [activePremiumId, setActivePremiumId] = useState("phares");
  const [cinematic, setCinematic] = useState<MainService | null>(null);
  const premiumVideoRef = useRef<HTMLVideoElement>(null);
  const cinematicVideoRef = useRef<HTMLVideoElement>(null);
  const activePremium = useMemo(
    () => premiumServices.find((service) => service.id === activePremiumId) ?? premiumServices[0],
    [activePremiumId],
  );

  const playPremium = () => {
    const video = premiumVideoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    void video.play().catch(() => undefined);
  };

  useEffect(() => {
    const video = premiumVideoRef.current;
    if (!video) return;

    const play = () => {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    };

    if (video.readyState >= 2) play();
    else {
      video.addEventListener("loadeddata", play, { once: true });
      video.addEventListener("canplay", play, { once: true });
    }

    return () => {
      video.removeEventListener("loadeddata", play);
      video.removeEventListener("canplay", play);
    };
  }, [activePremium]);

  useEffect(() => {
    if (!cinematic) return;
    const video = cinematicVideoRef.current;
    if (!video) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const play = () => {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.currentTime = cinematic.videoStart;
      void video.play().catch(() => undefined);
    };

    if (video.readyState >= 2) play();
    else {
      video.addEventListener("loadeddata", play, { once: true });
      video.addEventListener("canplay", play, { once: true });
    }

    const fallback = window.setTimeout(() => router.push(cinematic.href), (cinematic.videoDuration + 2.5) * 1000);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(fallback);
      video.removeEventListener("loadeddata", play);
      video.removeEventListener("canplay", play);
    };
  }, [cinematic, router]);

  const loopPremium = () => {
    const video = premiumVideoRef.current;
    if (!video) return;
    if (video.currentTime >= activePremium.end) {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    }
  };

  const progressCinematic = () => {
    const video = cinematicVideoRef.current;
    if (!video || !cinematic) return;
    if (video.currentTime >= cinematic.videoStart + cinematic.videoDuration) {
      video.pause();
      router.push(cinematic.href);
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
            <article data-motion-reveal data-motion-delay={index * 90} key={service.name} className={`${styles.card} ${service.name === "Formule Duo" ? styles.featured : ""}`}>
              <div className={styles.overview}>
                <div className={styles.photo}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={service.image} alt={service.name} loading="lazy" />
                </div>
                <div className={styles.copy}>
                  <span className={styles.tag}>{service.tag}</span>
                  <h3>{service.name}</h3>
                  <p className={styles.description}>{service.text}</p>
                  <div className={styles.price}><span>À partir de</span><strong>{service.price}</strong></div>
                </div>
              </div>
              <button type="button" className={styles.action} onClick={() => setCinematic(service)}>
                Choisir cette prestation <span aria-hidden="true">→</span>
              </button>
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
          <p className={styles.intro}>Survolez une prestation pour découvrir le soin en action. Sur mobile, touchez simplement la prestation.</p>
        </header>

        <div className={styles.premiumExperience}>
          <div className={styles.premiumSelector}>
            {premiumServices.map((service, index) => (
              <button
                key={service.id}
                type="button"
                className={`${styles.premiumChoice} ${activePremiumId === service.id ? styles.premiumChoiceActive : ""}`}
                onMouseEnter={() => setActivePremiumId(service.id)}
                onFocus={() => setActivePremiumId(service.id)}
                onClick={() => setActivePremiumId(service.id)}
                aria-pressed={activePremiumId === service.id}
              >
                <span className={styles.premiumIndex}>0{index + 1}</span>
                <span className={styles.premiumChoiceText}>
                  <small>{service.tag}</small>
                  <strong>{service.name}</strong>
                  <em>{service.price}</em>
                </span>
                <span className={styles.premiumArrow} aria-hidden="true">↗</span>
              </button>
            ))}
          </div>

          <div className={styles.premiumStageWrap}>
            <div className={styles.premiumStage} aria-live="polite" onClick={playPremium}>
              <video
                ref={premiumVideoRef}
                key={activePremium.video}
                className={styles.premiumVideo}
                src={activePremium.video}
                muted
                autoPlay
                playsInline
                preload="auto"
                onLoadedData={playPremium}
                onCanPlay={playPremium}
                onTimeUpdate={loopPremium}
              />
              <div className={styles.premiumShade} />
              <div className={styles.premiumStageTitle}>
                <span>{activePremium.tag}</span>
                <strong>{activePremium.name}</strong>
                <em>{activePremium.price}</em>
              </div>
            </div>
            <div className={styles.premiumDetail}>
              <p>{activePremium.text}</p>
              <Link href={activePremium.href} className={styles.premiumAction}>{activePremium.cta}<span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </div>
      </div>

      {cinematic && (
        <div className={styles.cinematicOverlay} role="dialog" aria-modal="true" aria-label={`${cinematic.name} en action`}>
          <div className={styles.cinematicFrame}>
            <video
              ref={cinematicVideoRef}
              key={`${cinematic.name}-${cinematic.videoStart}`}
              className={styles.cinematicVideo}
              src={cinematic.video}
              poster={cinematic.image}
              muted
              autoPlay
              playsInline
              preload="auto"
              onLoadedData={() => {
                const video = cinematicVideoRef.current;
                if (!video) return;
                video.currentTime = cinematic.videoStart;
                void video.play().catch(() => undefined);
              }}
              onCanPlay={() => {
                const video = cinematicVideoRef.current;
                if (!video) return;
                void video.play().catch(() => undefined);
              }}
              onTimeUpdate={progressCinematic}
            />
            <div className={styles.cinematicShade} />
            <div className={styles.cinematicTitle}>{cinematic.name}</div>
          </div>
        </div>
      )}
    </section>
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
