"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ServiceId = "duo" | "interieur" | "exterieur";
type VehicleId = "citadine" | "berline" | "suv" | "utilitaire";
type PremiumAddonId = "phares" | "jantes";
type ServicePlace = "domicile" | "travail" | "garage" | "autre";

type CustomerPhoto = {
  file: File;
  url: string;
};

const services: {
  id: ServiceId;
  name: string;
  premiumName: string;
  tag: string;
  description: string;
  operations: string[];
}[] = [
  {
    id: "duo",
    name: "Formule Duo",
    premiumName: "Formule Duo Premium",
    tag: "Best seller",
    description:
      "La prestation complète : intérieur + extérieur, avec nettoyage moteur offert.",
    operations: [
      "Aspiration complète de l’habitacle",
      "Nettoyage des plastiques et du tableau de bord",
      "Nettoyage des vitres intérieures",
      "Nettoyage des tapis",
      "Parfum d’ambiance",
      "Pré-lavage de la carrosserie",
      "Démoustiquage",
      "Décontamination ferreuse",
      "Lavage microfibre",
      "Nettoyage des jantes",
      "Séchage complet",
      "Brillant pneus",
      "Nettoyage moteur offert",
      "Finition complète du véhicule",
    ],
  },
  {
    id: "interieur",
    name: "Intérieur",
    premiumName: "Formule Intérieur",
    tag: "Confort",
    description:
      "Un habitacle propre, sain et soigné jusque dans les détails.",
    operations: [
      "Aspiration complète",
      "Nettoyage des plastiques",
      "Nettoyage du tableau de bord",
      "Nettoyage des vitres intérieures",
      "Nettoyage des tapis",
      "Parfum d’ambiance",
    ],
  },
  {
    id: "exterieur",
    name: "Extérieur",
    premiumName: "Formule Extérieur",
    tag: "Brillance",
    description:
      "Une carrosserie propre, brillante et des finitions soignées.",
    operations: [
      "Pré-lavage",
      "Démoustiquage",
      "Décontamination ferreuse",
      "Lavage microfibre",
      "Nettoyage des jantes",
      "Séchage complet",
      "Brillant pneus",
    ],
  },
];

const vehicles: {
  id: VehicleId;
  name: string;
  image: string;
  prices: Record<ServiceId, number>;
  estimatedTime: Record<ServiceId, string>;
}[] = [
  {
    id: "citadine",
    name: "Citadine",
    image: "/citadine.jpg",
    prices: {
      interieur: 89,
      exterieur: 89,
      duo: 169,
    },
    estimatedTime: {
      interieur: "1h30+",
      exterieur: "1h30+",
      duo: "4h+",
    },
  },
  {
    id: "berline",
    name: "Berline",
    image: "/berline.jpg",
    prices: {
      interieur: 89,
      exterieur: 89,
      duo: 169,
    },
    estimatedTime: {
      interieur: "1h30+",
      exterieur: "1h30+",
      duo: "4h+",
    },
  },
  {
    id: "suv",
    name: "SUV",
    image: "/suv.jpg",
    prices: {
      interieur: 99,
      exterieur: 99,
      duo: 179,
    },
    estimatedTime: {
      interieur: "1h30+",
      exterieur: "1h30+",
      duo: "4h+",
    },
  },
  {
    id: "utilitaire",
    name: "Utilitaire",
    image: "/utilitaire.jpg",
    prices: {
      interieur: 109,
      exterieur: 99,
      duo: 179,
    },
    estimatedTime: {
      interieur: "1h30+",
      exterieur: "1h30+",
      duo: "4h+",
    },
  },
];

const options: {
  name: string;
  price: number;
  services: ServiceId[];
}[] = [
  {
    name: "Shampoing sièges",
    price: 39,
    services: ["interieur", "duo"],
  },
  {
    name: "Poils animaux",
    price: 30,
    services: ["interieur", "duo"],
  },
  {
    name: "Destructeur d'odeurs habitacle + clim",
    price: 15,
    services: ["interieur", "duo"],
  },
  {
    name: "Nettoyage moteur",
    price: 20,
    services: ["exterieur"],
  },
  {
    name: "Cire hydrophobe",
    price: 10,
    services: ["exterieur", "duo"],
  },
];

const premiumAddons: {
  id: PremiumAddonId;
  name: string;
  price: number | null;
  label: string;
  description: string;
}[] = [
  {
    id: "phares",
    name: "Rénovation de phares",
    price: 69,
    label: "+69€",
    description:
      "Restauration des optiques ternis, jaunis ou opaques avec protection.",
  },
  {
    id: "jantes",
    name: "Réparation de jantes",
    price: null,
    label: "Sur devis",
    description:
      "Remise en état esthétique via partenaire spécialisé selon les dégâts.",
  },
];

const servicePlaceLabel: Record<ServicePlace, string> = {
  domicile: "À domicile",
  travail: "Au travail",
  garage: "Garage / site professionnel",
  autre: "Autre lieu",
};

const stepLabels = ["Prestation", "Véhicule", "Options", "Finaliser"];

