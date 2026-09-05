import Link from "next/link";

export function Reservation() {
  return (
    <section
      id="reservation"
      className="relative overflow-hidden bg-[#050608] px-5 py-16 text-white sm:px-6 lg:px-8 lg:py-24"
    >
      <div className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-[#0d64c8]/[0.08] blur-[150px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[30px] border border-[#8fb8e8]/20 bg-[linear-gradient(145deg,#111a27_0%,#0a1018_42%,#08090c_100%)] shadow-[0_30px_90px_rgba(0,0,0,.38)] sm:rounded-[36px]">
          <div className="relative p-7 sm:p-10 lg:p-14">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_4%,rgba(67,137,220,.12),transparent_36%)]" />
            <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(185,216,250,.45),transparent)]" />

            <div className="relative">
              <p className="text-[11px] font-black uppercase tracking-[0.42em] text-[#a9cbed] sm:text-xs">
                Réservation
              </p>

              <h2 className="mt-7 max-w-[760px] text-[44px] font-black uppercase leading-[0.98] tracking-[-0.055em] sm:text-[58px] lg:text-[72px]">
                Prêt à
                <br />
                retrouver
                <br />
                <span className="bg-[linear-gradient(135deg,#eef5fb_0%,#c4d8ed_35%,#91b7df_70%,#e8f2fb_100%)] bg-clip-text text-transparent">
                  la joie du neuf ?
                </span>
              </h2>

              <p className="mt-7 max-w-2xl text-[16px] leading-8 text-white/62 sm:text-[18px]">
                Réservez votre prestation AUTO 9 en quelques secondes. Configurez
                votre véhicule, choisissez votre prestation et vos options
                directement en ligne.
              </p>

              <div className="mt-9 grid max-w-3xl gap-3 sm:gap-4">
                <Link
                  href="/devis"
                  className="group relative flex min-h-[70px] items-center overflow-hidden rounded-full border border-[#a8cff6]/65 bg-[linear-gradient(105deg,#e9f1f7_0%,#b8cadb_23%,#e5edf3_47%,#8ea7bf_73%,#dbe7ef_100%)] px-5 text-[#07101b] shadow-[0_12px_36px_rgba(83,151,218,.16),inset_0_1px_0_rgba(255,255,255,.85)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(83,151,218,.24)] active:scale-[0.985] sm:min-h-[78px] sm:px-7"
                >
                  <span className="pointer-events-none absolute inset-0 opacity-45 [background:repeating-linear-gradient(90deg,rgba(255,255,255,.13)_0px,rgba(255,255,255,.13)_1px,rgba(0,0,0,.025)_1px,rgba(0,0,0,.025)_3px)]" />
                  <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-white/90" />

                  <span className="relative grid h-10 w-10 shrink-0 place-items-center border-r border-[#34506c]/25 pr-4 text-[#0b2137] sm:h-11 sm:w-12">
                    <CalendarIcon />
                  </span>

                  <span className="relative flex-1 px-4 text-[11px] font-black uppercase tracking-[0.16em] sm:px-6 sm:text-[13px] sm:tracking-[0.2em]">
                    Configurer ma prestation
                  </span>

                  <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#2f78c5]/35 bg-[#0b2036]/10 text-[24px] transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>

                <Link
                  href="/devis"
                  className="group relative flex min-h-[70px] items-center overflow-hidden rounded-full border border-[#9bb9d8]/55 bg-[linear-gradient(110deg,#0b1118_0%,#151d27_44%,#090d12_100%)] px-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_10px_34px_rgba(0,0,0,.25)] transition duration-300 hover:-translate-y-0.5 hover:border-[#b4d3f3]/75 active:scale-[0.985] sm:min-h-[78px] sm:px-7"
                >
                  <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(187,218,249,.65),transparent)]" />
                  <span className="pointer-events-none absolute bottom-0 left-10 h-px w-1/3 bg-[linear-gradient(90deg,#3186d8,transparent)] opacity-70" />

                  <span className="relative grid h-10 w-10 shrink-0 place-items-center border-r border-white/10 pr-4 text-[#d4e6f7] sm:h-11 sm:w-12">
                    <CarIcon />
                  </span>

                  <span className="relative flex-1 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-[#e9f1f8] sm:px-6 sm:text-[13px] sm:tracking-[0.2em]">
                    Choisir mon véhicule
                  </span>

                  <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#78aee4]/35 bg-white/[0.025] text-[24px] text-[#e9f3fc] transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>

              <p className="mt-7 text-[13px] leading-6 text-white/38 sm:text-sm">
                Réponse rapide selon disponibilité.
                <br />
                Intervention à Nîmes et jusqu’à 30 km autour.
              </p>

              <div className="mt-10 rounded-[24px] border border-white/10 bg-black/25 p-6 sm:mt-12 sm:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white/78 sm:text-xs">
                  Infos utiles
                </p>

                <div className="mt-6 grid gap-4 text-[13px] leading-6 text-white/52 sm:grid-cols-3 sm:text-sm">
                  <div className="border-b border-white/10 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
                    <p className="font-bold text-white/82">Zone d’intervention</p>
                    <p className="mt-1">Nîmes et jusqu’à 30 km autour.</p>
                  </div>

                  <div className="border-b border-white/10 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
                    <p className="font-bold text-white/82">Réservation</p>
                    <p className="mt-1">Choisissez directement votre prestation et votre créneau.</p>
                  </div>

                  <div>
                    <p className="font-bold text-white/82">Confirmation</p>
                    <p className="mt-1">Votre demande est confirmée selon les disponibilités AUTO 9.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 16h14l-1.5-6A2 2 0 0 0 15.6 8H8.4a2 2 0 0 0-1.9 2L5 16Z" />
      <path d="M4 16v3M20 16v3M7 19h10" />
      <path d="M7.5 13h.01M16.5 13h.01" />
    </svg>
  );
}
