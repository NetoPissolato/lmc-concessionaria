import { NextResponse, type NextRequest } from "next/server";

/**
 * O mesmo Next atende o site e o painel. No domínio do painel nada deve ser indexado
 * (as páginas do site também respondem lá e virariam conteúdo duplicado no Google).
 */
export function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://site.spacerstorepaineladmin.com";
  const host = (request.headers.get("host") || "").toLowerCase();
  const siteHost = new URL(base).host.toLowerCase();
  const ehSite = host === siteHost || host.startsWith("site.") || host.startsWith("localhost");

  const conteudo = ehSite
    ? `User-agent: *\nAllow: /\nDisallow: /login\nDisallow: /dashboard\n\nSitemap: ${base}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";

  return new NextResponse(conteudo, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
