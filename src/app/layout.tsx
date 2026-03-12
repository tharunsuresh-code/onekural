import type { Metadata, Viewport } from "next";
import { Noto_Serif_Tamil, Inter, Crimson_Text } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import BottomNav from "@/components/BottomNav";
import Providers from "@/components/Providers";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import NavigationProgress from "@/components/NavigationProgress";
import "./globals.css";

const notoSerifTamil = Noto_Serif_Tamil({
  subsets: ["tamil"],
  weight: ["400", "700"],
  variable: "--font-noto-tamil",
  display: "swap",
  preload: true,
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: true,
});

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  variable: "--font-crimson",
  display: "swap",
  weight: ["400", "600"],
  adjustFontFallback: true,
});

const siteDescription = "One kural a day. Read, reflect, and journal your thoughts on the timeless wisdom of Thiruvalluvar.";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "OneKural",
  url: "https://onekural.com",
  description: siteDescription,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: "https://onekural.com/explore?q={search_term_string}" },
    "query-input": "required name=search_term_string",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL("https://onekural.com"),
  title: "OneKural",
  applicationName: "OneKural",
  description: siteDescription,
  alternates: { canonical: "https://onekural.com" },
  openGraph: {
    title: "OneKural",
    siteName: "OneKural",
    description: siteDescription,
    type: "website",
    url: "https://onekural.com",
    locale: "en_US",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "OneKural" }],
  },
  twitter: {
    card: "summary",
    title: "OneKural",
    description: siteDescription,
    images: ["/icons/icon-512.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OneKural",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0E0C" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ta" className={`${notoSerifTamil.variable} ${inter.variable} ${crimsonText.variable} light`}>
      <body className="font-sans antialiased bg-cream dark:bg-dark-bg text-dark dark:text-dark-fg">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Providers>
          <NavigationProgress />
          {children}
          <BottomNav />
          <ServiceWorkerRegistrar />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
