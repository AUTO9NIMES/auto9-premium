import Link from "next/link";
import { requireCrmAccess } from "../../lib/auth/dal";
import {
  getLeadsList,
  type LeadLifecycleStatus,
  type LeadListItem,
} from "../../lib/crm";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";
import {
  cancelV2Lead,
  deleteV2Lead,
  recordV2Payment,
  toggleV2LeadStep,
  updateV2LeadDetails,
  updateV2DraftPrice,
} from "./actions";
import LeadDangerActions from "./LeadDangerActions";
import LeadEditPanel from "./LeadEditPanel";

export const dynamic = "force-dynamic";

type StepKey = LeadLifecycleStatus | "PAID";
type ManualStepKey =
  | "CONTACTED"
  | "QUOTE_SENT"
  | "BOOKED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REVIEW_REQUESTED";

type StepActivity = {
  lead_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
};

const steps: Array<{ key: StepKey; label: string }> = [
  { key: "NEW", label: "Demande reçue" },
  { key: "CONTACTED", label: "Client contacté" },
  { key: "QUOTE_SENT", label: "Devis envoyé" },
  { key: "BOOKED", label: "Devis accepté / RDV réservé" },
  { key: "IN_PROGRESS", label: "Prestation en cours" },
  { key: "COMPLETED", label: "Prestation effectuée" },
  { key: "PAID", label: "Paiement reçu" },
  { key: "REVIEW_REQUESTED", label: "Avis Google demandé" },
];

const manualSteps = new Set<ManualStepKey>([
  "CONTACTED",
  "QUOTE_SENT",
  "BOOKED",
  "IN_PROGRESS",
  "COMPLETED",
  "REVIEW_REQUESTED",
]);

const rank: Record<LeadLifecycleStatus, number> = {
  NEW: 0,
  QUALIFIED: 0,
  CONTACTED: 1,
  QUOTE_SENT: 2,
  BOOKED: 3,
  IN_PROGRESS: 4,
  COMPLETED: 5,
  REVIEW_REQUESTED: 7,
  CLOSED_LOST: -1,
};

function name(item: LeadListItem) {
  return (
    [item.customer.first_name, item.customer.last_name].filter(Boolean).join(" ") ||
    item.customer.full_name ||
    "Client"
  );
}

function vehicle(item: LeadListItem) {
  if (!item.vehicle) return "Véhicule non renseigné";
  return (
    [item.vehicle.brand, item.vehicle.model, item.vehicle.plate].filter(Boolean).join(" · ") ||
    "Véhicule"
  );
}

function serviceName(item: LeadListItem) {
  const value = item.latestQuote?.payload_json?.serviceName;
  return typeof value === "string" && value.trim()
    ? value
    : item.latestJob?.title || "Prestation AUTO 9";
}

function money(value?: number | null) {
  if (typeof value !== "number") return null;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStepDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(date);
}


function cancellationInfo(
  activity: StepActivity[],
  leadId?: string,
) {
  if (!leadId) return null;

  const row = activity.find(
    (entry) =>
      entry.lead_id === leadId &&
      (entry.event_type === "lead.cancelled" ||
        (entry.event_type === "lead.status_changed" && entry.event_data?.new_status === "CLOSED_LOST")),
  );

  if (!row) return null;

  const rawComment = row.event_data?.comment;
  return {
    comment:
      typeof rawComment === "string" && rawComment.trim()
        ? rawComment.trim()
        : null,
    createdAt: row.created_at,
  };
}

function fallbackDone(item: LeadListItem, key: StepKey) {
  if (key === "NEW") return true;
  if (key === "PAID") return item.latestJob?.status === "PAID";
  if (item.lead.lifecycle_status === "CLOSED_LOST") return false;
  return rank[item.lead.lifecycle_status] >= rank[key];
}

function manualOverride(
  activity: StepActivity[],
  leadId: string | undefined,
  key: StepKey,
): { done: boolean; date: string | null } | null {
  if (!leadId || !manualSteps.has(key as ManualStepKey)) return null;

  const latest = activity.find((row) => {
    if (row.lead_id !== leadId) return false;
    if (row.event_type !== "crm_v2.step.completed" && row.event_type !== "crm_v2.step.reopened") {
      return false;
    }
    return row.event_data?.step_key === key;
  });

  if (!latest) return null;

  return {
    done: latest.event_type === "crm_v2.step.completed",
    date: latest.event_type === "crm_v2.step.completed" ? latest.created_at : null,
  };
}

function lifecycleDate(
  activity: StepActivity[],
  leadId: string | undefined,
  status: LeadLifecycleStatus,
) {
  if (!leadId) return null;

  const row = activity.find((entry) => {
    if (entry.lead_id !== leadId || entry.event_type !== "lead.status_changed") return false;
    return entry.event_data?.new_status === status;
  });

  return row?.created_at || null;
}

