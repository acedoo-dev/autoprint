import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoPrint — Dashboard",
  description: "Générateur automatique de planificateurs numériques",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
