import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCustomer360,
  type Customer360Result,
  type JobStatus,
  type LeadLifecycleStatus,
  type Quote,
  type Appointment,
} from "../../../lib/crm";

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
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.full_name || "Client";
}

export default async function CustomerV2Page({
  params,
}: {
  params: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await params;
  const id = customerId?.trim();

  if (!id || !UUID_REGEX.test(id)) notFound();

  let result: Customer360Result | null = null;
  try {
    result = await getCustomer360(id);
  } catch {
    result = null;
  }

  if (!result) notFound();

  const c = result.customer;
  const activeLeads = result.leads.filter((lead) =>
    ["NEW", "QUALIFIED", "CONTACTED", "QUOTE_SENT", "BOOKED", "IN_PROGRESS"].includes(lead.lifecycle_status),
  ).length;
  const activeJobs = result.jobs.filter((job) =>
    ["QUOTE_ACCEPTED", "SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(job.status),
  ).length;

  return (
    <div className="space-y-7">
      <Link href="/crm-v2/clients" className="text-xs text-cyan-200/65 hover:text-cyan-100">
        ← Retour aux clients
      </Link>

      <section className="rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.06] to-blue-500/[0.025] p-6 md:p-8">
        <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/55">Dossier client</p>
        <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{customerName(result)}</h1>
            <p className="mt-3 text-sm text-white/45">
              {[c.email, c.phone, c.city].filter(Boolean).join(" · ") || "Coordonnées non renseignées"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.phone && <a href={"tel:" + c.phone} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/70">Appeler</a>}
            {c.email && <a href={"mailto:" + c.email} className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] px-4 py-2.5 text-xs text-cyan-100">Email</a>}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Véhicules", result.vehicles.length, "Parc client"],
          ["Demandes", result.leads.length, `${activeLeads} active${activeLeads > 1 ? "s" : ""}`],
          ["Devis", result.quotes.length, "Historique commercial"],
          ["Prestations", result.jobs.length, `${activeJobs} active${activeJobs > 1 ? "s" : ""}`],
        ].map(([label, value, detail]) => (
          <div key={String(label)} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">{label}</p>
            <p className="mt-3 text-3xl font-bold text-white">{value}</p>
            <p className="mt-2 text-xs text-white/35">{detail}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">Parc</p>
          <h2 className="mt-2 text-xl font-semibold">Véhicules</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {result.vehicles.length ? result.vehicles.map((v) => (
            <article key={v.id} className="rounded-2xl border border-white/8 bg-[#0b121b] p-5">
              <p className="font-semibold">{[v.brand, v.model, v.variant].filter(Boolean).join(" ") || "Véhicule"}</p>
              <p className="mt-2 text-xs text-white/40">{[v.year, v.color, v.plate].filter(Boolean).join(" · ") || "Détails non renseignés"}</p>
            </article>
          )) : <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/30">Aucun véhicule.</div>}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">Relation</p>
          <h2 className="mt-2 text-xl font-semibold">Demandes</h2>
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b] divide-y divide-white/8">
          {result.leads.length ? result.leads.map((lead) => (
            <article key={lead.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">{leadLabels[lead.lifecycle_status]}</p>
                <p className="mt-1 text-xs text-white/35">{lead.source}{lead.notes ? " · " + lead.notes : ""}</p>
              </div>
              <Link href="/crm-v2/pipeline" className="text-xs text-cyan-200/60 hover:text-cyan-100">Voir dans le pipeline →</Link>
            </article>
          )) : <div className="p-6 text-sm text-white/30">Aucune demande.</div>}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">Commercial</p>
          <h2 className="mt-2 text-xl font-semibold">Devis</h2>
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b] divide-y divide-white/8">
          {result.quotes.length ? result.quotes.map((quote) => (
            <article key={quote.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">Devis v{quote.quote_version} · {quoteLabels[quote.status]}</p>
                <p className="mt-1 text-xs text-white/35">{dt(quote.created_at)}</p>
              </div>
              <p className="text-sm font-semibold text-cyan-100">{typeof quote.total_price === "number" ? eur.format(quote.total_price) : "—"}</p>
            </article>
          )) : <div className="p-6 text-sm text-white/30">Aucun devis.</div>}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">Opérations</p>
          <h2 className="mt-2 text-xl font-semibold">Prestations</h2>
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b] divide-y divide-white/8">
          {result.jobs.length ? result.jobs.map((job) => (
            <article key={job.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">{job.title || job.job_number || "Prestation"}</p>
                <p className="mt-1 text-xs text-white/35">{jobLabels[job.status]} · {dt(job.scheduled_at) || dt(job.created_at) || "Date non renseignée"}</p>
              </div>
              <p className="text-sm font-semibold text-cyan-100">{typeof job.total_amount === "number" ? eur.format(job.total_amount) : "—"}</p>
            </article>
          )) : <div className="p-6 text-sm text-white/30">Aucune prestation.</div>}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/45">Planning</p>
          <h2 className="mt-2 text-xl font-semibold">Rendez-vous</h2>
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b] divide-y divide-white/8">
          {result.appointments.length ? result.appointments.map((appointment) => (
            <article key={appointment.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">{appointmentLabels[appointment.status]}</p>
                <p className="mt-1 text-xs text-white/35">{appointment.notes || "Rendez-vous AUTO 9"}</p>
              </div>
              <p className="text-sm text-white/60">{dt(appointment.scheduled_at) || dt(appointment.requested_at) || "Date non renseignée"}</p>
            </article>
          )) : <div className="p-6 text-sm text-white/30">Aucun rendez-vous.</div>}
        </div>
      </section>
    </div>
  );
}
