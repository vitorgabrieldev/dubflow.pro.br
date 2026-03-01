import type { Metadata } from "next";
import { headers } from "next/headers";
import { JetBrains_Mono, Sora } from "next/font/google";

import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { SEO_APP_NAME, SEO_DEFAULT_DESCRIPTION, getSiteUrl } from "@/lib/seo";

import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: SEO_APP_NAME,
  description: SEO_DEFAULT_DESCRIPTION,
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicons/16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicons/512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicons/32x32.png",
    apple: [
      { url: "/favicons/120x120.png", sizes: "120x120", type: "image/png" },
      { url: "/favicons/152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/favicons/180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: SEO_APP_NAME,
    description: SEO_DEFAULT_DESCRIPTION,
    type: "website",
    images: [
      {
        url: "/Opengraph.png",
        width: 1600,
        height: 600,
        alt: "DubFlow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_APP_NAME,
    description: SEO_DEFAULT_DESCRIPTION,
    images: ["/Opengraph.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const requestLocale = headerStore.get("x-dubflow-locale");
  const htmlLang: Locale = requestLocale && isLocale(requestLocale) ? requestLocale : DEFAULT_LOCALE;

  return (
    <html lang={htmlLang}>
      <body className={`${sora.variable} ${jetBrainsMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
