import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import VeiculoDetail from "./_VeiculoDetail";
import { getPublicVehicle, getPublicVehicles } from "@/lib/publicApi";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const v = await getPublicVehicle(id);
  if (!v) {
    return {
      title: "Veículo não encontrado | LMC Veículos",
      robots: "noindex",
    };
  }
  const title = `${v.marca} ${v.modelo}${v.versao ? " " + v.versao : ""} ${v.ano} | LMC Veículos`;
  const preco = v.valor_anunciado
    ? `R$ ${new Intl.NumberFormat("pt-BR").format(v.valor_anunciado)}`
    : "";
  return {
    title,
    description: `${title}${preco ? " por " + preco : ""}. ${(v.quilometragem ?? 0).toLocaleString("pt-BR")} km, ${v.cambio}, ${v.combustivel}. Confira fotos e condições na LMC Veículos.`,
    robots: "index, follow",
    openGraph: {
      title,
      images: v.photos?.[0]?.url ? [v.photos[0].url] : [],
    },
  };
}

export default async function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Busca veículo e similares em paralelo
  const [vehicle, allVehicles] = await Promise.all([
    getPublicVehicle(id),
    getPublicVehicles({ limit: 50 }),
  ]);

  if (!vehicle) notFound();

  // Pega até 3 veículos do mesmo tipo, excluindo o atual
  const related = allVehicles
    .filter(v => v.id !== id && v.tipo === vehicle.tipo)
    .slice(0, 3);

  return (
    <Suspense>
      <VeiculoDetail vehicle={vehicle} related={related} />
    </Suspense>
  );
}
