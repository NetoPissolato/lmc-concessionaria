import type { Metadata } from "next";
import { Suspense } from "react";
import EstoquePage from "./_EstoquePage";
import { getPublicVehicles } from "@/lib/publicApi";

export const metadata: Metadata = {
  title: "Estoque de Veículos | LMC Veículos",
  description:
    "Confira nosso estoque completo de carros e motos. Filtre por marca, modelo, preço, câmbio, combustível e muito mais.",
  robots: "index, follow",
};

export const revalidate = 60;

export default async function Estoque() {
  // Busca TODOS os disponíveis no servidor (ISR 60s)
  const vehicles = await getPublicVehicles({ limit: 100 });

  return (
    <Suspense>
      <EstoquePage initialVehicles={vehicles} />
    </Suspense>
  );
}
