import type { Metadata } from "next";
import { Suspense } from "react";
import HomeSections from "../_home/HomeSections";
import { getPublicVehicles, getPublicStats, getPublicSettings } from "@/lib/publicApi";

export const metadata: Metadata = {
  title: "LMC Veículos — Concessionária com os melhores veículos",
  description:
    "Encontre o veículo ideal na LMC Veículos. Estoque completo de carros e motos com procedência garantida, documentação em dia e facilidade de financiamento.",
  keywords: ["concessionária", "veículos usados", "carros", "motos", "LMC", "comprar carro"],
  robots: "index, follow",
};

// Revalida a cada 30s (ISR) — settings e veículos sempre atualizados sem rebuild
export const revalidate = 30;

export default async function HomePage() {
  // Busca dados reais em paralelo — se o backend cair, retorna fallback vazio
  const [featuredVehicles, recentVehicles, stats, settings] = await Promise.all([
    getPublicVehicles({ destaque: true, limit: 6 }),
    getPublicVehicles({ limit: 8 }),
    getPublicStats(),
    getPublicSettings(),
  ]);

  return (
    <Suspense>
      <HomeSections
        featuredVehicles={featuredVehicles}
        recentVehicles={recentVehicles}
        stats={stats}
        settings={settings}
      />
    </Suspense>
  );
}
