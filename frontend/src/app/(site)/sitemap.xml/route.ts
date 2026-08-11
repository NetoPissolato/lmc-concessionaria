import { NextResponse } from "next/server";
import { getPublicVehicles } from "@/lib/publicApi";
import { vehicleSlug } from "@/lib/vehicleSlug";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://site.spacerstorepaineladmin.com";

  const staticPages = [
    { url: `${baseUrl}/home`, priority: "1.0", changefreq: "daily" },
    { url: `${baseUrl}/estoque`, priority: "0.9", changefreq: "hourly" },
    { url: `${baseUrl}/sobre`, priority: "0.6", changefreq: "monthly" },
    { url: `${baseUrl}/contato`, priority: "0.7", changefreq: "monthly" },
    { url: `${baseUrl}/comparador`, priority: "0.5", changefreq: "weekly" },
  ];

  // Fetch all vehicles for individual pages
  let vehicleUrls: string[] = [];
  try {
    const vehicles = await getPublicVehicles({ limit: 200 });
    vehicleUrls = vehicles.map((v) => `${baseUrl}/veiculo/${vehicleSlug(v)}`);
  } catch {
    // silently fail — sitemap still works without vehicle pages
  }

  const now = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (p) => `  <url>
    <loc>${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join("\n")}
${vehicleUrls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
