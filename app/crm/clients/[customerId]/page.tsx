import { randomUUID } from "node:crypto";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../../lib/auth/dal";
import {
  buildWhatsAppLink,
  toMailtoHref,
  toTelHref,
} from "../../../lib/contact";
import { createCustomerVehicleAction, updateCustomerProfileAction, uploadCustomerVehiclePhotoAction } from "./actions";
import {
  getCustomer360,
  type ActivityLog,
  type Appointment,
  type Customer360Result,
  type Job,
  type JobStatus,
  type Lead,
  type LeadLifecycleStatus,
  type Quote,
  type Vehicle,
} from "../../../lib/crm";
import { createVehiclePhotoSignedUrl } from "../../../lib/crm-storage";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const leadStatusLabels: Record<LeadLifecycleStatus, string> = {
  NEW: "Nouveau",
  QUALIFIED: "Qualifié",
  CONTACTED: "Contacté",
  QUOTE_SENT: "Devis envoyé",
  BOOKED: "Réservé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  REVIEW_REQUESTED: "Avis demandé",
  CLOSED_LOST: "Clôturé",
};

const jobStatusLabels: Record<JobStatus, string> = {
  QUOTE_ACCEPTED: "Devis accepté",
  SCHEDULED: "Planifié",
  CONFIRMED: "Confirmé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  PAID: "Payé",
};

const quoteStatusLabels: Record<Quote["status"], string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  EXPIRED: "Expiré",
};

const appointmentStatusLabels: Record<Appointment["status"], string> = {
  REQUESTED: "Demandé",
  CONFIRMED: "Confirmé",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

async function ensureCrmAccess() {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirect("/crm/login?error=access");
    }
    throw new Error("Service CRM temporairement indisponible.");
  }
}

function formatBirthday(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value + "T12:00:00Z");
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatAmount(value?: number | null): string | null {
  return typeof value === "number"
    ? new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(value)
    : null;
}

function formatCustomerName(result: Customer360Result): string {
  const customer = result.customer;
  const name = [customer.first_name, customer.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");

  return name || customer.full_name.trim() || "Identité non renseignée";
}

const contactLinkClass =
  "border border-white/15 px-3 py-2 text-xs text-white/65 transition-colors hover:border-[#d8b477] hover:text-[#d8b477]";

function ContactActions({ phone, email, whatsappMessage }: {
  phone?: string | null;
  email?: string | null;
  whatsappMessage: string;
}) {
  const telHref = toTelHref(phone);
  const mailtoHref = toMailtoHref(email);
  const whatsappHref = buildWhatsAppLink(phone, whatsappMessage);

  if (!telHref && !mailtoHref && !whatsappHref) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
      {telHref && <a href={telHref} className={contactLinkClass}>Appeler</a>}
      {mailtoHref && <a href={mailtoHref} className={contactLinkClass}>Email</a>}
      {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={contactLinkClass}>WhatsApp</a>}
    </div>
  );
}

function formatVehicle(vehicle: Vehicle): string {
  return [vehicle.brand, vehicle.model, vehicle.variant]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ") || "Véhicule sans désignation";
}

function formatVehicleMeta(vehicle: Vehicle): string | null {
  const fields = [
    vehicle.year ? String(vehicle.year) : null,
    vehicle.color,
    vehicle.plate,
  ].filter((value): value is string => Boolean(value?.trim()));

  return fields.length > 0 ? fields.join(" · ") : null;
}

function statusLabel(status: string, labels: Record<string, string>): string {
  return labels[status] || status;
}

function SectionHeading({ eyebrow, title, count }: {
  eyebrow: string;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-end justify-between border-b border-white/10 pb-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-medium text-white">{title}</h2>
      </div>
      {count !== undefined && <span className="text-xs text-white/30">{count}</span>}
    </div>
  );
}

function EmptySection({ children }: { children: string }) {
  return <p className="border border-dashed border-white/15 px-5 py-8 text-sm text-white/35">{children}</p>;
}

