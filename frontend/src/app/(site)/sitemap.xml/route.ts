import { NextResponse } from "next/server";
import { getAllPublicVehicles } from "@/lib/publicApi";
import { vehicleSlug } from "@/lib/vehicleSlug";

export const dynamic = "force-dynamic";

const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://site.spacerstorepaineladmin.com";
  const hoje = new Date().toISOString().slice(0, 10);

  const fixas = [
    { loc: `${base}/`, prioridade: "1.0", freq: "daily" },
    { loc: `${base}/estoque`, prioridade: "0.9", freq: "hourly" },
    { loc: `${base}/sobre`, prioridade: "0.6", freq: "monthly" },
    { loc: `${base}/contato`, prioridade: "0.6", freq: "monthly" },
    { loc: `${base}/comparador`, prioridade: "0.4", freq: "weekly" },
    { loc: `${base}/politica-de-privacidade`, prioridade: "0.2", freq: "yearly" },
  ];

  // Todo o estoque (antes pedia 200 e o backend aceitava no máximo 100: a resposta era
  // erro 422 e o sitemap saía SEM nenhum veículo)
  const { veiculos } = await getAllPublicVehicles();
  const urls = [
    ...fixas.map((p) => ({ ...p, lastmod: hoje })),
    ...veiculos.map((v) => ({
      loc: `${base}/veiculo/${vehicleSlug(v)}`,
      prioridade: "0.8",
      freq: "weekly",
      lastmod: (v.created_at ?? hoje).slice(0, 10),
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapar(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.prioridade}</priority></url>`).join("\n")}
</urlset>`;

  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
}
