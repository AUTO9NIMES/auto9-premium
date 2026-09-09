"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Services.module.css";

type Service = {
  id: string;
  name: string;
  eyebrow: string;
  price: string;
  href: string;
  cta: string;
  video: string;
  start: number;
  end: number;
  text: string;
  details: string[];
};

const DUO_VIDEO = "https://d2jqrm6oza8nb6.cloudfront.net/datasets/a7e6eaba-3b71-4599-9eb8-7aad932642f1.mov?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZTVmOGZiMjk3ZWI3ZDBjMiIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTEwNjA4OX0.ze-8xk61CcMGT0esvNmAFOVn_twCOhGbP5InFqjXx-c";

const services: Service[] = [
  {
    id: "duo",
    name: "Formule DUO",
    eyebrow: "Best seller",
    price: "À partir de 169 €",
    href: "/devis?service=duo",
    cta: "Choisir la formule DUO",
    video: DUO_VIDEO,
    start: 0,
    end: 19.2,
    text: "Le soin complet intérieur + extérieur pour retrouver une voiture nette, brillante et agréable à vivre.",
    details: ["Aspiration et nettoyage intérieur complet", "Pré-lavage et lavage extérieur", "Jantes, vitres et finitions", "Nettoyage moteur offert"],
  },
  {
    id: "interieur",
    name: "Lavage intérieur",
    eyebrow: "Confort",
    price: "À partir de 89 €",
    href: "/devis?service=interieur",
    cta: "Choisir l’intérieur",
    video: DUO_VIDEO,
    start: 6.0,
    end: 13.2,
    text: "Un habitacle propre, sain et soigné jusque dans les détails, avec une finition premium.",
    details: ["Aspiration complète", "Plastiques et tableau de bord", "Vitres intérieures", "Tapis et finitions"],
  },
  {
    id: "exterieur",
    name: "Lavage extérieur",
    eyebrow: "Brillance",
    price: "À partir de 89 €",
    href: "/devis?service=exterieur",
    cta: "Choisir l’extérieur",
    video: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/2480bd3e-c2ef-4987-9e29-42acb8069308.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOTU2MTBiZmUyNmEzZjYyZSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTEzMTY0Nn0.6NnhFDLwuHJAp4LAnwmgruJlPpaAgYMJN3aGsdhMhsM",
    start: 0,
    end: 7.8,
    text: "Une carrosserie propre et brillante grâce à un protocole de lavage précis et des finitions soignées.",
    details: ["Pré-lavage mousse", "Lavage microfibre", "Décontamination ferreuse", "Jantes, séchage et brillant pneus"],
  },
  {
    id: "phares",
    name: "Rénovation phares",
    eyebrow: "Restauration",
    price: "À partir de 69 €",
    href: "/demande-speciale?type=phares",
    cta: "Demander cette prestation",
    video: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/5066f38b-598e-4ca5-8db0-e004d62a3006.mov?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMDgzNzM5NzdiOTE3YTQ1ZCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTExMzcxOX0.AMH1SiQGiiDvkQz0LBwuV31821nWkXOp4HIVbQaVouA",
    start: 0,
    end: 4.9,
    text: "Restauration des optiques ternis ou opaques pour retrouver transparence, éclat et une finition protégée.",
    details: ["Préparation de l’optique", "Correction progressive", "Polissage de finition", "Protection finale"],
  },
  {
    id: "polissage",
    name: "Polissage carrosserie",
    eyebrow: "Correction",
    price: "Sur devis",
    href: "/demande-speciale?type=polissage",
    cta: "Demander un devis",
    video: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/b1dd8971-1f8e-43ce-834e-1d49ecbca853.mov?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiY2Q5YzZjOTBjOGE3NTg2ZCIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTE0NTQ4OH0.-MRyk-BpCs4QjqwyfthY0U3PgUyaGjvGhIolYiSDSvM",
    start: 0,
    end: 6.8,
    text: "Correction des défauts visuels pour retrouver profondeur, netteté des reflets et brillance de la peinture.",
    details: ["Inspection de la peinture", "Correction mécanique", "Finition brillante", "Protection adaptée sur demande"],
  },
  {
    id: "jantes",
    name: "Rénovation jantes",
    eyebrow: "Esthétique",
    price: "Sur devis",
    href: "/demande-speciale?type=jantes",
    cta: "Demander un devis",
    video: "https://d2jqrm6oza8nb6.cloudfront.net/datasets/66680976-2afb-4cdf-923f-6d8ffc040697.mov?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMzUyN2Q3MjA0YTg2Mzg3NCIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTE1MzgyNH0.Qmq6GkgxP-tDTjwxmLNaNw92x27ConIjL9sK5y8FpKg",
    start: 0,
    end: 6.8,
    text: "Remise en état esthétique des jantes selon leurs défauts pour retrouver une finition nette et homogène.",
    details: ["Préparation de la zone", "Correction des défauts", "Mise en peinture ciblée", "Finition et contrôle visuel"],
  },
];