function fallbackDate(item: LeadListItem, key: StepKey, activity: StepActivity[]) {
  if (key === "NEW") return item.lead.created_at || null;
  if (key === "CONTACTED") return lifecycleDate(activity, item.lead.id, "CONTACTED");
  if (key === "QUOTE_SENT") {
    return (
      lifecycleDate(activity, item.lead.id, "QUOTE_SENT") ||
      (item.latestQuote?.status === "SENT" || item.latestQuote?.status === "ACCEPTED"
        ? item.latestQuote?.updated_at || item.latestQuote?.created_at || null
        : null)
    );
  }
  if (key === "BOOKED") {
    return (
      item.latestAppointment?.created_at ||
      item.latestJob?.created_at ||
      lifecycleDate(activity, item.lead.id, "BOOKED")
    );
  }
  if (key === "IN_PROGRESS") {
    return item.latestJob?.started_at || lifecycleDate(activity, item.lead.id, "IN_PROGRESS");
  }
  if (key === "COMPLETED") {
    return item.latestJob?.completed_at || lifecycleDate(activity, item.lead.id, "COMPLETED");
  }
  if (key === "PAID") {
    return item.latestJob?.status === "PAID" ? item.latestJob.updated_at || null : null;
  }
  if (key === "REVIEW_REQUESTED") {
    return lifecycleDate(activity, item.lead.id, "REVIEW_REQUESTED");
  }
  return null;
}

function stepState(item: LeadListItem, key: StepKey, activity: StepActivity[]) {
  const override = manualOverride(activity, item.lead.id, key);
  if (override) return override;

  const done = fallbackDone(item, key);
  return {
    done,
    date: done ? fallbackDate(item, key, activity) : null,
  };
}

