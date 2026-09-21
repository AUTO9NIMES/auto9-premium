import { getCustomersList } from "../../lib/crm";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";
import EmailEditor from "./EmailEditor";

export const dynamic = "force-dynamic";

type EmailSubscription = {
  id: string;
  customer_id: string;
  service_name: string;
  price: number | null;
  booking_token: string | null;
  active: boolean;
};

export default async function EmailsPage() {
  const customers = await getCustomersList({ page: 1, limit: 100 });
  const { businessId } = await resolveCurrentBusinessContext();

  let subscriptions: EmailSubscription[] = [];
  try {
    const rows = await supabaseRest<EmailSubscription[]>(
      "crm_subscriptions",
      "GET",
      null,
      `business_id=eq.${businessId}&active=eq.true&order=created_at.desc&select=id,customer_id,service_name,price,booking_token,active`,
    );
    subscriptions = (rows as EmailSubscription[] | null) ?? [];
  } catch {
    subscriptions = [];
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/55">Communication</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Emails AUTO 9</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
          Choisis un modèle, sélectionne un client, modifie le contenu si besoin et vérifie exactement ce qu'il verra avant d'envoyer.
        </p>
      </header>

      <EmailEditor
        customers={customers.items.map((item) => item.customer)}
        subscriptions={subscriptions}
      />
    </div>
  );
}
