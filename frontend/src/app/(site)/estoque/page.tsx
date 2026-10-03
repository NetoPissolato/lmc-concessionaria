import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllPublicVehicles, getPublicSettings } from "@/lib/publicApi";
import EstoqueCliente from "./EstoqueCliente";
import "./estoque.css";

export const metadata: Metadata = {
  title: "Estoque de carros e motos",
  description: "Veja todo o estoque da LMC Veículos: carros e motos seminovos com fotos reais, preço, quilometragem e financiamento.",
  alternates: { canonical: "/estoque" },
};

export const dynamic = "force-dynamic";

export default async function EstoquePage() {
  // Todo o estoque de uma vez: a filtragem é instantânea no navegador (sem esqueleto falso)
  const [{ veiculos, erro }, s] = await Promise.all([getAllPublicVehicles(), getPublicSettings()]);
  return (
    <Suspense>
      <EstoqueCliente veiculos={veiculos} whatsapp={s.whatsapp} agora={Date.now()} erro={erro} />
    </Suspense>
  );
}
