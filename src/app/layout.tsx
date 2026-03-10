import type { Metadata, Viewport } from "next";
import { Noto_Serif_Tamil, Inter, Crimson_Text } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import BottomNav from "@/components/BottomNav";
import Providers from "@/components/Providers";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const notoSerifTamil = Noto_Serif_Tamil({
  subsets: ["tamil"],
  variable: "--font-noto-tamil",
  display: "swap",
  preload: true,
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  variable: "--font-crimson",
  display: "swap",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "OneKural",
  applicationName: "OneKural",
  description: "One kural a day. Read, reflect, and journal your thoughts on the timeless wisdom of Thiruvalluvar.",
  openGraph: {
    title: "OneKural",
    siteName: "OneKural",
    description: "One kural a day. Read, reflect, and journal your thoughts on the timeless wisdom of Thiruvalluvar.",
    type: "website",
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
        <Providers>
          {children}
          <BottomNav />
          <ServiceWorkerRegistrar />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
