import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
