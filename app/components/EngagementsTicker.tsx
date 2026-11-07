/*
 * Bandeau d'engagements qui défile en continu (uniquement des informations déjà présentes sur le site).
 * Pause au survol ; immobile et centré si l'utilisateur demande moins d'animations.
 */
const engagements = [
  "À domicile ou au travail",
  "Nîmes et jusqu’à 30 km autour",
  "Estimation affichée avant l’envoi",
  "Créneau confirmé par AUTO 9",
  "Devis adapté sur photos",
  "Particuliers & professionnels",
];

export function EngagementsTicker() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {engagements.map((item) => (
        <li key={item} className="flex items-center gap-6 px-6 sm:gap-8 sm:px-8">
          <span aria-hidden="true" className="h-2 w-2 rotate-45 bg-accent shadow-[0_0_12px_rgba(var(--accent-rgb),.8)]" />
          <span className="whitespace-nowrap text-sm font-black uppercase tracking-[0.22em] text-ivory/85 sm:text-base">{item}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label="Nos engagements" className="relative py-10 sm:py-14">
      <div className="ticker group relative overflow-hidden bg-black/25 py-5 backdrop-blur-sm [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="ticker-track flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}
