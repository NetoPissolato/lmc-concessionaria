import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import VeiculoDetail from "./_VeiculoDetail";
import { getPublicVehicle, getPublicVehicles } from "@/lib/publicApi";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://site.spacerstorepaineladmin.com";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const v = await getPublicVehicle(id);
  if (!v) {
    return {
      title: "Veiculo nao encontrado | LMC Veiculos",
      robots: "noindex",
    };
  }

  const titulo = `${v.marca} ${v.modelo}${v.versao ? " " + v.versao : ""} ${v.ano}`;
  const preco = v.valor_anunciado
    ? `R$ ${new Intl.NumberFormat("pt-BR").format(v.valor_anunciado)}`
    : "";
  const descricao = `${titulo}${preco ? " por " + preco : ""}. ${(v.quilometragem ?? 0).toLocaleString("pt-BR")} km, ${v.cambio}, ${v.combustivel}. Confira fotos e condicoes na LMC Veiculos.`;

  // Resolve photo URL for Open Graph (must be absolute)
  const mainPhoto = v.photos?.find((p) => p.is_main) ?? v.photos?.[0];
  const imageUrl = mainPhoto?.url
    ? mainPhoto.url.startsWith("http")
      ? mainPhoto.url
      : `${SITE_URL}${mainPhoto.url}`
    : `${SITE_URL}/LogoLMC.png`;

  return {
    title: `${titulo} | LMC Veiculos`,
    description: descricao,
    robots: "index, follow",
    openGraph: {
      title: `${titulo} - LMC Veiculos`,
      description: descricao,
      url: `${SITE_URL}/veiculo/${v.id}`,
      siteName: "LMC Veiculos",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: titulo,
        },
      ],
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${titulo} | LMC Veiculos`,
      description: descricao,
      images: [imageUrl],
    },
  };
}

export default async function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [vehicle, allVehicles] = await Promise.all([
    getPublicVehicle(id),
    getPublicVehicles({ limit: 50 }),
  ]);

  if (!vehicle) notFound();

  const related = allVehicles
    .filter(v => v.id !== id && v.tipo === vehicle.tipo)
    .slice(0, 3);

  return (
    <Suspense>
      <VeiculoDetail vehicle={vehicle} related={related} />
    </Suspense>
  );
}
