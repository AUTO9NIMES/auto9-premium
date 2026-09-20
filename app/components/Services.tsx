"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Services.module.css";

type IconName =
  | "interior"
  | "vacuum"
  | "sparkles"
  | "drop"
  | "wheel"
  | "headlight"
  | "shield"
  | "polish"
  | "depth"
  | "repair";

const services = [
  {
    id: "duo",
    eyebrow: "Formule",
    name: "Formule DUO",
    priceLabel: "À partir de",
    price: "169 €",
    video: "/media/services-v2/duo.mp4",
    poster: "/media/services-v2/duo.jpg",
    href: "/devis?service=duo",
    duration: "00:05",
    features: [
      { label: "Intérieur + extérieur", icon: "sparkles" },
      { label: "Moteur offert", icon: "drop" },
      { label: "Expérience complète", icon: "shield" },
    ],
  },
  {
    id: "interieur",
    eyebrow: "Formule",
    name: "Intérieur",
    priceLabel: "À partir de",
    price: "89 €",
    video: "/media/services-v2/interieur.mp4",
    poster: "/media/services-v2/interieur.jpg",
    href: "/devis?service=interieur",
    duration: "00:05",
    features: [
      { label: "Habitacle complet", icon: "interior" },
      { label: "Aspiration & plastiques", icon: "vacuum" },
      { label: "Finition premium", icon: "sparkles" },
    ],
  },
  {
    id: "exterieur",
    eyebrow: "Formule",
    name: "Extérieur",
    priceLabel: "À partir de",
    price: "89 €",
    video: "/media/services-v2/exterieur.mp4",
    poster: "/media/services-v2/exterieur.jpg",
    href: "/devis?service=exterieur",
    duration: "00:05",
    features: [
      { label: "Prélavage mousse", icon: "drop" },
      { label: "Jantes & carrosserie", icon: "wheel" },
      { label: "Séchage microfibre", icon: "sparkles" },
    ],
  },
  {
    id: "phares",
    eyebrow: "Rénovation",
    name: "Phares",
    priceLabel: "À partir de",
    price: "69 €",
    video: "/media/services-v2/phares.mp4",
    poster: "/media/services-v2/phares.jpg",
    href: "/demande-speciale?type=phares",
    duration: "00:05",
    features: [
      { label: "Clarté retrouvée", icon: "headlight" },
      { label: "Optiques rénovés", icon: "sparkles" },
      { label: "Finition protégée", icon: "shield" },
    ],
  },
  {
    id: "polissage",
    eyebrow: "Correction",
    name: "Polissage",
    priceLabel: "Tarif",
    price: "Sur devis",
    video: "/media/services-v2/polissage.mp4",
    poster: "/media/services-v2/polissage.jpg",
    href: "/demande-speciale?type=polissage",
    duration: "00:05",
    features: [
      { label: "Correction visuelle", icon: "polish" },
      { label: "Profondeur des reflets", icon: "depth" },
      { label: "Brillance", icon: "sparkles" },
    ],
  },
  {
    id: "jantes",
    eyebrow: "Esthétique",
    name: "Rénovation jantes",
    priceLabel: "Tarif",
    price: "Sur devis",
    video: "/media/services-v2/jantes.mp4",
    poster: "/media/services-v2/jantes.jpg",
    href: "/demande-speciale?type=jantes",
    duration: "00:05",
    features: [
      { label: "Remise en état", icon: "repair" },
      { label: "Finition homogène", icon: "wheel" },
      { label: "Détail premium", icon: "sparkles" },
    ],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  eyebrow: string;
  name: string;
  priceLabel: string;
  price: string;
  video: string;
  poster: string;
  href: string;
  duration: string;
  features: ReadonlyArray<{ label: string; icon: IconName }>;
}>;

function wrappedDistance(index: number, active: number, length: number) {
  let distance = index - active;
  if (distance > length / 2) distance -= length;
  if (distance < -length / 2) distance += length;
  return distance;
}

function FeatureIcon({ name }: { name: IconName }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "drop") {
    return <svg {...common}><path d="M12 2.8s-6 6.7-6 11.4a6 6 0 0 0 12 0C18 9.5 12 2.8 12 2.8Z" /></svg>;
  }
  if (name === "wheel") {
    return <svg {...common}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.2" /><path d="m12 3.5 1.4 6.2M20.5 12l-6.2 1.4M12 20.5l-1.4-6.2M3.5 12l6.2-1.4M18 6l-4.3 4.3M18 18l-4.3-4.3M6 18l4.3-4.3M6 6l4.3 4.3" /></svg>;
  }
  if (name === "sparkles") {
    return <svg {...common}><path d="m12 3 1.1 3.1L16 7.2l-2.9 1.1L12 11.5l-1.1-3.2L8 7.2l2.9-1.1L12 3ZM18.5 12l.8 2.1 2.2.9-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.9.8-2.1ZM6.3 13.2l1.1 2.8 2.8 1.1-2.8 1.1L6.3 21l-1.1-2.8-2.7-1.1L5.2 16l1.1-2.8Z" /></svg>;
  }
  if (name === "interior") {
    return <svg {...common}><path d="M6 16.5V9.8c0-1.8 1.4-3.3 3.2-3.3h.6v6.1h5.6c1.4 0 2.6 1.1 2.6 2.6v1.3M4 18.5h16M7 18.5v2M17 18.5v2" /></svg>;
  }
  if (name === "vacuum") {
    return <svg {...common}><path d="M5 7.5a3 3 0 1 1 4.8 2.4l-1.6 1.2V16M8.2 16h4.3a3.5 3.5 0 0 1 3.5 3.5M16 19.5h3M4 16h4.2" /><path d="M17 4.2c1.2 1.2 1.8 2.5 1.8 4.1" /></svg>;
  }
  if (name === "headlight") {
    return <svg {...common}><path d="M9.5 5.5C6.4 6.8 4.8 9 4.8 12s1.6 5.2 4.7 6.5h3.8V5.5H9.5Z" /><path d="M16 8h4M16 12h5M16 16h4" /></svg>;
  }
  if (name === "shield") {
    return <svg {...common}><path d="M12 3.2 19 6v5.1c0 4.5-2.8 7.9-7 9.7-4.2-1.8-7-5.2-7-9.7V6l7-2.8Z" /><path d="m9.2 12 1.8 1.8 3.8-4" /></svg>;
  }
  if (name === "polish") {
    return <svg {...common}><circle cx="10" cy="14" r="5.5" /><path d="M13.8 10.2 18 6M16.5 4.5 19.5 7.5M6 6.5h4M8 4.5v4" /></svg>;
  }
  if (name === "depth") {
    return <svg {...common}><path d="M4 15c4-5 12-5 16 0M6 18c3-3.2 9-3.2 12 0M9 21c1.8-1.5 4.2-1.5 6 0" /><path d="m12 3 1 2.7 2.7 1L13 7.8l-1 2.7-1-2.7-2.7-1 2.7-1L12 3Z" /></svg>;
  }
  return <svg {...common}><path d="M4.5 15.8 8 12.3l3.7 3.7 7.8-7.8" /><path d="M14.5 8.2h5v5M6 6.5h4M8 4.5v4" /></svg>;
}