function VehicleCard({ vehicle, photoUrl }: { vehicle: Vehicle; photoUrl?: string | null }) {
  return (
    <article className="group relative overflow-hidden border border-white/10 bg-[#101419] transition-colors hover:border-white/20">
      <div className="relative aspect-[16/8] bg-[#0d1014]">{photoUrl ? <Image src={photoUrl} alt={formatVehicle(vehicle)} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-white/20">Aucune photo</div>}</div>
      <div className="p-5 md:p-6">
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-[#d8b477]/40" />
      <p className="text-sm font-medium text-white">{formatVehicle(vehicle)}</p>
      {formatVehicleMeta(vehicle) && <p className="mt-2 text-xs text-white/45">{formatVehicleMeta(vehicle)}</p>}
      {vehicle.vehicle_type && <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-[#d8b477]">{vehicle.vehicle_type}</p>}
      {vehicle.mileage_km !== null && vehicle.mileage_km !== undefined && <p className="mt-2 text-xs text-white/35">{vehicle.mileage_km.toLocaleString("fr-FR")} km</p>}
      {vehicle.id && <form action={uploadCustomerVehiclePhotoAction} encType="multipart/form-data" className="mt-4 flex flex-col gap-2 sm:flex-row"><input type="hidden" name="customerId" value={vehicle.customer_id} /><input type="hidden" name="vehicleId" value={vehicle.id} /><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="min-w-0 flex-1 border border-white/10 bg-[#0d1014] px-3 py-2 text-[11px] text-white/45 file:mr-3 file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-[10px] file:text-white" /><button type="submit" className="border border-[#d8b477]/30 px-3 py-2 text-[11px] text-[#d8b477]">{photoUrl ? "Changer la photo" : "Ajouter la photo"}</button></form>}
    </div>
    </article>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  return (
    <article className="border-b border-white/10 px-5 py-5 transition-colors last:border-b-0 hover:bg-white/[0.015] md:px-7">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium text-white">{statusLabel(lead.lifecycle_status, leadStatusLabels)}</p>
          <p className="mt-1 text-xs text-white/40">Source : {lead.source}</p>
        </div>
        <p className="text-xs text-white/35">{formatDate(lead.created_at) || "Date non renseignée"}</p>
      </div>
      {(lead.source_page || lead.notes) && <p className="mt-4 text-xs leading-6 text-white/50">{lead.notes || lead.source_page}</p>}
    </article>
  );
}

function QuoteRow({ quote }: { quote: Quote }) {
  return (
    <article className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-5 transition-colors last:border-b-0 hover:bg-white/[0.015] md:flex-row md:items-center md:px-7">
      <div>
        <p className="text-sm font-medium text-white">Version {quote.quote_version}</p>
        <p className="mt-1 text-xs text-white/40">{statusLabel(quote.status, quoteStatusLabels)}{quote.estimated_time ? ` · ${quote.estimated_time}` : ""}</p>
      </div>
      <div className="text-left md:text-right">
        {quote.total_price !== null && quote.total_price !== undefined && <p className="text-sm text-[#d8b477]">{formatAmount(quote.total_price)}</p>}
        <p className="mt-1 text-xs text-white/35">{formatDate(quote.created_at) || "Date non renseignée"}</p>
      </div>
    </article>
  );
}

function JobRow({ job }: { job: Job }) {
  return (
    <article className="border-b border-white/10 px-5 py-5 transition-colors last:border-b-0 hover:bg-white/[0.015] md:px-7">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-medium text-white">{job.title || job.job_number || "Prestation"}</p>
          <p className="mt-1 text-xs text-[#d8b477]">{statusLabel(job.status, jobStatusLabels)}</p>
        </div>
        <div className="text-left md:text-right">
          {job.total_amount !== null && job.total_amount !== undefined && <p className="text-sm text-white">{formatAmount(job.total_amount)}</p>}
          <p className="mt-1 text-xs text-white/35">{formatDateTime(job.scheduled_at) || formatDate(job.created_at) || "Date non renseignée"}</p>
        </div>
      </div>
      {job.notes && <p className="mt-4 text-xs leading-6 text-white/45">{job.notes}</p>}
    </article>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const operationalDate = formatDateTime(appointment.scheduled_at);
  const requestedDate = formatDateTime(appointment.requested_at);

  return (
    <article className="border-b border-white/10 px-5 py-5 last:border-b-0 md:px-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-white">
              {statusLabel(appointment.status, appointmentStatusLabels)}
            </p>
            <span className="border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/35">
              Rendez-vous
            </span>
          </div>

          {appointment.notes && (
            <p className="mt-3 max-w-2xl text-xs leading-5 text-white/40">
              {appointment.notes}
            </p>
          )}
        </div>

        <div className="md:text-right">
          {operationalDate ? (
            <>
              <p className="text-sm font-medium text-[#d8b477]">{operationalDate}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/30">
                Créneau opérationnel
              </p>
            </>
          ) : requestedDate ? (
            <>
              <p className="text-sm text-white/60">{requestedDate}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/30">
                Souhait client · non planifié
              </p>
            </>
          ) : (
            <p className="text-xs text-white/30">Date non renseignée</p>
          )}
        </div>
      </div>

      {operationalDate && requestedDate && operationalDate !== requestedDate && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-xs text-white/30">
            Souhait initial : {requestedDate}
          </p>
        </div>
      )}
    </article>
  );
}

function ActivityRow({ activity }: { activity: ActivityLog }) {
  return (
    <article className="relative border-l border-[#d8b477]/40 pb-7 pl-5 last:pb-0">
      <span className="absolute -left-1.5 top-0 h-3 w-3 rounded-full border-2 border-[#080a0d] bg-[#d8b477]" />
      <div className="flex flex-col justify-between gap-2 md:flex-row">
        <p className="text-sm text-white">{activity.event_type}</p>
        <p className="text-xs text-white/35">{formatDateTime(activity.created_at) || "Date non renseignée"}</p>
      </div>
    </article>
  );
}

export default async function Customer360Page({ params, searchParams }: {
  params: Promise<{ customerId?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureCrmAccess();

  const { customerId } = await params;
  const normalizedCustomerId = customerId?.trim();

  if (!normalizedCustomerId || !UUID_REGEX.test(normalizedCustomerId)) {
    notFound();
  }

  let result: Customer360Result | null = null;
  let failed = false;

  try {
    result = await getCustomer360(normalizedCustomerId);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div data-crm-route="clients" className="space-y-8">
        <Link href="/crm/clients" className="text-xs text-[#d8b477] hover:text-white">← Retour aux clients</Link>
        <section className="border border-white/10 bg-[#101419] p-7">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">Customer 360</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Client indisponible</h1>
          <p className="mt-3 text-sm text-white/45">Les informations de ce client sont momentanément indisponibles.</p>
        </section>
      </div>
    );
  }

  if (!result) {
    notFound();
  }

  const customer = result.customer;
  const displayName = formatCustomerName(result);
  const feedback = await searchParams;
  const profileStatus = Array.isArray(feedback.profile) ? feedback.profile[0] : feedback.profile;
  const profileError = Array.isArray(feedback.profile_error) ? feedback.profile_error[0] : feedback.profile_error;
  const photoError = Array.isArray(feedback.photo_error) ? feedback.photo_error[0] : feedback.photo_error;
  const vehicleStatus = Array.isArray(feedback.vehicle) ? feedback.vehicle[0] : feedback.vehicle;
  const vehicleError = Array.isArray(feedback.vehicle_error) ? feedback.vehicle_error[0] : feedback.vehicle_error;
  const photoStatus = Array.isArray(feedback.photo) ? feedback.photo[0] : feedback.photo;
  const vehicleIdempotencyKey = randomUUID();
  const vehiclePhotos = new Map<string, string>();
  await Promise.all(result.vehicles.map(async (vehicle) => { if (!vehicle.id || !vehicle.photo_path) return; const signed = await createVehiclePhotoSignedUrl(vehicle.photo_path, 60 * 60); if (signed) vehiclePhotos.set(vehicle.id, signed); }));

  const contactDetails = [customer.email, customer.phone, customer.city].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  const scheduledAppointments = result.appointments
    .filter((appointment) => Boolean(appointment.scheduled_at))
    .sort((left, right) => {
      const leftTime = new Date(left.scheduled_at as string).getTime();
      const rightTime = new Date(right.scheduled_at as string).getTime();
      return leftTime - rightTime;
    });

  const now = Date.now();

  const nextAppointment =
    scheduledAppointments.find((appointment) => {
      const scheduledTime = new Date(appointment.scheduled_at as string).getTime();

      return (
        appointment.status === "CONFIRMED" &&
        !Number.isNaN(scheduledTime) &&
        scheduledTime >= now
      );
    }) ?? null;

  const latestOperationalAppointment =
    [...scheduledAppointments]
      .reverse()
      .find((appointment) => {
        const scheduledTime = new Date(appointment.scheduled_at as string).getTime();

        return (
          appointment.status === "COMPLETED" &&
          !Number.isNaN(scheduledTime) &&
          scheduledTime < now
        );
      }) ?? null;

  const planningAppointment = nextAppointment ?? latestOperationalAppointment;

  const activeJobs = result.jobs.filter((job) =>
    ["QUOTE_ACCEPTED", "SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(job.status),
  ).length;

  const activeLeads = result.leads.filter((lead) =>
    ["NEW", "QUALIFIED", "CONTACTED", "QUOTE_SENT", "BOOKED", "IN_PROGRESS"].includes(
      lead.lifecycle_status,
    ),
  ).length;

  return (
    <div data-crm-route="clients" className="space-y-12">
      <Link href="/crm/clients" className="inline-block text-xs text-[#d8b477] hover:text-white">← Retour aux clients</Link>

      <section className="relative overflow-hidden border border-white/10 bg-[#101419]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d8b477]/80 to-transparent"
        />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="p-6 md:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8b477]">
                Customer 360°
              </p>
              <span className="h-px w-8 bg-white/15" />
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                Dossier client
              </p>
            </div>

            <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.03em] text-white md:text-5xl lg:text-6xl">
              {displayName}
            </h1>

            {contactDetails.length > 0 && (
              <p className="mt-5 max-w-3xl text-sm leading-6 text-white/45">
                {contactDetails.join(" · ")}
              </p>
            )}

            <ContactActions
              phone={customer.phone}
              email={customer.email}
              whatsappMessage={`Bonjour ${displayName}, AUTO 9 ici.`}
            />
          </div>

          <aside className="border-t border-white/10 bg-[#0d1014]/70 p-6 lg:border-l lg:border-t-0 lg:p-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
              Relation client
            </p>

            <p className="mt-4 text-sm font-medium text-white">
              {formatDate(customer.created_at)
                ? `Client depuis le ${formatDate(customer.created_at)}`
                : "Date d’entrée non renseignée"}
            </p>

            <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-white/35">Demandes actives</span>
                <span className="text-sm font-medium text-white">{activeLeads}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-white/35">Prestations actives</span>
                <span className="text-sm font-medium text-white">{activeJobs}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-white/35">Véhicules</span>
                <span className="text-sm font-medium text-white">{result.vehicles.length}</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section aria-labelledby="customer-summary" className="space-y-4">
        <SectionHeading eyebrow="Cockpit" title="Vue opérationnelle" />

        <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Véhicules", result.vehicles.length, "Parc client"],
            ["Demandes", result.leads.length, `${activeLeads} active${activeLeads > 1 ? "s" : ""}`],
            ["Devis", result.quotes.length, "Historique commercial"],
            ["Prestations", result.jobs.length, `${activeJobs} active${activeJobs > 1 ? "s" : ""}`],
          ].map(([label, value, detail]) => (
            <div key={label} className="bg-[#101419] p-5 md:p-6">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">{label}</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</p>
              <p className="mt-2 text-xs text-white/35">{detail}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <div className="border border-white/10 bg-[#101419] p-5 md:p-7">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#d8b477]">
                  Planning
                </p>
                <h3 className="mt-2 text-lg font-medium text-white">
                  {nextAppointment
                    ? "Prochain rendez-vous"
                    : latestOperationalAppointment
                      ? "Dernier rendez-vous"
                      : "Aucun rendez-vous planifié"}
                </h3>
              </div>

              {planningAppointment?.status && (
                <span className="w-fit border border-[#d8b477]/30 bg-[#d8b477]/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#d8b477]">
                  {statusLabel(planningAppointment.status, appointmentStatusLabels)}
                </span>
              )}
            </div>

            {planningAppointment?.scheduled_at ? (
              <p className="mt-8 text-2xl font-medium tracking-tight text-white md:text-3xl">
                {formatDateTime(planningAppointment.scheduled_at)}
              </p>
            ) : (
              <p className="mt-6 max-w-xl text-sm leading-6 text-white/40">
                Aucun créneau opérationnel confirmé ou planifié n’est actuellement rattaché à ce client.
              </p>
            )}

            {planningAppointment && (
              <p className="mt-3 text-xs text-white/30">
                Créneau opérationnel
              </p>
            )}
          </div>

          <div className="border border-white/10 bg-[#101419] p-5 md:p-7">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#d8b477]">
              Dossier
            </p>
            <h3 className="mt-2 text-lg font-medium text-white">Signal commercial</h3>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <span className="text-xs text-white/40">Demandes actives</span>
                <span className="text-sm font-medium text-white">{activeLeads}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <span className="text-xs text-white/40">Devis enregistrés</span>
                <span className="text-sm font-medium text-white">{result.quotes.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-white/40">Prestations actives</span>
                <span className="text-sm font-medium text-white">{activeJobs}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="customer-vehicles" className="space-y-4">
        <SectionHeading eyebrow="01 / Parc" title="Véhicules" count={result.vehicles.length} />

        {vehicleStatus === "created" && <p role="status" className="border border-emerald-300/30 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-200">Véhicule créé.</p>}
        {vehicleStatus === "unchanged" && <p role="status" className="border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/55">Véhicule déjà créé.</p>}
        {photoStatus === "updated" && <p role="status" className="border border-emerald-300/30 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-200">Photo du véhicule mise à jour.</p>}
        {photoError && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">Mise à jour de la photo momentanément indisponible.</p>}
        {vehicleError && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">{vehicleError === "invalid" ? "Vérifiez les informations du véhicule." : vehicleError === "access" ? "Action non autorisée." : "Création du véhicule momentanément indisponible."}</p>}

        {result.vehicles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {result.vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id || `${vehicle.brand}-${vehicle.model}-${vehicle.created_at}`} vehicle={vehicle} photoUrl={vehicle.id ? vehiclePhotos.get(vehicle.id) : null} />
            ))}
          </div>
        ) : (
          <EmptySection>Aucun véhicule associé à ce client.</EmptySection>
        )}
      </section>

      <section aria-labelledby="customer-administration" className="space-y-4">
        <SectionHeading eyebrow="Administration" title="Gestion du dossier" />

        <div className="grid gap-4 xl:grid-cols-2">
          <details
            open={Boolean(profileStatus || profileError)}
            className="group border border-white/10 bg-[#101419]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-5 md:p-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#d8b477]">
                  Identité
                </p>
                <h3 className="mt-2 text-base font-medium text-white">
                  Modifier le profil
                </h3>
                <p className="mt-2 text-xs leading-5 text-white/35">
                  Coordonnées et informations principales du client.
                </p>
              </div>

              <span
                aria-hidden="true"
                className="text-xl font-light text-white/35 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>

            <div className="border-t border-white/10 p-5 md:p-6">
        {profileStatus === "updated" && <p role="status" className="border border-emerald-300/30 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-200">Profil mis à jour.</p>}
        {profileStatus === "unchanged" && <p role="status" className="border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/55">Aucun changement à enregistrer.</p>}
        {profileError && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">{profileError === "invalid" ? "Vérifiez les informations saisies." : profileError === "access" ? "Action non autorisée." : "Mise à jour momentanément indisponible."}</p>}
        <form action={updateCustomerProfileAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="customerId" value={normalizedCustomerId} />
          <div className="md:col-span-2"><label htmlFor="full_name" className="block text-xs text-white/55">Nom complet</label><input id="full_name" name="full_name" defaultValue={customer.full_name} required maxLength={200} autoComplete="name" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="first_name" className="block text-xs text-white/55">Prénom</label><input id="first_name" name="first_name" defaultValue={customer.first_name || ""} maxLength={100} autoComplete="given-name" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="last_name" className="block text-xs text-white/55">Nom</label><input id="last_name" name="last_name" defaultValue={customer.last_name || ""} maxLength={100} autoComplete="family-name" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="email" className="block text-xs text-white/55">Email</label><input id="email" name="email" type="email" defaultValue={customer.email || ""} maxLength={254} autoComplete="email" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="phone" className="block text-xs text-white/55">Téléphone</label><input id="phone" name="phone" type="tel" defaultValue={customer.phone || ""} maxLength={40} autoComplete="tel" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="birth_date" className="block text-xs text-white/55">Date d’anniversaire</label><input id="birth_date" name="birth_date" type="date" defaultValue={customer.birth_date || ""} className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="city" className="block text-xs text-white/55">Ville</label><input id="city" name="city" defaultValue={customer.city || ""} maxLength={120} autoComplete="address-level2" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div className="md:col-span-2"><button type="submit" className="border border-[#d8b477] px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-[#d8b477] transition-colors hover:bg-[#d8b477] hover:text-[#080a0d]">Enregistrer les modifications</button></div>
        </form>
            </div>
          </details>

          <details
            open={Boolean(vehicleStatus || vehicleError)}
            className="group border border-white/10 bg-[#101419]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-5 md:p-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#d8b477]">
                  Parc client
                </p>
                <h3 className="mt-2 text-base font-medium text-white">
                  Ajouter un véhicule
                </h3>
                <p className="mt-2 text-xs leading-5 text-white/35">
                  Enrichir le dossier sans masquer l’historique existant.
                </p>
              </div>

              <span
                aria-hidden="true"
                className="text-xl font-light text-white/35 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>

            <div className="border-t border-white/10 p-5 md:p-6">
        <form action={createCustomerVehicleAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="customerId" value={normalizedCustomerId} />
          <input type="hidden" name="idempotencyKey" value={vehicleIdempotencyKey} />
          <div><label htmlFor="vehicle-brand" className="block text-xs text-white/55">Marque <span className="text-[#d8b477]">*</span></label><input id="vehicle-brand" name="brand" required maxLength={100} autoComplete="off" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="vehicle-model" className="block text-xs text-white/55">Modèle <span className="text-[#d8b477]">*</span></label><input id="vehicle-model" name="model" required maxLength={100} autoComplete="off" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="vehicle-variant" className="block text-xs text-white/55">Version <span className="text-white/30">(optionnel)</span></label><input id="vehicle-variant" name="variant" maxLength={100} autoComplete="off" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="vehicle-year" className="block text-xs text-white/55">Année <span className="text-white/30">(optionnel)</span></label><input id="vehicle-year" name="year" type="number" min="1900" max="2100" step="1" inputMode="numeric" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="vehicle-color" className="block text-xs text-white/55">Couleur <span className="text-white/30">(optionnel)</span></label><input id="vehicle-color" name="color" maxLength={100} autoComplete="off" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="vehicle-plate" className="block text-xs text-white/55">Immatriculation <span className="text-white/30">(optionnel)</span></label><input id="vehicle-plate" name="plate" maxLength={32} autoComplete="off" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div><label htmlFor="vehicle-mileage" className="block text-xs text-white/55">Kilométrage <span className="text-white/30">(optionnel)</span></label><input id="vehicle-mileage" name="mileage_km" type="number" min="0" max="2147483647" step="1" inputMode="numeric" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /></div>
          <div className="md:col-span-2"><button type="submit" className="border border-[#d8b477] px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-[#d8b477] transition-colors hover:bg-[#d8b477] hover:text-[#080a0d]">Créer un véhicule</button></div>
        </form>
            </div>
          </details>
        </div>
      </section>

      <section aria-labelledby="customer-leads" className="space-y-4">
        <SectionHeading eyebrow="02 / Relation" title="Demandes" count={result.leads.length} />
        <div className="border border-white/10 bg-[#101419]">{result.leads.length > 0 ? result.leads.map((lead) => <LeadRow key={lead.id || `${lead.created_at}-${lead.source}`} lead={lead} />) : <EmptySection>Aucune demande associée à ce client.</EmptySection>}</div>
      </section>

      <section aria-labelledby="customer-quotes" className="space-y-4">
        <SectionHeading eyebrow="03 / Proposition" title="Devis" count={result.quotes.length} />
        <div className="border border-white/10 bg-[#101419]">{result.quotes.length > 0 ? result.quotes.map((quote) => <QuoteRow key={quote.id || `${quote.quote_version}-${quote.created_at}`} quote={quote} />) : <EmptySection>Aucun devis associé à ce client.</EmptySection>}</div>
      </section>

      <section aria-labelledby="customer-jobs" className="space-y-4">
        <SectionHeading eyebrow="04 / Opérations" title="Prestations" count={result.jobs.length} />
        <div className="border border-white/10 bg-[#101419]">{result.jobs.length > 0 ? result.jobs.map((job) => <JobRow key={job.id || `${job.job_number}-${job.created_at}`} job={job} />) : <EmptySection>Aucune prestation associée à ce client.</EmptySection>}</div>
      </section>

      <section aria-labelledby="customer-appointments" className="space-y-4">
        <SectionHeading eyebrow="05 / Planning" title="Rendez-vous" count={result.appointments.length} />
        <div className="border border-white/10 bg-[#101419]">{result.appointments.length > 0 ? result.appointments.map((appointment) => <AppointmentRow key={appointment.id || appointment.requested_at} appointment={appointment} />) : <EmptySection>Aucun rendez-vous associé à ce client.</EmptySection>}</div>
      </section>

      <section aria-labelledby="customer-activity" className="space-y-4">
        <SectionHeading eyebrow="06 / Historique" title="Activité" count={result.activities.length} />
        {result.activities.length > 0 ? <div className="border border-white/10 bg-[#101419] p-5 md:p-7">{result.activities.map((activity) => <ActivityRow key={activity.id || `${activity.event_type}-${activity.created_at}`} activity={activity} />)}</div> : <EmptySection>Aucune activité enregistrée pour ce client.</EmptySection>}
      </section>
    </div>
  );
}
