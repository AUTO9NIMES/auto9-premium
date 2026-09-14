import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../../lib/auth/dal";

export const dynamic = "force-dynamic";

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

export default async function ClientsPage() {
  await ensureCrmAccess();

  return (
    <div data-crm-route="clients" className="space-y-10">
      <section className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#d8b477]">01 / Relationnel</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">Clients</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">L&apos;espace central pour retrouver les contacts, véhicules et historiques de prestation.</p>
        </div>
        <span className="w-fit border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/35">Lecture à venir</span>
      </section>

      <section aria-labelledby="clients-list" className="border border-white/10 bg-[#101419]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-7">
          <h2 id="clients-list" className="text-sm font-medium text-white">Répertoire clients</h2>
          <span className="text-xs text-white/30">0 résultat</span>
        </div>
        <div className="flex min-h-56 items-center justify-center px-6 py-12 text-center">
          <div>
            <div className="mx-auto flex h-10 w-10 items-center justify-center border border-[#d8b477]/40 text-[#d8b477]">A9</div>
            <p className="mt-5 text-sm text-white/65">La liste clients sera connectée ici.</p>
            <p className="mt-2 text-xs text-white/35">Prêt pour la couche de lecture customer list.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
