import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { MobileGate } from "@/components/MobileGate";
import favicon from "../../public/16X16_icon.png";
import icon from "../../public/512×512_icon.png";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://watchstash.site";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("defaultTitle"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    applicationName: "WatchStash",
    keywords: [
      "media tracker",
      "watchlist",
      "movies",
      "tv shows",
      "anime",
      "rating",
      "reviews",
    ],
    authors: [{ name: "WatchStash" }],
    category: "entertainment",
    icons: {
      icon: favicon.src,
      apple: icon.src,
    },
    alternates: {
      canonical: "/",
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
    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName: "WatchStash",
      title: t("defaultTitle"),
      description: t("description"),
      images: [
        {
          url: icon.src,
          width: 512,
          height: 512,
          alt: t("ogImageAlt"),
        },
      ],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("defaultTitle"),
      description: t("description"),
      images: [icon.src],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enables static rendering for this locale segment.
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "metadata" });

  return (
    <html lang={locale} className="dark">
      <body
        className={`${inter.variable} ${bebasNeue.variable} min-h-screen bg-canvas font-sans text-primary antialiased`}
      >
        <NextIntlClientProvider locale={locale}>
          <MobileGate />
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "WatchStash",
              description: t("description"),
              applicationCategory: "EntertainmentApplication",
              operatingSystem: "Web",
              url: SITE_URL,
              image: `${SITE_URL}${icon.src}`,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}