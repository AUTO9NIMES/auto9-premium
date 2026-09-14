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

export default async function PipelinePage() {
  await ensureCrmAccess();

  return (
    <div data-crm-route="pipeline" className="space-y-10">
      <section className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#d8b477]">02 / Développement</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">Pipeline</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">Une vue claire des opportunités, des demandes entrantes et des prochaines relances.</p>
        </div>
        <span className="w-fit border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/35">Lecture à venir</span>
      </section>

      <section aria-labelledby="pipeline-board" className="border border-white/10 bg-[#101419]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-7">
          <h2 id="pipeline-board" className="text-sm font-medium text-white">Vue pipeline</h2>
          <span className="text-xs text-white/30">Aucune opportunité</span>
        </div>
        <div className="grid gap-px bg-white/10 md:grid-cols-3">
          {["À qualifier", "En discussion", "À confirmer"].map((stage) => (
            <div key={stage} className="min-h-48 bg-[#0d1014] p-5">
              <p className="text-xs text-white/55">{stage}</p>
              <p className="mt-12 text-xs text-white/30">La lecture des leads sera branchée ici.</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
