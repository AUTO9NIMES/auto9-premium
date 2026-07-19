export function BeforeAfter() {
  return (
    <section className="border-t border-white/10 px-6 py-28 md:px-12">
      <p className="mb-6 text-xs font-black uppercase tracking-[0.55em] text-[#B8C7D1]">
        Avant / Après
      </p>

      <h2 className="max-w-5xl text-5xl font-black uppercase tracking-[-0.05em] md:text-7xl">
        Le résultat parle de lui-même.
      </h2>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-white/45">
            Avant
          </div>
          <img
            src="/before-1.jpg"
            alt="Avant AUTO 9"
            className="h-auto w-full object-contain"
          />
        </div>

        <div className="border border-[#B8C7D1]/25 bg-[#B8C7D1]/5 p-4 shadow-[0_0_70px_rgba(184,199,209,.16)]">
          <div className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-[#B8C7D1]">
            Après
          </div>
          <img
            src="/after-1.jpg"
            alt="Après AUTO 9"
            className="h-auto w-full object-contain"
          />
        </div>
      </div>
    </section>
  );
}
