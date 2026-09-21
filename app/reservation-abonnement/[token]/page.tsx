import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseRest } from "../../../lib/supabase";
import { submitSubscriptionBookingRequest } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Réservation abonnement | AUTO 9",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SubscriptionRow = {
  id: string;
  business_id: string;
  customer_id: string;
  service_name: string;
  price: number | null;
  active: boolean;
};

type CustomerRow = {
  id: string;
  full_name: string;
  first_name: string | null;
};

function displayName(customer: CustomerRow | null) {
  return customer?.first_name?.trim() || customer?.full_name?.trim() || "Client";
}

export default async function SubscriptionBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const safeToken = token?.trim();

  if (!safeToken || !UUID_REGEX.test(safeToken)) {
    notFound();
  }

  const subscriptionRows = await supabaseRest<SubscriptionRow[]>(
    "crm_subscriptions",
    "GET",
    null,
    `booking_token=eq.${safeToken}&active=eq.true&select=id,business_id,customer_id,service_name,price,active&limit=1`,
  );

  const subscription = (subscriptionRows as SubscriptionRow[] | null)?.[0];
  if (!subscription) {
    notFound();
  }

  const customerRows = await supabaseRest<CustomerRow[]>(
    "customers",
    "GET",
    null,
    `business_id=eq.${subscription.business_id}&id=eq.${subscription.customer_id}&select=id,full_name,first_name&limit=1`,
  );
  const customer = (customerRows as CustomerRow[] | null)?.[0] ?? null;

  const sp = await searchParams;
  const sent = (Array.isArray(sp.sent) ? sp.sent[0] : sp.sent) === "1";

  if (sent) {
    return (
      <main className="min-h-screen bg-[#060b11] px-5 py-12 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.05] p-7 md:p-10">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/60">AUTO 9 · Abonnement</p>
            <h1 className="mt-4 text-3xl font-bold md:text-5xl">Demande de créneau reçue</h1>
            <p className="mt-5 text-sm leading-7 text-white/60">
              Merci {displayName(customer)}. Ta demande a bien été transmise à AUTO 9. Nous te confirmerons le rendez-vous dès validation.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#060b11] px-5 py-10 text-white md:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-sm font-black tracking-[0.18em] text-cyan-100">A9</div>
          <p className="mt-5 text-[11px] uppercase tracking-[0.26em] text-cyan-200/55">Espace abonnement privé</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
            Bonjour {displayName(customer)}
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/50">
            Choisis simplement le jour et l'heure qui te conviennent pour ton prochain entretien AUTO 9.
          </p>
        </div>

        <section className="rounded-3xl border border-white/8 bg-[#0b121b] p-5 md:p-7">
          <div className="rounded-2xl border border-cyan-300/12 bg-cyan-300/[0.035] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/50">Ton abonnement</p>
            <p className="mt-2 text-lg font-semibold">{subscription.service_name}</p>
            {typeof subscription.price === "number" && (
              <p className="mt-1 text-sm text-white/45">
                Tarif convenu : {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(subscription.price)}
              </p>
            )}
          </div>

          <form action={submitSubscriptionBookingRequest} className="mt-6 space-y-4">
            <input type="hidden" name="token" value={safeToken} />

            <label className="block text-xs text-white/45">
              Jour souhaité
              <input
                name="date"
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-base text-white outline-none focus:border-cyan-300/35"
              />
            </label>

            <label className="block text-xs text-white/45">
              Heure souhaitée
              <input
                name="time"
                type="time"
                required
                step="1800"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#081019] px-4 py-3 text-base text-white outline-none focus:border-cyan-300/35"
              />
            </label>

            <p className="text-xs leading-5 text-white/30">
              Le créneau choisi est une demande. AUTO 9 te confirme ensuite définitivement le rendez-vous.
            </p>

            <button className="w-full rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15">
              Envoyer ma demande de rendez-vous
            </button>
          </form>
        </section>

        <p className="mt-7 text-center text-xs text-white/25">AUTO 9 · Retrouvez la joie du neuf</p>
      </div>
    </main>
  );
}
