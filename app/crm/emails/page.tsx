import { redirect } from "next/navigation";

import { CrmAccessError, requireCrmAccess } from "../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { getCustomersList } from "../../lib/crm";
import { supabaseRest } from "../../lib/supabase";
import EmailEditor from "./EmailEditor";

export const dynamic = "force-dynamic";

type EmailSubscription = {
  id: string;
  business_id: string;
  customer_id: string;
  service_name: string;
  price: number | null;
  booking_token: string | null;
  active: boolean;
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

export default async function EmailsPage() {
  await ensureCrmAccess();

  const { businessId } = await resolveCurrentBusinessContext();
  const customersResult = await getCustomersList({ page: 1, limit: 100 });

  let subscriptions: EmailSubscription[] = [];
  let subscriptionsUnavailable = false;

  try {
    const rows = await supabaseRest<EmailSubscription>(
      "crm_subscriptions",
      "GET",
      null,
      `business_id=eq.${encodeURIComponent(
        businessId,
      )}&active=eq.true&order=next_due_on.asc&select=id,business_id,customer_id,service_name,price,booking_token,active`,
    );

    subscriptions = Array.isArray(rows) ? rows : rows ? [rows] : [];
  } catch {
    subscriptionsUnavailable = true;
  }

  const customers = customersResult.items.map(({ customer }) => ({
    id: customer.id,
    full_name: customer.full_name,
    first_name: customer.first_name,
    last_name: customer.last_name,
    email: customer.email,
  }));

  return (
    <div data-crm-route="emails" className="space-y-12">
      <section className="max-w-3xl">
        <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#d8b477]">
          Relation client / Communication
        </p>

        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
          Emails
        </h1>

        <p className="mt-5 max-w-xl text-sm leading-7 text-white/50 md:text-base">
          Prépare les messages AUTO 9 à partir des données clients, personnalise
          le contenu puis ouvre le brouillon dans ta messagerie avant envoi.
        </p>
      </section>

      <section className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3">
        <div className="bg-[#101419] p-5 md:p-6">
          <p className="text-xs text-white/40">Clients disponibles</p>
          <p className="mt-4 text-3xl font-semibold text-white">
            {customers.length}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/25">
            Maximum 100 affichés
          </p>
        </div>

        <div className="bg-[#101419] p-5 md:p-6">
          <p className="text-xs text-white/40">Avec adresse email</p>
          <p className="mt-4 text-3xl font-semibold text-[#d8b477]">
            {customers.filter((customer) => Boolean(customer.email)).length}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/25">
            Prêts à contacter
          </p>
        </div>

        <div className="bg-[#101419] p-5 md:p-6">
          <p className="text-xs text-white/40">Abonnements actifs</p>
          <p className="mt-4 text-3xl font-semibold text-white">
            {subscriptions.length}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/25">
            Liens privés disponibles
          </p>
        </div>
      </section>

      {subscriptionsUnavailable && (
        <section className="border border-[#e4bd7c]/40 bg-[#101419] p-5">
          <p className="text-sm text-[#e4bd7c]">
            Les abonnements sont momentanément indisponibles.
          </p>
          <p className="mt-2 text-xs leading-5 text-white/40">
            Les autres modèles restent utilisables. Le modèle abonnement ne
            pourra pas être ouvert tant qu&apos;aucun lien privé n&apos;est disponible.
          </p>
        </section>
      )}

      <EmailEditor customers={customers} subscriptions={subscriptions} />
    </div>
  );
}
