import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../lib/auth/dal";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login");
      if (error.code === "FORBIDDEN") redirect("/crm/login?error=access");
    }
    throw new Error("Service CRM temporairement indisponible.");
  }

  return (
    <div data-crm-route="dashboard" className="space-y-10">
      <section className="max-w-3xl">
        <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#d8b477]">Dashboard / Vue d&apos;ensemble</p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white md:text-5xl">Le cockpit AUTO9 pour piloter chaque relation.</h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-white/50 md:text-base">Le shell CRM est en place. Les données métier seront branchées progressivement sur les couches de lecture existantes.</p>
      </section>

      <section aria-labelledby="dashboard-summary" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 id="dashboard-summary" className="text-sm font-medium text-white">Aperçu de l&apos;espace</h2>
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">Structure V1</span>
        </div>
        <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3">
          {[
            ["Clients", "Liste à connecter", "01"],
            ["Pipeline", "Suivi à connecter", "02"],
            ["Prestations", "Flux à connecter", "03"],
          ].map(([label, status, number]) => (
            <div key={label} className="bg-[#101419] p-5 md:p-6">
              <div className="flex items-center justify-between text-xs text-white/35">
                <span>{number}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#d8b477]" />
              </div>
              <h3 className="mt-10 text-lg font-medium text-white">{label}</h3>
              <p className="mt-2 text-xs text-white/40">{status}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-dashed border-white/15 bg-white/[0.02] p-6 md:p-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">Prochaine étape</p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Le dashboard ne présente encore aucune métrique réelle. Il attend les lectures CRM autorisées avant d&apos;afficher des données d&apos;activité.</p>
      </section>
    </div>
  );
}