export function Services() {
  const [activeId, setActiveId] = useState("duo");
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = useMemo(() => services.find((service) => service.id === activeId) ?? services[0], [activeId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const restart = () => {
      if (Math.abs(video.currentTime - active.start) > 0.2) video.currentTime = active.start;
      void video.play().catch(() => undefined);
    };

    if (video.readyState >= 1) restart();
    else video.addEventListener("loadedmetadata", restart, { once: true });

    return () => video.removeEventListener("loadedmetadata", restart);
  }, [active]);

  const loopSegment = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime >= active.end) {
      video.currentTime = active.start;
      void video.play().catch(() => undefined);
    }
  };

  const selectService = (service: Service) => setActiveId(service.id);

  return (
    <section id="services" className={styles.section} aria-labelledby="services-title">
      <div className={styles.container}>
        <header className={styles.heading} data-motion-reveal>
          <p className={styles.eyebrow}>Nos prestations</p>
          <h2 id="services-title">Choisissez votre <span>niveau de soin.</span></h2>
          <p className={styles.intro}>Survolez une prestation pour voir le soin en action. Sur mobile, touchez simplement le service qui vous intéresse.</p>
        </header>

        <div className={styles.experience}>
          <div className={styles.sideList}>
            {services.slice(0, 3).map((service) => (
              <ServiceButton key={service.id} service={service} active={activeId === service.id} onSelect={selectService} />
            ))}
          </div>

          <div className={styles.stageWrap}>
            <div className={styles.stage} aria-live="polite">
              <video
                ref={videoRef}
                key={active.video}
                className={styles.video}
                src={active.video}
                muted
                autoPlay
                playsInline
                preload="metadata"
                onTimeUpdate={loopSegment}
              />
              <div className={styles.stageShade} />
              <div className={styles.stageBadge}><span /> AUTO 9 EXPERIENCE</div>
              <div className={styles.stageTitle}>
                <span>{active.eyebrow}</span>
                <strong>{active.name}</strong>
                <em>{active.price}</em>
              </div>
            </div>
          </div>

          <div className={styles.sideList}>
            {services.slice(3).map((service) => (
              <ServiceButton key={service.id} service={service} active={activeId === service.id} onSelect={selectService} />
            ))}
          </div>
        </div>

        <div className={styles.mobileSelector} aria-label="Choisir une prestation">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              className={activeId === service.id ? styles.mobileActive : ""}
              onClick={() => selectService(service)}
            >
              {service.name}
            </button>
          ))}
        </div>

        <article className={styles.detailPanel} key={active.id}>
          <div className={styles.detailCopy}>
            <p className={styles.detailEyebrow}>{active.eyebrow}</p>
            <h3>{active.name}</h3>
            <p>{active.text}</p>
          </div>
          <div className={styles.detailMeta}>
            <ul>
              {active.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
            <Link href={active.href} className={styles.action}>{active.cta}<span aria-hidden="true">→</span></Link>
          </div>
        </article>
      </div>
    </section>
  );
}

function ServiceButton({ service, active, onSelect }: { service: Service; active: boolean; onSelect: (service: Service) => void }) {
  return (
    <button
      type="button"
      className={`${styles.serviceButton} ${active ? styles.active : ""}`}
      onMouseEnter={() => onSelect(service)}
      onFocus={() => onSelect(service)}
      onClick={() => onSelect(service)}
      aria-pressed={active}
    >
      <span className={styles.serviceIndex}>0{services.findIndex((item) => item.id === service.id) + 1}</span>
      <span className={styles.serviceText}><small>{service.eyebrow}</small><strong>{service.name}</strong><em>{service.price}</em></span>
      <span className={styles.serviceArrow} aria-hidden="true">↗</span>
    </button>
  );
}
