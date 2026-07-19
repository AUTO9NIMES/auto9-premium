import { Footer } from "../components/Footer";
import { Realisations } from "../components/Realisations";

export default function RealisationsPage() {
  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <div className="border-b border-white/10 px-6 py-6 md:px-12">
        <a
          href="/"
          className="text-xs font-black uppercase tracking-[0.3em] text-white/50 transition hover:text-[#B8C7D1]"
        >
          ← Retour au site
        </a>
      </div>

      <Realisations />

      <Footer />
    </main>
  );
}
