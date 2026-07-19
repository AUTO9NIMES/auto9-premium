export function Stats() {
  return (
    <div className="relative z-10 px-6 pb-8 md:px-12">
      <div className="grid gap-8 border-y border-white/10 bg-black/25 px-6 py-10 backdrop-blur md:grid-cols-3 md:gap-12 md:px-10 md:py-12">
        <div className="text-center md:text-left">
          <p className="text-4xl font-light leading-none">★★★★★</p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-white/45">
            Avis Google particuliers
          </p>
        </div>

        <div className="text-center md:text-left">
          <p className="text-4xl font-light leading-none">+400</p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-white/45">
            Véhicules remis à neuf
          </p>
        </div>

        <div className="text-center md:text-left">
          <p className="text-4xl font-light leading-none">30 km</p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-white/45">
            Autour de Nîmes
          </p>
        </div>
      </div>
    </div>
  );
}
