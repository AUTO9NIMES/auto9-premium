"use client";

import { useMemo, useState } from "react";

type Customer = {
  id?: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type EmailSubscription = {
  id: string;
  customer_id: string;
  service_name: string;
  price: number | null;
  booking_token: string | null;
  active: boolean;
};

type TemplateKey =
  | "appointment"
  | "review"
  | "quote"
  | "subscription"
  | "thanks";

type Template = {
  label: string;
  subject: string;
  body: string;
  cta: string;
  url: string;
};

const templates: Record<TemplateKey, Template> = {
  appointment: {
    label: "Confirmation de rendez-vous",
    subject: "Confirmation de votre rendez-vous AUTO 9",
    body:
      "Bonjour {{prenom}},\n\nVotre rendez-vous AUTO 9 est bien confirmé.\n\nNous avons hâte de prendre soin de votre véhicule.\n\nÀ très bientôt,\nAUTO 9",
    cta: "Voir AUTO 9",
    url: "https://auto9nimes.com",
  },
  review: {
    label: "Demande d’avis Google",
    subject: "Votre avis compte pour AUTO 9",
    body:
      "Bonjour {{prenom}},\n\nMerci encore pour votre confiance. J’espère que vous êtes pleinement satisfait(e) de la prestation réalisée sur votre véhicule.\n\nSi vous avez 30 secondes, votre avis Google nous aide énormément à faire connaître AUTO 9.\n\nMerci beaucoup,\nAUTO 9",
    cta: "Découvrir AUTO 9",
    url: "https://auto9nimes.com",
  },
  quote: {
    label: "Relance devis",
    subject: "Votre devis AUTO 9",
    body:
      "Bonjour {{prenom}},\n\nJe me permets de revenir vers vous concernant votre demande auprès d’AUTO 9.\n\nSi vous souhaitez toujours faire réaliser la prestation, je reste disponible pour organiser votre rendez-vous.\n\nÀ bientôt,\nAUTO 9",
    cta: "Voir AUTO 9",
    url: "https://auto9nimes.com",
  },
  subscription: {
    label: "Abonnement à planifier",
    subject: "Votre entretien AUTO 9 - prochain rendez-vous",
    body:
      "Bonjour {{prenom}},\n\nVotre entretien AUTO 9 est à planifier pour ce mois-ci.\n\nVous pouvez choisir directement le jour et l’horaire qui vous conviennent via le lien ci-dessous.\n\nÀ bientôt,\nAUTO 9",
    cta: "Choisir mon créneau",
    url: "",
  },
  thanks: {
    label: "Merci après prestation",
    subject: "Merci pour votre confiance",
    body:
      "Bonjour {{prenom}},\n\nMerci d’avoir confié votre véhicule à AUTO 9.\n\nJ’espère que le résultat vous plaît et que vous avez retrouvé la joie du neuf.\n\nÀ bientôt,\nAUTO 9",
    cta: "Découvrir AUTO 9",
    url: "https://auto9nimes.com",
  },
};

function firstName(customer?: Customer) {
  return (
    customer?.first_name?.trim() ||
    customer?.full_name?.trim().split(/\s+/)[0] ||
    "Client"
  );
}

function replaceVars(text: string, customer?: Customer) {
  return text.replaceAll("{{prenom}}", firstName(customer));
}

function buildMailto(
  email: string | null | undefined,
  subject: string,
  body: string,
  cta: string,
  url: string,
) {
  const destination = email?.trim();

  if (!destination) {
    return null;
  }

  const ctaLine = cta.trim() && url.trim() ? `\n\n${cta.trim()} : ${url.trim()}` : "";
  const plain = `${body}${ctaLine}`;

  return `mailto:${destination}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(plain)}`;
}

export default function EmailEditor({
  customers,
  subscriptions,
}: {
  customers: Customer[];
  subscriptions: EmailSubscription[];
}) {
  const [templateKey, setTemplateKey] =
    useState<TemplateKey>("subscription");
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [subscriptionId, setSubscriptionId] = useState("");

  const [subjectOverrides, setSubjectOverrides] = useState<
    Partial<Record<TemplateKey, string>>
  >({});
  const [bodyOverrides, setBodyOverrides] = useState<
    Partial<Record<TemplateKey, string>>
  >({});
  const [ctaOverrides, setCtaOverrides] = useState<
    Partial<Record<TemplateKey, string>>
  >({});
  const [urlOverrides, setUrlOverrides] = useState<
    Partial<Record<TemplateKey, string>>
  >({});

  const selectedCustomer = customers.find(
    (customer) => customer.id === customerId,
  );

  const customerSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.active && subscription.customer_id === customerId,
  );

  const selectedSubscription =
    customerSubscriptions.find(
      (subscription) => subscription.id === subscriptionId,
    ) || customerSubscriptions[0];

  const base = templates[templateKey];

  const subject = subjectOverrides[templateKey] ?? base.subject;
  const body = bodyOverrides[templateKey] ?? base.body;
  const cta = ctaOverrides[templateKey] ?? base.cta;

  const privateSubscriptionUrl =
    templateKey === "subscription" && selectedSubscription?.booking_token
      ? `https://auto9nimes.com/reservation-abonnement/${selectedSubscription.booking_token}`
      : base.url;

  const url = urlOverrides[templateKey] ?? privateSubscriptionUrl;

  const renderedSubject = replaceVars(subject, selectedCustomer);
  const renderedBody = replaceVars(body, selectedCustomer);

  const subscriptionReady =
    templateKey !== "subscription" ||
    Boolean(selectedSubscription?.booking_token);

  const mailto = useMemo(
    () =>
      subscriptionReady
        ? buildMailto(
            selectedCustomer?.email,
            renderedSubject,
            renderedBody,
            cta,
            url,
          )
        : null,
    [
      selectedCustomer?.email,
      renderedSubject,
      renderedBody,
      cta,
      url,
      subscriptionReady,
    ],
  );

  return (
    <div className="grid gap-8 2xl:grid-cols-[0.9fr_1.1fr]">
      <section className="border border-white/10 bg-[#101419] p-5 md:p-7">
        <div className="border-b border-white/10 pb-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">
            01 / Préparation
          </p>
          <h2 className="mt-2 text-xl font-medium text-white">
            Composer le message
          </h2>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block text-xs text-white/45">
            Modèle
            <select
              value={templateKey}
              onChange={(event) => {
                setTemplateKey(event.target.value as TemplateKey);
                setSubscriptionId("");
              }}
              className="mt-2 w-full border border-white/10 bg-[#0b0f13] px-4 py-3 text-sm text-white outline-none focus:border-[#d8b477]/50"
            >
              {Object.entries(templates).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-white/45">
            Client
            <select
              value={customerId}
              onChange={(event) => {
                setCustomerId(event.target.value);
                setSubscriptionId("");
              }}
              className="mt-2 w-full border border-white/10 bg-[#0b0f13] px-4 py-3 text-sm text-white outline-none focus:border-[#d8b477]/50"
            >
              <option value="">Choisir un client</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                  {customer.email ? ` · ${customer.email}` : ""}
                </option>
              ))}
            </select>
          </label>

          {templateKey === "subscription" && (
            <label className="block text-xs text-white/45">
              Abonnement
              <select
                value={selectedSubscription?.id || ""}
                onChange={(event) => setSubscriptionId(event.target.value)}
                className="mt-2 w-full border border-white/10 bg-[#0b0f13] px-4 py-3 text-sm text-white outline-none focus:border-[#d8b477]/50"
              >
                {!customerSubscriptions.length && (
                  <option value="">Aucun abonnement actif pour ce client</option>
                )}

                {customerSubscriptions.map((subscription) => (
                  <option key={subscription.id} value={subscription.id}>
                    {subscription.service_name}
                    {typeof subscription.price === "number"
                      ? ` · ${subscription.price.toFixed(2)} €`
                      : ""}
                  </option>
                ))}
              </select>

              <span className="mt-2 block text-[10px] leading-4 text-white/25">
                Le lien privé de réservation est associé automatiquement à
                l&apos;abonnement sélectionné.
              </span>
            </label>
          )}

          <label className="block text-xs text-white/45">
            Objet
            <input
              value={subject}
              onChange={(event) =>
                setSubjectOverrides((previous) => ({
                  ...previous,
                  [templateKey]: event.target.value,
                }))
              }
              className="mt-2 w-full border border-white/10 bg-[#0b0f13] px-4 py-3 text-sm text-white outline-none focus:border-[#d8b477]/50"
            />
          </label>

          <label className="block text-xs text-white/45">
            Message
            <textarea
              rows={12}
              value={body}
              onChange={(event) =>
                setBodyOverrides((previous) => ({
                  ...previous,
                  [templateKey]: event.target.value,
                }))
              }
              className="mt-2 w-full resize-y border border-white/10 bg-[#0b0f13] px-4 py-3 text-sm leading-6 text-white outline-none focus:border-[#d8b477]/50"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs text-white/45">
              Texte du lien
              <input
                value={cta}
                onChange={(event) =>
                  setCtaOverrides((previous) => ({
                    ...previous,
                    [templateKey]: event.target.value,
                  }))
                }
                className="mt-2 w-full border border-white/10 bg-[#0b0f13] px-4 py-3 text-sm text-white outline-none focus:border-[#d8b477]/50"
              />
            </label>

            <label className="block text-xs text-white/45">
              Destination
              <input
                value={url}
                onChange={(event) =>
                  setUrlOverrides((previous) => ({
                    ...previous,
                    [templateKey]: event.target.value,
                  }))
                }
                className="mt-2 w-full border border-white/10 bg-[#0b0f13] px-4 py-3 text-sm text-white outline-none focus:border-[#d8b477]/50"
              />
            </label>
          </div>

          <div className="border border-white/10 px-4 py-3 text-xs leading-5 text-white/35">
            Variable disponible :{" "}
            <span className="text-[#d8b477]">{"{{prenom}}"}</span>
            {" "}— remplacée automatiquement par le prénom du client.
          </div>

          {mailto ? (
            <a
              href={mailto}
              className="block border border-[#d8b477]/40 bg-[#d8b477]/10 px-4 py-3 text-center text-sm font-medium text-[#e4bd7c] transition hover:bg-[#d8b477]/15"
            >
              Ouvrir dans ma messagerie
            </a>
          ) : (
            <div className="border border-[#e4bd7c]/30 bg-[#e4bd7c]/[0.04] px-4 py-3 text-sm leading-6 text-[#e4bd7c]/80">
              {templateKey === "subscription" &&
              selectedCustomer?.email &&
              !selectedSubscription?.booking_token
                ? "Aucun lien privé disponible pour cet abonnement."
                : "Sélectionne un client avec une adresse email."}
            </div>
          )}
        </div>
      </section>

      <section className="border border-white/10 bg-[#101419] p-5 md:p-7">
        <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8b477]">
              02 / Aperçu
            </p>
            <h2 className="mt-2 text-xl font-medium text-white">
              Avant envoi
            </h2>
          </div>

          <span className="text-[10px] uppercase tracking-[0.16em] text-white/25">
            Modifiable
          </span>
        </div>

        <div className="overflow-hidden border border-white/10 bg-[#f4f7fa]">
          <div className="bg-[#090d11] px-7 py-6 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center border border-[#d8b477]/40 text-sm font-semibold tracking-[0.16em] text-[#d8b477]">
                A9
              </div>

              <div>
                <p className="text-sm font-semibold">AUTO 9</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-white/35">
                  Retrouvez la joie du neuf
                </p>
              </div>
            </div>
          </div>

          <div className="px-7 py-8 text-[#14202c] md:px-10 md:py-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#718394]">
              Objet
            </p>

            <h3 className="mt-2 text-xl font-semibold">{renderedSubject}</h3>

            <div className="mt-7 whitespace-pre-line text-[15px] leading-7 text-[#34495c]">
              {renderedBody}
            </div>

            {cta && url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-block bg-[#111820] px-6 py-3 text-sm font-semibold text-[#e4bd7c] no-underline"
              >
                {cta}
              </a>
            )}

            <div className="mt-10 border-t border-slate-200 pt-5">
              <p className="text-xs font-semibold text-[#14202c]">
                AUTO 9 · Nîmes
              </p>
              <p className="mt-1 text-xs text-[#718394]">
                Nettoyage & préparation automobile premium
              </p>
              <p className="mt-1 text-xs text-[#9b7745]">auto9nimes.com</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
