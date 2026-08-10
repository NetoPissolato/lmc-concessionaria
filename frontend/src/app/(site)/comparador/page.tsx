import type { Metadata } from "next";
import { Suspense } from "react";
import ComparadorClient from "./_ComparadorClient";

export const metadata: Metadata = {
  title: "Comparador de Veículos | LMC Veículos",
  description: "Compare até 3 veículos do nosso estoque lado a lado e tome a melhor decisão de compra.",
  robots: "index, follow",
};

export default function ComparadorPage() {
  return (
    <Suspense>
      <ComparadorClient />
    </Suspense>
  );
}
