import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess, type CrmAccess } from "../../../lib/auth/dal";
import { canAccessAutomation } from "../../../lib/auth/roles";
import { createAuthServerClient } from "../../../lib/auth/server";
import { googleCalendarFeedKey } from "../../../lib/google-calendar-feed";


async function mayViewLink(access: CrmAccess) {
  if (canAccessAutomation(access.role)) return true;
  const owner = process.env.AUTO9_CALENDAR_OWNER_EMAIL?.trim().toLowerCase();
  if (!owner) return false;

  const supabase = await createAuthServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  return !error && user?.id === access.userId && Boolean(user.email_confirmed_at) &&
    user.email?.toLowerCase() === owner;
}

export default async function CalendarSubscriptionPage() {
  const access = await requireCrmAccess().catch((error: unknown) => {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login?next=%2Fcrm%2Fcalendar%2Fsubscription");
      if (error.code === "FORBIDDEN") redirect("/crm/login?error=access");
    }
    throw error;
  });
  const allowed = await mayViewLink(access);
  const key = allowed ? googleCalendarFeedKey(access.businessId) : null;
  const url = key ? `https://www.auto9nimes.com/api/integrations/google-calendar?key=${key}` : null;

  return (
    <section className="mx-auto grid max-w-2xl gap-4 rounded-2xl border border-white/15 bg-[#0b121b] p-4 text-white sm:p-6">
      <Link href="/crm/calendar" className="w-fit text-sm text-cyan-200">← Retour au planning</Link>
      <h1 className="text-2xl font-bold">Ajouter à Google Agenda</h1>
      {url ? (
        <>
          <label htmlFor="calendar-url" className="text-sm font-semibold">Lien privé du planning AUTO 9</label>
          <input id="calendar-url" className="w-full min-w-0 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-base" readOnly value={url} />
          <p className="text-sm text-white/65">Copie le lien et garde-le pour toi.</p>
          <a
            href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
            target="_blank"
            rel="noreferrer"
            className="w-fit rounded-xl border border-cyan-300/30 px-4 py-3 text-sm text-cyan-100"
          >
            Ouvrir Google Agenda
          </a>
          <h2 className="font-semibold">Rappels sur iPhone</h2>
          <p className="text-sm text-white/65">
            Dans Calendrier → Calendriers → Ajouter un calendrier → Ajouter un calendrier avec abonnement,
            colle le lien puis active les alertes d’AUTO 9. Les rappels sont prévus une heure avant les rendez-vous avec un horaire.
          </p>
        </>
      ) : (
        <p role="status" className="text-sm text-white/65">
          {allowed ? "Le lien est temporairement indisponible." : "Connecte-toi avec le compte principal AUTO 9 pour accéder au lien privé."}
        </p>
      )}
    </section>
  );
}
