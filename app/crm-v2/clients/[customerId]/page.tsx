import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCrmAccess } from "../../../lib/auth/dal";
import {
  getCustomer360,
  type Appointment,
  type Customer360Result,
  type JobStatus,
  type LeadLifecycleStatus,
  type Quote,
} from "../../../lib/crm";
import { createVehiclePhotoSignedUrl } from "../../../lib/crm-storage";
import {
  getCustomer360RenderedAt,
  selectCustomerPlanningAppointment,
} from "./planning";
import { formatCustomerActivity } from "./timeline";
import { buildWhatsAppLink } from "../../../lib/contact";
import {
  createV2Vehicle,
  updateV2CustomerProfile,
  uploadV2VehiclePhoto,
} from "./actions";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const leadLabels: Record<LeadLifecycleStatus, string> = {
  NEW: "Nouveau",
  QUALIFIED: "Qualifié",
  CONTACTED: "Contacté",
  QUOTE_SENT: "Devis envoyé",
  BOOKED: "Réservé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  REVIEW_REQUESTED: "Avis demandé",
  CLOSED_LOST: "Annulé / perdu",
};

const jobLabels: Record<JobStatus, string> = {
  QUOTE_ACCEPTED: "Devis accepté",
  SCHEDULED: "Planifié",
  CONFIRMED: "Confirmé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  PAID: "Payé",
};

const quoteLabels: Record<Quote["status"], string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  EXPIRED: "Expiré",
};

