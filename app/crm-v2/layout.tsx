import "./crm-v2.css";
import "./crm-v2-light-adapter.css";
import Image from "next/image";
import Link from "next/link";
import { ensureCrmV2Access } from "./access";
import { CrmMobileNav, CrmSideNav } from "./CrmNav";
import CrmSearch from "./CrmSearch";
import ThemeToggle from "./ThemeToggle";

export const dynamic = "force-dynamic";

export default async function CrmV2Layout({ children }: { children: React.ReactNode }) {
  await ensureCrmV2Access();

  return (
    <div className="crm-v2-root min-h-screen" data-theme="dark">
      <div className="mx-auto flex min-h-screen max-w-[1800px] gap-4 p-3 md:p-4">
        <aside className="crm-glass sticky top-4 hidden h-[calc(100vh-2rem)] w-[248px] shrink-0 flex-col gap-5 overflow-y-auto p-4 lg:flex">
          <Link href="/crm-v2" className="flex items-center gap-3 px-1">
            <Image src="/brand/auto9-logo.webp" alt="" width={420} height={288} sizes="60px" className="h-10 w-auto" />
            <span className="grid">
              <span className="text-sm font-extrabold tracking-tight">AUTO 9</span>
              <span className="crm-eyebrow !tracking-[0.14em]">CRM · Nîmes</span>
            </span>
          </Link>

          <CrmSearch id="crm-search-side" />

          <CrmSideNav />

          <div className="mt-auto grid gap-2">
            <Link href="/" className="crm-nav-link !text-[12.5px]">← Voir le site</Link>
            <ThemeToggle />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="crm-glass sticky top-3 z-30 grid gap-3 p-3 lg:hidden">
            <div className="flex items-center gap-3">
              <Link href="/crm-v2" className="flex shrink-0 items-center gap-2" aria-label="Tableau de bord AUTO 9">
                <Image src="/brand/auto9-logo.webp" alt="" width={420} height={288} sizes="48px" className="h-8 w-auto" />
              </Link>
              <div className="min-w-0 flex-1">
                <CrmSearch id="crm-search-top" />
              </div>
              <ThemeToggle compact />
            </div>
            <CrmMobileNav />
          </div>

          <main className="min-w-0 flex-1 px-1 pb-10 pt-1 md:px-3 md:pt-3 xl:px-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
