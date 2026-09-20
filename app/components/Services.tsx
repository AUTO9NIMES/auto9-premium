"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Services.module.css";

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
    features: ["Intérieur + extérieur", "Nettoyage moteur offert", "Expérience complète"],
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
    features: ["Habitacle complet", "Aspiration & plastiques", "Finition premium"],
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
    features: ["Prélavage mousse", "Jantes & carrosserie", "Séchage microfibre"],
  },
  {
    id: "phares",
    eyebrow: "Restauration",
    name: "Rénovation phares",
    priceLabel: "À partir de",
    price: "69 €",
    video: "/media/services-v2/phares.mp4",
    poster: "/media/services-v2/phares.jpg",
    href: "/demande-speciale?type=phares",
    features: ["Transparence retrouvée", "Optiques rénovés", "Finition protégée"],
  },
  {
    id: "polissage",
    eyebrow: "Correction",
    name: "Polissage carrosserie",
    priceLabel: "Tarif",
    price: "Sur devis",
    video: "/media/services-v2/polissage.mp4",
    poster: "/media/services-v2/polissage.jpg",
    href: "/demande-speciale?type=polissage",
    features: ["Correction visuelle", "Profondeur des reflets", "Brillance"],
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
    features: ["Remise en état", "Finition homogène", "Détail premium"],
  },
] as const;

function wrappedDistance(index: number, active: number, length: number) {
  let distance = index - active;
  if (distance > length / 2) distance -= length;
  if (distance < -length / 2) distance += length;
  return distance;
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
    startTransition(() => {
      router.push(href);
    });
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
          pointerStart.current = event.clientX;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerUp={(event) => {
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
            const x = distance === 0 ? 0 : distance * (isMobile ? 118 : abs === 1 ? 305 : 505);
            const z = distance === 0 ? 70 : abs === 1 ? -65 : -150;
            const rotate = distance * (isMobile ? -14 : -20);
            const scale = distance === 0 ? 1 : abs === 1 ? (isMobile ? 0.84 : 0.83) : 0.72;
            const opacity = distance === 0 ? 1 : abs === 1 ? (isMobile ? 0.62 : 0.72) : isMobile ? 0.08 : 0.38;

            return (
              <article
                key={service.id}
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
                  <div className={styles.mediaTitle}>
                    <span className={styles.cardEyebrow}>{service.eyebrow}</span>
                    <h3>{service.name}</h3>
                  </div>
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.price}>
                    <span>{service.priceLabel}</span>
                    <strong>{service.price}</strong>
                  </div>
                  <div className={styles.features}>
                    {service.features.map((feature) => <span key={feature}>{feature}</span>)}
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
