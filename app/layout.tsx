import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import AdminButton from "@/components/AdminButton";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "VISIT SD — Our San Diego Picks",
  description: "Our favourite San Diego restaurants for visitors & friends",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){d.classList.add("dark")}else{d.classList.remove("dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <ThemeToggle />
          <AdminButton />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
