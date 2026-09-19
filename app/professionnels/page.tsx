"use client";

import { FormEvent, useState } from "react";
import { Footer } from "../components/Footer";
import { Partners } from "../components/Partners";

const targets = [
  "Garages indépendants",
  "Marchands VO",
  "Mandataires auto",
  "Concessions",
  "Parcs véhicules",
  "Vendeurs professionnels",
];

const benefits = [
  {
    title: "Véhicules mieux présentés",
    text: "Un véhicule propre inspire confiance, valorise l’annonce et facilite la décision d’achat.",
  },
  {
    title: "Gain de temps pour vos équipes",
    text: "AUTO 9 prend en charge la préparation esthétique pendant que vous vous concentrez sur la vente.",
  },
  {
    title: "Image professionnelle renforcée",
    text: "Livrer un véhicule propre, brillant et soigné améliore directement l’expérience client.",
  },
];

const steps = [
  "Premier échange sur vos besoins",
  "Définition du volume et du niveau de préparation",
  "Mise en place d’un fonctionnement simple",
  "Préparation des véhicules avec suivi qualité",
];

export default function ProfessionnelsPage() {
  const [form, setForm] = useState({
    garage: "",
    phone: "",
    email: "",
    date: "",
    time: "",
    vehicle: "",
    plate: "",
    service: "",
  });

  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const ready =
    form.garage.trim().length > 1 &&
    form.phone.replace(/\D/g, "").length >= 8 &&
    form.date.trim().length > 0 &&
    form.time.trim().length > 0 &&
    form.vehicle.trim().length > 1 &&
    form.service.trim().length > 0;

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || sending) return;

    setSending(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/probooking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garage: form.garage.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          date: form.date,
          time: form.time,
          vehicle: form.vehicle.trim(),
          plate: form.plate.trim(),
          service: form.service,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Impossible d’envoyer la réservation pour le moment.");
      }

      setSuccess(true);
      setForm({ garage: "", phone: "", email: "", date: "", time: "", vehicle: "", plate: "", service: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue pendant l’envoi.");
    } finally {
      setSending(false);
    }
  }

  const fieldClass =
    "w-full rounded-2xl border border-[#438dff]/20 bg-[#050a12]/80 px-5 py-4 text-white outline-none transition placeholder:text-white/20 focus:border-[#6daaff]/70 focus:shadow-[0_0_28px_rgba(38,113,240,.14)]";

  return (
    <main className="min-h-screen overflow-hidden bg-[#050608] text-white">
      <div className="border-b border-white/10 px-6 py-6 md:px-12">
        <a href="/" className="text-xs font-black uppercase tracking-[0.3em] text-white/50 transition hover:text-[#91bbfa]">
          ← Retour au site
        </a>
      </div>

      <section className="relative px-6 pb-20 pt-10 md:px-12 md:pt-14">
        <div className="pointer-events-none absolute -left-44 top-16 h-[520px] w-[520px] rounded-full bg-[#1268ff]/15 blur-[150px]" />
        <div className="pointer-events-none absolute -right-44 top-[460px] h-[560px] w-[560px] rounded-full bg-[#438dff]/10 blur-[160px]" />

        <div className="relative mx-auto max-w-7xl">
          <section
            id="reservation"
            className="relative overflow-hidden rounded-[2rem] border border-[#438dff]/35 bg-[radial-gradient(circle_at_12%_8%,rgba(38,113,240,.18),transparent_36%),linear-gradient(145deg,rgba(9,18,32,.98),rgba(5,8,13,.98))] p-7 shadow-[0_30px_90px_rgba(0,0,0,.55),0_0_55px_rgba(38,113,240,.16)] md:p-10"
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#2671f0]/15 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-28 left-1/4 h-80 w-80 rounded-full bg-[#72aaff]/10 blur-[110px]" />

            <div className="relative max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.55em] text-[#91bbfa]">Réservation professionnels</p>
              <h1 className="mt-5 text-4xl font-black uppercase tracking-[-0.055em] md:text-6xl">Réserver une préparation</h1>
              <p className="mt-5 max-w-2xl leading-relaxed text-white/50">
                Votre véhicule à préparer en quelques secondes. Sélectionnez votre créneau souhaité et AUTO 9 vous confirme rapidement la réservation.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="relative mt-10 grid gap-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-3 block text-xs font-black uppercase tracking-[0.25em] text-white/60">Nom du garage *</label>
                  <input required type="text" name="garage" value={form.garage} onChange={handleChange} placeholder="Ex : Twiice Auto Nîmes" className={fieldClass} />
                </div>
                <div>
                  <label className="mb-3 block text-xs font-black uppercase tracking-[0.25em] text-white/60">Véhicule / Modèle *</label>
                  <input required type="text" name="vehicle" value={form.vehicle} onChange={handleChange} placeholder="Ex : Peugeot 3008" className={fieldClass} />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-3 block text-xs font-black uppercase tracking-[0.25em] text-white/60">Téléphone *</label>
                  <input required type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Ex : 06 12 34 56 78" autoComplete="tel" className={fieldClass} />
                </div>
                <div>
                  <label className="mb-3 block text-xs font-black uppercase tracking-[0.25em] text-white/60">Email professionnel</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Ex : contact@garage.fr" autoComplete="email" className={fieldClass} />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-3 block text-xs font-black uppercase tracking-[0.25em] text-white/60">Date souhaitée *</label>
                  <input required type="date" name="date" value={form.date} onChange={handleChange} className={fieldClass} />
                </div>
                <div>
                  <label className="mb-3 block text-xs font-black uppercase tracking-[0.25em] text-white/60">Heure souhaitée *</label>
                  <input required type="time" name="time" value={form.time} onChange={handleChange} className={fieldClass} />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-3 block text-xs font-black uppercase tracking-[0.25em] text-white/60">Immatriculation</label>
                  <input type="text" name="plate" value={form.plate} onChange={handleChange} placeholder="Ex : AB-123-CD" className={`${fieldClass} uppercase`} />
                </div>
                <div>
                  <label className="mb-3 block text-xs font-black uppercase tracking-[0.25em] text-white/60">Prestation *</label>
                  <select required name="service" value={form.service} onChange={handleChange} className={fieldClass}>
                    <option value="" className="bg-[#111]">Choisir une prestation</option>
                    <option value="Intérieur + Extérieur" className="bg-[#111]">Intérieur + Extérieur</option>
                    <option value="Intérieur" className="bg-[#111]">Intérieur</option>
                    <option value="Extérieur" className="bg-[#111]">Extérieur</option>
                    <option value="Formule Livraison — 100 €" className="bg-[#111]">Formule Livraison — 100 €</option>
                    <option value="Autre" className="bg-[#111]">Autre</option>
                  </select>
                </div>
              </div>

              {error && <p className="rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-bold text-red-200">{error}</p>}
              {success && <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-200">Réservation envoyée ✓ AUTO 9 vous confirme rapidement le créneau.</p>}

              <div className="flex flex-col justify-between gap-5 border-t border-[#438dff]/15 pt-6 sm:flex-row sm:items-center">
                <p className="max-w-xl text-xs leading-relaxed text-white/40">Réservation destinée aux garages et professionnels partenaires AUTO 9.</p>
                <button
                  type="submit"
                  disabled={!ready || sending}
                  className="rounded-full border border-[#6daaff]/55 bg-[linear-gradient(135deg,#1057d6,#2677ef)] px-8 py-5 text-xs font-black uppercase tracking-[0.3em] text-white shadow-[0_0_28px_rgba(38,113,240,.35),0_18px_45px_rgba(0,0,0,.3)] transition hover:scale-[1.02] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {sending ? "Envoi..." : success ? "Réservation envoyée ✓" : "Réserver la préparation →"}
                </button>
              </div>
            </form>
          </section>

          <div className="mt-20">
            <p className="text-xs font-black uppercase tracking-[0.55em] text-[#91bbfa]">Professionnels de l’auto</p>
            <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h2 className="text-4xl font-black uppercase tracking-[-0.06em] md:text-7xl">Préparation esthétique pour garages & pros auto.</h2>
                <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/55">
                  AUTO 9 accompagne les professionnels de l’automobile dans la préparation esthétique de leurs véhicules : mise en vente, livraison client, présentation parc VO et image premium.
                </p>
              </div>
              <div className="rounded-[2rem] border border-[#438dff]/25 bg-[#0b1628]/65 p-7 shadow-[0_0_35px_rgba(38,113,240,.08)]">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-[#91bbfa]">Objectif</p>
                <p className="mt-4 text-2xl font-black uppercase tracking-[-0.04em]">Des véhicules plus propres, mieux présentés, plus faciles à vendre.</p>
              </div>
            </div>
          </div>

          <div className="mt-14 overflow-hidden rounded-[2rem] border border-[#438dff]/15 bg-white/[0.025] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#91bbfa]">Ils nous font confiance</p>
            <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20"><Partners /></div>
          </div>

          <div className="mt-16 rounded-[2rem] border border-[#438dff]/15 bg-white/[0.025] p-7 md:p-9">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#91bbfa]">Pour qui ?</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {targets.map((target) => (
                <div key={target} className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm font-black uppercase tracking-[0.18em] text-white/65">
                  <span className="text-[#72aaff]">✓</span> {target}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(38,113,240,.08),transparent_45%),rgba(255,255,255,.025)] p-7 transition hover:-translate-y-2 hover:border-[#438dff]/30">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#91bbfa]">AUTO 9</p>
                <h2 className="mt-5 text-3xl font-black uppercase tracking-[-0.05em]">{benefit.title}</h2>
                <p className="mt-5 leading-relaxed text-white/50">{benefit.text}</p>
              </article>
            ))}
          </div>

          <section className="relative mt-24 overflow-hidden rounded-[2rem] border border-[#438dff]/25 bg-[radial-gradient(circle_at_100%_0%,rgba(38,113,240,.14),transparent_38%),linear-gradient(145deg,rgba(255,255,255,.045),rgba(9,19,34,.58))] p-8 shadow-[0_0_42px_rgba(38,113,240,.08)] md:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2671f0]/12 blur-[90px]" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#91bbfa]">Préparation livraison</p>
              <h3 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em] md:text-5xl">Nettoyage complet avant livraison client</h3>
              <p className="mt-6 max-w-4xl text-base leading-relaxed text-white/55 md:text-lg">
                Une préparation esthétique complète pour présenter un véhicule propre, soigné et prêt à être livré au client.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#91bbfa]">Extérieur</p>
                  <p className="mt-3 text-lg font-bold text-white/80">Carrosserie · Jantes</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#91bbfa]">Intérieur</p>
                  <p className="mt-3 text-lg font-bold text-white/80">Moquettes · Tapis · Plastiques · Vitres</p>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-[#438dff]/20 bg-[#0b1628]/55 p-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#91bbfa]">En supplément</p>
                <p className="mt-3 leading-relaxed text-white/60">Shampoing sièges · Rénovation phares · Lustrage · Rénovation plastiques</p>
              </div>
            </div>
          </section>

          <div className="mt-24 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.55em] text-[#91bbfa]">Process</p>
              <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">Simple, clair, efficace.</h2>
              <p className="mt-6 leading-relaxed text-white/50">Un fonctionnement fluide pour préparer vos véhicules régulièrement, sans alourdir l’organisation de vos équipes.</p>
            </div>
            <div className="grid gap-4">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-5 rounded-[2rem] border border-[#438dff]/15 bg-white/[0.025] p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#438dff]/30 bg-[#1268ff]/10 text-sm font-black text-[#91bbfa]">{index + 1}</div>
                  <p className="pt-3 text-lg font-bold text-white/70">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
