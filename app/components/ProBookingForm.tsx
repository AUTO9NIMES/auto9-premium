"use client";

import { type FormEvent, useMemo, useRef, useState, useSyncExternalStore } from "react";

import {
  PRO_ADDONS,
  PRO_PACKS,
  type ProPackId,
  computeProTotal,
  isAddonIncluded,
  resolveProPack,
  selectProAddons,
} from "../lib/pro-offer";

/*
 * Réservation professionnels — remplissage en 4 temps (véhicule, créneau, options, coordonnées).
 * Envoyé à /api/probooking : mêmes champs qu'avant + `pack` (standard / premium / signature),
 * date « AAAA-MM-JJ » et heure « HH:MM » (le serveur les combine en date de rendez-vous).
 * Packs, suppléments et prix viennent de lib/pro-offer.ts (le serveur recalcule le total). L'immatriculation est
 * envoyée en majuscules. Les coordonnées du garage peuvent être retenues sur l'appareil
 * (navigateur du pro uniquement, case à décocher).
 */

// Créneaux proposés (heure de début). Modifiable ici.
const SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const DAYS_SHOWN = 7;
const CONTACT_KEY = "auto9_pro_contact";

const pad = (value: number) => String(value).padStart(2, "0");
// Date locale (pas UTC) au format attendu par le serveur.
const isoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function formatPlate(raw: string) {
  const upper = raw.toUpperCase();
  const compact = upper.replace(/[^A-Z0-9]/g, "");
  // Format SIV « AB-123-CD » quand la saisie y correspond, sinon on garde la saisie (en majuscules).
  return /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(compact)
    ? `${compact.slice(0, 2)}-${compact.slice(2, 5)}-${compact.slice(5)}`
    : upper;
}

type Contact = { garage: string; phone: string; email: string };
const emptyBooking = { vehicle: "", plate: "", date: "", time: "", pack: "standard" as ProPackId, addons: [] as string[] };

function readSavedContact(): Contact | null {
  try {
    const saved = JSON.parse(localStorage.getItem(CONTACT_KEY) ?? "null") as Contact | null;
    return saved?.garage ? { garage: saved.garage ?? "", phone: saved.phone ?? "", email: saved.email ?? "" } : null;
  } catch {
    return null; // stockage indisponible : formulaire vide
  }
}

const noop = () => () => {};

/*
 * Le formulaire s'affiche uniquement dans le navigateur : la date du jour et les créneaux dépendent
 * de l'heure locale du pro (le serveur est en UTC), et les coordonnées retenues sont sur l'appareil.
 */
export function ProBookingForm() {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) {
    return <div className="mt-10 h-[60rem] animate-pulse rounded-[1.75rem] border border-white/8 bg-white/[0.02] md:h-[44rem]" aria-hidden="true" />;
  }
  return <BookingForm />;
}

