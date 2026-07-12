import type { Metadata } from "next";
import { Inter, Cormorant_Garamond, Great_Vibes } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// URL publique du site (pour des aperçus de lien avec image absolue).
// Sur Vercel, VERCEL_PROJECT_PRODUCTION_URL est fourni automatiquement.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Justin & Nahomie — 22 août 2026",
  description:
    "Mariage de Justin & Nahomie — Grace and Love for a Fresh Start. Confirmez votre présence.",
  // L'invitation reste privée (non indexée), mais les aperçus de lien
  // (WhatsApp, SMS, réseaux sociaux) fonctionnent grâce aux balises Open Graph.
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Mariage de Justin & Nahomie",
    title: "Justin & Nahomie vous invitent — 22 août 2026",
    description:
      "Nous avons la joie de vous convier à notre mariage à Yamoussoukro. Découvrez le programme et confirmez votre présence.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Justin & Nahomie — 22 août 2026",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Justin & Nahomie vous invitent — 22 août 2026",
    description:
      "Nous avons la joie de vous convier à notre mariage à Yamoussoukro. Découvrez le programme et confirmez votre présence.",
    images: ["/og.jpg"],
  },
};

export const viewport = {
  themeColor: "#0e6b54",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${cormorant.variable} ${greatVibes.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
