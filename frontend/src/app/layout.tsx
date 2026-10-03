import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Zoom com dois dedos liberado: travar o zoom tira a leitura de quem enxerga menos.
// (O "zoom ao focar campo" do iPhone é evitado com fonte de 16px nos campos.)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0c",
};

export const metadata: Metadata = {
  // As páginas passam só o próprio nome; o " | LMC Veículos" vem daqui (antes saía duplicado)
  title: {
    default: "LMC Veículos",
    template: "%s | LMC Veículos",
  },
  description: "Carros e motos seminovos com procedência na LMC Veículos.",
  robots: "noindex, nofollow", // o site público libera a indexação no próprio layout
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
