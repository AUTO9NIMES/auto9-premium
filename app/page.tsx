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
      {/* VERSION MOBILE — NOUVEAU DESIGN                       */}
      {/* ===================================================== */}

      <div className="relative md:hidden">
        {/* Header conservé au-dessus du nouveau hero */}
        <div className="absolute inset-x-0 top-0 z-50">
          <Header />
        </div>

        <MobileHomeRefresh />
      </div>

      {/* ===================================================== */}
      {/* VERSION DESKTOP — DESIGN ACTUEL CONSERVÉ              */}
      {/* ===================================================== */}

      <div className="hidden md:block">
        <section className="relative min-h-screen overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-75 brightness-110 contrast-110 saturate-110"
            src="/hero-video.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-[#050608]" />

          <div className="relative z-10">
            <Header />
            <Hero />
          </div>
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