function LeadProgress({
  item,
  activity,
}: {
  item: LeadListItem;
  activity: StepActivity[];
}) {
  const amount = money(item.latestQuote?.total_price || item.latestJob?.total_amount);
  const closed = item.lead.lifecycle_status === "CLOSED_LOST";
  const canRecordPayment = Boolean(item.latestJob?.id && item.latestJob.status === "COMPLETED");
  const cancelled = cancellationInfo(activity, item.lead.id);
  const states = steps.map((step) => stepState(item, step.key, activity));
  const firstPending = states.findIndex((state) => !state.done);

  return (
    <article className="overflow-hidden rounded-3xl border border-white/8 bg-[#0b121b]">
      <div className="flex flex-col gap-4 border-b border-white/8 p-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-white">{name(item)}</h2>
            {closed && (
              <span className="rounded-full border border-red-300/20 bg-red-300/5 px-2 py-1 text-[9px] uppercase tracking-[0.15em] text-red-200/70">
                Perdu / annulé
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-white/40">{vehicle(item)}</p>
          <p className="mt-3 text-sm text-white/65">{serviceName(item)}</p>
          {closed && cancelled && (
            <div className="mt-3 rounded-xl border border-amber-300/12 bg-amber-300/[0.035] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-amber-100/55">
                Annulée le {formatStepDate(cancelled.createdAt)}
              </p>
              {cancelled.comment && (
                <p className="mt-1 text-xs leading-5 text-amber-50/70">
                  {cancelled.comment}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 text-left md:text-right">
          {amount && <p className="text-xl font-bold text-cyan-100">{amount}</p>}
          {item.latestAppointment?.scheduled_at && (
            <p className="mt-1 text-xs text-white/35">
              {new Intl.DateTimeFormat("fr-FR", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Europe/Paris",
              }).format(new Date(item.latestAppointment.scheduled_at))}
            </p>
          )}
          {item.lead.id && (
            <Link
              href="/crm-v2/pipeline"
              className="mt-3 inline-block text-[11px] text-cyan-200/65 hover:text-cyan-100"
            >
              Dossier dans la V2
            </Link>
          )}
        </div>

        {item.lead.id && (
          <div className="flex flex-col items-start gap-2 md:ml-auto md:items-end md:pt-1">
            {!closed && (
              <LeadEditPanel
                leadId={item.lead.id}
                initialFullName={name(item)}
                initialPhone={item.customer.phone || ""}
                initialEmail={item.customer.email || ""}
                initialCity={item.customer.city || ""}
                initialService={serviceName(item)}
                initialPrice={String(item.latestQuote?.total_price ?? item.latestJob?.total_amount ?? "")}
                initialNote={item.lead.notes || ""}
                action={updateV2LeadDetails}
                quoteId={item.latestQuote?.id ?? null}
                expectedPrice={item.latestQuote?.total_price ?? null}
                canEditPrice={Boolean(
                  item.latestQuote?.id && item.latestQuote.status === "DRAFT" &&
                  ["NEW", "QUALIFIED", "CONTACTED"].includes(item.lead.lifecycle_status) &&
                  !item.latestJob
                )}
                priceAction={updateV2DraftPrice}
              />
            )}
            <LeadDangerActions
              leadId={item.lead.id}
              lifecycleStatus={item.lead.lifecycle_status}
              cancelAction={cancelV2Lead}
              deleteAction={deleteV2Lead}
            />
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const state = states[index];
            const now = !state.done && index === firstPending;
            const manual = manualSteps.has(step.key as ManualStepKey);
            const clickable = Boolean(item.lead.id && manual && !closed);

            const inner = (
              <>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${state.done
                    ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-200"
                    : now
                      ? "border-amber-300/35 bg-amber-300/10 text-amber-200"
                      : "border-white/10 text-white/25"}`}
                >
                  {state.done ? "✓" : now ? "•" : ""}
                </span>
                <div className="min-w-0 text-left">
                  <p
                    className={`text-xs font-medium ${state.done
                      ? "text-emerald-100"
                      : now
                        ? "text-amber-100"
                        : "text-white/35"}`}
                  >
                    {step.label}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/20">
                    {state.done ? "Fait" : now ? "À faire" : "En attente"}
                  </p>
                  {state.done && state.date && (
                    <p className="mt-1 text-[10px] text-emerald-100/45">
                      {formatStepDate(state.date)}
                    </p>
                  )}
                  {step.key === "NEW" && (
                    <p className="mt-1 text-[9px] text-white/20">Créée automatiquement</p>
                  )}
                  {step.key === "PAID" && (
                    <p className="mt-1 text-[9px] text-white/20">Via encaissement</p>
                  )}
                </div>
              </>
            );

            const classes = `flex w-full items-center gap-3 rounded-2xl border px-3 py-3 transition ${state.done
              ? "border-emerald-300/18 bg-emerald-300/[0.05]"
              : now
                ? "border-amber-300/20 bg-amber-300/[0.05]"
                : "border-white/6 bg-white/[0.02]"} ${clickable
                  ? "cursor-pointer hover:border-cyan-300/30 hover:bg-cyan-300/[0.035]"
                  : ""}`;

            if (clickable) {
              return (
                <form key={step.key} action={toggleV2LeadStep}>
                  <input type="hidden" name="leadId" value={item.lead.id} />
                  <input type="hidden" name="stepKey" value={step.key} />
                  <input type="hidden" name="nextDone" value={state.done ? "0" : "1"} />
                  <button
                    className={classes}
                    title={state.done ? "Cliquer pour remettre cette étape en attente" : "Cliquer pour marquer cette étape comme faite"}
                  >
                    {inner}
                  </button>
                </form>
              );
            }

            return (
              <div key={step.key} className={classes}>
                {inner}
              </div>
            );
          })}
        </div>

        {canRecordPayment && item.latestJob?.id && (
          <div className="mt-4 rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.035] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Paiement reçu</p>
                <p className="mt-1 text-xs text-white/35">
                  Choisis le mode utilisé par le client. La case Paiement se cochera automatiquement.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["CARD", "Carte"],
                  ["BANK_TRANSFER", "Virement"],
                  ["CASH", "Espèces"],
                ].map(([method, label]) => (
                  <form key={method} action={recordV2Payment}>
                    <input type="hidden" name="jobId" value={item.latestJob!.id} />
                    <input type="hidden" name="method" value={method} />
                    <button className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white/70 transition hover:border-cyan-300/30 hover:text-cyan-100">
                      {label}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default async function CrmV2Pipeline({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCrmAccess();

  const params = await searchParams;
  const rawSearch = Array.isArray(params.search) ? params.search[0] : params.search;
  const search = rawSearch?.trim() || undefined;
  const paymentRecorded =
    (Array.isArray(params.payment) ? params.payment[0] : params.payment) === "recorded";
  const paymentError = Array.isArray(params.payment_error)
    ? params.payment_error[0]
    : params.payment_error;
  const leadCancelled =
    (Array.isArray(params.lead_cancelled) ? params.lead_cancelled[0] : params.lead_cancelled) ===
    "1";
  const leadDeleted =
    (Array.isArray(params.lead_deleted) ? params.lead_deleted[0] : params.lead_deleted) === "1";
  const leadError = Array.isArray(params.lead_error) ? params.lead_error[0] : params.lead_error;
  const stepUpdated =
    (Array.isArray(params.step_updated) ? params.step_updated[0] : params.step_updated) === "1";
  const stepError = Array.isArray(params.step_error) ? params.step_error[0] : params.step_error;
  const editUpdated =
    (Array.isArray(params.edit_updated) ? params.edit_updated[0] : params.edit_updated) === "1";
  const editError = Array.isArray(params.edit_error) ? params.edit_error[0] : params.edit_error;
  const priceUpdated = (Array.isArray(params.price_updated) ? params.price_updated[0] : params.price_updated) === "1";
  const priceError = Array.isArray(params.price_error) ? params.price_error[0] : params.price_error;\n  const created = (Array.isArray(params.created) ? params.created[0] : params.created) === "1";

  const result = await getLeadsList({ page: 1, limit: 50, search });
  const { businessId } = await resolveCurrentBusinessContext();

  let activity: StepActivity[] = [];
  try {
    const rows = await supabaseRest<StepActivity[]>(
      "activity_log",
      "GET",
      null,
      `business_id=eq.${businessId}&order=created_at.desc&limit=1000&select=lead_id,event_type,event_data,created_at`,
    );
    activity = (rows as StepActivity[] | null) ?? [];
  } catch {
    activity = [];
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/55">Gestion des dossiers</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Dossiers clients</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
            Clique sur une étape pour la cocher ou la rouvrir. La date est conservée automatiquement.
          </p>
        </div>
        <Link
          href="/crm-v2/pipeline/new"
          className="w-fit rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100"
        >
          + Nouveau dossier
        </Link>
      </header>

      {created && (\n        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">\n          Nouveau dossier client créé.\n        </div>\n      )}\n      {paymentRecorded && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">
          Paiement enregistré. Le CA du mois a été mis à jour.
        </div>
      )}
      {paymentError && (
        <div className="rounded-xl border border-red-300/20 bg-red-300/[0.05] px-4 py-3 text-sm text-red-100">
          Le paiement n&apos;a pas pu être enregistré.
        </div>
      )}
      {editUpdated && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">
          Coordonnées du client mises à jour.
        </div>
      )}
      {editError && (
        <div className="rounded-xl border border-red-300/20 bg-red-300/[0.05] px-4 py-3 text-sm text-red-100">
          Les modifications n&apos;ont pas pu être enregistrées.
        </div>
      )}
      {priceUpdated && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">
          Montant du devis brouillon enregistré.
        </div>
      )}
      {priceError && (
        <div className="rounded-xl border border-red-300/20 bg-red-300/[0.05] px-4 py-3 text-sm text-red-100">
          {priceError === "conflict"
            ? "Le montant a changé depuis l’ouverture du dossier. Recharge la page avant de réessayer."
            : priceError === "invalid_lifecycle"
              ? "Ce devis est verrouillé : son état ou une prestation liée ne permet plus de modifier le montant."
              : priceError === "not_found"
                ? "Ce devis est introuvable. Recharge la page."
                : priceError === "invalid_amount"
                  ? "Saisis un montant positif, avec deux décimales au maximum (plafond : 10 000 000 €)."
                  : "Le montant n’a pas pu être enregistré. Réessaie plus tard."}
        </div>
      )}
      {stepUpdated && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">
          Parcours client mis à jour.
        </div>
      )}
      {stepError && (
        <div className="rounded-xl border border-red-300/20 bg-red-300/[0.05] px-4 py-3 text-sm text-red-100">
          L&apos;étape n&apos;a pas pu être mise à jour.
        </div>
      )}
      {leadCancelled && (
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] px-4 py-3 text-sm text-amber-100">
          Demande annulée et conservée dans l&apos;historique.
        </div>
      )}
      {leadDeleted && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-100">
          Demande supprimée.
        </div>
      )}
      {leadError === "linked" && (
        <div className="rounded-xl border border-red-300/20 bg-red-300/[0.05] px-4 py-3 text-sm text-red-100">
          Impossible de supprimer cette demande : une prestation est déjà liée. Consulte le dossier pour gérer cette prestation et conserver son historique.
        </div>
      )}
      {leadError && leadError !== "linked" && (
        <div className="rounded-xl border border-red-300/20 bg-red-300/[0.05] px-4 py-3 text-sm text-red-100">
          La demande n&apos;a pas pu être modifiée.
        </div>
      )}

      <form className="flex gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-2">
        <input
          name="search"
          defaultValue={search}
          placeholder="Rechercher un client, téléphone, véhicule..."
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
        />
        <button className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/70">
          Rechercher
        </button>
      </form>

      <div className="space-y-4">
        {result.items.length ? (
          result.items.map((item) => (
            <LeadProgress
              key={item.lead.id || item.lead.created_at}
              item={item}
              activity={activity}
            />
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-white/30">
            Aucun dossier trouvé.
          </div>
        )}
      </div>
    </div>
  );
}
