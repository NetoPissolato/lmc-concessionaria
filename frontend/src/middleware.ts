import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware de roteamento por domínio
 *
 * site.spacerstorepaineladmin.com/  → /home  (site público)
 * lcm.spacerstorepaineladmin.com/   → /login (painel de gestão)
 *
 * Usa rewrite (não redirect) → URL permanece limpa sem /home ou /login
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Só age na raiz "/"
  if (pathname !== "/") return NextResponse.next();

  if (host.includes("site.")) {
    // Domínio público → serve a home sem mudar a URL
    return NextResponse.rewrite(new URL("/home", request.url));
  }

  // Domínio do painel (lcm.) ou localhost → login
  return NextResponse.rewrite(new URL("/login", request.url));
}

export const config = {
  // Aplica o middleware em todas as rotas exceto arquivos estáticos e API interna
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
