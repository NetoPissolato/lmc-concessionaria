import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllPublicVehicles } from "@/lib/publicApi";
import ComparadorCliente from "./ComparadorCliente";
import "../institucional.css";

export const metadata: Metadata = {
  title: "Comparar veículos",
  description: "Compare até 3 veículos do estoque da LMC Veículos lado a lado: preço, ano, quilometragem, câmbio e mais.",
  alternates: { canonical: "/comparador" },
};

export const dynamic = "force-dynamic";

export default async function ComparadorPage() {
  const { veiculos } = await getAllPublicVehicles();
  return (
    <>
      <section className="i-topo" data-theme="dark">
        <div className="s-container">
          <h1 className="s-h1">Comparar veículos</h1>
          <p className="s-lead">Coloque até 3 lado a lado. O melhor de cada linha fica marcado.</p>
        </div>
      </section>
      <section className="s-section s-section--tight" data-theme="light">
        <div className="s-container">
          <Suspense>
            <ComparadorCliente veiculos={veiculos} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
