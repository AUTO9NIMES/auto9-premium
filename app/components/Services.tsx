import Link from "next/link";
import styles from "./Services.module.css";

const services = [
  {
    name: "Formule Duo",
    tag: "Best seller",
    price: "169 €",
    text: "Intérieur + extérieur, avec nettoyage moteur offert.",
    href: "/devis?service=duo",
    image: "/services/duo-card.png",
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
    tag: "Restauration",
    name: "Rénovation optiques",
    priceLabel: "À partir de",
    price: "69 €",
    text: "Restauration des optiques ternis, jaunis ou opaques pour retrouver transparence et éclat.",
    href: "/demande-speciale?type=phares",
    image: "/services/phares-card.jpg",
  },
  {
    tag: "Correction",
    name: "Polissage carrosserie",
    priceLabel: "Tarif",
    price: "Sur devis",
    text: "Correction des défauts visuels et restauration de la profondeur et de la brillance de la carrosserie.",
    href: "/demande-speciale?type=polissage",
    image: "/services/polissage-card.jpg",
  },
  {
    tag: "Esthétique",
    name: "Réparation de jantes",
    priceLabel: "Tarif",
    price: "Sur devis",
    text: "Remise en état esthétique des jantes selon leur état, leurs défauts et la finition recherchée.",
    href: "/demande-speciale?type=jantes",
    image: "/services/jantes-card.jpg",
  },
];

export function Services() {
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
                  {/* Existing editorial photos retain their original files. */}
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
          <p className={styles.intro}>Des prestations ciblées pour restaurer, corriger et valoriser les éléments qui méritent une attention particulière.</p>
        </header>
        <div className={styles.grid}>
          {premiumServices.map((service, index) => (
            <article data-motion-reveal data-motion-delay={index * 90} key={service.name} className={`${styles.card} ${styles.premium}`}>
              <div className={styles.overview}>
                <div className={styles.photo}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={service.image} alt={service.name} loading="lazy" />
                </div>
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

  if (type === "sparkles") {
    return (
      <svg {...common}>
        <path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z" />
        <path d="m18.5 13.5.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
        <path d="m5 13 .9 2.6L8.5 16l-2.6.9L5 19.5l-.9-2.6L1.5 16l2.6-.4L5 13Z" />
      </svg>
    );
  }

  if (type === "car") {
    return (
      <svg {...common}>
        <path d="M5 16h14l-1.4-6.1A2 2 0 0 0 15.7 8H8.3a2 2 0 0 0-1.9 1.9L5 16Z" />
        <path d="M4 16v3M20 16v3M7 19h10M7.5 13h.01M16.5 13h.01" />
      </svg>
    );
  }

  if (type === "engine") {
    return (
      <svg {...common}>
        <path d="M7 8h8l2 2h3v7h-3l-2 2H7l-2-2H3v-7h2l2-2Z" />
        <path d="M9 5v3M13 5v3M9 13h4" />
      </svg>
    );
  }

  if (type === "seat") {
    return (
      <svg {...common}>
        <path d="M8 4v8a3 3 0 0 0 3 3h5v5" />
        <path d="M8 7h5v5H8M5 20h12" />
      </svg>
    );
  }

  if (type === "air") {
    return (
      <svg {...common}>
        <path d="M4 8h9a2 2 0 1 0-2-2M3 12h14a2 2 0 1 1-2 2M4 16h7" />
      </svg>
    );
  }

  if (type === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 5 6v5c0 4.6 2.9 8 7 10 4.1-2 7-5.4 7-10V6l-7-3Z" />
        <path d="m9.5 12 1.7 1.7 3.5-3.7" />
      </svg>
    );
  }

  if (type === "wash") {
    return (
      <svg {...common}>
        <path d="M7 5h10M8 8h8M5 12c1.2 0 2 .8 2 2s-.8 2-2 2-2-.8-2-2 .8-2 2-2Zm14 0c1.2 0 2 .8 2 2s-.8 2-2 2-2-.8-2-2 .8-2 2-2Z" />
        <path d="M9 14h6M8 19h8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 5v5M18 9l-4 2M18 15l-4-2M12 19v-5M6 15l4-2M6 9l4 2" />
    </svg>
  );
}
