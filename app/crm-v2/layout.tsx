import Link from "next/link";
import { redirect } from "next/navigation";
import { CrmAccessError, requireCrmAccess } from "../lib/auth/dal";

export const dynamic = "force-dynamic";

async function ensureCrmAccess() {
  try {
    await requireCrmAccess();
  } catch (error) {
    if (error instanceof CrmAccessError) {
      if (error.code === "UNAUTHENTICATED") redirect("/crm/login?next=/crm-v2");
      if (error.code === "FORBIDDEN") redirect("/crm/login?error=access");
    }
    throw error;
  }
}

const nav = [
  ["Pilotage", "/crm-v2"],
  ["Chiffre d’affaires", "/crm-v2/revenue"],
  ["Pipeline", "/crm-v2/pipeline"],
  ["Clients", "/crm-v2/clients"],
  ["Abonnements", "/crm-v2/subscriptions"],
  ["Emails", "/crm-v2/emails"],
  ["Calendrier", "/crm-v2/calendar"],
];

export default async function CrmV2Layout({ children }: { children: React.ReactNode }) {
  await ensureCrmAccess();

  return (
    <div className="min-h-screen bg-[#070b10] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-cyan-400/10 bg-[#091019]/95 p-6 lg:flex lg:flex-col">
          <Link href="/crm-v2" className="block">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/5 text-sm font-black tracking-[0.18em] text-cyan-200">A9</div>
              <div>
                <p className="text-sm font-semibold">AUTO 9</p>
                <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/50">Command Center</p>
              </div>
            </div>
          </Link>

          <nav className="mt-10 space-y-2">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="block rounded-xl border border-transparent px-4 py-3 text-sm text-white/60 transition hover:border-cyan-300/15 hover:bg-cyan-300/5 hover:text-white">
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Version</p>
            <p className="mt-2 text-sm text-cyan-200">CRM V2 · NOX</p>
            <p className="mt-2 text-xs leading-5 text-white/35">Branche indépendante. Le CRM actuel reste intact.</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="border-b border-white/8 bg-[#091019]/80 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {nav.map(([label, href]) => (
                <Link key={href} href={href} className="whitespace-nowrap rounded-full border border-white/10 px-3 py-2 text-xs text-white/70">{label}</Link>
              ))}
            </div>
          </div>
          <div className="p-4 md:p-7 xl:p-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
