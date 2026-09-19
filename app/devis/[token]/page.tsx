import type { Metadata } from "next";

import { getPublicQuoteByToken } from "../../lib/crm";
import { site } from "../../lib/site";

export const dynamic = "force-dynamic";

const TOKEN_REGEX = /^[0-9a-f]{32}$/;

export const metadata: Metadata = {
  title: `Votre devis — ${site.name}`,
  robots: { index: false, follow: false },
};

function formatAmount(value?: number | null): string | null {
  return typeof value === "number"
    ? new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(value)
    : null;
}

function formatDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function UnavailableState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050608] px-6 text-white">
      <div className="max-w-md text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-white/40">
          {site.name}
        </p>
        <h1 className="mt-5 text-3xl font-black uppercase tracking-tight">
          Devis indisponible
        </h1>
        <p className="mt-4 leading-relaxed text-white/50">
          Ce lien de devis n&apos;est plus valide ou a expiré. Contactez{" "}
          {site.name} pour recevoir un nouveau lien.
        </p>
        <a
          href={site.phoneHref}
          className="mt-8 inline-block rounded-full border border-white/20 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:border-white/50"
        >
          Appeler {site.name}
        </a>
      </div>
    </main>
  );
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token?: string }>;
}) {
  const { token } = await params;
  const normalizedToken = token?.trim().toLowerCase() ?? "";

  if (!TOKEN_REGEX.test(normalizedToken)) {
    return <UnavailableState />;
  }

  const quote = await getPublicQuoteByToken(normalizedToken);

  if (!quote) {
    return <UnavailableState />;
  }

  const amount = formatAmount(quote.totalPrice);
  const createdAt = formatDate(quote.createdAt);
  const displayName =
    quote.customerName?.trim() || "Client";
  const isSent = quote.status === "SENT";
  const isAccepted = quote.status === "ACCEPTED";

  return (
    <main className="min-h-screen bg-[#050608] px-5 py-10 text-white md:px-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(0,87,255,.12),rgba(255,255,255,.03))]">
          <div className="border-b border-white/10 p-7 md:p-10">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#7DB7FF]">
              {quote.businessName || site.name}
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.04em] md:text-5xl">
              Votre devis
            </h1>
            {createdAt && (
              <p className="mt-3 text-xs text-white/35">Émis le {createdAt}</p>
            )}
          </div>

          <div className="space-y-6 p-7 md:p-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                Client
              </p>
              <p className="mt-2 text-lg font-bold text-white">{displayName}</p>
              {quote.vehicleName && (
                <p className="mt-1 text-sm text-white/55">{quote.vehicleName}</p>
              )}
            </div>

            {quote.serviceNames.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                  Prestation{quote.serviceNames.length > 1 ? "s" : ""}
                </p>
                <ul className="mt-3 space-y-2">
                  {quote.serviceNames.map((serviceName) => (
                    <li
                      key={serviceName}
                      className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white/85"
                    >
                      {serviceName}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#0057FF]/30 bg-[#0057FF]/10 p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7DB7FF]">
                  Total
                </p>
                <p className="mt-2 text-4xl font-black tracking-tight">
                  {amount ?? "Sur devis"}
                </p>
              </div>
              {quote.estimatedTime && (
                <p className="text-sm text-white/55">
                  Durée estimée : {quote.estimatedTime}
                </p>
              )}
            </div>

            {isAccepted ? (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-200">
                  Devis accepté ✓
                </p>
                <p className="mt-2 text-sm text-white/55">
                  Merci. {site.name} vous recontacte pour confirmer la
                  prestation.
                </p>
              </div>
            ) : isSent ? (
              <form
                method="post"
                action={`/api/quotes/share/${normalizedToken}/accept`}
              >
                <button
                  type="submit"
                  className="w-full rounded-full border border-[#0057FF] bg-[#0057FF] px-7 py-5 text-xs font-black uppercase tracking-[0.25em] text-white shadow-[0_0_28px_rgba(0,87,255,.35)] transition hover:brightness-110"
                >
                  Accepter le devis
                </button>
              </form>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-6 text-center">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-white/50">
                  Ce devis n&apos;est plus disponible
                </p>
              </div>
            )}

            <p className="text-center text-xs leading-relaxed text-white/35">
              Une question ?{" "}
              <a href={site.phoneHref} className="text-[#7DB7FF] hover:text-white">
                {site.phone}
              </a>{" "}
              · {site.name}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