const appointmentLabels: Record<Appointment["status"], string> = {
  REQUESTED: "Demandé",
  CONFIRMED: "Confirmé",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function dt(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

function customerName(result: Customer360Result) {
  const c = result.customer;
  return (
    [c.first_name, c.last_name].filter(Boolean).join(" ") ||
    c.full_name ||
    "Client"
  );
}

function birthday(value?: string | null) {
  if (!value) return "Non renseigné";
  const date = new Date(value + "T12:00:00Z");
  if (Number.isNaN(date.getTime())) return "Non renseigné";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}


export default async function CustomerV2Page({
  params,
  searchParams,
}: {
  params: Promise<{ customerId?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCrmAccess();

  const renderedAt = await getCustomer360RenderedAt();
  const { customerId } = await params;
  const id = customerId?.trim();
  const sp = await searchParams;

  if (!id || !UUID_REGEX.test(id)) notFound();

  let result: Customer360Result | null = null;
  try {
    result = await getCustomer360(id);
  } catch {
    result = null;
  }

  if (!result) notFound();

  const showEdit =
    (Array.isArray(sp.edit) ? sp.edit[0] : sp.edit) === "1";
  const showVehicle =
    (Array.isArray(sp.new_vehicle) ? sp.new_vehicle[0] : sp.new_vehicle) === "1";
  const updated =
    (Array.isArray(sp.updated) ? sp.updated[0] : sp.updated) === "1";
  const vehicleCreated = Array.isArray(sp.vehicle_created)
    ? sp.vehicle_created[0]
    : sp.vehicle_created;
  const photoUpdated =
    (Array.isArray(sp.photo_updated) ? sp.photo_updated[0] : sp.photo_updated) ===
    "1";
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const vehicleError = Array.isArray(sp.vehicle_error)
    ? sp.vehicle_error[0]
    : sp.vehicle_error;
  const photoError = Array.isArray(sp.photo_error)
    ? sp.photo_error[0]
    : sp.photo_error;

  const c = result.customer;
  const activeLeads = result.leads.filter((lead) =>
    ["NEW", "QUALIFIED", "CONTACTED", "QUOTE_SENT", "BOOKED", "IN_PROGRESS"].includes(
      lead.lifecycle_status,
    ),
  ).length;
  const activeJobs = result.jobs.filter((job) =>
    ["QUOTE_ACCEPTED", "SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(
      job.status,
    ),
  ).length;

  const {
    nextAppointment,
    latestCompletedAppointment,
    planningAppointment,
  } = selectCustomerPlanningAppointment(result.appointments, renderedAt);
  const whatsapp = buildWhatsAppLink(
    c.phone,
    `Bonjour ${customerName(result)}, AUTO 9 ici.`,
  );

  const vehiclePhotos = new Map<string, string>();
  await Promise.all(
    result.vehicles.map(async (vehicle) => {
      if (!vehicle.id || !vehicle.photo_path) return;
      const signed = await createVehiclePhotoSignedUrl(vehicle.photo_path, 60 * 60);
      if (signed) vehiclePhotos.set(vehicle.id, signed);
    }),
  );

  return (
    <div className="space-y-7">
      <Link
        href="/crm-v2/clients"
        className="text-xs text-cyan-200/65 hover:text-cyan-100"
      >
        ← Retour aux clients
      </Link>

      {updated && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">
          Informations client mises à jour.
        </div>
      )}
      {vehicleCreated && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">
          Véhicule ajouté au client.
        </div>
      )}
      {photoUpdated && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">
          Photo du véhicule mise à jour.
        </div>
      )}
      {(error || vehicleError || photoError) && (
        <div className="rounded-xl border border-red-300/20 bg-red-300/[0.05] px-4 py-3 text-sm text-red-100">
          La modification n&apos;a pas pu être enregistrée.
        </div>
      )}

      <section className="rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.06] to-blue-500/[0.025] p-6 md:p-8">
        <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/55">
          Dossier client
        </p>

        <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              {customerName(result)}
            </h1>
            <p className="mt-3 text-sm text-white/45">
              {[c.email, c.phone, c.city].filter(Boolean).join(" · ") ||
                "Coordonnées non renseignées"}
            </p>
            <p className="mt-2 text-xs text-white/35">
              🎂 Anniversaire : {birthday(c.birth_date)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/crm-v2/clients/${id}?edit=1`}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/70 hover:border-cyan-300/25 hover:text-cyan-100"
            >
              Modifier le client
            </Link>
            <Link
              href={`/crm-v2/clients/${id}?new_vehicle=1`}
              className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] px-4 py-2.5 text-xs text-cyan-100"
            >
              + Véhicule
            </Link>
            {c.phone && (
              <a
                href={"tel:" + c.phone}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/70"
              >
                Appeler
              </a>
            )}
            {c.email && (
              <a
                href={"mailto:" + c.email}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/70"
              >
                Email
              </a>
            )}
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-2.5 text-xs text-emerald-100"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {showEdit && (
        <section className="rounded-3xl border border-cyan-300/15 bg-[#0b121b] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/50">
                Profil
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                Modifier les informations client
              </h2>
            </div>
            <Link
              href={`/crm-v2/clients/${id}`}
              className="text-xs text-white/35 hover:text-white"
            >
              Fermer ×
            </Link>
          </div>

          <form
            action={updateV2CustomerProfile}
            className="mt-6 grid gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="customerId" value={id} />

            <label className="text-xs text-white/45">
              Nom complet *
              <input
                name="fullName"
                required
                defaultValue={c.full_name}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <label className="text-xs text-white/45">
              Date d&apos;anniversaire
              <input
                name="birthDate"
                type="date"
                defaultValue={c.birth_date || ""}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white"
              />
            </label>

            <label className="text-xs text-white/45">
              Prénom
              <input
                name="firstName"
                defaultValue={c.first_name || ""}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <label className="text-xs text-white/45">
              Nom
              <input
                name="lastName"
                defaultValue={c.last_name || ""}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <label className="text-xs text-white/45">
              Email
              <input
                name="email"
                type="email"
                defaultValue={c.email || ""}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <label className="text-xs text-white/45">
              Téléphone
              <input
                name="phone"
                defaultValue={c.phone || ""}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <label className="text-xs text-white/45 md:col-span-2">
              Ville
              <input
                name="city"
                defaultValue={c.city || ""}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <button className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 md:col-span-2">
              Enregistrer le client
            </button>
          </form>
        </section>
      )}

      {showVehicle && (
        <section className="rounded-3xl border border-cyan-300/15 bg-[#0b121b] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/50">
                Parc client
              </p>
              <h2 className="mt-2 text-xl font-semibold">Ajouter un véhicule</h2>
            </div>
            <Link
              href={`/crm-v2/clients/${id}`}
              className="text-xs text-white/35 hover:text-white"
            >
              Fermer ×
            </Link>
          </div>

          <form action={createV2Vehicle} className="mt-6 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="customerId" value={id} />

            <input
              name="brand"
              required
              placeholder="Marque *"
              className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            />
            <input
              name="model"
              required
              placeholder="Modèle *"
              className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            />
            <input
              name="variant"
              placeholder="Finition / version"
              className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            />
            <input
              name="year"
              type="number"
              min="1900"
              max="2100"
              placeholder="Année"
              className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            />
            <input
              name="color"
              placeholder="Couleur"
              className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            />
            <input
              name="plate"
              placeholder="Immatriculation"
              className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            />
            <input
              name="mileageKm"
              type="number"
              min="0"
              placeholder="Kilométrage"
              className="rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 md:col-span-2"
            />

            <button className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 md:col-span-2">
              Ajouter ce véhicule
            </button>
          </form>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">
            Cockpit
          </p>
          <h2 className="mt-2 text-xl font-semibold">Vue opérationnelle</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Véhicules", result.vehicles.length, "Parc client"],
            [
              "Demandes",
              result.leads.length,
              `${activeLeads} active${activeLeads > 1 ? "s" : ""}`,
            ],
            ["Devis", result.quotes.length, "Historique commercial"],
            [
              "Prestations",
              result.jobs.length,
              `${activeJobs} active${activeJobs > 1 ? "s" : ""}`,
            ],
          ].map(([label, value, detail]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                {label}
              </p>
              <p className="mt-3 text-3xl font-bold text-white">{value}</p>
              <p className="mt-2 text-xs text-white/35">{detail}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
          <div className="rounded-2xl border border-cyan-300/10 bg-gradient-to-br from-cyan-300/[0.045] to-transparent p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/50">
                  Planning
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  {nextAppointment
                    ? "Prochain rendez-vous"
                    : latestCompletedAppointment
                      ? "Dernier rendez-vous"
                      : "Aucun rendez-vous opérationnel"}
                </h3>
              </div>

              {planningAppointment && (
                <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100">
                  {appointmentLabels[planningAppointment.status]}
                </span>
              )}
            </div>

            {planningAppointment ? (
              <>
                <p className="mt-6 text-2xl font-semibold tracking-tight text-white">
                  {dt(planningAppointment.scheduled_at) || "Date non renseignée"}
                </p>
                <p className="mt-2 text-xs text-white/35">
                  {planningAppointment.notes || "Rendez-vous AUTO 9"}
                </p>
              </>
            ) : (
              <p className="mt-6 text-sm leading-6 text-white/35">
                Aucun créneau confirmé à venir ni rendez-vous terminé n&apos;est rattaché à ce client.
              </p>
            )}

            <Link
              href="/crm-v2/calendar"
              className="mt-5 inline-block text-xs text-cyan-200/65 hover:text-cyan-100"
            >
              Ouvrir le calendrier →
            </Link>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 md:p-6">
            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/50">
              Relation
            </p>
            <h3 className="mt-2 text-lg font-semibold">Signal commercial</h3>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                <span className="text-white/35">Demandes actives</span>
                <span className="font-semibold">{activeLeads}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                <span className="text-white/35">Devis enregistrés</span>
                <span className="font-semibold">{result.quotes.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/35">Prestations actives</span>
                <span className="font-semibold">{activeJobs}</span>
              </div>
            </div>

            <Link
              href="/crm-v2/pipeline"
              className="mt-5 inline-block text-xs text-cyan-200/65 hover:text-cyan-100"
            >
              Ouvrir le pipeline →
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">
            Parc
          </p>
          <h2 className="mt-2 text-xl font-semibold">Véhicules possédés</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {result.vehicles.length ? (
            result.vehicles.map((v) => {
              const photo = v.id ? vehiclePhotos.get(v.id) : null;
              return (
                <article
                  key={v.id}
                  className="overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b]"
                >
                  <div className="relative aspect-[16/8] bg-white/[0.025]">
                    {photo ? (
                      <Image
                        src={photo}
                        alt={[v.brand, v.model].filter(Boolean).join(" ") || "Véhicule client"}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-white/20">
                        Aucune photo
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <p className="text-lg font-semibold">
                      {[v.brand, v.model, v.variant].filter(Boolean).join(" ") ||
                        "Véhicule"}
                    </p>
                    <p className="mt-2 text-xs text-white/40">
                      {[v.year, v.color, v.plate].filter(Boolean).join(" · ") ||
                        "Détails non renseignés"}
                    </p>
                    {typeof v.mileage_km === "number" && (
                      <p className="mt-1 text-xs text-white/30">
                        {new Intl.NumberFormat("fr-FR").format(v.mileage_km)} km
                      </p>
                    )}

                    {v.id && (
                      <form
                        action={uploadV2VehiclePhoto}
                        encType="multipart/form-data"
                        className="mt-4 flex flex-col gap-2 sm:flex-row"
                      >
                        <input type="hidden" name="customerId" value={id} />
                        <input type="hidden" name="vehicleId" value={v.id} />
                        <input
                          name="photo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          required
                          className="min-w-0 flex-1 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-[11px] text-white/45 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-300/10 file:px-3 file:py-1.5 file:text-[10px] file:font-semibold file:text-cyan-100"
                        />
                        <button className="rounded-xl border border-cyan-300/20 px-3 py-2 text-[11px] text-cyan-100">
                          {photo ? "Changer la photo" : "Ajouter la photo"}
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/30">
              Aucun véhicule.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">
            Relation
          </p>
          <h2 className="mt-2 text-xl font-semibold">Demandes</h2>
        </div>
        <div className="divide-y divide-white/8 overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b]">
          {result.leads.length ? (
            result.leads.map((lead) => (
              <article
                key={lead.id}
                className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {leadLabels[lead.lifecycle_status]}
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    {lead.source}
                    {lead.notes ? " · " + lead.notes : ""}
                  </p>
                </div>
                <Link
                  href="/crm-v2/pipeline"
                  className="text-xs text-cyan-200/60 hover:text-cyan-100"
                >
                  Voir dans le pipeline →
                </Link>
              </article>
            ))
          ) : (
            <div className="p-6 text-sm text-white/30">Aucune demande.</div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">
            Commercial
          </p>
          <h2 className="mt-2 text-xl font-semibold">Devis</h2>
        </div>
        <div className="divide-y divide-white/8 overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b]">
          {result.quotes.length ? (
            result.quotes.map((quote) => (
              <article
                key={quote.id}
                className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">
                    Devis v{quote.quote_version} · {quoteLabels[quote.status]}
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    {dt(quote.created_at)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-cyan-100">
                  {typeof quote.total_price === "number"
                    ? eur.format(quote.total_price)
                    : "—"}
                </p>
              </article>
            ))
          ) : (
            <div className="p-6 text-sm text-white/30">Aucun devis.</div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">
            Opérations
          </p>
          <h2 className="mt-2 text-xl font-semibold">Prestations</h2>
        </div>
        <div className="divide-y divide-white/8 overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b]">
          {result.jobs.length ? (
            result.jobs.map((job) => (
              <article
                key={job.id}
                className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {job.title || job.job_number || "Prestation"}
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    {jobLabels[job.status]} ·{" "}
                    {dt(job.scheduled_at) ||
                      dt(job.created_at) ||
                      "Date non renseignée"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-cyan-100">
                  {typeof job.total_amount === "number"
                    ? eur.format(job.total_amount)
                    : "—"}
                </p>
              </article>
            ))
          ) : (
            <div className="p-6 text-sm text-white/30">Aucune prestation.</div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">
              Planning
            </p>
            <h2 className="mt-2 text-xl font-semibold">Rendez-vous</h2>
          </div>
          <Link
            href="/crm-v2/calendar"
            className="text-xs text-cyan-200/60 hover:text-cyan-100"
          >
            Ouvrir le calendrier →
          </Link>
        </div>
        <div className="divide-y divide-white/8 overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b]">
          {result.appointments.length ? (
            result.appointments.map((appointment) => (
              <article
                key={appointment.id}
                className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {appointmentLabels[appointment.status]}
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    {appointment.notes || "Rendez-vous AUTO 9"}
                  </p>
                </div>
                <p className="text-sm text-white/60">
                  {dt(appointment.scheduled_at) ||
                    dt(appointment.requested_at) ||
                    "Date non renseignée"}
                </p>
              </article>
            ))
          ) : (
            <div className="p-6 text-sm text-white/30">Aucun rendez-vous.</div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">
            Historique
          </p>
          <h2 className="mt-2 text-xl font-semibold">Timeline client</h2>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b]">
          {result.activities.length ? (
            <div className="divide-y divide-white/8">
              {result.activities.map((activity) => {
                const presentation = formatCustomerActivity(activity);

                return (
                  <article
                    key={activity.id || `${activity.event_type}-${activity.created_at}`}
                    className="relative px-5 py-4 pl-10"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute left-5 top-5 h-2 w-2 rounded-full bg-cyan-300/70"
                    />
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white/80">
                          {presentation.title}
                        </p>
                        {presentation.detail && (
                          <p className="mt-1 text-xs leading-5 text-white/50">
                            {presentation.detail}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-xs text-white/35">
                        {dt(activity.created_at) || "Date non renseignée"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-sm text-white/30">
              Aucun événement enregistré pour ce client.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
