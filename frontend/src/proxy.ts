import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Roteamento por domínio (no Next 16 o antigo "middleware" se chama "proxy").
 *
 *   site.<domínio>/  → /home   (site público)
 *   lcm.<domínio>/   → /login  (painel)
 *
 * Rewrite e não redirect: a URL continua limpa. O domínio do site é reconhecido pelo
 * prefixo "site." ou pela variável SITE_HOST (para quando a loja tiver domínio próprio,
 * ex.: SITE_HOST=lmcveiculos.com.br).
 */
const SITE_HOST = process.env.SITE_HOST?.toLowerCase();

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/") return NextResponse.next();

  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];
  const ehSite = host.startsWith("site.") || (SITE_HOST && (host === SITE_HOST || host === `www.${SITE_HOST}`));

  return NextResponse.rewrite(new URL(ehSite ? "/home" : "/login", request.url));
}

export const config = {
  matcher: ["/"],
};
