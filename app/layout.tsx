import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { BottomNav } from "@/components/bottom-nav"
import { IOSInstallPrompt } from "@/components/ios-install-prompt"
import { OneSignalSessionSync } from "@/components/onesignal-session-sync"
import { NotificationPermissionPrompt } from "@/components/notification-permission-prompt"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script"
import { brand } from "@/lib/brand-config"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: `${brand.name} - ${brand.tagline} in ${brand.city}`,
    template: `%s | ${brand.name}`,
  },
  description: `Experience ${brand.tagline.toLowerCase()} with ${brand.name} in ${brand.city}. Monthly subscription plans, professional cuts, and exceptional grooming services.`,
  keywords: [
    "barbershop",
    brand.city,
    "premium cuts",
    "men's grooming",
    "subscription barbering",
    "professional barber",
  ],
  authors: [{ name: `${brand.name} Team` }],
  creator: brand.name,
  publisher: brand.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(brand.domain),
  alternates: {
    canonical: "/",
  },
  // TEMPLATE NOTE: no og:image/twitter:image set -- this template ships
  // with no client photos in it at all (see SETUP.md). Add an `images`
  // array back to both blocks below once the new shop has a real photo in
  // public/ to point at.
  openGraph: {
    title: `${brand.name} - ${brand.tagline}`,
    description: `Experience ${brand.tagline.toLowerCase()} with ${brand.name} in ${brand.city}. Monthly subscription plans and professional cuts.`,
    url: brand.domain,
    siteName: brand.name,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} - ${brand.tagline}`,
    description: `Experience ${brand.tagline.toLowerCase()} with ${brand.name} in ${brand.city}.`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // No Google Search Console verification code set up yet — a placeholder
  // string here does nothing useful and just looks unfinished if anyone
  // inspects the page source. Add a real `verification: { google: "..." }`
  // once Search Console is actually set up for this domain.
  generator: "Next.js",
  icons: [
    { rel: "icon", url: "/favicon.ico", sizes: "any" },
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
    { rel: "icon", url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png", sizes: "180x180" },
    { rel: "mask-icon", url: "/favicon.svg", color: "#1f2937" },
  ],
  manifest: "/site.webmanifest",
  // site.webmanifest already declares display: "standalone", which modern
  // iOS Safari honors on its own — but this legacy meta tag (still Apple's
  // own recommended belt-and-suspenders pairing) is the more
  // battle-tested signal for actually launching chrome-less from the Home
  // Screen icon rather than opening a normal tab. Without a standalone
  // launch, navigator.standalone stays false and IOSInstallPrompt (which
  // depends on it) would keep nudging someone who already installed the
  // app. Found via code review while QA'ing that banner — not confirmed
  // broken without it (no iOS device available to test either way), added
  // defensively since it's zero-risk and directly hardens the one thing
  // this whole feature hinges on.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: brand.name,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Favicon Links */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png?v=2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2" />
        <link rel="mask-icon" href="/favicon.svg?v=2" color="#1f2937" />
        <link rel="manifest" href="/site.webmanifest?v=2" />
        
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              // TEMPLATE PLACEHOLDER — address, geo coordinates, and
              // openingHours below are real physical business info and
              // can't be derived from brand-config.ts. Replace all three
              // (and add telephone/streetAddress) with the new shop's real
              // details before launch — get lat/long from the shop's actual
              // Google Maps listing, not guessed.
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: brand.name,
              description: `${brand.tagline} in ${brand.city}`,
              url: brand.domain,
              address: {
                "@type": "PostalAddress",
                addressLocality: brand.city,
                addressRegion: "REPLACE_WITH_STATE",
                addressCountry: "US",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: "0",
                longitude: "0",
              },
              openingHours: ["Mo-Fr 09:00-18:00"],
              priceRange: "$$",
              // TEMPLATE PLACEHOLDER -- no `image` set: add one once the
              // new shop has a real photo in public/ to point at.
              sameAs: ["https://www.instagram.com/REPLACE_ME/"],
            }),
          }}
        />

        {process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID && (
          <>
            {/* Versioned v16 CDN path + allowLocalhostAsSecureOrigin match the
                current official Web SDK setup docs exactly — the unversioned
                URL used before this was a leftover from an earlier drift, same
                class of bug as the REST API shape mismatch in lib/onesignal.ts. */}
            <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" defer />
            <Script id="onesignal-init" strategy="afterInteractive">
              {`
                window.OneSignalDeferred = window.OneSignalDeferred || [];
                OneSignalDeferred.push(async function(OneSignal) {
                  await OneSignal.init({
                    appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID}",
                    allowLocalhostAsSecureOrigin: true,
                  });
                });
              `}
            </Script>
          </>
        )}

        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script 
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`} 
              strategy="afterInteractive" 
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                  page_title: typeof document !== 'undefined' ? document.title : '',
                  page_location: typeof window !== 'undefined' ? window.location.href : '',
                });
              `}
            </Script>
          </>
        )}
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>
          {children}
          <BottomNav />
          <IOSInstallPrompt />
          <OneSignalSessionSync />
          <NotificationPermissionPrompt />
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  )
}
