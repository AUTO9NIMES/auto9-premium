import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import GoogleAnalytics from "./components/GoogleAnalytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.auto9nimes.com"),

  title: "AUTO 9 | Nettoyage automobile premium à Nîmes",

  description:
    "AUTO 9 réalise le nettoyage intérieur, extérieur et complet de votre véhicule à Nîmes et aux alentours. Configurez votre prestation et obtenez votre estimation en ligne.",

  applicationName: "AUTO 9",

  authors: [
    {
      name: "AUTO 9",
      url: "https://www.auto9nimes.com",
    },
  ],

  creator: "AUTO 9",
  publisher: "AUTO 9",

  keywords: [
    "nettoyage voiture Nîmes",
    "nettoyage automobile Nîmes",
    "nettoyage intérieur voiture Nîmes",
    "nettoyage extérieur voiture Nîmes",
    "nettoyage voiture à domicile Nîmes",
    "detailing automobile Nîmes",
    "lavage auto Nîmes",
    "polissage voiture Nîmes",
    "rénovation phares Nîmes",
    "AUTO 9",
  ],

  category: "Automobile",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    siteName: "AUTO 9",
    title: "AUTO 9 | Nettoyage automobile premium à Nîmes",
    description:
      "Nettoyage automobile intérieur, extérieur et complet à Nîmes. Configurez votre prestation et obtenez votre estimation en ligne.",
    images: [
      {
        url: "/hero-audi.jpg",
        width: 1200,
        height: 630,
        alt: "Nettoyage automobile premium AUTO 9 à Nîmes",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "AUTO 9 | Nettoyage automobile premium à Nîmes",
    description:
      "Nettoyage automobile intérieur, extérieur et complet à Nîmes et aux alentours.",
    images: ["/hero-audi.jpg"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050608",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-[#050608] antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#050608] text-white">
        {children}

        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
      </body>
    </html>
  );
}
