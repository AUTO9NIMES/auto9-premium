import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../../lib/auth/dal";
import { scheduleJobAction, startJobAction } from "../actions";
import {
  getJobDetails,
  type ActivityLog,
  type Appointment,
  type JobDetailsResult,
  type JobStatus,
  type LeadLifecycleStatus,
  type LeadService,
  type Quote,
  type Vehicle,
} from "../../../lib/crm";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const jobStatusLabels: Record<JobStatus, string> = {
  QUOTE_ACCEPTED: "Devis accepté",
  SCHEDULED: "Planifiée",
  CONFIRMED: "Confirmée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  PAID: "Payée",
};

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
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium", timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

function formatAmount(value?: number | null): string | null {
  return typeof value === "number"
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value)
    : null;
}

function statusLabel(status: string, labels: Record<string, string>): string {
  return labels[status] || status;
}

function customerName(customer: JobDetailsResult["customer"]): string {
  const name = [customer.first_name, customer.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
  return name || customer.full_name.trim() || "Identité non renseignée";
}

function vehicleName(vehicle: Vehicle): string {
  const name = [vehicle.brand, vehicle.model, vehicle.variant]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
  return name || "Véhicule sans désignation";
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex items-end justify-between border-b border-white/10 pb-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-medium text-white">{title}</h2>
      </div>
    </div>
  );
}

function EmptySection({ children }: { children: string }) {
  return <p className="border border-dashed border-white/15 px-5 py-8 text-sm text-white/35">{children}</p>;
}

