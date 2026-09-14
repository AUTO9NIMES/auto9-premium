import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../../lib/auth/dal";
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

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <article className="border border-white/10 bg-[#101419] p-5">
      <p className="text-sm font-medium text-white">{formatVehicle(vehicle)}</p>
      {formatVehicleMeta(vehicle) && <p className="mt-2 text-xs text-white/45">{formatVehicleMeta(vehicle)}</p>}
      {vehicle.vehicle_type && <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-[#d8b477]">{vehicle.vehicle_type}</p>}
      {vehicle.mileage_km !== null && vehicle.mileage_km !== undefined && <p className="mt-2 text-xs text-white/35">{vehicle.mileage_km.toLocaleString("fr-FR")} km</p>}
    </article>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  return (
    <article className="border-b border-white/10 px-5 py-5 last:border-b-0 md:px-7">
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
    <article className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-5 last:border-b-0 md:flex-row md:items-center md:px-7">
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
    <article className="border-b border-white/10 px-5 py-5 last:border-b-0 md:px-7">
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
  return (
    <article className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-5 last:border-b-0 md:flex-row md:items-center md:px-7">
      <div>
        <p className="text-sm font-medium text-white">{statusLabel(appointment.status, appointmentStatusLabels)}</p>
        {appointment.notes && <p className="mt-1 text-xs text-white/40">{appointment.notes}</p>}
      </div>
      <p className="text-xs text-white/35">{formatDateTime(appointment.requested_at) || "Date non renseignée"}</p>
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

export default async function Customer360Page({ params }: {
  params: Promise<{ customerId?: string }>;
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
  const contactDetails = [customer.email, customer.phone, customer.city].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  return (
    <div data-crm-route="clients" className="space-y-12">
      <Link href="/crm/clients" className="inline-block text-xs text-[#d8b477] hover:text-white">← Retour aux clients</Link>

      <section className="border-b border-white/10 pb-8">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8b477]">Customer 360 / Profil client</p>
        <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">{displayName}</h1>
            {contactDetails.length > 0 && <p className="mt-4 text-sm text-white/50">{contactDetails.join(" · ")}</p>}
          </div>
          {formatDate(customer.created_at) && <p className="text-xs text-white/35">Client depuis le {formatDate(customer.created_at)}</p>}
        </div>
      </section>

      <section aria-labelledby="customer-summary" className="space-y-4">
        <SectionHeading eyebrow="Vue rapide" title="Repères du dossier" />
        <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Véhicules", result.vehicles.length],
            ["Demandes", result.leads.length],
            ["Devis", result.quotes.length],
            ["Prestations", result.jobs.length],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#101419] p-5">
              <p className="text-xs text-white/40">{label}</p>
              <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/25">Données du dossier</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="customer-vehicles" className="space-y-4">
        <SectionHeading eyebrow="01 / Parc" title="Véhicules" count={result.vehicles.length} />
        {result.vehicles.length > 0 ? <div className="grid gap-4 md:grid-cols-2">{result.vehicles.map((vehicle) => <VehicleCard key={vehicle.id || `${vehicle.brand}-${vehicle.model}-${vehicle.created_at}`} vehicle={vehicle} />)}</div> : <EmptySection>Aucun véhicule associé à ce client.</EmptySection>}
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
