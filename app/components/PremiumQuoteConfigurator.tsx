"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";

type PremiumServiceId = "phares" | "polissage" | "jantes";
type VehicleId = "citadine" | "berline" | "suv" | "utilitaire";

const premiumServices = [
  {
    id: "phares",
    name: "Rénovation de phares",
    tag: "Optiques",
    price: 69,
    priceLabel: "69€",
    time: "1h+",
    description:
      "Restauration des optiques ternis, jaunis ou opaques avec protection anti-UV.",
    details: [
      "Diagnostic des optiques",
      "Ponçage progressif",
      "Polissage en plusieurs étapes",
      "Protection céramique anti-UV",
    ],
  },
  {
    id: "polissage",
    name: "Polissage carrosserie",
    tag: "Correction",
    price: null,
    priceLabel: "Sur devis",
    time: "À confirmer",
    description:
      "Correction esthétique sur mesure selon l’état du vernis et le niveau de défauts.",
    details: [
      "Inspection de la carrosserie",
      "Analyse des défauts",
      "Décontamination avant correction",
      "Estimation selon état réel",
    ],
  },
  {
    id: "jantes",
    name: "Réparation de jantes",
    tag: "Partenaire",
    price: null,
    priceLabel: "Sur devis",
    time: "À confirmer",
    description:
      "Demande dédiée aux jantes frottées, marquées ou abîmées via partenaire spécialisé.",
    details: [
      "Analyse des dégâts visibles",
      "Photos des zones abîmées",
      "Estimation selon type de jante",
      "Suivi AUTO 9",
    ],
  },
] as const;

const vehicles = [
  {
    id: "citadine",
    name: "Citadine",
    image: "/citadine.jpg",
    icon: "▱",
  },
  {
    id: "berline",
    name: "Berline",
    image: "/berline.jpg",
    icon: "▰",
  },
  {
    id: "suv",
    name: "SUV",
    image: "/suv.jpg",
    icon: "▣",
  },
  {
    id: "utilitaire",
    name: "Utilitaire",
    image: "/utilitaire.jpg",
    icon: "▤",
  },
] as const;