function BookingForm() {
  const [saved] = useState(readSavedContact);
  const [contact, setContact] = useState<Contact>(saved ?? { garage: "", phone: "", email: "" });
  const [booking, setBooking] = useState(emptyBooking);
  const [remember, setRemember] = useState(true);
  const rememberedName = saved?.garage ?? "";
  const [customDate, setCustomDate] = useState(false);
  const [customTime, setCustomTime] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DAYS_SHOWN }, (_, index) => {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
      const label =
        index === 0
          ? "Aujourd’hui"
          : index === 1
            ? "Demain"
            : day.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
      return { value: isoDay(day), label, sub: day.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "") };
    });
  }, []);
  const todayIso = days[0].value;

  const isPastSlot = (hour: number) => {
    if (booking.date !== todayIso) return false;
    const now = new Date();
    return hour <= now.getHours();
  };

  const selectedPack = resolveProPack(booking.pack);
  const selectedAddons = selectProAddons(selectedPack, booking.addons);
  const totalPrice = computeProTotal(selectedPack, booking.addons);

  const missing = [
    booking.vehicle.trim().length > 1 ? null : "le véhicule",
    booking.date ? null : "la date",
    booking.time ? null : "l’heure",
    contact.garage.trim().length > 1 ? null : "le nom du garage",
    contact.phone.replace(/\D/g, "").length >= 8 ? null : "le téléphone",
  ].filter(Boolean) as string[];
  const ready = missing.length === 0;

  // Changer de pack retire les suppléments désormais inclus dans ce pack.
  const selectPack = (id: ProPackId) =>
    setBooking((current) => ({
      ...current,
      pack: id,
      addons: current.addons.filter((addon) => !isAddonIncluded(resolveProPack(id), addon)),
    }));

  const toggleAddon = (id: string) =>
    setBooking((current) => ({
      ...current,
      addons: current.addons.includes(id) ? current.addons.filter((value) => value !== id) : [...current.addons, id],
    }));

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
          garage: contact.garage.trim(),
          phone: contact.phone.trim(),
          email: contact.email.trim(),
          date: booking.date,
          time: booking.time,
          vehicle: booking.vehicle.trim(),
          plate: booking.plate.trim().toUpperCase(),
          pack: selectedPack.id,
          service: `${selectedPack.name} — ${selectedPack.price} €`,
          addons: selectedAddons.map((addon) => ({ id: addon.id, name: addon.name, price: addon.price })),
          totalPrice,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Impossible d’envoyer la réservation pour le moment.");
      }

      try {
        if (remember) localStorage.setItem(CONTACT_KEY, JSON.stringify({ ...contact, garage: contact.garage.trim(), phone: contact.phone.trim(), email: contact.email.trim() }));
        else localStorage.removeItem(CONTACT_KEY);
      } catch {
        /* stockage indisponible : sans conséquence */
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue pendant l’envoi.");
    } finally {
      setSending(false);
    }
  }

  // Réserver un autre véhicule : on garde les coordonnées, on vide le reste
  const bookAnother = () => {
    setBooking(emptyBooking);
    setCustomDate(false);
    setCustomTime(false);
    setSuccess(false);
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => formRef.current?.querySelector<HTMLInputElement>('input[name="vehicle"]')?.focus(), 450);
  };

  const field =
    "w-full rounded-2xl border border-white/12 bg-black/30 px-5 py-4 text-base text-white outline-none transition placeholder:text-white/25 focus:border-accent/70 focus:shadow-[0_0_24px_rgba(var(--accent-rgb),.14)]";
  const label = "mb-2.5 block text-xs font-black uppercase tracking-[0.22em] text-white/60";
  const chip = (active: boolean, disabled = false) =>
    `rounded-2xl border px-3 py-3 text-center transition duration-200 ${
      disabled
        ? "cursor-not-allowed border-white/5 text-white/20"
        : active
          ? "border-accent bg-accent/15 text-white shadow-[0_0_22px_rgba(var(--accent-rgb),.18)]"
          : "border-white/12 bg-white/[0.04] text-white/75 hover:border-white/30 hover:text-white"
    }`;
  const stepTitle = (number: number, title: string, hint?: string) => (
    <div className="mb-5 flex items-center gap-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-on-metal">{number}</span>
      <div>
        <p className="text-lg font-black uppercase tracking-[-0.03em]">{title}</p>
        {hint && <p className="text-xs text-white/40">{hint}</p>}
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="relative mt-10 rounded-[1.75rem] border border-accent/40 bg-black/30 p-7 text-center md:p-10" role="status">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-3xl font-black text-on-metal">✓</span>
        <p className="mt-6 text-2xl font-black uppercase tracking-[-0.04em]">Réservation envoyée</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55">
          {selectedPack.label} · {booking.vehicle} · {new Date(`${booking.date}T00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {booking.time.replace(":", " h ")}.
          AUTO 9 vous confirme rapidement le créneau.
        </p>
        <button
          type="button"
          onClick={bookAnother}
          className="mt-8 rounded-full border border-white/40 bg-metal px-8 py-4 text-xs font-black uppercase tracking-[0.25em] text-on-metal shadow-[0_18px_45px_rgba(var(--metal-rgb),.2)] transition hover:brightness-105"
        >
          Réserver un autre véhicule →
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="relative mt-10 grid scroll-mt-6 gap-10" noValidate>
      {/* 1. Véhicule */}
      <fieldset>
        <legend className="contents">{stepTitle(1, "Le véhicule")}</legend>
        <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
          <div>
            <label htmlFor="pro-vehicle" className={label}>Véhicule / Modèle *</label>
            <input
              id="pro-vehicle"
              name="vehicle"
              type="text"
              required
              value={booking.vehicle}
              onChange={(event) => setBooking((current) => ({ ...current, vehicle: event.target.value }))}
              placeholder="Ex : Peugeot 3008"
              autoComplete="off"
              enterKeyHint="next"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="pro-plate" className={label}>
              Immatriculation <span className="normal-case tracking-normal text-white/30">(facultatif)</span>
            </label>
            <input
              id="pro-plate"
              name="plate"
              type="text"
              value={booking.plate}
              onChange={(event) => setBooking((current) => ({ ...current, plate: formatPlate(event.target.value) }))}
              placeholder="AB-123-CD"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={12}
              className={`${field} font-bold tracking-[0.12em]`}
            />
          </div>
        </div>
      </fieldset>

      {/* 2. Créneau */}
      <fieldset>
        <legend className="contents">{stepTitle(2, "Le créneau", "Touchez un jour puis une heure")}</legend>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {days.map((day) => (
            <button
              key={day.value}
              type="button"
              aria-pressed={!customDate && booking.date === day.value}
              onClick={() => {
                setCustomDate(false);
                setBooking((current) => ({
                  ...current,
                  date: day.value,
                  // une heure déjà passée aujourd'hui n'est plus valable
                  time: day.value === todayIso && current.time && Number(current.time.slice(0, 2)) <= new Date().getHours() ? "" : current.time,
                }));
              }}
              className={chip(!customDate && booking.date === day.value)}
            >
              <span className="block text-[11px] font-black uppercase tracking-[0.08em] first-letter:uppercase">{day.label}</span>
              <span className="mt-0.5 block text-[11px] text-white/45">{day.sub}</span>
            </button>
          ))}
          <button type="button" aria-pressed={customDate} onClick={() => setCustomDate(true)} className={chip(customDate)}>
            <span className="block text-[11px] font-black uppercase tracking-[0.08em]">Autre</span>
            <span className="mt-0.5 block text-[11px] text-white/45">date</span>
          </button>
        </div>
        {customDate && (
          <input
            type="date"
            aria-label="Choisir une autre date"
            min={todayIso}
            value={booking.date}
            onChange={(event) => setBooking((current) => ({ ...current, date: event.target.value }))}
            className={`${field} mt-3 max-w-xs`}
          />
        )}

        <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {SLOT_HOURS.map((hour) => {
            const value = `${pad(hour)}:00`;
            const past = isPastSlot(hour);
            return (
              <button
                key={value}
                type="button"
                disabled={past}
                aria-pressed={!customTime && booking.time === value}
                onClick={() => {
                  setCustomTime(false);
                  setBooking((current) => ({ ...current, time: value }));
                }}
                className={`${chip(!customTime && booking.time === value, past)} text-sm font-black`}
              >
                {hour} h
              </button>
            );
          })}
          <button type="button" aria-pressed={customTime} onClick={() => setCustomTime(true)} className={`${chip(customTime)} text-[11px] font-black uppercase`}>
            Autre
          </button>
        </div>
        {customTime && (
          <input
            type="time"
            aria-label="Choisir une autre heure"
            step={900}
            value={booking.time}
            onChange={(event) => setBooking((current) => ({ ...current, time: event.target.value }))}
            className={`${field} mt-3 max-w-xs`}
          />
        )}
      </fieldset>

      {/* 3. Options */}
      <fieldset>
        <legend className="contents">{stepTitle(3, "La prestation", "Choisissez un pack, puis vos suppléments")}</legend>
        <div role="radiogroup" aria-label="Pack" className="grid gap-2 sm:grid-cols-3">
          {PRO_PACKS.map((pack) => {
            const active = booking.pack === pack.id;
            return (
              <button
                key={pack.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectPack(pack.id)}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-4 sm:px-5 text-left transition duration-200 ${
                  active
                    ? "border-accent bg-accent/15 shadow-[0_0_22px_rgba(var(--accent-rgb),.16)]"
                    : pack.id === "signature"
                      ? "border-accent/45 bg-white/[0.04] hover:border-accent/80"
                      : "border-white/12 bg-white/[0.04] hover:border-white/30"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${active ? "border-accent bg-accent" : "border-white/25"}`}>
                    <span className={`h-2 w-2 rounded-full ${active ? "bg-on-metal" : "bg-transparent"}`} />
                  </span>
                  <span>
                    <span className="block text-sm font-black uppercase tracking-[0.08em] sm:tracking-[0.14em]">{pack.label}</span>
                    <span className="mt-1 block text-xs text-white/60">{pack.summary}</span>
                  </span>
                </span>
                <strong className="shrink-0 bg-price bg-clip-text text-xl font-black tracking-[-0.04em] text-transparent sm:text-2xl">{pack.price} €</strong>
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {PRO_ADDONS.map((addon) => {
            const included = isAddonIncluded(selectedPack, addon.id);
            const checked = !included && booking.addons.includes(addon.id);
            return (
              <button
                key={addon.id}
                type="button"
                aria-pressed={checked}
                disabled={included}
                onClick={() => toggleAddon(addon.id)}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left transition duration-200 ${
                  included
                    ? "cursor-default border-white/8 bg-white/[0.02]"
                    : checked
                      ? "border-accent bg-accent/15 shadow-[0_0_22px_rgba(var(--accent-rgb),.16)]"
                      : "border-white/12 bg-white/[0.04] hover:border-white/30"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-black transition ${checked ? "border-accent bg-accent text-on-metal" : included ? "border-white/20 text-white/60" : "border-white/25 text-transparent"}`}>✓</span>
                  <span className={`text-sm font-bold ${included ? "text-white/60" : "text-white/85"}`}>{addon.name}</span>
                </span>
                {included ? (
                  <span className="shrink-0 text-xs font-black uppercase tracking-[0.18em] text-white/60">Inclus</span>
                ) : (
                  <strong className="shrink-0 bg-price bg-clip-text text-sm font-black text-transparent">+{addon.price} €</strong>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* 4. Coordonnées */}
      <fieldset>
        <legend className="contents">
          {stepTitle(4, "Vos coordonnées", rememberedName ? `Pré-remplies pour ${rememberedName}` : "Retenues pour vos prochaines réservations")}
        </legend>
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label htmlFor="pro-garage" className={label}>Nom du garage *</label>
            <input
              id="pro-garage"
              name="garage"
              type="text"
              required
              value={contact.garage}
              onChange={(event) => setContact((current) => ({ ...current, garage: event.target.value }))}
              placeholder="Ex : Twiice Auto Nîmes"
              autoComplete="organization"
              enterKeyHint="next"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="pro-phone" className={label}>Téléphone *</label>
            <input
              id="pro-phone"
              name="phone"
              type="tel"
              required
              inputMode="tel"
              value={contact.phone}
              onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))}
              placeholder="06 12 34 56 78"
              autoComplete="tel"
              enterKeyHint="next"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="pro-email" className={label}>
              Email <span className="normal-case tracking-normal text-white/30">(facultatif)</span>
            </label>
            <input
              id="pro-email"
              name="email"
              type="email"
              inputMode="email"
              value={contact.email}
              onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))}
              placeholder="contact@garage.fr"
              autoComplete="email"
              enterKeyHint="done"
              className={field}
            />
          </div>
        </div>
        <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 text-sm text-white/55">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-5 w-5 accent-accent" />
          Se souvenir de ces coordonnées sur cet appareil
        </label>
      </fieldset>

      {error && <p className="rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-bold text-red-200" role="alert">{error}</p>}

      {/* Récapitulatif collant : reste visible en bas de l'écran pendant le remplissage */}
      <div className="sticky bottom-3 z-20 -mx-2 rounded-[1.5rem] border border-white/12 bg-[#060908]/85 p-3 shadow-[0_20px_60px_rgba(0,0,0,.55)] backdrop-blur-xl sm:-mx-0 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="min-w-0 flex-1 pl-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">Total · {selectedPack.label}</p>
            <p className="bg-price bg-clip-text text-2xl font-black tracking-[-0.04em] text-transparent">{totalPrice} €</p>
          </div>
          <button
            type="submit"
            disabled={!ready || sending}
            className="shrink-0 rounded-full border border-white/40 bg-metal px-6 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-on-metal shadow-[0_18px_45px_rgba(var(--metal-rgb),.2)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 sm:px-8 sm:text-xs"
          >
            {sending ? "Envoi…" : "Réserver →"}
          </button>
        </div>
        {!ready && (
          <p className="mt-2 px-2 text-xs text-white/50" aria-live="polite">
            Il manque : <span className="font-bold text-white/75">{missing.join(", ")}</span>
          </p>
        )}
      </div>
    </form>
  );
}
