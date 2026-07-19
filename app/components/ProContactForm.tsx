"use client";

import { useState, type FormEvent } from "react";

type FormState = {
  company: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  proType: string;
  volume: string;
  need: string;
  message: string;
};

const initialState: FormState = {
  company: "",
  name: "",
  phone: "",
  email: "",
  city: "",
  proType: "",
  volume: "",
  need: "",
  message: "",
};

export function ProContactForm() {
  const [form, setForm] = useState<FormState>(initialState);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function buildMessage() {
    return `Demande partenariat professionnel AUTO 9

Société : ${form.company || "Non renseigné"}
Nom : ${form.name || "Non renseigné"}
Téléphone : ${form.phone || "Non renseigné"}
Email : ${form.email || "Non renseigné"}
Ville / secteur : ${form.city || "Non renseigné"}

Type de professionnel : ${form.proType || "Non renseigné"}
Volume estimé : ${form.volume || "Non renseigné"}
Besoin principal : ${form.need || "Non renseigné"}

Message :
${form.message || "Non renseigné"}`;
  }

  function sendByEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const subject = encodeURIComponent(
      "Demande partenariat professionnel AUTO 9"
    );

    const body = encodeURIComponent(buildMessage());

    window.location.href = `mailto:contact.nicolas.auto9@gmail.com?subject=${subject}&body=${body}`;
  }

  function sendByWhatsApp() {
    const message = encodeURIComponent(buildMessage());

    window.open(`https://wa.me/33659762992?text=${message}`, "_blank");
  }

  return (
    <section
      id="demande-partenariat"
      className="mt-24 rounded-[2.5rem] border border-[#B8C7D1]/20 bg-[linear-gradient(145deg,rgba(184,199,209,.13),rgba(255,255,255,.035))] p-7 md:p-12"
    >
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.45em] text-[#B8C7D1]">
            Demande pro
          </p>

          <h2 className="mt-6 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
            Parlez-nous de vos besoins.
          </h2>

          <p className="mt-6 leading-relaxed text-white/55">
            Vous êtes garage, marchand VO, mandataire, concession ou
            professionnel de l’automobile ? Remplissez ce formulaire pour
            démarrer un échange avec AUTO 9.
          </p>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-black/20 p-6">
            <p className="text-sm font-bold leading-relaxed text-white/60">
              L’objectif : comprendre votre volume, votre secteur, vos besoins
              et construire une solution de préparation esthétique adaptée à
              votre activité.
            </p>
          </div>
        </div>

        <form onSubmit={sendByEmail} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Société"
              placeholder="Nom du garage / entreprise"
              value={form.company}
              onChange={(value) => updateField("company", value)}
            />

            <Field
              label="Nom"
              placeholder="Votre nom"
              value={form.name}
              onChange={(value) => updateField("name", value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Téléphone"
              placeholder="06..."
              value={form.phone}
              onChange={(value) => updateField("phone", value)}
            />

            <Field
              label="Email"
              placeholder="contact@..."
              value={form.email}
              onChange={(value) => updateField("email", value)}
            />
          </div>

          <Field
            label="Ville / secteur"
            placeholder="Nîmes, Montpellier, Avignon..."
            value={form.city}
            onChange={(value) => updateField("city", value)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Type de professionnel"
              value={form.proType}
              onChange={(value) => updateField("proType", value)}
              options={[
                "Garage indépendant",
                "Marchand VO",
                "Mandataire auto",
                "Concession",
                "Parc véhicules",
                "Autre professionnel",
              ]}
            />

            <SelectField
              label="Volume estimé"
              value={form.volume}
              onChange={(value) => updateField("volume", value)}
              options={[
                "1 à 3 véhicules / mois",
                "4 à 10 véhicules / mois",
                "10 à 20 véhicules / mois",
                "20+ véhicules / mois",
                "Besoin ponctuel",
              ]}
            />
          </div>

          <SelectField
            label="Besoin principal"
            value={form.need}
            onChange={(value) => updateField("need", value)}
            options={[
              "Préparation VO avant mise en vente",
              "Préparation avant livraison client",
              "Nettoyage récurrent de parc",
              "Renfort ponctuel",
              "Partenariat régulier",
              "Autre demande",
            ]}
          />

          <div>
            <label className="text-xs font-black uppercase tracking-[0.25em] text-white/45">
              Message
            </label>

            <textarea
              value={form.message}
              onChange={(event) => updateField("message", event.target.value)}
              placeholder="Expliquez rapidement votre besoin, vos volumes, vos attentes..."
              rows={5}
              className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#B8C7D1]/60"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-7 py-4 text-xs font-black uppercase tracking-[0.25em] text-[#050608] transition hover:scale-105"
            >
              Envoyer par email →
            </button>

            <button
              type="button"
              onClick={sendByWhatsApp}
              className="rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.25em] text-white/65 transition hover:border-[#B8C7D1] hover:text-[#B8C7D1]"
            >
              Envoyer par WhatsApp →
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-[0.25em] text-white/45">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#B8C7D1]/60"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-[0.25em] text-white/45">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-[#B8C7D1]/60"
      >
        <option value="">Sélectionner</option>

        {options.map((option) => (
          <option key={option} value={option} className="bg-[#050608]">
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
