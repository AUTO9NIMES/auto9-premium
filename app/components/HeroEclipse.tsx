import styles from "./HeroEclipse.module.css";

/*
 * Fond du Hero « Éclipse émeraude » : halo et grille discrète.
 * Purement décoratif (CSS) ; l'intro s'arrête si l'appareil demande moins
 * d'animations. data-hero-media : garde l'effet de défilement de HomeMotion.
 */
export function HeroEclipse() {
  return (
    <div aria-hidden="true" data-hero-media className={styles.stage}>
      <div className={styles.grid} />
    </div>
  );
}

/*
 * Anneau de lumière, à placer dans le bloc logo + slogan
 * (parent : className="relative isolate").
 */
export function EclipseRing() {
  return <div aria-hidden="true" className={styles.ring} />;
}
