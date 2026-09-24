import type { ActivityLog } from "../../../lib/crm";

export type CustomerTimelinePresentation = {
  title: string;
  detail: string | null;
};

const leadStatusLabels: Record<string, string> = {
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

const stepLabels: Record<string, string> = {
  CONTACTED: "Contacté",
  QUOTE_SENT: "Devis envoyé",
  BOOKED: "Réservé",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  REVIEW_REQUESTED: "Avis demandé",
};

function dataOf(activity: Pick<ActivityLog, "event_data">): Record<string, unknown> {
  return activity.event_data &&
    typeof activity.event_data === "object" &&
    !Array.isArray(activity.event_data)
    ? activity.event_data
    : {};
}

function stringValue(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(data: Record<string, unknown>, key: string): number | null {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function amount(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function dateTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(date);
}

function statusLabel(value: string | null): string | null {
  return value ? leadStatusLabels[value] ?? null : null;
}

export function formatCustomerActivity(
  activity: Pick<ActivityLog, "event_type" | "event_data">,
): CustomerTimelinePresentation {
  const data = dataOf(activity);

  switch (activity.event_type) {
    case "website.lead.created":
      return { title: "Nouvelle demande reçue", detail: "Depuis le site AUTO9" };

    case "manual.lead.created":
      return { title: "Demande créée manuellement", detail: null };

    case "lead.cancelled":
      return {
        title: "Demande clôturée",
        detail: stringValue(data, "comment"),
      };

    case "lead.status_changed": {
      const previous = statusLabel(stringValue(data, "previous_status"));
      const next = statusLabel(stringValue(data, "new_status"));
      const comment = stringValue(data, "comment");

      if (stringValue(data, "new_status") === "CLOSED_LOST") {
        return { title: "Demande clôturée", detail: comment };
      }

      return {
        title: "Statut de la demande modifié",
        detail:
          previous && next
            ? `${previous} → ${next}`
            : next
              ? `Nouveau statut : ${next}`
              : null,
      };
    }

    case "quote.created": {
      const version = numberValue(data, "quote_version");
      return {
        title: "Devis créé",
        detail: version !== null ? `Version ${version}` : null,
      };
    }

    case "quote.sent":
      return { title: "Devis envoyé", detail: null };

    case "quote.amount_updated": {
      const previous = numberValue(data, "old_total_price");
      const next = numberValue(data, "new_total_price");

      return {
        title: "Montant du devis modifié",
        detail:
          previous !== null && next !== null
            ? `${amount(previous)} → ${amount(next)}`
            : next !== null
              ? `Nouveau montant : ${amount(next)}`
              : null,
      };
    }

    case "quote.accepted":
      return { title: "Devis accepté", detail: null };

    case "appointment.requested":
      return { title: "Rendez-vous demandé", detail: null };

    case "appointment.scheduled":
      return { title: "Rendez-vous planifié", detail: null };

    case "appointment.confirmed":
      return { title: "Rendez-vous confirmé", detail: null };

    case "appointment.completed":
      return { title: "Rendez-vous terminé", detail: null };

    case "appointment.cancelled":
      return { title: "Rendez-vous annulé", detail: null };

    case "appointment.rescheduled": {
      const previous = dateTime(stringValue(data, "previous_scheduled_at"));
      const next = dateTime(stringValue(data, "new_scheduled_at"));

      return {
        title: "Rendez-vous replanifié",
        detail:
          previous && next
            ? `${previous} → ${next}`
            : next
              ? `Nouvel horaire : ${next}`
              : null,
      };
    }

    case "job.started":
      return { title: "Prestation démarrée", detail: null };

    case "payment.recorded":
      return { title: "Paiement enregistré", detail: null };

    case "review.requested":
      return { title: "Avis client demandé", detail: null };

    case "customer.profile_updated": {
      const fields = data.changed_fields;
      const count =
        Array.isArray(fields) &&
        fields.every((field) => typeof field === "string")
          ? fields.length
          : 0;

      return {
        title: "Profil client mis à jour",
        detail: count ? `${count} champ${count > 1 ? "s" : ""} modifié${count > 1 ? "s" : ""}` : null,
      };
    }

    case "crm_v2.step.completed":
    case "crm_v2.step.reopened": {
      const key = stringValue(data, "step_key");
      const step = key ? stepLabels[key] ?? null : null;
      const completed = activity.event_type === "crm_v2.step.completed";

      return {
        title: completed ? "Étape CRM terminée" : "Étape CRM rouverte",
        detail: step,
      };
    }

    default:
      return {
        title: activity.event_type || "Activité client",
        detail: null,
      };
  }
}
