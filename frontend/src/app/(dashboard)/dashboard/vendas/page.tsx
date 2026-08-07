// Vendas now has dedicated separate pages:
// - /dashboard/vendas/carros  →  Vendas de Carros (blue theme)
// - /dashboard/vendas/motos   →  Vendas de Motos  (orange theme)
// This route redirects to the carros page by default.
import { redirect } from "next/navigation";

export default function VendasPage() {
  redirect("/dashboard/vendas/carros");
}
