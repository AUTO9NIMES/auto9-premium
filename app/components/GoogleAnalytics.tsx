"use client";

import Script from "next/script";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { createBrowserPreference } from "../lib/browser-preference";

const GOOGLE_ANALYTICS_ID = "G-CE110ZOZ4V";
const CONSENT_STORAGE_KEY = "auto9_cookie_consent";

type ConsentChoice = "accepted" | "refused" | null;

declare global {
  interface Window {
    "ga-disable-G-CE110ZOZ4V"?: boolean;
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const consentPreference = createBrowserPreference<ConsentChoice>(
  CONSENT_STORAGE_KEY,
  (stored) => stored === "accepted" || stored === "refused" ? stored : null,
  (choice) => {
    // Removing a Script element cannot unload a tracker already running.
    // Disable it synchronously, including on cross-tab withdrawal.
    window["ga-disable-G-CE110ZOZ4V"] = choice !== "accepted";
  },
);

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? "";
  const consent = useSyncExternalStore(
    consentPreference.subscribe,
    consentPreference.getSnapshot,
    consentPreference.getServerSnapshot,
  );
  const [showSettings, setShowSettings] = useState(false);
  const initialized = useRef(false);
  const lastPageView = useRef<string | null>(null);

  const sendPageView = useCallback(() => {
    if (consentPreference.getSnapshot() !== "accepted" || !initialized.current) return;
    const pagePath = `${window.location.pathname}${window.location.search}`;
    if (lastPageView.current === pagePath) return;
    lastPageView.current = pagePath;
    window.gtag?.("event", "page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, []);

  function analyticsReady() {
    // The script may finish loading after consent was withdrawn.
    if (consentPreference.getSnapshot() !== "accepted" || !window.gtag) return;
    if (!initialized.current) {
      window.gtag("js", new Date());
      window.gtag("config", GOOGLE_ANALYTICS_ID, { anonymize_ip: true, send_page_view: false });
      initialized.current = true;
    }
    sendPageView();
  }

  useEffect(() => {
    if (consent !== "accepted") lastPageView.current = null;
    else sendPageView();
  }, [pathname, query, consent, sendPageView]);

  useEffect(() => () => {
    window["ga-disable-G-CE110ZOZ4V"] = true;
  }, []);

  function acceptCookies() {
    consentPreference.set("accepted");
    setShowSettings(false);
  }

  function refuseCookies() {
    consentPreference.set("refused");
    setShowSettings(false);
  }

  function reopenSettings() {
    setShowSettings(true);
  }

  const bannerVisible =
    consent == null || showSettings;

  const cookieInterface = consent !== undefined
    ? createPortal(
        <>
          {bannerVisible && (
            <div
              className="fixed inset-x-0 bottom-0 p-3 sm:p-5"
              style={{
                zIndex: 2147483647,
                pointerEvents: "auto",
                touchAction: "manipulation",
              }}
            >
              <div
                className="mx-auto max-w-4xl rounded-3xl border border-white/15 bg-[#080a0f]/95 p-5 text-white shadow-2xl backdrop-blur-2xl sm:p-6"
                style={{
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                }}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7DB7FF]">
                      Vos préférences
                    </p>

                    <h2 className="mt-2 text-xl font-black">
                      AUTO 9 respecte votre vie privée
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-white/65">
                      Nous utilisons Google Analytics uniquement
                      avec votre accord afin de comprendre comment
                      le site est utilisé et d’améliorer nos services.
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
                      style={{
                        pointerEvents: "auto",
                        touchAction: "manipulation",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      Refuser
                    </button>

                    <button
                      type="button"
                      onClick={acceptCookies}
                      className="rounded-full bg-[#0057FF] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_30px_rgba(0,87,255,.35)] transition hover:bg-[#1767ff]"
                      style={{
                        pointerEvents: "auto",
                        touchAction: "manipulation",
                        WebkitTapHighlightColor: "transparent",
                      }}
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
              className="fixed rounded-full border border-white/10 bg-[#080a0f]/85 px-3 py-2 text-[10px] font-bold text-white/50 backdrop-blur-xl transition hover:text-white"
              style={{
                bottom: "110px",
                left: "12px",
                zIndex: 2147483647,
                pointerEvents: "auto",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Cookies
            </button>
          )}
        </>,
        document.body
      )
    : null;

  return (
    <>
      {consent === "accepted" && (
        <>
          <Script id="auto9-google-analytics-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              window.gtag = window.gtag || function () {
                window.dataLayer.push(arguments);
              };
            `}
          </Script>
          <Script
            id="auto9-google-analytics"
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
            strategy="afterInteractive"
            onReady={analyticsReady}
          />
        </>
      )}

      {cookieInterface}
    </>
  );
}
