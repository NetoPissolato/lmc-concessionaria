import type { Metadata } from "next";
import { Suspense } from "react";
import HomeSections from "../_home/HomeSections";
import { getPublicVehicles, getPublicStats } from "@/lib/publicApi";

export const metadata: Metadata = {
  title: "LMC Veículos — Concessionária com os melhores veículos",
  description:
    "Encontre o veículo ideal na LMC Veículos. Estoque completo de carros e motos com procedência garantida, documentação em dia e facilidade de financiamento.",
  keywords: ["concessionária", "veículos usados", "carros", "motos", "LMC", "comprar carro"],
  robots: "index, follow",
};

// Revalida a cada 60s (ISR) — sem rebuild manual quando novo veículo for cadastrado
export const revalidate = 60;

export default async function HomePage() {
  // Busca dados reais em paralelo — se o backend cair, retorna fallback vazio
  const [featuredVehicles, recentVehicles, stats] = await Promise.all([
    getPublicVehicles({ destaque: true, limit: 6 }),
    getPublicVehicles({ limit: 8 }),   // recém adicionados (sem filtro de destaque)
    getPublicStats(),
  ]);

  return (
    <Suspense>
      <HomeSections
        featuredVehicles={featuredVehicles}
        recentVehicles={recentVehicles}
        stats={stats}
      />
    </Suspense>
  );
}
