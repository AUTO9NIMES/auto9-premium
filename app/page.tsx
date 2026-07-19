import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Stats } from "./components/Stats";
import { Partners } from "./components/Partners";
import { Showcase } from "./components/Showcase";
import { Services } from "./components/Services";
import { Transformations } from "./components/Transformations";
import { RealisationsPreview } from "./components/RealisationsPreview";
import { Reviews } from "./components/Reviews";
import { Reservation } from "./components/Reservation";
import { Footer } from "./components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050608] text-white">
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

      {/* Section "Les preuves" masquée sur mobile */}
      <div className="hidden md:block">
        <Showcase />
      </div>

      <Services />
      <Transformations />
      <RealisationsPreview />
      <Reviews />
      <Reservation />
      <Footer />
    </main>
  );
}
