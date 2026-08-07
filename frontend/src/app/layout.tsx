import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "LMC Veículos - ERP",
    template: "%s | LMC Veículos",
  },
  description:
    "Sistema ERP completo para gestão da concessionária LMC Veículos. Controle de estoque, vendas, clientes e financeiro.",
  keywords: ["concessionária", "ERP", "veículos", "gestão", "LMC"],
  robots: "noindex, nofollow", // Internal system - no SEO indexing
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
