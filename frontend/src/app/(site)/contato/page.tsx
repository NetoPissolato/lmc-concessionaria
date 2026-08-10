import type { Metadata } from "next";
import ContatoClient from "./_ContatoClient";

export const metadata: Metadata = {
  title: "Contato | LMC Veículos",
  description: "Entre em contato com a LMC Veículos. WhatsApp, telefone, e-mail ou formulário — estamos prontos para te atender.",
  robots: "index, follow",
};

export default function ContatoPage() {
  return <ContatoClient />;
}
