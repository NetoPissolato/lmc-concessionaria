import type { Metadata } from "next";
import { Suspense } from "react";
import ComparadorClient from "./_ComparadorClient";
import { getPublicVehicles } from "@/lib/publicApi";

export const metadata: Metadata = {
  title: "Comparar Veículos | LMC Veículos",
  description: "Compare até 3 veículos do nosso estoque lado a lado. Analise preço, quilometragem, câmbio, combustível e mais.",
  robots: "index, follow",
};

export const revalidate = 60;

export default async function ComparadorPage() {
  const vehicles = await getPublicVehicles({ limit: 100 });

  return (
    <Suspense>
      <ComparadorClient initialVehicles={vehicles} />
    </Suspense>
  );
}
