import type { Metadata } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import ToastProvider from "@/components/Toast";
import PageViewTracker from "@/components/PageViewTracker";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ["400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-body",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${dmSans.variable}`} suppressHydrationWarning>
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
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
