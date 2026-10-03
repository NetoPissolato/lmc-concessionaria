import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
// CSS do painel só no painel: o site público não baixa nem herda estas regras globais
import "../globals.css";

export const metadata: Metadata = { title: "Entrar", robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