export function QuoteConfigurator() {
  const searchParams = useSearchParams();
  const initialService = searchParams.get("service") as ServiceId | null;

  const stepContentRef = useRef<HTMLElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const submissionIdRef = useRef<string | null>(null);

  const [step, setStep] = useState(1);

  const [selectedService, setSelectedService] = useState<ServiceId>(
    initialService && ["duo", "interieur", "exterieur"].includes(initialService)
      ? initialService
      : "duo",
  );

  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleId>("citadine");

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const [selectedPremiumAddons, setSelectedPremiumAddons] = useState<
    PremiumAddonId[]
  >([]);

  const [customerPhotos, setCustomerPhotos] = useState<CustomerPhoto[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [customerComment, setCustomerComment] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");

  const [servicePlace, setServicePlace] =
    useState<ServicePlace>("domicile");

  const [availabilityDateTime, setAvailabilityDateTime] = useState("");
  const [selectedAvailabilityDate, setSelectedAvailabilityDate] = useState("");
  const [selectedAvailabilityTime, setSelectedAvailabilityTime] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const currentService = useMemo(
    () => services.find((service) => service.id === selectedService)!,
    [selectedService],
  );

  const currentVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicle)!,
    [selectedVehicle],
  );

  const availableOptions = useMemo(
    () =>
      options.filter((option) => option.services.includes(selectedService)),
    [selectedService],
  );

  const selectedPremiumAddonItems = useMemo(
    () =>
      premiumAddons.filter((addon) =>
        selectedPremiumAddons.includes(addon.id),
      ),
    [selectedPremiumAddons],
  );

  const basePrice = currentVehicle.prices[selectedService];

  const optionsTotal = selectedOptions.reduce((total, optionName) => {
    const option = options.find((item) => item.name === optionName);
    return total + (option?.price ?? 0);
  }, 0);

  const premiumAddonsTotal = selectedPremiumAddonItems.reduce(
    (total, addon) => total + (addon.price ?? 0),
    0,
  );

  const totalPrice = basePrice + optionsTotal + premiumAddonsTotal;
  const estimatedTime = currentVehicle.estimatedTime[selectedService];

  const hasQuoteAddon = selectedPremiumAddonItems.some(
    (addon) => addon.price === null,
  );

  const mainCustomerPhoto =
    customerPhotos[mainPhotoIndex] ?? customerPhotos[0] ?? null;

  const contactReady =
    customerName.trim().length > 1 && customerPhone.trim().length >= 8;

  const vehicleReady =
    vehicleBrand.trim().length > 0 && vehicleModel.trim().length > 0;
  const vehicleIdentity = [vehicleBrand.trim(), vehicleModel.trim()]
    .filter(Boolean)
    .join(" ");

  const canRequestAvailability = availabilityDateTime.trim().length > 0;

  function focusField(id: string) {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => element?.focus({ preventScroll: true }), 350);
  }

  // Ce qui bloque encore l'envoi, avec un raccourci vers le bon champ.
  const missingItems: { label: string; action: () => void }[] = [
    !vehicleReady && {
      label: "Marque et modèle",
      action: () => {
        goToStep(2);
        window.setTimeout(
          () =>
            focusField(
              vehicleBrand.trim() ? "quote-vehicle-model" : "quote-vehicle-brand",
            ),
          450,
        );
      },
    },
    !canRequestAvailability && {
      label: selectedAvailabilityDate ? "L’heure" : "La date",
      action: () =>
        document
          .getElementById("quote-when")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
    customerName.trim().length <= 1 && {
      label: "Votre nom",
      action: () => focusField("quote-name"),
    },
    customerPhone.trim().length < 8 && {
      label: "Votre téléphone",
      action: () => focusField("quote-phone"),
    },
  ].filter(Boolean) as { label: string; action: () => void }[];

  const minAvailabilityDateTime = useMemo(() => {
    const date = new Date();

    date.setHours(date.getHours() + 48);
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);

    const pad = (value: number) => String(value).padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }, []);

  // Créneaux à l'heure, de 8 h à 18 h (même format « HH:MM » qu'avant).
  const availabilityTimes = useMemo(
    () =>
      Array.from(
        { length: 11 },
        (_, index) => `${String(8 + index).padStart(2, "0")}:00`,
      ),
    [],
  );

  const availabilityDays = useMemo(() => {
    const start = new Date(minAvailabilityDateTime);
    start.setHours(0, 0, 0, 0);

    const pad = (value: number) => String(value).padStart(2, "0");

    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      const value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate(),
      )}`;

      return {
        value,
        dayName: new Intl.DateTimeFormat("fr-FR", {
          weekday: "short",
        }).format(date),
        dayNumber: new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "short",
        }).format(date),
      };
    });
  }, [minAvailabilityDateTime]);

  const formattedAvailabilityDateTime = useMemo(() => {
    if (!availabilityDateTime) return "Non renseignée";

    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(availabilityDateTime));
  }, [availabilityDateTime]);

  const reservationMessage = [
    "Bonjour AUTO 9, je souhaite demander une disponibilité pour cette prestation.",
    "",
    `Nom : ${customerName.trim() || "Non renseigné"}`,
    `Téléphone : ${customerPhone.trim() || "Non renseigné"}`,
    `Ville : ${customerCity.trim() || "Non renseignée"}`,
    `Lieu d'intervention : ${servicePlaceLabel[servicePlace]}`,
    `Date et heure souhaitées : ${formattedAvailabilityDateTime}`,
    "",
    `Formule : ${currentService.premiumName}`,
    `Véhicule : ${vehicleIdentity || "Non renseigné"}`,
    `Catégorie : ${currentVehicle.name}`,
    vehiclePlate.trim() ? `Immatriculation : ${vehiclePlate.trim()}` : "",
    `Prix estimé : ${totalPrice}€${
      hasQuoteAddon ? " + devis complémentaire" : ""
    }`,
    `Temps estimé : ${estimatedTime}`,
    "",
    selectedOptions.length > 0
      ? `Options : ${selectedOptions.join(", ")}`
      : "Options : aucune",
    selectedPremiumAddonItems.length > 0
      ? `Compléments premium : ${selectedPremiumAddonItems
          .map((addon) =>
            addon.price === null
              ? `${addon.name} : sur devis partenaire`
              : `${addon.name} : +${addon.price}€`,
          )
          .join(", ")}`
      : "Compléments premium : aucun",
    selectedService === "duo" ? "Inclus : Nettoyage moteur offert" : "",
    customerPhotos.length > 0
      ? `Photos ajoutées dans le configurateur : ${customerPhotos.length}`
      : "Photos ajoutées dans le configurateur : non",
    customerComment.trim()
      ? `Commentaire : ${customerComment.trim()}`
      : "Commentaire : aucun",
    "",
    "Le tarif affiché me convient sous réserve de confirmation selon l’état réel du véhicule.",
    "Merci de me confirmer si ce créneau est disponible.",
  ]
    .filter(Boolean)
    .join("\n");

  function goToStep(nextStep: number) {
    setStep(nextStep);

    window.setTimeout(() => {
      const target = stepContentRef.current;

      if (!target) return;

      const stickyBarOffset = window.innerWidth < 768 ? 92 : 28;

      const top =
        target.getBoundingClientRect().top + window.scrollY - stickyBarOffset;

      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
    }, 90);
  }

  function trackLeadClick(method: "whatsapp" | "mail") {
    if (typeof window === "undefined") return;

    const gtag = (
      window as Window & {
        gtag?: (
          command: "event",
          eventName: string,
          params?: Record<string, string | number | boolean>,
        ) => void;
      }
    ).gtag;

    gtag?.("event", `auto9_${method}_click`, {
      event_category: "lead",
      event_label: method,
    });
  }

  function isSlotDisabled(dateValue: string, timeValue: string) {
    return `${dateValue}T${timeValue}` < minAvailabilityDateTime;
  }

  function isDateDisabled(dateValue: string) {
    return availabilityTimes.every((time) =>
      isSlotDisabled(dateValue, time),
    );
  }

  function handleAvailabilityDateSelect(dateValue: string) {
    if (isDateDisabled(dateValue)) return;

    setSelectedAvailabilityDate(dateValue);
    setSelectedAvailabilityTime("");
    setAvailabilityDateTime("");
  }

  function handleAvailabilityTimeSelect(timeValue: string) {
    if (!selectedAvailabilityDate) return;

    const nextDateTime = `${selectedAvailabilityDate}T${timeValue}`;

    if (nextDateTime < minAvailabilityDateTime) return;

    setSelectedAvailabilityTime(timeValue);
    setAvailabilityDateTime(nextDateTime);
  }

  function toggleOption(optionName: string) {
    setSelectedOptions((current) =>
      current.includes(optionName)
        ? current.filter((item) => item !== optionName)
        : [...current, optionName],
    );
  }

  function togglePremiumAddon(addonId: PremiumAddonId) {
    setSelectedPremiumAddons((current) =>
      current.includes(addonId)
        ? current.filter((item) => item !== addonId)
        : [...current, addonId],
    );
  }

  function handleServiceChange(serviceId: ServiceId) {
    setSelectedService(serviceId);

    setSelectedOptions((current) =>
      current.filter((optionName) => {
        const option = options.find((item) => item.name === optionName);
        return option?.services.includes(serviceId);
      }),
    );
  }

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/"),
    );

    const remainingSlots = 4 - customerPhotos.length;
    const selectedFiles = imageFiles.slice(0, remainingSlots);

    const newPhotos = selectedFiles.map((file) => {
      const url = URL.createObjectURL(file);

      objectUrlsRef.current.push(url);

      return {
        file,
        url,
      };
    });

    if (customerPhotos.length === 0 && newPhotos.length > 0) {
      setMainPhotoIndex(0);
    }

    setCustomerPhotos((current) => [...current, ...newPhotos]);
    event.target.value = "";
  }

  function removePhoto(indexToRemove: number) {
    const photoToRemove = customerPhotos[indexToRemove];

    if (photoToRemove) {
      URL.revokeObjectURL(photoToRemove.url);

      objectUrlsRef.current = objectUrlsRef.current.filter(
        (url) => url !== photoToRemove.url,
      );
    }

    const nextPhotos = customerPhotos.filter(
      (_, index) => index !== indexToRemove,
    );

    setCustomerPhotos(nextPhotos);

    setMainPhotoIndex((current) => {
      if (nextPhotos.length === 0) return 0;
      if (indexToRemove === current) {
        return Math.min(current, nextPhotos.length - 1);
      }
      if (indexToRemove < current) return current - 1;

      return current;
    });
  }

  async function handleQuoteRequest() {
    if (!contactReady || !vehicleReady || !canRequestAvailability || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const submissionId =
        submissionIdRef.current ?? crypto.randomUUID();

      submissionIdRef.current = submissionId;

      const formData = new FormData();

      formData.append("submissionId", submissionId);

      formData.append(
        "payload",
        JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerCity: customerCity.trim(),
          customerEmail: customerEmail.trim(),
          servicePlace,
          servicePlaceLabel: servicePlaceLabel[servicePlace],
          availabilityDateTime,
          formattedAvailabilityDateTime,
          serviceId: selectedService,
          serviceName: currentService.premiumName,
          vehicleId: selectedVehicle,
          vehicleName: currentVehicle.name,
          vehicleBrand: vehicleBrand.trim(),
          vehicleModel: vehicleModel.trim(),
          vehiclePlate: vehiclePlate.trim(),
          basePrice,
          selectedOptions,
          selectedPremiumAddons: selectedPremiumAddonItems.map((addon) => ({
            id: addon.id,
            name: addon.name,
            price: addon.price,
            label: addon.label,
          })),
          totalPrice,
          estimatedTime,
          hasQuoteAddon,
          customerComment: customerComment.trim(),
          mainPhotoIndex,
          reservationMessage,
        }),
      );

      customerPhotos.forEach(({ file }) => {
        formData.append("photos", file, file.name);
      });

      const response = await fetch("/api/quote-request", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error || "Impossible d’envoyer la demande pour le moment.",
        );
      }

      trackLeadClick("mail");
      submissionIdRef.current = null;
      setSubmitSuccess(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant l’envoi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden px-3 pb-32 pt-4 text-white sm:px-6 lg:px-8">



      <div className="auto9-grid pointer-events-none absolute inset-0 opacity-[0.025]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-soft))] shadow-[0_0_18px_rgba(var(--accent-rgb),.65)] transition-[width] duration-700 ease-out"
            style={{
              width: `${(step / stepLabels.length) * 100}%`,
            }}
          />
        </div>

        <div className="mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-2 lg:min-w-0 lg:justify-between">
            {stepLabels.map((label, index) => {
              const number = index + 1;
              const active = step === number;
              const done = step > number;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => goToStep(number)}
                  aria-current={active ? "step" : undefined}
                  className={`group flex items-center gap-2 rounded-full border px-3 py-2 transition duration-300 hover:-translate-y-0.5 lg:gap-3 lg:px-4 lg:py-2.5 ${
                    active
                      ? "auto9-active-step border-accent/70 bg-accent/15"
                      : done
                        ? "border-accent/25 bg-accent/5"
                        : "border-white/10 bg-black/30 hover:border-accent/35"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-black transition duration-300 lg:h-10 lg:w-10 lg:text-sm ${
                      active || done
                        ? "bg-accent text-on-metal shadow-[0_0_18px_rgba(var(--accent-rgb),.45)]"
                        : "bg-white/10 text-white/45 group-hover:bg-white/15"
                    }`}
                  >
                    {done ? "✓" : number}
                  </span>

                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.14em] transition lg:text-sm ${
                      active
                        ? "text-white"
                        : done
                          ? "text-white/60"
                          : "text-white/40 group-hover:text-white/60"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <main
          ref={stepContentRef}
          className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-4 shadow-2xl backdrop-blur-sm sm:p-6 lg:p-10 xl:p-12"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(var(--accent-rgb),.65),transparent)]" />

          <div key={step} className="auto9-step-enter relative">
            {step === 1 && (
              <AssistantStep
                eyebrow="Étape 1 sur 4"
                title="Quelle prestation recherchez-vous ?"
                subtitle="Commencez par choisir le niveau de soin souhaité pour votre véhicule."
              >
                <div className="grid gap-3 lg:grid-cols-3">
                  {services.map((service, index) => {
                    const active = selectedService === service.id;
                    const startingPrice = Math.min(
                      ...vehicles.map((vehicle) => vehicle.prices[service.id]),
                    );

                    return (
                      <div
                        key={service.id}
                        className={`auto9-card-enter group overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1 ${
                          active
                            ? "border-accent bg-accent/10 shadow-[0_0_38px_rgba(var(--accent-rgb),.16)]"
                            : "border-white/10 bg-black/25 hover:border-accent/40 hover:bg-accent/5"
                        }`}
                        style={{
                          animationDelay: `${index * 80}ms`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleServiceChange(service.id)}
                          className="relative w-full p-4 text-left lg:p-6"
                        >
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),.13),transparent_50%)] opacity-0 transition duration-500 group-hover:opacity-100" />

                          <div className="relative flex items-start justify-between gap-3">
                            <div>
                              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-accent-soft lg:text-xs">
                                {service.tag}
                              </span>

                              <h3 className="mt-3 text-xl font-black uppercase tracking-[-0.04em] lg:text-3xl">
                                {service.name}
                              </h3>
                            </div>

                            <div className="relative isolate rounded-xl border border-metal-mid/25 bg-white/[0.04] px-3 py-2 shadow-[0_0_18px_rgba(var(--metal-rgb),.12)]">
                              <span className="pointer-events-none absolute inset-1 -z-10 rounded-lg bg-metal-mid/10 blur-lg" />

                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-accent-soft">
                                Dès
                              </p>
                              <p className="text-2xl font-black bg-price bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(var(--metal-rgb),.35)] lg:text-4xl">
                                {startingPrice}€
                              </p>
                            </div>
                          </div>

                          <p className="relative mt-3 text-sm leading-relaxed text-white/55 lg:text-lg">
                            {service.description}
                          </p>
                        </button>

                        <details className="border-t border-white/10 px-4 py-3 text-xs text-white/55 lg:px-6 lg:py-4 lg:text-base">
                          <summary className="cursor-pointer select-none font-black uppercase tracking-[0.12em] text-white/70 transition hover:text-accent-soft">
                            Voir ce qui est inclus
                          </summary>

                          <div className="mt-3 space-y-2">
                            {service.operations.map((operation) => (
                              <p key={operation}>
                                <span className="text-accent-soft">✓</span>{" "}
                                {operation}
                              </p>
                            ))}
                          </div>
                        </details>
                      </div>
                    );
                  })}
                </div>
              </AssistantStep>
            )}

            {step === 2 && (
              <AssistantStep
                eyebrow="Étape 2 sur 4"
                title="Quel véhicule souhaitez-vous nous confier ?"
                subtitle={`${currentService.name} sélectionnée — choisissez le gabarit le plus proche de votre véhicule.`}
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {vehicles.map((vehicle, index) => {
                    const active = selectedVehicle === vehicle.id;
                    const price = vehicle.prices[selectedService];

                    return (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => {
                          setSelectedVehicle(vehicle.id);
                        }}
                        className={`auto9-card-enter group relative overflow-hidden rounded-2xl border p-3 text-left transition duration-300 hover:-translate-y-1 lg:p-6 ${
                          active
                            ? "border-accent bg-accent/10 shadow-[0_0_35px_rgba(var(--accent-rgb),.18)]"
                            : "border-white/10 bg-black/25 hover:border-accent/40 hover:bg-accent/5"
                        }`}
                        style={{
                          animationDelay: `${index * 70}ms`,
                        }}
                      >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-rgb),.12),transparent_48%)] opacity-0 transition duration-500 group-hover:opacity-100" />

                        <div className="relative flex items-center gap-3 lg:block">
                          <img
                            src={vehicle.image}
                            alt={vehicle.name}
                            className="h-16 w-24 shrink-0 object-contain transition duration-500 group-hover:scale-105 lg:h-36 lg:w-full xl:h-40"
                          />

                          <div className="min-w-0 lg:mt-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-lg font-black uppercase tracking-[-0.03em] lg:text-3xl">
                                {vehicle.name}
                              </p>

                              <span
                                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black transition duration-300 ${
                                  active
                                    ? "bg-accent text-on-metal shadow-[0_0_18px_rgba(var(--accent-rgb),.55)]"
                                    : "border border-white/15 text-transparent"
                                }`}
                              >
                                ✓
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-white/45 lg:text-lg">
                              {price}€ · {currentService.name}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div
                  className="auto9-card-enter mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:grid-cols-2 lg:p-6"
                  style={{ animationDelay: "300ms" }}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-soft sm:col-span-2">
                    Votre véhicule
                  </p>
                  <label className="grid gap-2 text-sm text-white/65">
                    Marque du véhicule *
                    <input
                      id="quote-vehicle-brand"
                      value={vehicleBrand}
                      onChange={(event) => setVehicleBrand(event.target.value)}
                      required
                      placeholder="Ex. BMW"
                      className="rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-base text-white lg:text-sm outline-none transition placeholder:text-white/30 focus:border-accent focus:shadow-[0_0_22px_rgba(var(--accent-rgb),.12)]"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-white/65">
                    Modèle du véhicule *
                    <input
                      id="quote-vehicle-model"
                      value={vehicleModel}
                      onChange={(event) => setVehicleModel(event.target.value)}
                      required
                      placeholder="Ex. Série 3"
                      className="rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-base text-white lg:text-sm outline-none transition placeholder:text-white/30 focus:border-accent focus:shadow-[0_0_22px_rgba(var(--accent-rgb),.12)]"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-white/65 sm:col-span-2">
                    Immatriculation (optionnel)
                    <input
                      value={vehiclePlate}
                      onChange={(event) => setVehiclePlate(event.target.value)}
                      placeholder="Ex. AB-123-CD"
                      className="rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-base text-white lg:text-sm outline-none transition placeholder:text-white/30 focus:border-accent focus:shadow-[0_0_22px_rgba(var(--accent-rgb),.12)]"
                    />
                  </label>
                </div>
              </AssistantStep>
            )}

            {step === 3 && (
              <AssistantStep
                eyebrow="Étape 3 sur 4"
                title="Des options à ajouter ?"
                subtitle="Suppléments et photos sont facultatifs. Les photos nous aident à confirmer le tarif."
              >
                <div className="mx-auto max-w-4xl space-y-2">
                  {availableOptions.map((option, index) => {
                    const active = selectedOptions.includes(option.name);

                    return (
                      <div
                        key={option.name}
                        className="auto9-card-enter"
                        style={{
                          animationDelay: `${index * 55}ms`,
                        }}
                      >
                        <ChoiceRow
                          title={option.name}
                          price={`+${option.price}€`}
                          active={active}
                          onClick={() => toggleOption(option.name)}
                        />
                      </div>
                    );
                  })}

                  {premiumAddons.map((addon, index) => {
                    const active = selectedPremiumAddons.includes(addon.id);
                    const animationIndex = availableOptions.length + index;

                    return (
                      <div
                        key={addon.id}
                        className="auto9-card-enter"
                        style={{
                          animationDelay: `${animationIndex * 55}ms`,
                        }}
                      >
                        <ChoiceRow
                          title={addon.name}
                          price={addon.label}
                          active={active}
                          onClick={() => togglePremiumAddon(addon.id)}
                        />
                      </div>
                    );
                  })}

                  {selectedService === "duo" && (
                    <div
                      className="auto9-card-enter flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 lg:px-5 lg:py-4"
                      style={{
                        animationDelay: `${
                          (availableOptions.length + premiumAddons.length) * 55
                        }ms`,
                      }}
                    >
                      <span className="text-sm font-bold lg:text-base">
                        Nettoyage moteur
                      </span>

                      <span className="text-right text-xs font-black text-emerald-300 lg:text-sm">
                        Déjà inclus dans votre formule
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <div className="auto9-card-enter mx-auto max-w-4xl rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-lg font-black lg:text-2xl">
                          Photos du véhicule
                        </p>

                        <p className="mt-1 text-sm text-white/45 lg:text-base">
                          Facultatif, mais fortement recommandé pour une
                          estimation plus précise.
                        </p>
                      </div>

                      <label
                        className={`inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-black transition duration-300 lg:text-xs ${
                          customerPhotos.length >= 4
                            ? "cursor-not-allowed opacity-35"
                            : "cursor-pointer hover:scale-[1.03] hover:bg-[#DDEBFF]"
                        }`}
                      >
                        {customerPhotos.length >= 4
                          ? "4 photos ajoutées"
                          : "Ajouter des photos"}

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          className="hidden"
                          disabled={customerPhotos.length >= 4}
                        />
                      </label>
                    </div>

                    {customerPhotos.length > 0 ? (
                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {customerPhotos.map((photo, index) => (
                          <div
                            key={photo.url}
                            className="auto9-card-enter relative"
                            style={{
                              animationDelay: `${index * 70}ms`,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setMainPhotoIndex(index)}
                              className={`group relative block w-full overflow-hidden rounded-xl border transition duration-300 hover:-translate-y-1 ${
                                mainPhotoIndex === index
                                  ? "border-accent shadow-[0_0_24px_rgba(var(--accent-rgb),.35)]"
                                  : "border-white/10 hover:border-accent/45"
                              }`}
                            >
                              <img
                                src={photo.url}
                                alt={`Photo du véhicule ${index + 1}`}
                                className="h-32 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-28 lg:h-36"
                              />

                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                              {mainPhotoIndex === index && (
                                <span className="absolute bottom-2 left-2 rounded-full bg-metal px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-on-metal">
                                  Principale
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              aria-label={`Supprimer la photo ${index + 1}`}
                              className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-black/80 text-sm text-white transition hover:scale-110 hover:bg-red-500"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-6 text-center text-sm text-white/40">
                        Aucune photo ajoutée pour le moment.
                      </div>
                    )}

                    <div className="mt-6">
                      <label
                        htmlFor="customer-comment"
                        className="text-sm font-black lg:text-base"
                      >
                        Commentaire
                      </label>

                      <textarea
                        id="customer-comment"
                        value={customerComment}
                        onChange={(event) =>
                          setCustomerComment(event.target.value)
                        }
                        placeholder="Taches, poils d’animaux, rayures, odeurs, besoins particuliers…"
                        className="mt-3 min-h-32 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-4 text-sm outline-none transition placeholder:text-white/30 focus:border-accent focus:shadow-[0_0_22px_rgba(var(--accent-rgb),.12)] lg:text-base"
                      />
                    </div>
                  </div>
                </div>
              </AssistantStep>
            )}

            {step === 4 && !submitSuccess && (
              <AssistantStep
                eyebrow="Étape 4 sur 4"
                title="Finalisez votre demande."
                subtitle="Le lieu, le créneau et vos coordonnées : tout se règle ici."
              >
                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                  <div className="grid gap-4">
                    <section
                      id="quote-when"
                      className="auto9-card-enter grid scroll-mt-28 gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 lg:p-6"
                    >
                      <FinalSectionTitle number={1} title="Où et quand ?" />
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {(Object.keys(servicePlaceLabel) as ServicePlace[]).map(
                          (place, index) => (
                            <div
                              key={place}
                              className="auto9-card-enter"
                              style={{
                                animationDelay: `${index * 60}ms`,
                              }}
                            >
                              <ChoiceRow
                                title={servicePlaceLabel[place]}
                                price=""
                                active={servicePlace === place}
                                onClick={() => setServicePlace(place)}
                              />
                            </div>
                          ),
                        )}
                      </div>
                    <div
                      className="space-y-4"
                      style={{
                        animationDelay: "130ms",
                      }}
                    >
                      <div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent-soft">
                          Date souhaitée
                        </p>

                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
                          {availabilityDays.map((day) => {
                            const disabled = isDateDisabled(day.value);
                            const active =
                              selectedAvailabilityDate === day.value;

                            return (
                              <button
                                key={day.value}
                                type="button"
                                disabled={disabled}
                                onClick={() =>
                                  handleAvailabilityDateSelect(day.value)
                                }
                                className={`rounded-xl border px-2 py-2.5 text-center text-[10px] font-black uppercase transition duration-300 ${
                                  active
                                    ? "border-accent bg-accent/15 text-white shadow-[0_0_18px_rgba(var(--accent-rgb),.25)]"
                                    : disabled
                                      ? "cursor-not-allowed border-white/5 text-white/15"
                                      : "border-white/10 text-white/60 hover:-translate-y-0.5 hover:border-accent/50 hover:text-white"
                                }`}
                              >
                                <span className="block">{day.dayName}</span>

                                <span className="mt-1 block text-xs">
                                  {day.dayNumber}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent-soft">
                          Heure souhaitée
                        </p>

                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-7">
                          {availabilityTimes.map((time) => {
                            const disabled =
                              !selectedAvailabilityDate ||
                              isSlotDisabled(selectedAvailabilityDate, time);

                            const active =
                              selectedAvailabilityTime === time;

                            return (
                              <button
                                key={time}
                                type="button"
                                disabled={disabled}
                                onClick={() =>
                                  handleAvailabilityTimeSelect(time)
                                }
                                className={`rounded-full border px-2 py-2.5 text-xs font-black transition duration-300 ${
                                  active
                                    ? "border-accent bg-accent/15 text-white shadow-[0_0_18px_rgba(var(--accent-rgb),.25)]"
                                    : disabled
                                      ? "cursor-not-allowed border-white/5 text-white/15"
                                      : "border-white/10 text-white/60 hover:-translate-y-0.5 hover:border-accent/50 hover:text-white"
                                }`}
                              >
                                {time.replace(":", "h")}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    </section>

                    <section
                      className="auto9-card-enter grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:grid-cols-2 lg:p-6"
                      style={{ animationDelay: "120ms" }}
                    >
                      <div className="sm:col-span-2">
                        <FinalSectionTitle number={2} title="Vos coordonnées" />
                      </div>
                      <label htmlFor="quote-name" className="grid gap-2 text-sm text-white/65">
                        Nom et prénom *
                        <input
                          id="quote-name"
                          value={customerName}
                          onChange={(event) => setCustomerName(event.target.value)}
                          placeholder="Ex. Camille Martin"
                          autoComplete="name"
                          enterKeyHint="next"
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-accent focus:shadow-[0_0_22px_rgba(var(--accent-rgb),.12)] lg:text-sm"
                        />
                      </label>
                      <label htmlFor="quote-phone" className="grid gap-2 text-sm text-white/65">
                        Téléphone *
                        <input
                          id="quote-phone"
                          value={customerPhone}
                          onChange={(event) => setCustomerPhone(event.target.value)}
                          placeholder="06 12 34 56 78"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          enterKeyHint="next"
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-accent focus:shadow-[0_0_22px_rgba(var(--accent-rgb),.12)] lg:text-sm"
                        />
                      </label>
                      <label htmlFor="quote-email" className="grid gap-2 text-sm text-white/65">
                        Email (pour recevoir votre devis)
                        <input
                          id="quote-email"
                          value={customerEmail}
                          onChange={(event) => setCustomerEmail(event.target.value)}
                          placeholder="vous@exemple.fr"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          enterKeyHint="next"
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-accent focus:shadow-[0_0_22px_rgba(var(--accent-rgb),.12)] lg:text-sm"
                        />
                      </label>
                      <label htmlFor="quote-city" className="grid gap-2 text-sm text-white/65">
                        Ville
                        <input
                          id="quote-city"
                          value={customerCity}
                          onChange={(event) => setCustomerCity(event.target.value)}
                          placeholder="Ex. Nîmes"
                          autoComplete="address-level2"
                          enterKeyHint="done"
                          className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-accent focus:shadow-[0_0_22px_rgba(var(--accent-rgb),.12)] lg:text-sm"
                        />
                      </label>
                    </section>
                  </div>

                  <div
                    className="auto9-card-enter overflow-hidden rounded-2xl border border-accent/30 lg:sticky lg:top-6 bg-accent/10 shadow-[0_0_45px_rgba(var(--accent-rgb),.08)]"
                    style={{
                      animationDelay: "100ms",
                    }}
                  >
                    {mainCustomerPhoto && (
                      <div className="relative h-44 overflow-hidden border-b border-accent/20 sm:h-52 lg:h-60">
                        <img
                          src={mainCustomerPhoto.url}
                          alt="Photo principale du véhicule"
                          className="h-full w-full object-cover"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-forest/80 via-transparent to-transparent" />

                        <div className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white backdrop-blur">
                          Photo principale
                        </div>

                        {customerPhotos.length > 1 && (
                          <div className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
                            {customerPhotos.length} photos
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent-soft">
                        Votre demande
                      </p>

                      <div className="mt-4 space-y-3 text-sm">
                        <SummaryLine
                          label="Véhicule"
                          value={vehicleIdentity || "À renseigner"}
                        />

                        <SummaryLine
                          label="Catégorie"
                          value={currentVehicle.name}
                        />

                        {vehiclePlate.trim() && (
                          <SummaryLine
                            label="Immatriculation"
                            value={vehiclePlate.trim()}
                          />
                        )}

                        <SummaryLine
                          label="Prestation"
                          value={currentService.premiumName}
                        />

                        <SummaryLine
                          label="Lieu"
                          value={servicePlaceLabel[servicePlace]}
                        />
                        <SummaryLine
                          label="Créneau"
                          value={
                            availabilityDateTime
                              ? formattedAvailabilityDateTime
                              : "À choisir"
                          }
                        />

                        <SummaryLine
                          label="Durée estimée"
                          value={estimatedTime}
                        />
                      </div>

                      <details className="group mt-5 overflow-hidden rounded-xl border border-white/10 bg-black/25">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left [&::-webkit-details-marker]:hidden">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-soft">
                              Prestation sélectionnée
                            </p>

                            <p className="mt-1 text-sm font-black text-white lg:text-base">
                              {currentService.premiumName}
                            </p>
                          </div>

                          <span className="flex shrink-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/65 transition group-open:text-accent-soft">
                            Voir ce qui est inclus

                            <span className="text-lg transition-transform duration-300 group-open:rotate-180">
                              ⌄
                            </span>
                          </span>
                        </summary>

                        <div className="border-t border-white/10 px-4 py-4">
                          <p className="text-sm leading-relaxed text-white/50">
                            {currentService.description}
                          </p>

                          <div className="mt-4 space-y-2.5">
                            {currentService.operations.map((operation) => (
                              <p
                                key={operation}
                                className="flex gap-2 text-sm leading-relaxed text-white/70"
                              >
                                <span className="shrink-0 font-black text-accent-soft">
                                  ✓
                                </span>

                                <span>{operation}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      </details>

                      <div className="mt-5 flex items-end justify-between gap-4 border-t border-accent/25 pt-4">
                        <span className="text-sm text-white/55">
                          Total estimé
                        </span>

                        <div className="relative isolate rounded-2xl border border-metal-mid/30 bg-[radial-gradient(circle_at_center,rgba(var(--metal-rgb),.14),rgba(var(--metal-rgb),.04)_58%,transparent_82%)] px-4 py-2 shadow-[0_0_28px_rgba(var(--metal-rgb),.16),inset_0_0_20px_rgba(var(--metal-rgb),.06)]">
                          <span className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-metal-mid/10 blur-xl" />

                          <span
                            key={totalPrice}
                            className="auto9-price-pop block text-4xl font-black bg-price bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(var(--metal-rgb),.35)]"
                          >
                            {totalPrice}€
                          </span>
                        </div>
                      </div>

                      {hasQuoteAddon && (
                        <p className="mt-2 text-xs text-accent-soft">
                          + complément sur devis partenaire
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="auto9-card-enter mt-5 grid gap-3" style={{ animationDelay: "200ms" }}>
                  {missingItems.length > 0 && (
                    <div
                      className="auto9-message-enter flex flex-wrap items-center gap-2 text-sm text-white/65"
                      aria-live="polite"
                    >
                      <span>Il manque :</span>
                      {missingItems.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={item.action}
                          className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5 text-xs font-black text-white transition duration-300 hover:-translate-y-0.5 hover:border-accent"
                        >
                          {item.label} →
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleQuoteRequest}
                    disabled={missingItems.length > 0 || isSubmitting}
                    className="group w-full rounded-full bg-metal px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-on-metal shadow-[0_18px_45px_rgba(var(--metal-rgb),.2)] transition duration-300 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 lg:text-sm"
                  >
                    {isSubmitting ? "Envoi en cours…" : `Envoyer ma demande · ${totalPrice}€`}{" "}
                    {!isSubmitting && (
                      <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    )}
                  </button>

                  {submitError && (
                    <p className="auto9-message-enter rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm font-bold text-red-200" role="alert">
                      {submitError}
                    </p>
                  )}
                </div>
              </AssistantStep>
            )}

            {step === 4 && submitSuccess && (
              <div className="mx-auto max-w-2xl py-6 text-center lg:py-12" role="status">
                <span className="auto9-success-pop mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent text-4xl font-black text-on-metal shadow-[0_0_45px_rgba(var(--accent-rgb),.45)]">
                  ✓
                </span>
                <h2 className="auto9-card-enter mt-7 text-3xl font-black tracking-[-0.04em] lg:text-5xl" style={{ animationDelay: "150ms" }}>
                  Demande envoyée.
                </h2>
                <p className="auto9-card-enter mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/65 lg:text-lg" style={{ animationDelay: "250ms" }}>
                  {currentService.premiumName} · {vehicleIdentity} · {formattedAvailabilityDateTime}.
                  AUTO 9 vous recontacte rapidement pour confirmer le créneau.
                </p>
                <div className="auto9-card-enter mt-8" style={{ animationDelay: "350ms" }}>
                  <Link
                    href="/"
                    className="inline-block rounded-full bg-metal px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-on-metal shadow-[0_18px_45px_rgba(var(--metal-rgb),.2)] transition hover:brightness-105"
                  >
                    Retour au site
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <div className="auto9-bottom-bar fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#07090d]/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_50px_rgba(0,0,0,.35)] backdrop-blur-2xl sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-3 lg:gap-5">
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="truncate text-sm font-black lg:text-lg">
              {currentVehicle.name} · {currentService.name}
            </p>

            <p className="text-xs text-white/40 lg:text-base">
              {stepLabels[step - 1]} · étape {step}/{stepLabels.length}
            </p>
          </div>

          <div className="relative isolate mr-auto rounded-xl border border-metal-mid/25 bg-white/[0.04] px-3 py-1.5 shadow-[0_0_20px_rgba(var(--metal-rgb),.12)] sm:mr-0 lg:px-4 lg:py-2">
            <span className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-metal-mid/10 blur-lg" />

            <p className="text-[9px] uppercase tracking-[0.18em] text-accent-soft lg:text-sm">
              Estimation
            </p>

            <p
              key={totalPrice}
              className="auto9-price-pop text-xl font-black bg-price bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(var(--metal-rgb),.35)] lg:text-3xl"
            >
              {totalPrice}€
            </p>
          </div>

          {step > 1 && (
            <button
              type="button"
              onClick={() => goToStep(step - 1)}
              className="rounded-full border border-white/15 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/70 transition duration-300 hover:-translate-y-0.5 hover:border-accent-soft hover:text-white lg:px-8 lg:py-5 lg:text-xs"
            >
              Retour
            </button>
          )}

          {step < stepLabels.length ? (
            <button
              type="button"
              onClick={() => goToStep(step + 1)}
              className="group rounded-full bg-metal px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-on-metal shadow-[0_12px_30px_rgba(var(--metal-rgb),.22)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_40px_rgba(var(--metal-rgb),.32)] lg:px-9 lg:py-5 lg:text-sm"
            >
              Continuer{" "}
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleQuoteRequest}
              disabled={missingItems.length > 0 || isSubmitting || submitSuccess}
              className="rounded-full bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[0_12px_30px_rgba(255,255,255,.1)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#DDEBFF] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 lg:px-9 lg:py-5 lg:text-sm"
            >
              {isSubmitting
                ? "Envoi..."
                : submitSuccess
                  ? "Envoyée ✓"
                  : "Envoyer"}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes auto9StepEnter {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.992);
            filter: blur(5px);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes auto9CardEnter {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }

          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes auto9PricePop {
          0% {
            opacity: 0.45;
            transform: scale(0.86);
            filter: blur(3px);
          }

          60% {
            transform: scale(1.08);
          }

          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
        }

        @keyframes auto9SuccessPop {
          0% {
            opacity: 0;
            transform: scale(0.4) rotate(-12deg);
          }
          60% {
            opacity: 1;
            transform: scale(1.12) rotate(3deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0);
          }
        }

        @keyframes auto9MessageEnter {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }

          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes auto9BottomBarEnter {
          0% {
            opacity: 0;
            transform: translateY(100%);
          }

          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes auto9OrbOne {
          0%,
          100% {
            transform: translateX(-50%) translateY(0) scale(1);
          }

          50% {
            transform: translateX(-50%) translateY(32px) scale(1.08);
          }
        }

        @keyframes auto9OrbTwo {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(-45px, 35px, 0) scale(1.12);
          }
        }

        @keyframes auto9OrbThree {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(55px, -28px, 0) scale(1.1);
          }
        }

        @keyframes auto9GridDrift {
          0% {
            background-position: 0 0;
          }

          100% {
            background-position: 48px 48px;
          }
        }

        @keyframes auto9ActivePulse {
          0%,
          100% {
            box-shadow: 0 0 0 rgba(var(--accent-rgb),0);
          }

          50% {
            box-shadow: 0 0 28px rgba(var(--accent-rgb),0.18);
          }
        }

        .auto9-step-enter {
          animation: auto9StepEnter 560ms cubic-bezier(0.22, 1, 0.36, 1)
            both;
        }

        .auto9-card-enter {
          opacity: 0;
          animation: auto9CardEnter 520ms cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
        }

        .auto9-price-pop {
          animation: auto9PricePop 420ms cubic-bezier(0.22, 1, 0.36, 1)
            both;
        }

        .auto9-success-pop {
          animation: auto9SuccessPop 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .auto9-message-enter {
          animation: auto9MessageEnter 420ms ease-out both;
        }

        .auto9-bottom-bar {
          animation: auto9BottomBarEnter 620ms cubic-bezier(0.22, 1, 0.36, 1)
            both;
        }

        .auto9-orb-one {
          animation: auto9OrbOne 11s ease-in-out infinite;
        }

        .auto9-orb-two {
          animation: auto9OrbTwo 14s ease-in-out infinite;
        }

        .auto9-orb-three {
          animation: auto9OrbThree 16s ease-in-out infinite;
        }

        .auto9-grid {
          background-image:
            linear-gradient(rgba(var(--accent-rgb),0.5) 1px, transparent 1px),
            linear-gradient(
              90deg,
              rgba(var(--accent-rgb),0.5) 1px,
              transparent 1px
            );
          background-size: 48px 48px;
          animation: auto9GridDrift 18s linear infinite;
        }

        .auto9-active-step {
          animation: auto9ActivePulse 2.6s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .auto9-step-enter,
          .auto9-card-enter,
          .auto9-price-pop,
          .auto9-message-enter,
          .auto9-success-pop,
          .auto9-bottom-bar,
          .auto9-orb-one,
          .auto9-orb-two,
          .auto9-orb-three,
          .auto9-grid,
          .auto9-active-step {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }

          * {
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </section>
  );
}

function AssistantStep({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent-soft lg:text-xs">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl lg:text-6xl">
        {title}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/50 lg:mt-3 lg:text-xl">
        {subtitle}
      </p>

      <div className="mt-5 lg:mt-7">{children}</div>
    </div>
  );
}

function ChoiceRow({
  title,
  price,
  active,
  onClick,
}: {
  title: string;
  price: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition duration-300 hover:-translate-y-0.5 lg:px-5 lg:py-4 ${
        active
          ? "border-accent bg-accent/10 shadow-[0_0_24px_rgba(var(--accent-rgb),.11)]"
          : "border-white/10 bg-black/25 hover:border-accent/40 hover:bg-accent/5"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black transition duration-300 lg:h-8 lg:w-8 ${
            active
              ? "bg-accent text-on-metal shadow-[0_0_18px_rgba(var(--accent-rgb),.45)]"
              : "border border-white/15 text-transparent group-hover:border-accent/45"
          }`}
        >
          ✓
        </span>

        <span className="text-sm font-bold lg:text-base">{title}</span>
      </span>

      {price && (
        <span className="shrink-0 text-xs font-black text-accent-soft lg:text-sm">
          {price}
        </span>
      )}
    </button>
  );
}

function FinalSectionTitle({
  number,
  title,
}: {
  number: number;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-black text-on-metal shadow-[0_0_18px_rgba(var(--accent-rgb),.35)]">
        {number}
      </span>
      <p className="text-base font-black uppercase tracking-[0.08em] lg:text-lg">
        {title}
      </p>
    </div>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2">
      <span className="text-white/45">{label}</span>

      <span className="text-right font-bold">{value}</span>
    </div>
  );
}
