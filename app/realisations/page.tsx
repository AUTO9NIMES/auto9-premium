import Link from "next/link";
import { Footer } from "../components/Footer";
import { Realisations } from "../components/Realisations";
import { SiteMotion } from "../components/SiteMotion";
import { MobileActionBar } from "../components/MobileActionBar";

export default function RealisationsPage() {
  return (
    <main data-motion-site className="min-h-screen bg-forest text-white">
      <SiteMotion />
      <MobileActionBar />
      <div className="border-b border-white/10 px-6 py-6 md:px-12">
        <Link
          href="/"
          className="text-xs font-black uppercase tracking-[0.3em] text-white/50 transition hover:text-metal-mid"
        >
          ← Retour au site
        </Link>
      </div>

      <Realisations />

      <Footer />
    </main>
  );
}
