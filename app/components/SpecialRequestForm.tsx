"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

type ServiceType = "phares" | "jantes" | "polissage";

type PhotoPreview = {
  file: File;
  url: string;
};

const serviceConfig: Record<
  ServiceType,
  {
    eyebrow: string;
    title: string;
    price: string;
    intro: string;
    detailLabel: string;
    detailOptions: string[];
    photoHint: string;
  }
> = {
  phares: {
    eyebrow: "Rénovation",
    title: "Rénovation optiques",
    price: "Tarif rapide",
    intro:
      "Quelques informations suffisent pour préparer votre demande. Ajoutez des photos de vos optiques pour nous permettre d’évaluer leur état.",
    detailLabel: "Nombre d’optiques à rénover",
    detailOptions: ["1 optique", "2 optiques"],
    photoHint:
      "Idéalement : une photo de face et une photo rapprochée de chaque optique.",
  },

  jantes: {
    eyebrow: "Rénovation",
    title: "Rénovation jantes",
    price: "Sur devis",
    intro:
      "Montrez-nous l’état de vos jantes. Nous pourrons ainsi évaluer précisément la remise en état nécessaire.",
    detailLabel: "Nombre de jantes concernées",
    detailOptions: ["1 jante", "2 jantes", "3 jantes", "4 jantes"],
    photoHint:
      "Ajoutez une vue complète des jantes ainsi que des gros plans des défauts.",
  },

  polissage: {
    eyebrow: "Correction carrosserie",
    title: "Polissage",
    price: "Sur devis",
    intro:
      "Quelques photos de votre carrosserie nous permettront d’évaluer le niveau de correction adapté à votre véhicule.",
    detailLabel: "Zone concernée",
    detailOptions: [
      "Véhicule complet",
      "Quelques éléments",
      "Un élément",
    ],
    photoHint:
      "Photographiez les rayures, micro-rayures ou défauts visibles, idéalement sous une lumière directe.",
  },
};

