import "./signature-emerald.css";
import { Header } from "./components/Header";
import { HeroEclipse } from "./components/HeroEclipse";
import eclipse from "./components/HeroEclipse.module.css";
import { Hero } from "./components/Hero";
import { Stats } from "./components/Stats";
import { Partners } from "./components/Partners";
import { Showcase } from "./components/Showcase";
import { Services } from "./components/Services";
import { MobileHomeRefresh } from "./components/MobileHomeRefresh";
import { Transformations } from "./components/Transformations";
import { BeforeAfter } from "./components/BeforeAfter";
import { RealisationsPreview } from "./components/RealisationsPreview";
import { Reviews } from "./components/Reviews";
import { HomeConfidence } from "./components/HomeConfidence";
import { Reservation } from "./components/Reservation";
import { Footer } from "./components/Footer";
import { HomeMotion } from "./components/HomeMotion";
import { EngagementsTicker } from "./components/EngagementsTicker";
import { ZoneMap } from "./components/ZoneMap";
import { HomeFaq } from "./components/HomeFaq";
import motion from "./home-motion.module.css";
import { SiteMotion } from "./components/SiteMotion";
import { MobileActionBar } from "./components/MobileActionBar";

export default function Home() {
  return (
    <main data-motion-site id="auto9-home" className={`${motion.home} min-h-screen bg-forest text-white`}>
      <SiteMotion />
      <MobileActionBar />
      <HomeMotion />

      {/* ===================================================== */}
      {/* VERSION MOBILE                                        */}
      {/* ===================================================== */}

      <div className={`relative md:hidden ${eclipse.headerLogoIntro}`} data-home-hero>
        <div className="absolute inset-x-0 top-0 z-50" data-hero-fade>
          <Header />
        </div>

        <MobileHomeRefresh />

        <div
          data-hero-veil
          className="pointer-events-none absolute inset-0 z-40 bg-[linear-gradient(180deg,transparent_28%,rgba(3,8,6,.5)_68%,transparent_100%)] opacity-0"
        />
      </div>

      {/* ===================================================== */}
      {/* VERSION DESKTOP                                       */}
      {/* ===================================================== */}

      <div className="hidden md:block">
        <section className="relative min-h-screen overflow-hidden" data-home-hero>
          <HeroEclipse />

          <div className="relative z-10 will-change-transform" data-hero-fade>
            <Header />
            <Hero />
          </div>

          <div
            data-hero-veil
            className="pointer-events-none absolute inset-0 z-[5] bg-[linear-gradient(180deg,transparent_22%,rgba(3,8,6,.5)_66%,transparent_100%)] opacity-0"
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
      <EngagementsTicker />
      <ZoneMap />
      <HomeConfidence />
      <Transformations />
      <BeforeAfter />
      <RealisationsPreview />
      <Reviews />
      <HomeFaq />
      <Reservation />
      <Footer />
    </main>
  );
}
