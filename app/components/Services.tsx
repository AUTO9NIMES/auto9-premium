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
  const [isMobile, setIsMobile] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState<string[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const videos = useRef<Record<string, HTMLVideoElement | null>>({});

  const primaryServices = [
    services.find((service) => service.id === "exterieur")!,
    services.find((service) => service.id === "duo")!,
    services.find((service) => service.id === "interieur")!,
  ];

  const complementaryServices = services.filter(
    (service) => !["duo", "interieur", "exterieur"].includes(service.id),
  );

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
    const element = stage.current;
    if (!element) return;

    const warmup = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearby(true);
          warmup.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );

    const playback = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.08);
      },
      { threshold: [0, 0.08] },
    );

    warmup.observe(element);
    playback.observe(element);

    return () => {
      warmup.disconnect();
      playback.disconnect();
    };
  }, []);

  useEffect(() => {
    const syncPlayback = () => {
      Object.entries(videos.current).forEach(([id, video]) => {
        if (!video) return;

        if (!nearby || !visible || document.hidden) {
          video.pause();
          return;
        }

        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;

        void video.play().catch(() => undefined);
      });
    };

    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    window.addEventListener("pageshow", syncPlayback);

    return () => {
      document.removeEventListener("visibilitychange", syncPlayback);
      window.removeEventListener("pageshow", syncPlayback);
      Object.values(videos.current).forEach((video) => video?.pause());
    };
  }, [nearby, visible]);

  const openService = (href: string) => {
    startTransition(() => router.push(href));
  };

  const playVideo = (id: string) => {
    const video = videos.current[id];
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => undefined);
  };

  const renderCard = (
    service: (typeof services)[number],
    priority = false,
  ) => (
    <article
      key={service.id}
      data-service={service.id}
      className={`${styles.card} ${styles.active} ${styles.fixedCard} ${priority ? styles.popular : ""}`}
    >
      {priority && (
        <div className={styles.popularBadge}>Offre la plus populaire</div>
      )}

      <div className={styles.media}>
        <video
          ref={(node) => {
            videos.current[service.id] = node;
          }}
          className={styles.video}
          src={
            nearby
              ? isMobile
                ? `/media/services-mobile-v1/${service.id}.mp4`
                : service.video
              : undefined
          }
          poster={service.poster}
          autoPlay={visible}
          muted
          loop
          playsInline
          preload={nearby ? "metadata" : "none"}
          onCanPlay={(event) => {
            if (!visible || document.hidden) return;
            event.currentTarget.muted = true;
            void event.currentTarget.play().catch(() => undefined);
          }}
          onPlaying={() =>
            setPlaying((current) =>
              current.includes(service.id) ? current : [...current, service.id],
            )
          }
          onPause={() =>
            setPlaying((current) => current.filter((id) => id !== service.id))
          }
        />

        <div className={styles.mediaShade} />
        <div className={styles.badge}>{service.eyebrow}</div>

        {!playing.includes(service.id) && (
          <button
            type="button"
            className={styles.playButton}
            aria-label={`Lire la vidéo ${service.name}`}
            onClick={(event) => {
              event.stopPropagation();
              playVideo(service.id);
            }}
          >
            <span aria-hidden="true">▶</span>
          </button>
        )}

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
              <span className={styles.featureIcon}>
                <FeatureIcon name={feature.icon} />
              </span>
              <span>{feature.label}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className={styles.action}
          onClick={() => openService(service.href)}
        >
          Découvrir <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );

  return (
    <section id="services" className={styles.section} aria-labelledby="services-title">
      <div className={styles.heading} data-motion-reveal>
        <p className={styles.eyebrow}>AUTO 9</p>
        <h2 id="services-title">Nos prestations</h2>
        <p>Choisissez la formule adaptée à votre véhicule.</p>
      </div>

      <div ref={stage} className={styles.fixedStage}>
        <div className={styles.primaryGrid}>
          {primaryServices.map((service) =>
            renderCard(service, service.id === "duo"),
          )}
        </div>

        <div className={styles.secondaryBlock}>
          <p className={styles.secondaryEyebrow}>Pour aller plus loin</p>
          <h3 className={styles.secondaryTitle}>Prestations complémentaires</h3>

          <div className={styles.secondaryGrid}>
            {complementaryServices.map((service) => renderCard(service))}
          </div>
        </div>
      </div>
    </section>
  );
}
