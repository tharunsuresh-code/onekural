import type { Metadata, Viewport } from "next";
import { Noto_Serif_Tamil, Inter } from "next/font/google";
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

export const metadata: Metadata = {
  title: "OneKural — Daily Thirukkural",
  description: "One kural a day. Read, reflect, and journal your thoughts on the timeless wisdom of Thiruvalluvar.",
  manifest: "/manifest.json",
  icons: {
    icon: [
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
  themeColor: "#F4A528",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ta" className={`${notoSerifTamil.variable} ${inter.variable}`}>
      <body className="font-sans antialiased bg-cream text-dark">
        <Providers>
          {children}
          <BottomNav />
          <ServiceWorkerRegistrar />
        </Providers>
      </body>
    </html>
  );
}
