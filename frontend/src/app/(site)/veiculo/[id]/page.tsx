import type { Metadata } from "next";
import { Suspense } from "react";
import VeiculoDetail from "./_VeiculoDetail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Veículo ${id} | LMC Veículos`,
    description: "Confira os detalhes, fotos e condições de financiamento deste veículo na LMC Veículos.",
    robots: "index, follow",
  };
}

export default async function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <VeiculoDetail id={id} />
    </Suspense>
  );
}
