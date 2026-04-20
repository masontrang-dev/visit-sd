import type { Metadata, Viewport } from "next";
import { Playfair_Display, Syne, DM_Mono } from "next/font/google";
import { ViewTransition } from "react";
// Canary channel types for <ViewTransition>
import type {} from "react/canary";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import ToastProvider from "@/components/Toast";
import PageViewTracker from "@/components/PageViewTracker";

const playfairDisplay = Playfair_Display({
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const syne = Syne({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VISIT SD — Our San Diego Picks",
  description: "Our favourite San Diego restaurants for visitors & friends",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://visitsd.vercel.app"),
  openGraph: {
    title: "VISIT SD — Our San Diego Picks",
    description: "Our favourite San Diego restaurants for visitors & friends",
    siteName: "VISIT SD",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VISIT SD — Our San Diego Picks",
    description: "Our favourite San Diego restaurants for visitors & friends",
  },
  appleWebApp: {
    capable: true,
    title: "VISIT SD",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#141512" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${syne.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){d.classList.add("dark")}else{d.classList.remove("dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            <PageViewTracker />
            <ViewTransition>{children}</ViewTransition>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
