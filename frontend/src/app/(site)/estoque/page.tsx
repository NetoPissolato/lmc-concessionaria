import type { Metadata } from "next";
import { Suspense } from "react";
import EstoquePage from "./_EstoquePage";

export const metadata: Metadata = {
  title: "Estoque de Veículos | LMC Veículos",
  description:
    "Confira nosso estoque completo de carros e motos. Filtre por marca, modelo, preço, câmbio, combustível e muito mais.",
  robots: "index, follow",
};

export default function Estoque() {
  return (
    <Suspense>
      <EstoquePage />
    </Suspense>
  );
}
