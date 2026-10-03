import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
// CSS do painel só no painel: o site público não baixa nem herda estas regras globais
import "../globals.css";
import PainelShell from "./_PainelShell";

// Painel interno: fora do Google
export const metadata: Metadata = { title: "Painel", robots: { index: false, follow: false } };

// react-query e toasts só no painel: o site público não baixa essas bibliotecas
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <PainelShell>{children}</PainelShell>
    </Providers>
  );
}
