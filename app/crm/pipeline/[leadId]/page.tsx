import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../../lib/auth/dal";
import {
  getLeadDetails,
  type Appointment,
  type Job,
  type JobStatus,
  type LeadDetailsResult,
  type LeadLifecycleStatus,
  type LeadService,
  type Quote,
  type RecentActivity,
  type Vehicle,
} from "../../../lib/crm";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const leadStatusLabels: Record<LeadLifecycleStatus, string> = {
  NEW: "Nouveau", QUALIFIED: "Qualifié", CONTACTED: "Contacté", QUOTE_SENT: "Devis envoyé",
  BOOKED: "Réservé", IN_PROGRESS: "En cours", COMPLETED: "Terminé", REVIEW_REQUESTED: "Avis demandé", CLOSED_LOST: "Clôturé",
};
const jobStatusLabels: Record<JobStatus, string> = {
  QUOTE_ACCEPTED: "Devis accepté", SCHEDULED: "Planifiée", CONFIRMED: "Confirmée", IN_PROGRESS: "En cours",
  COMPLETED: "Terminée", CANCELLED: "Annulée", PAID: "Payée",
};
const quoteStatusLabels: Record<Quote["status"], string> = {
  DRAFT: "Brouillon", SENT: "Envoyé", ACCEPTED: "Accepté", REJECTED: "Refusé", EXPIRED: "Expiré",
};
const appointmentStatusLabels: Record<Appointment["status"], string> = {
  REQUESTED: "Demandé", CONFIRMED: "Confirmé", COMPLETED: "Terminé", CANCELLED: "Annulé",
};
const activityLabels: Record<string, string> = {
  "website.lead.created": "Nouveau lead reçu", "quote.accepted": "Devis accepté",
  "appointment.requested": "Rendez-vous demandé", "appointment.confirmed": "Rendez-vous confirmé",
  "appointment.completed": "Rendez-vous terminé", "appointment.cancelled": "Rendez-vous annulé",
  "lead.status_changed": "Statut du lead modifié",
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
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function formatAmount(value?: number | null): string | null {
  return typeof value === "number" ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value) : null;
}
function statusLabel(status: string, labels: Record<string, string>): string { return labels[status] || status; }
function sectionHeading(eyebrow: string, title: string) {
  return <div className="border-b border-white/10 pb-4"><p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">{eyebrow}</p><h2 className="mt-2 text-xl font-medium text-white">{title}</h2></div>;
}
function emptySection(text: string) { return <p className="border border-dashed border-white/15 px-5 py-8 text-sm text-white/35">{text}</p>; }
function customerName(customer: LeadDetailsResult["customer"]): string {
  const name = [customer.first_name, customer.last_name].filter((value): value is string => Boolean(value?.trim())).join(" ");
  return name || customer.full_name.trim() || "Identité non renseignée";
}
function vehicleName(vehicle: Vehicle): string {
  return [vehicle.brand, vehicle.model, vehicle.variant].filter((value): value is string => Boolean(value?.trim())).join(" ") || "Véhicule sans désignation";
}
function ActivityRow({ activity }: { activity: RecentActivity }) {
  const jobHref = activity.jobId && UUID_REGEX.test(activity.jobId) ? `/crm/jobs/${activity.jobId}` : null;
  const customerHref = activity.customerId && UUID_REGEX.test(activity.customerId) ? `/crm/clients/${activity.customerId}` : null;
  return <article className="relative border-l border-[#d8b477]/40 pb-7 pl-5 last:pb-0"><span className="absolute -left-1.5 top-0 h-3 w-3 rounded-full border-2 border-[#080a0d] bg-[#d8b477]" /><p className="text-sm text-white">{activityLabels[activity.eventType] || "Activité CRM"}</p><div className="mt-1 flex flex-wrap gap-3 text-xs text-white/35"><span>{formatDateTime(activity.createdAt) || "Date non renseignée"}</span>{jobHref ? <Link href={jobHref} className="text-[#d8b477] hover:text-white">Voir la prestation →</Link> : customerHref ? <Link href={customerHref} className="text-[#d8b477] hover:text-white">Voir le client →</Link> : null}</div></article>;
}

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId?: string }> }) {
  await ensureCrmAccess();
  const { leadId } = await params;
  const normalizedLeadId = leadId?.trim();
  if (!normalizedLeadId || !UUID_REGEX.test(normalizedLeadId)) notFound();

  let result: LeadDetailsResult | null = null;
  try {
    result = await getLeadDetails(normalizedLeadId);
  } catch {
    return <div data-crm-route="pipeline" className="space-y-8"><Link href="/crm/pipeline" className="text-xs text-[#d8b477] hover:text-white">← Retour au pipeline</Link><section className="border border-white/10 bg-[#101419] p-7"><p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">Détail lead</p><h1 className="mt-3 text-2xl font-semibold text-white">Lead indisponible</h1><p className="mt-3 text-sm text-white/45">Les informations de ce lead sont momentanément indisponibles.</p></section></div>;
  }
  if (!result) notFound();

  const { lead, customer, vehicle, services, quotes, jobs, appointments, activities } = result;
  const customerHref = customer.id && UUID_REGEX.test(customer.id) ? `/crm/clients/${customer.id}` : null;

  return <div data-crm-route="pipeline" className="space-y-12">
    <Link href="/crm/pipeline" className="inline-block text-xs text-[#d8b477] hover:text-white">← Retour au pipeline</Link>
    <section className="border-b border-white/10 pb-8"><p className="text-[10px] uppercase tracking-[0.24em] text-[#d8b477]">Pipeline / Détail lead</p><div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">{customerName(customer)}</h1><p className="mt-4 text-sm text-white/50">{statusLabel(lead.lifecycle_status, leadStatusLabels)} · {lead.source}</p></div><p className="text-xs text-white/35">Créé le {formatDate(lead.created_at) || "date non renseignée"}</p></div></section>
    <section className="space-y-4">{sectionHeading("Vue rapide", "Résumé du lead")}<div className="grid gap-4 md:grid-cols-2"><div className="border border-white/10 bg-[#101419] p-5">{customerHref ? <Link href={customerHref} className="text-lg font-medium text-white hover:text-[#d8b477]">{customerName(customer)}</Link> : <p className="text-lg font-medium text-white">{customerName(customer)}</p>}{[customer.email, customer.phone, customer.city].filter((value): value is string => Boolean(value?.trim())).map((value) => <p key={value} className="mt-2 text-sm text-white/45">{value}</p>)}</div><div className="border border-white/10 bg-[#101419] p-5"><p className="text-[10px] uppercase tracking-[0.16em] text-[#d8b477]">Source</p><p className="mt-3 text-sm text-white/70">{lead.source}</p>{lead.source_page && <p className="mt-2 text-xs text-white/40">{lead.source_page}</p>}{lead.utm_source && <p className="mt-2 text-xs text-white/40">UTM : {lead.utm_source}{lead.utm_campaign ? ` · ${lead.utm_campaign}` : ""}</p>}</div></div>{lead.notes && <p className="border border-white/10 bg-[#101419] p-5 text-sm leading-7 text-white/50">{lead.notes}</p>}</section>
    <section className="space-y-4">{sectionHeading("01 / Véhicule", "Véhicule associé")}{vehicle ? <div className="border border-white/10 bg-[#101419] p-5"><p className="text-sm font-medium text-white">{vehicleName(vehicle)}</p><p className="mt-2 text-xs text-white/45">{[vehicle.year ? String(vehicle.year) : null, vehicle.color, vehicle.plate].filter((value): value is string => Boolean(value?.trim())).join(" · ") || "Détails non renseignés"}</p>{vehicle.mileage_km !== null && vehicle.mileage_km !== undefined && <p className="mt-2 text-xs text-white/35">{vehicle.mileage_km.toLocaleString("fr-FR")} km</p>}</div> : emptySection("Aucun véhicule associé à ce lead.")}</section>
    <section className="space-y-4">{sectionHeading("02 / Services", "Services demandés")}<div className="border border-white/10 bg-[#101419]">{services.length ? services.map((service: LeadService) => <article key={service.id || service.service_name} className="border-b border-white/10 px-5 py-5 last:border-b-0 md:px-7"><p className="text-sm font-medium text-white">{service.service_name}</p>{service.service_slug && <p className="mt-1 text-xs text-white/35">{service.service_slug}</p>}{service.base_price !== null && service.base_price !== undefined && <p className="mt-2 text-xs text-[#d8b477]">{formatAmount(service.base_price)}</p>}{service.estimated_time && <p className="mt-2 text-xs text-white/40">{service.estimated_time}</p>}{service.customer_comment && <p className="mt-3 text-xs leading-6 text-white/45">{service.customer_comment}</p>}</article>) : emptySection("Aucun service détaillé pour ce lead.")}</div></section>
    <section className="space-y-4">{sectionHeading("03 / Devis", "Historique des devis")}<div className="border border-white/10 bg-[#101419]">{quotes.length ? quotes.map((quote) => <article key={quote.id || `${quote.quote_version}-${quote.created_at}`} className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-5 last:border-b-0 md:flex-row md:items-center md:px-7"><div><p className="text-sm font-medium text-white">Version {quote.quote_version}</p><p className="mt-1 text-xs text-white/40">{statusLabel(quote.status, quoteStatusLabels)}{quote.estimated_time ? ` · ${quote.estimated_time}` : ""}</p></div><div className="md:text-right">{quote.total_price !== null && quote.total_price !== undefined && <p className="text-sm text-[#d8b477]">{formatAmount(quote.total_price)}</p>}<p className="mt-1 text-xs text-white/35">{formatDate(quote.created_at) || "Date non renseignée"}</p></div></article>) : emptySection("Aucun devis associé à ce lead.")}</div></section>
    <section className="space-y-4">{sectionHeading("04 / Opérations", "Prestations liées")}{jobs.length ? <div className="grid gap-4 md:grid-cols-2">{jobs.map((job: Job) => <article key={job.id || `${job.job_number}-${job.created_at}`} className="border border-white/10 bg-[#101419] p-5"><p className="text-sm font-medium text-white">{job.title || job.job_number || "Prestation"}</p><p className="mt-2 text-xs text-[#d8b477]">{statusLabel(job.status, jobStatusLabels)}</p>{job.total_amount !== null && job.total_amount !== undefined && <p className="mt-2 text-sm text-white">{formatAmount(job.total_amount)}</p>}<p className="mt-2 text-xs text-white/35">{formatDateTime(job.scheduled_at) || formatDate(job.created_at) || "Date non renseignée"}</p>{job.id && UUID_REGEX.test(job.id) && <Link href={`/crm/jobs/${job.id}`} className="mt-4 inline-block text-xs text-[#d8b477] hover:text-white">Voir la prestation →</Link>}</article>)}</div> : emptySection("Aucune prestation associée à ce lead.")}</section>
    <section className="space-y-4">{sectionHeading("05 / Planning", "Rendez-vous")}{appointments.length ? <div className="border border-white/10 bg-[#101419]">{appointments.map((appointment) => <article key={appointment.id || appointment.requested_at} className="border-b border-white/10 px-5 py-5 last:border-b-0 md:px-7"><p className="text-sm font-medium text-white">{statusLabel(appointment.status, appointmentStatusLabels)}</p><p className="mt-2 text-sm text-white/55">Demandé le {formatDateTime(appointment.requested_at) || "date non renseignée"}</p>{appointment.confirmed_at && <p className="mt-2 text-xs text-white/40">Confirmé le {formatDateTime(appointment.confirmed_at)}</p>}{appointment.completed_at && <p className="mt-2 text-xs text-white/40">Terminé le {formatDateTime(appointment.completed_at)}</p>}{appointment.cancelled_at && <p className="mt-2 text-xs text-white/40">Annulé le {formatDateTime(appointment.cancelled_at)}</p>}{appointment.notes && <p className="mt-3 text-xs text-white/45">{appointment.notes}</p>}</article>)}</div> : emptySection("Aucun rendez-vous associé à ce lead.")}</section>
    <section className="space-y-4">{sectionHeading("06 / Historique", "Activité")}{activities.length ? <div className="border border-white/10 bg-[#101419] p-5 md:p-7">{activities.map((activity) => <ActivityRow key={activity.id} activity={activity} />)}</div> : emptySection("Aucune activité enregistrée pour ce lead.")}</section>
  </div>;
}