function VehiclePanel({ vehicle }: { vehicle: Vehicle }) {
  const details = [
    vehicle.year ? String(vehicle.year) : null,
    vehicle.color,
    vehicle.plate,
  ].filter((value): value is string => Boolean(value?.trim()));

  return (
    <div className="border border-white/10 bg-[#101419] p-5">
      <p className="text-sm font-medium text-white">{vehicleName(vehicle)}</p>
      {details.length > 0 && <p className="mt-2 text-xs text-white/45">{details.join(" · ")}</p>}
      {vehicle.vehicle_type && <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-[#d8b477]">{vehicle.vehicle_type}</p>}
      {vehicle.mileage_km !== null && vehicle.mileage_km !== undefined && <p className="mt-2 text-xs text-white/35">{vehicle.mileage_km.toLocaleString("fr-FR")} km</p>}
    </div>
  );
}

function ServiceRow({ service }: { service: LeadService }) {
  return (
    <article className="border-b border-white/10 px-5 py-5 last:border-b-0 md:px-7">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium text-white">{service.service_name}</p>
          {service.service_slug && <p className="mt-1 text-xs text-white/35">{service.service_slug}</p>}
        </div>
        {service.base_price !== null && service.base_price !== undefined && <p className="text-sm text-[#d8b477]">{formatAmount(service.base_price)}</p>}
      </div>
      {service.estimated_time && <p className="mt-3 text-xs text-white/45">Durée estimée : {service.estimated_time}</p>}
      {service.customer_comment && <p className="mt-3 text-xs leading-6 text-white/45">{service.customer_comment}</p>}
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

export default async function JobDetailPage({ params, searchParams }: {
  params: Promise<{ jobId?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureCrmAccess();

  const { jobId } = await params;
  const normalizedJobId = jobId?.trim();

  if (!normalizedJobId || !UUID_REGEX.test(normalizedJobId)) {
    notFound();
  }

  let result: JobDetailsResult | null = null;
  let failed = false;

  try {
    result = await getJobDetails(normalizedJobId);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div data-crm-route="jobs" className="space-y-8">
        <Link href="/crm/jobs" className="text-xs text-[#d8b477] hover:text-white">← Retour aux prestations</Link>
        <section className="border border-white/10 bg-[#101419] p-7">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">Détail prestation</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Prestation indisponible</h1>
          <p className="mt-3 text-sm text-white/45">Les informations de cette prestation sont momentanément indisponibles.</p>
        </section>
      </div>
    );
  }

  if (!result) {
    notFound();
  }

  const { job, customer, vehicle, lead, quote, appointment, services, activities } = result;
  const feedback = await searchParams;
  const scheduleStatus = Array.isArray(feedback.schedule) ? feedback.schedule[0] : feedback.schedule;
  const scheduleError = Array.isArray(feedback.schedule_error) ? feedback.schedule_error[0] : feedback.schedule_error;
  const started = Array.isArray(feedback.started) ? feedback.started[0] : feedback.started;
  const startError = Array.isArray(feedback.start_error) ? feedback.start_error[0] : feedback.start_error;
  const canSchedule = job.status === "QUOTE_ACCEPTED" &&
    !job.scheduled_at &&
    (!appointment || (appointment.status === "REQUESTED" && !appointment.scheduled_at));
  const customerHref = customer.id && UUID_REGEX.test(customer.id)
    ? `/crm/clients/${customer.id}`
    : null;

  return (
    <div data-crm-route="jobs" className="space-y-12">
      <Link href="/crm/jobs" className="inline-block text-xs text-[#d8b477] hover:text-white">← Retour aux prestations</Link>

      <section className="border-b border-white/10 pb-8">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8b477]">Prestations / Détail opérationnel</p>
        <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs text-white/35">{job.job_number || "Prestation"}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-5xl">{job.title || "Prestation sans intitulé"}</h1>
            <p className="mt-4 text-sm text-white/50">{statusLabel(job.status, jobStatusLabels)}</p>
          </div>
          {formatDate(job.created_at) && <p className="text-xs text-white/35">Créée le {formatDate(job.created_at)}</p>}
        </div>
      </section>

      <section aria-labelledby="job-overview" className="space-y-4">
        <SectionHeading eyebrow="Vue rapide" title="Informations principales" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-white/10 bg-[#101419] p-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#d8b477]">Client</p>
            {customerHref ? <Link href={customerHref} className="mt-3 block text-lg font-medium text-white hover:text-[#d8b477]">{customerName(customer)}</Link> : <p className="mt-3 text-lg font-medium text-white">{customerName(customer)}</p>}
            {[customer.email, customer.phone, customer.city].filter((value): value is string => Boolean(value?.trim())).map((value) => <p key={value} className="mt-2 text-sm text-white/45">{value}</p>)}
          </div>
          <div className="border border-white/10 bg-[#101419] p-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#d8b477]">Opération</p>
            {started === "1" && <p role="status" className="mt-3 border border-emerald-300/30 bg-emerald-300/5 px-3 py-2 text-sm text-emerald-200">Prestation démarrée.</p>}
            {startError && <p role="alert" className="mt-3 border border-red-300/30 bg-red-300/5 px-3 py-2 text-sm text-red-200">{startError === "invalid" ? "Action invalide." : startError === "access" ? "Action non autorisée." : "Démarrage momentanément indisponible."}</p>}
            {job.scheduled_at && <p className="mt-3 text-sm text-white/70">Planifiée : {formatDateTime(job.scheduled_at)}</p>}
            {job.total_amount !== null && job.total_amount !== undefined && <p className="mt-2 text-sm text-[#d8b477]">Montant : {formatAmount(job.total_amount)}</p>}
            {job.started_at && <p className="mt-2 text-xs text-white/40">Démarrée : {formatDateTime(job.started_at)}</p>}
            {job.completed_at && <p className="mt-2 text-xs text-white/40">Terminée : {formatDateTime(job.completed_at)}</p>}
            {!job.scheduled_at && job.total_amount === null && !job.started_at && !job.completed_at && <p className="mt-3 text-sm text-white/35">Informations opérationnelles non renseignées.</p>}
            {job.status === "CONFIRMED" && <form action={startJobAction} className="mt-5 border-t border-white/10 pt-4"><input type="hidden" name="jobId" value={normalizedJobId} /><button type="submit" className="border border-[#d8b477] px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-[#d8b477] transition-colors hover:bg-[#d8b477] hover:text-[#080a0d]">Démarrer la prestation</button></form>}
          </div>
        </div>
        {job.notes && <p className="border border-white/10 bg-[#101419] p-5 text-sm leading-7 text-white/50">{job.notes}</p>}
      </section>

      <section aria-labelledby="job-vehicle" className="space-y-4">
        <SectionHeading eyebrow="01 / Véhicule" title="Véhicule associé" />
        {vehicle ? <VehiclePanel vehicle={vehicle} /> : <EmptySection>Aucun véhicule associé à cette prestation.</EmptySection>}
      </section>

      <section aria-labelledby="job-lead" className="space-y-4">
        <SectionHeading eyebrow="02 / Demande" title="Lead associé" />
        <div className="border border-white/10 bg-[#101419] p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-medium text-white">{statusLabel(lead.lifecycle_status, leadStatusLabels)}</p>
              <p className="mt-2 text-xs text-white/40">Source : {lead.source}</p>
            </div>
            <p className="text-xs text-white/35">{formatDate(lead.created_at) || "Date non renseignée"}</p>
          </div>
          {lead.notes && <p className="mt-4 text-sm leading-6 text-white/45">{lead.notes}</p>}
        </div>
      </section>

      <section aria-labelledby="job-quote" className="space-y-4">
        <SectionHeading eyebrow="03 / Devis" title="Devis associé" />
        {quote ? <div className="border border-white/10 bg-[#101419] p-5"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><p className="text-sm font-medium text-white">Version {quote.quote_version}</p><p className="mt-2 text-xs text-white/40">{statusLabel(quote.status, quoteStatusLabels)}{quote.estimated_time ? ` · ${quote.estimated_time}` : ""}</p></div>{quote.total_price !== null && quote.total_price !== undefined && <p className="text-lg text-[#d8b477]">{formatAmount(quote.total_price)}</p>}</div><p className="mt-4 text-xs text-white/35">{formatDate(quote.created_at) || "Date non renseignée"}</p></div> : <EmptySection>Aucun devis associé à cette prestation.</EmptySection>}
      </section>

      <section aria-labelledby="job-services" className="space-y-4">
        <SectionHeading eyebrow="04 / Prestations" title="Services sélectionnés" />
        <div className="border border-white/10 bg-[#101419]">{services.length > 0 ? services.map((service) => <ServiceRow key={service.id || `${service.service_name}-${service.created_at}`} service={service} />) : <EmptySection>Aucun service détaillé pour cette prestation.</EmptySection>}</div>
      </section>

      <section aria-labelledby="job-appointment" className="space-y-4">
        <SectionHeading eyebrow="05 / Planning" title="Rendez-vous" />
        {scheduleStatus === "created" && <p role="status" className="border border-emerald-300/30 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-200">Prestation planifiée.</p>}
        {scheduleError && <p role="alert" className="border border-red-300/30 bg-red-300/5 px-4 py-3 text-sm text-red-200">{scheduleError === "invalid" ? "Vérifiez la date et l&apos;heure sélectionnées." : scheduleError === "access" ? "Action non autorisée." : "Planification momentanément indisponible."}</p>}
        {canSchedule && <form action={scheduleJobAction} className="grid gap-4 border border-[#d8b477]/30 bg-[#101419] p-5 md:grid-cols-[1fr_auto] md:items-end md:p-7"><input type="hidden" name="jobId" value={normalizedJobId} /><div><label htmlFor="scheduledAt" className="block text-xs text-white/55">Début opérationnel <span className="text-[#d8b477]">*</span></label><input id="scheduledAt" name="scheduledAt" type="datetime-local" required step="60" className="mt-2 w-full border border-white/15 bg-[#0d1014] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d8b477]" /><p className="mt-2 text-[11px] text-white/35">Fuseau horaire : Europe/Paris</p></div><button type="submit" className="border border-[#d8b477] px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-[#d8b477] transition-colors hover:bg-[#d8b477] hover:text-[#080a0d]">Planifier</button></form>}
        {appointment ? <div className="border border-white/10 bg-[#101419] p-5"><p className="text-sm font-medium text-white">{statusLabel(appointment.status, appointmentStatusLabels)}</p><p className="mt-2 text-sm text-white/55">Demandé le {formatDateTime(appointment.requested_at) || "date non renseignée"}</p>{appointment.scheduled_at ? <p className="mt-2 text-sm text-white/70">Planifié le {formatDateTime(appointment.scheduled_at)}</p> : <p className="mt-2 text-xs text-white/35">Non planifié</p>}{appointment.confirmed_at && <p className="mt-2 text-xs text-white/40">Confirmé le {formatDateTime(appointment.confirmed_at)}</p>}{appointment.completed_at && <p className="mt-2 text-xs text-white/40">Terminé le {formatDateTime(appointment.completed_at)}</p>}{appointment.cancelled_at && <p className="mt-2 text-xs text-white/40">Annulé le {formatDateTime(appointment.cancelled_at)}</p>}{appointment.notes && <p className="mt-4 text-sm leading-6 text-white/45">{appointment.notes}</p>}</div> : <EmptySection>Aucun rendez-vous associé à cette prestation.</EmptySection>}
      </section>

      <section aria-labelledby="job-activity" className="space-y-4">
        <SectionHeading eyebrow="06 / Historique" title="Activité" />
        {activities.length > 0 ? <div className="border border-white/10 bg-[#101419] p-5 md:p-7">{activities.map((activity) => <ActivityRow key={activity.id || `${activity.event_type}-${activity.created_at}`} activity={activity} />)}</div> : <EmptySection>Aucune activité enregistrée pour cette prestation.</EmptySection>}
      </section>
    </div>
  );
}
