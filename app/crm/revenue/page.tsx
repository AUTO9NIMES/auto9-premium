import Link from "next/link";
import { redirect } from "next/navigation";

import { CrmAccessError, requireCrmAccess } from "../../lib/auth/dal";
import { resolveCurrentBusinessContext } from "../../lib/business";
import { supabaseRest } from "../../lib/supabase";
import type { Payment } from "../../lib/crm";

export const dynamic = "force-dynamic";

type RevenuePayment = Payment & {
  jobs?: {
    job_number?: string | null;
    title?: string | null;
    customer_id?: string | null;
  } | null;
};

const PAYMENT_METHOD_LABELS: Record<Payment["method"], string> = {
  CASH: "Espèces",
  CARD: "Carte",
  BANK_TRANSFER: "Virement",
  OTHER: "Autre",
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

function money(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date non renseignée";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

function monthKey(value: string): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function RevenuePage() {
  await ensureCrmAccess();

  const { businessId } = await resolveCurrentBusinessContext();

  let payments: RevenuePayment[] = [];
  let storageUnavailable = false;

  try {
    const rows = await supabaseRest<RevenuePayment>(
      "payments",
      "GET",
      null,
      `business_id=eq.${businessId}&order=received_at.desc&select=id,business_id,job_id,amount,method,idempotency_key,received_at,created_at,jobs(job_number,title,customer_id)`,
    );

    payments = Array.isArray(rows) ? rows : rows ? [rows] : [];
  } catch {
    storageUnavailable = true;
  }

  const totalRevenue = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );

  const thisMonth = currentMonthKey();

  const monthlyRevenue = payments
    .filter((payment) => monthKey(payment.received_at) === thisMonth)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const averagePayment =
    payments.length > 0 ? totalRevenue / payments.length : 0;

  return (
    <div data-crm-route="revenue" className="space-y-12">
      <section className="max-w-3xl">
        <p className="mb-4 text-xs uppercase tracking-[0.24em] text-[#d8b477]">
          Finance / Encaissements
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
          Chiffre d&apos;affaires
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-white/50 md:text-base">
          Une lecture financière basée exclusivement sur les paiements réellement
          enregistrés dans AUTO9.
        </p>
      </section>

      <section aria-labelledby="revenue-summary" className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 id="revenue-summary" className="text-sm font-medium text-white">
            Vue financière
          </h2>
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
            Paiements encaissés
          </span>
        </div>

        <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3">
          <div className="bg-[#101419] p-5 md:p-6">
            <p className="text-xs text-white/40">Chiffre d&apos;affaires total</p>
            <p className="mt-4 text-3xl font-semibold text-white">
              {money(totalRevenue)}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/25">
              Tous les encaissements
            </p>
          </div>

          <div className="bg-[#101419] p-5 md:p-6">
            <p className="text-xs text-white/40">Ce mois</p>
            <p className="mt-4 text-3xl font-semibold text-[#d8b477]">
              {money(monthlyRevenue)}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/25">
              Selon received_at
            </p>
          </div>

          <div className="bg-[#101419] p-5 md:p-6">
            <p className="text-xs text-white/40">Panier moyen encaissé</p>
            <p className="mt-4 text-3xl font-semibold text-white">
              {money(averagePayment)}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/25">
              {payments.length} paiement{payments.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </section>

      {storageUnavailable ? (
        <section className="border border-[#e4bd7c]/40 bg-[#101419] p-6">
          <p className="text-sm text-[#e4bd7c]">
            Les données financières sont momentanément indisponibles.
          </p>
          <p className="mt-2 text-xs text-white/40">
            Aucun montant estimé ou reconstruit n&apos;est affiché.
          </p>
        </section>
      ) : (
        <section aria-labelledby="payment-history" className="space-y-4">
          <div className="flex items-end justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">
                01 / Historique
              </p>
              <h2
                id="payment-history"
                className="mt-2 text-xl font-medium text-white"
              >
                Encaissements
              </h2>
            </div>

            <span className="text-[10px] uppercase tracking-[0.16em] text-white/25">
              {payments.length} résultat{payments.length === 1 ? "" : "s"}
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="border border-dashed border-white/10 p-10 text-center">
              <p className="text-sm text-white/35">
                Aucun paiement enregistré.
              </p>
              <Link
                href="/crm/jobs"
                className="mt-4 inline-block text-xs text-[#d8b477] hover:text-white"
              >
                Ouvrir les prestations <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <div className="border border-white/10 bg-[#101419]">
              {payments.map((payment) => {
                const job = payment.jobs;
                const jobHref = `/crm/jobs/${payment.job_id}`;
                const customerHref = job?.customer_id
                  ? `/crm/clients/${job.customer_id}`
                  : null;

                return (
                  <article
                    key={payment.id}
                    className="grid gap-4 border-b border-white/10 p-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={jobHref}
                          className="truncate text-sm font-medium text-white transition-colors hover:text-[#d8b477]"
                        >
                          {job?.job_number || job?.title || "Prestation"}
                        </Link>

                        <span className="border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/40">
                          {PAYMENT_METHOD_LABELS[payment.method]}
                        </span>
                      </div>

                      {job?.job_number && job?.title && (
                        <p className="mt-2 truncate text-xs text-white/45">
                          {job.title}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/35">
                        <time dateTime={payment.received_at}>
                          Encaissé le {formatDateTime(payment.received_at)}
                        </time>

                        {customerHref && (
                          <Link
                            href={customerHref}
                            className="text-[#d8b477]/70 hover:text-[#d8b477]"
                          >
                            Voir le client
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xl font-semibold text-[#d8b477]">
                        {money(Number(payment.amount))}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/25">
                        Encaissé
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