export function Services() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const pointerStart = useRef<number | null>(null);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    services.forEach((service) => router.prefetch(service.href));
  }, [router]);

  useEffect(() => {
    videos.current.forEach((video, index) => {
      if (!video) return;
      if (index === active) {
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.currentTime = 0;
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [active]);

  const move = (delta: number) => {
    setActive((current) => (current + delta + services.length) % services.length);
  };

  const openService = (href: string) => {
    startTransition(() => router.push(href));
  };

  const playActiveVideo = (index: number) => {
    if (index !== active) {
      setActive(index);
      return;
    }
    const video = videos.current[index];
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  };

  return (
    <section id="services" className={styles.section} aria-labelledby="services-title">
      <div className={styles.heading} data-motion-reveal>
        <p className={styles.eyebrow}>AUTO 9</p>
        <h2 id="services-title">Nos prestations</h2>
        <p>Faites glisser pour découvrir nos services.</p>
      </div>

      <div
        className={styles.stage}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          pointerStart.current = event.clientX;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerUp={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          if (pointerStart.current === null) return;
          const delta = event.clientX - pointerStart.current;
          pointerStart.current = null;
          if (Math.abs(delta) > 42) move(delta < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
      >
        <button
          type="button"
          className={`${styles.arrow} ${styles.prev}`}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => { event.stopPropagation(); move(-1); }}
          aria-label="Prestation précédente"
        >‹</button>

        <div className={styles.deck}>
          {services.map((service, index) => {
            const distance = wrappedDistance(index, active, services.length);
            const abs = Math.abs(distance);
            const x = distance === 0 ? 0 : distance * (isMobile ? 116 : abs === 1 ? 330 : 545);
            const z = distance === 0 ? 90 : abs === 1 ? -55 : -150;
            const rotate = distance * (isMobile ? -12 : -18);
            const scale = distance === 0 ? 1 : abs === 1 ? (isMobile ? 0.84 : 0.81) : 0.69;
            const opacity = distance === 0 ? 1 : abs === 1 ? (isMobile ? 0.55 : 0.7) : isMobile ? 0.06 : 0.3;

            return (
              <article
                key={service.id}
                data-service={service.id}
                className={`${styles.card} ${distance === 0 ? styles.active : ""}`}
                style={{
                  transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotate}deg) scale(${scale})`,
                  opacity,
                  zIndex: 100 - abs,
                  pointerEvents: abs <= 2 ? "auto" : "none",
                }}
                onClick={() => {
                  if (index !== active) setActive(index);
                }}
              >
                <div className={styles.media}>
                  <video
                    ref={(node) => {
                      videos.current[index] = node;
                    }}
                    className={styles.video}
                    src={service.video}
                    poster={service.poster}
                    muted
                    loop
                    playsInline
                    preload={index === active ? "auto" : "metadata"}
                  />
                  <div className={styles.mediaShade} />

                  <div className={styles.badge}>{service.eyebrow}</div>

                  <button
                    type="button"
                    className={styles.playButton}
                    aria-label={`Lire la vidéo ${service.name}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerUp={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      playActiveVideo(index);
                    }}
                  >
                    <span aria-hidden="true">▶</span>
                  </button>

                  <div className={styles.duration}>{service.duration}</div>

                  <div className={styles.mediaTitle}>
                    <h3>{service.name}</h3>
                  </div>
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.priceBlock}>
                    <span className={styles.priceLabel}>{service.priceLabel}</span>
                    <div className={styles.priceRow}>
                      <strong className={styles.priceValue}>{service.price}</strong>
                      <span className={styles.priceLine} aria-hidden="true" />
                    </div>
                  </div>

                  <div className={styles.features}>
                    {service.features.map((feature) => (
                      <div className={styles.feature} key={feature.label}>
                        <span className={styles.featureIcon}><FeatureIcon name={feature.icon} /></span>
                        <span>{feature.label}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={styles.action}
                    onClick={(event) => {
                      event.stopPropagation();
                      openService(service.href);
                    }}
                  >
                    Découvrir <span aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <button
          type="button"
          className={`${styles.arrow} ${styles.next}`}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => { event.stopPropagation(); move(1); }}
          aria-label="Prestation suivante"
        >›</button>
      </div>

      <div className={styles.controls}>
        <div className={styles.hint}><span>←</span><span className={styles.dragIcon}>☝</span><span>Glissez ou utilisez les flèches</span><span>→</span></div>
        <div className={styles.dots} aria-label="Navigation des prestations">
          {services.map((service, index) => (
            <button
              key={service.id}
              type="button"
              className={`${styles.dot} ${index === active ? styles.dotActive : ""}`}
              onClick={() => setActive(index)}
              aria-label={`Voir ${service.name}`}
              aria-pressed={index === active}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
