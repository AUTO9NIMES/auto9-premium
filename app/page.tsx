import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Stats } from "./components/Stats";
import { Partners } from "./components/Partners";
import { Showcase } from "./components/Showcase";
import { Services } from "./components/Services";
import { MobileHomeRefresh } from "./components/MobileHomeRefresh";
import { Transformations } from "./components/Transformations";
import { RealisationsPreview } from "./components/RealisationsPreview";
import { Reviews } from "./components/Reviews";
import { Reservation } from "./components/Reservation";
import { Footer } from "./components/Footer";
import { HomeMotion } from "./components/HomeMotion";
import motion from "./home-motion.module.css";

export default function Home() {
  return (
    <main id="auto9-home" className={`${motion.home} min-h-screen bg-[#050608] text-white`}>
      <HomeMotion />

      {/* ===================================================== */}
      {/* VERSION MOBILE                                        */}
      {/* ===================================================== */}

      <div className="relative md:hidden" data-home-hero>
        <div className="absolute inset-x-0 top-0 z-50" data-hero-fade>
          <Header />
        </div>

        <MobileHomeRefresh />

        <div
          data-hero-veil
          className="pointer-events-none absolute inset-0 z-40 bg-[linear-gradient(180deg,transparent_28%,rgba(5,6,8,.10)_52%,#050608_100%)] opacity-0"
        />
      </div>

      {/* ===================================================== */}
      {/* VERSION DESKTOP                                       */}
      {/* ===================================================== */}

      <div className="hidden md:block">
        <section className="relative min-h-screen overflow-hidden" data-home-hero>
          <video
            data-hero-media
            className="absolute inset-0 h-full w-full object-cover opacity-75 brightness-110 contrast-110 saturate-110 will-change-transform"
            src="/hero-video.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-[#050608]" />

          <div className="relative z-10 will-change-transform" data-hero-fade>
            <Header />
            <Hero />
          </div>

          <div
            data-hero-veil
            className="pointer-events-none absolute inset-0 z-[5] bg-[linear-gradient(180deg,transparent_22%,rgba(5,6,8,.08)_48%,#050608_100%)] opacity-0"
          />
        </section>

        <Stats />
        <Partners />
        <Showcase />
      </div>

      {/* ===================================================== */}
      {/* SECTIONS COMMUNES MOBILE + DESKTOP                    */}
      {/* ===================================================== */}

      <Services />
      <Transformations />
      <RealisationsPreview />
      <Reviews />
      <Reservation />
      <Footer />
    </main>
  );
}