export function SpecialRequestForm() {
  const searchParams = useSearchParams();

  const requestedType = searchParams.get("type");

  const type: ServiceType =
    requestedType === "jantes" ||
    requestedType === "polissage" ||
    requestedType === "phares"
      ? requestedType
      : "phares";

  const config = serviceConfig[type];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [vehicle, setVehicle] = useState("");

  const [detail, setDetail] = useState(
    config.detailOptions[0]
  );

  const [comment, setComment] = useState("");

  const [photos, setPhotos] = useState<
    PhotoPreview[]
  >([]);

  const urlsRef = useRef<string[]>([]);

  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDetail(config.detailOptions[0]);
  }, [type, config.detailOptions]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) =>
        URL.revokeObjectURL(url)
      );
    };
  }, []);

  const ready = useMemo(() => {
    return (
      name.trim().length > 1 &&
      phone.trim().length >= 8 &&
      vehicle.trim().length > 1
    );
  }, [name, phone, vehicle]);

  function addPhotos(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files ?? []
    );

    const remaining = Math.max(
      0,
      5 - photos.length
    );

    const selected = files
      .slice(0, remaining)
      .map((file) => {
        const url = URL.createObjectURL(file);

        urlsRef.current.push(url);

        return {
          file,
          url,
        };
      });

    setPhotos((current) => [
      ...current,
      ...selected,
    ]);

    event.target.value = "";
  }

  function removePhoto(index: number) {
    const target = photos[index];

    if (target) {
      URL.revokeObjectURL(target.url);
    }

    setPhotos((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!ready || sending) return;

    setSending(true);
    setError("");
    setSuccess(false);

    try {
      const formData = new FormData();

      formData.append(
        "payload",
        JSON.stringify({
          type,
          serviceName: config.title,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerCity: city.trim(),
          vehicleName: vehicle.trim(),
          detail,
          customerComment: comment.trim(),
        })
      );

      photos.forEach(({ file }) => {
        formData.append(
          "photos",
          file,
          file.name
        );
      });

      const response = await fetch(
        "/api/special-request",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ||
            "Impossible d’envoyer la demande pour le moment."
        );
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#050608] px-5 py-10 text-white md:px-12 md:py-16">

      {/* HALOS DE FOND */}

      <div className="pointer-events-none absolute left-1/2 top-20 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[#0057FF]/10 blur-[150px]" />

      <div className="pointer-events-none absolute -right-40 top-[40%] h-96 w-96 rounded-full bg-[#0057FF]/7 blur-[130px]" />

      <div className="relative mx-auto max-w-5xl">

        {/* RETOUR */}

        <a
          href="/#services"
          className="text-xs font-black uppercase tracking-[0.25em] text-white/50 transition hover:text-[#7DB7FF]"
        >
          ← Retour aux prestations
        </a>

        {/* CARTE PRINCIPALE */}

        <div className="relative mt-8 overflow-hidden rounded-[2rem] border border-[#0057FF]/30 bg-[linear-gradient(145deg,rgba(0,87,255,.16),rgba(255,255,255,.055))] p-5 shadow-[0_0_90px_rgba(0,87,255,.14)] md:p-10">

          {/* HALO INTERNE */}

          <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#0057FF]/15 blur-[100px]" />

          <div className="relative">

            {/* HEADER */}

            <div className="flex flex-col justify-between gap-5 border-b border-white/15 pb-7 md:flex-row md:items-end">

              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#2F7BFF]">
                  {config.eyebrow}
                </p>

                <h1 className="mt-3 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
                  {config.title}
                </h1>

                <p className="mt-4 max-w-2xl leading-relaxed text-white/60">
                  {config.intro}
                </p>
              </div>

              {/* PRIX / TYPE */}

              <div className="relative isolate w-fit overflow-hidden rounded-full border border-[#2F7BFF]/60 bg-[radial-gradient(circle_at_center,rgba(0,87,255,.30),rgba(0,87,255,.10)_65%,transparent_100%)] px-5 py-3 text-lg font-black text-white shadow-[0_0_28px_rgba(0,87,255,.32)]">

                <span className="pointer-events-none absolute inset-0 -z-10 bg-[#0057FF]/20 blur-lg" />

                <span className="drop-shadow-[0_0_10px_rgba(125,183,255,.9)]">
                  {config.price}
                </span>
              </div>
            </div>

            {/* FORMULAIRE */}

            <form
              onSubmit={submit}
              className="mt-7 grid gap-7"
            >

              {/* INFORMATIONS */}

              <div className="grid gap-4 md:grid-cols-2">

                <Field label="Nom *">
                  <input
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    className={inputClass}
                    placeholder="Votre nom"
                  />
                </Field>

                <Field label="Téléphone *">
                  <input
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    className={inputClass}
                    inputMode="tel"
                    placeholder="06..."
                  />
                </Field>

                <Field label="Ville">
                  <input
                    value={city}
                    onChange={(e) =>
                      setCity(e.target.value)
                    }
                    className={inputClass}
                    placeholder="Nîmes..."
                  />
                </Field>

                <Field label="Véhicule *">
                  <input
                    value={vehicle}
                    onChange={(e) =>
                      setVehicle(e.target.value)
                    }
                    className={inputClass}
                    placeholder="Ex. Audi A3"
                  />
                </Field>
              </div>

              {/* DETAIL PRESTATION */}

              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-white/60">
                  {config.detailLabel}
                </p>

                <div className="flex flex-wrap gap-2">

                  {config.detailOptions.map(
                    (option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setDetail(option)
                        }
                        className={`rounded-full border px-4 py-3 text-xs font-black transition ${
                          detail === option
                            ? "border-[#2F7BFF] bg-[#0057FF] text-white shadow-[0_0_22px_rgba(0,87,255,.35)]"
                            : "border-white/15 bg-white/[0.04] text-white/60 hover:border-[#0057FF]/60 hover:bg-[#0057FF]/10 hover:text-white"
                        }`}
                      >
                        {option}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* PHOTOS */}

              <div className="rounded-[1.5rem] border border-white/15 bg-white/[0.04] p-5 shadow-[inset_0_0_35px_rgba(0,87,255,.035)] md:p-6">

                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

                  <div>
                    <p className="text-sm font-black text-white/90">
                      Photos du véhicule
                    </p>

                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/45">
                      {config.photoHint}
                    </p>
                  </div>

                  <label className="cursor-pointer rounded-full border border-[#0057FF]/50 bg-[#0057FF]/15 px-5 py-3 text-xs font-black text-white shadow-[0_0_20px_rgba(0,87,255,.10)] transition hover:bg-[#0057FF]">

                    + Ajouter des photos

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      multiple
                      onChange={addPhotos}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* PREVIEW PHOTOS */}

                {photos.length > 0 && (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">

                    {photos.map(
                      (photo, index) => (
                        <div
                          key={`${photo.file.name}-${index}`}
                          className="relative aspect-square overflow-hidden rounded-xl border border-white/15 bg-black/30"
                        >
                          <img
                            src={photo.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              removePhoto(index)
                            }
                            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/75 text-xs font-black backdrop-blur"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}

                <p className="mt-3 text-[11px] text-white/35">
                  {photos.length}/5 photos
                </p>
              </div>

              {/* COMMENTAIRE */}

              <Field label="Commentaire">
                <textarea
                  value={comment}
                  onChange={(e) =>
                    setComment(e.target.value)
                  }
                  className={`${inputClass} min-h-28 resize-y`}
                  placeholder="Précisez les défauts, vos attentes ou toute information utile..."
                />
              </Field>

              {/* ERREUR */}

              {error && (
                <p className="rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-bold text-red-200">
                  {error}
                </p>
              )}

              {/* SUCCÈS */}

              {success && (
                <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-200">
                  Demande envoyée ✓ AUTO 9 revient vers vous rapidement.
                </p>
              )}

              {/* FOOTER FORMULAIRE */}

              <div className="flex flex-col justify-between gap-5 border-t border-white/15 pt-6 sm:flex-row sm:items-center">

                <p className="max-w-xl text-xs leading-relaxed text-white/40">
                  Aucun paiement en ligne. Votre demande nous permet simplement
                  d’évaluer la prestation et de vous recontacter.
                </p>

                <button
                  type="submit"
                  disabled={!ready || sending}
                  className="rounded-full bg-[#0057FF] px-7 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-[0_15px_35px_rgba(0,87,255,.30),0_0_25px_rgba(0,87,255,.15)] transition hover:scale-[1.02] hover:shadow-[0_18px_45px_rgba(0,87,255,.40)] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {sending
                    ? "Envoi..."
                    : success
                    ? "Demande envoyée ✓"
                    : "Envoyer ma demande →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ========================================================= */
/* STYLES COMMUNS */
/* ========================================================= */

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.055] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#2F7BFF]/80 focus:bg-[#0057FF]/10 focus:shadow-[0_0_22px_rgba(0,87,255,.12)]";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white/50">
        {label}
      </span>

      {children}
    </label>
  );
}
