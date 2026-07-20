"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const GOOGLE_ANALYTICS_ID = "G-CE110ZOZ4V";
const CONSENT_STORAGE_KEY = "auto9_cookie_consent";

type ConsentChoice = "accepted" | "refused" | null;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();

  const [consent, setConsent] = useState<ConsentChoice>(null);
  const [showSettings, setShowSettings] = useState(false);

  const firstPageView = useRef(true);

  useEffect(() => {
    const savedConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY);

    if (savedConsent === "accepted" || savedConsent === "refused") {
      setConsent(savedConsent);
    }
  }, []);

  useEffect(() => {
    if (consent !== "accepted") return;

    if (firstPageView.current) {
      firstPageView.current = false;
      return;
    }

    const pagePath = `${window.location.pathname}${window.location.search}`;

    window.gtag?.("event", "page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, consent]);

  function acceptCookies() {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
    setConsent("accepted");
    setShowSettings(false);
  }

  function refuseCookies() {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "refused");
    setConsent("refused");
    setShowSettings(false);
  }

  function reopenSettings() {
    setShowSettings(true);
  }

  const bannerVisible = consent === null || showSettings;

  return (
    <>
      {consent === "accepted" && (
        <>
          <Script id="auto9-google-analytics-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];

              window.gtag = function () {
                window.dataLayer.push(arguments);
              };

              window.gtag("js", new Date());

              window.gtag("config", "${GOOGLE_ANALYTICS_ID}", {
                anonymize_ip: true
              });
            `}
          </Script>

          <Script
            id="auto9-google-analytics"
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
            strategy="afterInteractive"
          />
        </>
      )}

      {bannerVisible && (
        <div className="fixed inset-x-0 bottom-0 z-[9999] p-3 sm:p-5">
          <div className="mx-auto max-w-4xl rounded-3xl border border-white/15 bg-[#080a0f]/95 p-5 text-white shadow-2xl backdrop-blur-2xl sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7DB7FF]">
                  Vos préférences
                </p>

                <h2 className="mt-2 text-xl font-black">
                  AUTO 9 respecte votre vie privée
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/65">
                  Nous utilisons Google Analytics uniquement avec votre accord
                  afin de comprendre comment le site est utilisé et
                  d’améliorer nos services.
                </p>

                <Link
                  href="/politique-confidentialite"
                  className="mt-3 inline-block text-xs font-bold text-[#7DB7FF] underline underline-offset-4"
                >
                  Consulter la politique de confidentialité
                </Link>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={refuseCookies}
                  className="rounded-full border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  Refuser
                </button>

                <button
                  type="button"
                  onClick={acceptCookies}
                  className="rounded-full bg-[#0057FF] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_30px_rgba(0,87,255,.35)] transition hover:bg-[#1767ff]"
                >
                  Accepter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!bannerVisible && consent !== null && (
        <button
          type="button"
          onClick={reopenSettings}
          className="fixed bottom-3 left-3 z-[9998] rounded-full border border-white/10 bg-[#080a0f]/85 px-3 py-2 text-[10px] font-bold text-white/50 backdrop-blur-xl transition hover:text-white"
        >
          Cookies
        </button>
      )}
    </>
  );
}
