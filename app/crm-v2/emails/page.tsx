import { getCustomersList } from "../../lib/crm";
import EmailEditor from "./EmailEditor";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const customers = await getCustomersList({ page: 1, limit: 100 });

  return (
    <div className="space-y-7">
      <header>
        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/55">Communication</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Emails AUTO 9</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
          Choisis un modèle, sélectionne un client, modifie le contenu si besoin et vérifie exactement ce qu'il verra avant d'envoyer.
        </p>
      </header>

      <EmailEditor customers={customers.items.map((item) => item.customer)} />
    </div>
  );
}