export function PremiumQuoteConfigurator() {
  const searchParams = useSearchParams();
  const initialPresta = searchParams.get("presta") as PremiumServiceId | null;

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<PremiumServiceId>(
    initialPresta && ["phares", "polissage", "jantes"].includes(initialPresta)
      ? initialPresta
      : "phares",
  );
  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleId>("citadine");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);

  const currentService = useMemo(
    () => premiumServices.find((service) => service.id === selectedService)!,
    [selectedService],
  );

  const currentVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicle)!,
    [selectedVehicle],
  );

  const mainPhoto = photos[mainPhotoIndex] ?? photos[0] ?? null;
  const hasFixedPrice = currentService.price !== null;

  const whatsappMessage = [
    "Bonjour AUTO 9, je souhaite faire une demande premium.",
    "",
    `Prestation : ${currentService.name}`,
    `Véhicule : ${currentVehicle.name}`,
    vehicleInfo.trim() ? `Infos véhicule : ${vehicleInfo.trim()}` : "",
    hasFixedPrice
      ? `Prix estimé : ${currentService.price}€`
      : "Prix estimé : sur devis",
    `Temps estimé : ${currentService.time}`,
    photos.length > 0 ? `Photos ajoutées : ${photos.length}` : "Photos : non",
    comment.trim() ? `Commentaire : ${comment.trim()}` : "Commentaire : aucun",
    "",
    "Je peux vous envoyer les photos ici si besoin.",
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(
    whatsappMessage,
  )}`;

  function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const imageFiles = files
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 4 - photos.length);

    const newPhotos = imageFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPhotos((current) => [...current, ...newPhotos]);
    event.target.value = "";
  }

  function removePhoto(indexToRemove: number) {
    setPhotos((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );

    setMainPhotoIndex(0);
  }

  return (
    <section className="relative overflow-hidden px-6 py-16 md:px-12 md:py-24">
      <div className="absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-[#3F7D9F]/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#4D8DFF]">
              Configurateur premium
            </p>

            <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase tracking-[-0.06em] md:text-7xl">
              Votre demande premium.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/60">
              Phares, polissage ou jantes : sélectionnez la prestation, ajoutez
              votre véhicule et envoyez les infos utiles pour confirmer le devis.
            </p>
          </div>

          <div className="w-full rounded-[2rem] border border-[#B8C7D1]/25 bg-[#B8C7D1]/5 p-6 lg:w-[320px]">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#4D8DFF]">
              Estimation
            </p>

            <p className="mt-3 text-5xl font-black tracking-[-0.06em]">
              {currentService.priceLabel}
            </p>

            <p className="mt-3 text-sm leading-relaxed text-white/55">
              Tarif à confirmer selon l’état réel du véhicule.
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StepButton
            number={1}
            title="Prestation"
            active={step === 1}
            done={step > 1}
            onClick={() => setStep(1)}
          />
          <StepButton
            number={2}
            title="Véhicule"
            active={step === 2}
            done={step > 2}
            onClick={() => setStep(2)}
          />
          <StepButton
            number={3}
            title="Photos"
            active={step === 3}
            done={step > 3}
            onClick={() => setStep(3)}
          />
          <StepButton
            number={4}
            title="Récap"
            active={step === 4}
            done={false}
            onClick={() => setStep(4)}
          />
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.025))] p-6 md:p-8">
          {step === 1 && (
            <>
              <StepHeader
                label="Étape 1"
                title="Choisissez votre prestation."
                text="Sélectionnez le type de demande premium."
              />

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {premiumServices.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedService(service.id)}
                    className={`group flex h-full flex-col rounded-[1.5rem] border p-6 text-left transition hover:-translate-y-1 ${
                      selectedService === service.id
                        ? "border-[#B8C7D1] bg-[#B8C7D1]/5 shadow-[0_0_45px_rgba(184,199,209,.18)]"
                        : "border-white/10 bg-black/20 hover:border-[#B8C7D1]/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-3xl text-white">✦</span>

                      <span className="rounded-full border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/65">
                        {service.tag}
                      </span>
                    </div>

                    <h3 className="mt-8 text-3xl font-black uppercase tracking-[-0.05em] text-white md:text-4xl">
                      {service.name}
                    </h3>

                    <p className="mt-5 min-h-[4.2rem] text-base leading-relaxed text-white/70">
                      {service.description}
                    </p>

                    <div className="mt-6 border-t border-white/15 pt-5">
                      <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-[#8EC9E6]">
                        Inclus
                      </p>

                      <div className="space-y-3">
                        {service.details.map((detail) => (
                          <p
                            key={detail}
                            className="text-sm font-medium leading-relaxed text-white/75"
                          >
                            <span className="font-black text-[#4D8DFF]">
                              ✓
                            </span>{" "}
                            {detail}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto pt-8">
                      <p className="text-base font-black text-[#4D8DFF]">
                        {service.priceLabel}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <StepActions
                nextLabel="Choisir le véhicule"
                onNext={() => setStep(2)}
              />
            </>
          )}

          {step === 2 && (
            <>
              <StepHeader
                label="Étape 2"
                title="Quel type de véhicule ?"
                text="Sélectionnez le gabarit puis ajoutez les infos utiles."
              />

              <div className="mt-10 grid gap-6 md:grid-cols-2">
                {vehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => setSelectedVehicle(vehicle.id)}
                    className={`group overflow-hidden rounded-[2rem] border text-left transition duration-500 hover:-translate-y-1 ${
                      selectedVehicle === vehicle.id
                        ? "border-[#B8C7D1] bg-[#B8C7D1]/5 shadow-[0_0_55px_rgba(63,125,159,.18)]"
                        : "border-white/10 bg-black/20 hover:border-[#B8C7D1]/20"
                    }`}
                  >
                    <div className="relative h-72 overflow-hidden">
                      <img
                        src={vehicle.image}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover opacity-75 brightness-[0.62] contrast-110 saturate-110 transition duration-700 group-hover:scale-105 group-hover:opacity-95"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-[#050608] via-[#050608]/35 to-transparent" />

                      <div className="absolute bottom-8 left-8 right-8">
                        <p className="text-6xl leading-none text-white">
                          {vehicle.icon}
                        </p>

                        <div className="mt-4 flex items-end justify-between gap-5">
                          <h3 className="text-5xl font-black uppercase tracking-[-0.07em] text-white">
                            {vehicle.name}
                          </h3>

                          <p className="shrink-0 rounded-full border border-[#B8C7D1]/55 bg-[#B8C7D1]/5 px-6 py-3 text-xl font-black text-[#4D8DFF] backdrop-blur">
                            {currentService.priceLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#4D8DFF]">
                  Infos véhicule
                </p>

                <input
                  value={vehicleInfo}
                  onChange={(event) => setVehicleInfo(event.target.value)}
                  placeholder="Ex : Audi A3 2019, BMW Série 1, Mercedes Classe A..."
                  className="mt-5 w-full rounded-2xl border border-white/10 bg-[#050608] px-5 py-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#B8C7D1]/60"
                />
              </div>

              <StepActions
                previousLabel="Retour"
                nextLabel="Ajouter photos/commentaire"
                onPrevious={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            </>
          )}          {step === 3 && (
            <>
              <StepHeader
                label="Étape 3"
                title="Photos & commentaire."
                text="Ajoutez jusqu’à 4 photos et une précision sur la demande."
              />

              <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-[#4D8DFF]">
                    Photos
                  </p>

                  <label className="mt-6 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center transition hover:border-[#B8C7D1]/60 hover:bg-[#B8C7D1]/5">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotos}
                      className="hidden"
                      disabled={photos.length >= 4}
                    />

                    <span className="text-4xl">＋</span>

                    <span className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-white/75">
                      Importer des photos
                    </span>

                    <span className="mt-2 text-xs text-white/45">
                      {photos.length}/4 ajoutée{photos.length > 1 ? "s" : ""}
                    </span>
                  </label>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-[#4D8DFF]">
                    Commentaire
                  </p>

                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Ex : phares jaunis, jante frottée avant droite, micro-rayures capot..."
                    className="mt-6 min-h-44 w-full resize-none rounded-[1.5rem] border border-white/10 bg-[#050608] p-5 text-sm leading-relaxed text-white outline-none transition placeholder:text-white/35 focus:border-[#B8C7D1]/60"
                  />
                </div>
              </div>

              {photos.length > 0 && (
                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.url}
                      className={`relative overflow-hidden rounded-[1.25rem] border bg-black/30 ${
                        mainPhotoIndex === index
                          ? "border-[#B8C7D1]"
                          : "border-white/10"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setMainPhotoIndex(index)}
                        className="block w-full"
                      >
                        <img
                          src={photo.url}
                          alt={`Photo ${index + 1}`}
                          className="h-44 w-full object-cover"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-2 text-xs font-black text-white"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <StepActions
                previousLabel="Retour"
                nextLabel="Voir le récapitulatif"
                onPrevious={() => setStep(2)}
                onNext={() => setStep(4)}
              />
            </>
          )}

          {step === 4 && (
            <>
              <StepHeader
                label="Étape 4"
                title="Votre récapitulatif."
                text="Vérifiez les informations avant d’envoyer la demande."
              />

              <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-[#4D8DFF]">
                    Demande sélectionnée
                  </p>

                  <h3 className="mt-4 text-4xl font-black uppercase tracking-[-0.05em]">
                    {currentService.name}
                  </h3>

                  <p className="mt-4 text-white/60">
                    Véhicule : {currentVehicle.name}
                  </p>

                  {vehicleInfo.trim() && (
                    <p className="mt-2 text-white/60">
                      Infos : {vehicleInfo.trim()}
                    </p>
                  )}

                  <div className="mt-8 border-t border-white/10 pt-4">
                    {currentService.details.map((detail) => (
                      <p
                        key={detail}
                        className="border-b border-white/10 py-3 text-sm text-white/65"
                      >
                        <span className="text-[#4D8DFF]">✓</span> {detail}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[1.5rem] border border-[#B8C7D1]/25 bg-[#B8C7D1]/5">
                  {mainPhoto && (
                    <div className="relative h-64 overflow-hidden border-b border-[#B8C7D1]/20">
                      <img
                        src={mainPhoto.url}
                        alt="Photo principale"
                        className="h-full w-full object-cover opacity-95 brightness-[0.78] contrast-110 saturate-110"
                      />
                    </div>
                  )}

                  <div className="p-6">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-[#4D8DFF]">
                      Estimation
                    </p>

                    <p className="mt-4 text-7xl font-black tracking-[-0.08em]">
                      {currentService.priceLabel}
                    </p>

                    <p className="mt-4 text-sm leading-relaxed text-white/60">
                      Demande à confirmer après analyse des photos.
                    </p>

                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-8 flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-7 py-5 text-center text-xs font-black uppercase tracking-[0.25em] text-[#050608] transition hover:scale-105"
                    >
                      Envoyer sur WhatsApp →
                    </a>
                  </div>
                </div>
              </div>

              <StepActions
                previousLabel="Modifier"
                onPrevious={() => setStep(3)}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function StepButton({
  number,
  title,
  active,
  done,
  onClick,
}: {
  number: number;
  title: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[#B8C7D1] bg-[#B8C7D1]/5"
          : "border-white/10 bg-black/20 hover:border-[#B8C7D1]/20"
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black ${
          active || done
            ? "bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] text-white"
            : "bg-white/10 text-white/55"
        }`}
      >
        {done ? "✓" : number}
      </span>

      <span className="text-xs font-black uppercase tracking-[0.2em] text-white/75">
        {title}
      </span>
    </button>
  );
}

function StepHeader({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.45em] text-[#4D8DFF]">
        {label}
      </p>

      <h2 className="mt-5 text-4xl font-black uppercase tracking-[-0.05em] md:text-6xl">
        {title}
      </h2>

      <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60">
        {text}
      </p>
    </div>
  );
}

function StepActions({
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
}: {
  previousLabel?: string;
  nextLabel?: string;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="mt-10 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
      <div>
        {onPrevious && (
          <button
            type="button"
            onClick={onPrevious}
            className="rounded-full border border-white/15 px-7 py-4 text-xs font-black uppercase tracking-[0.25em] text-white/70 transition hover:border-[#B8C7D1] hover:text-[#4D8DFF]"
          >
            ← {previousLabel}
          </button>
        )}
      </div>

      <div>
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            className="rounded-full bg-[linear-gradient(135deg,#F4F7F8,#B8C7D1,#6F7F89)] text-[#050608] shadow-[0_18px_45px_rgba(184,199,209,.18)] px-7 py-4 text-xs font-black uppercase tracking-[0.25em] text-[#050608] transition hover:scale-105"
          >
            {nextLabel} →
          </button>
        )}
      </div>
    </div>
  );
}