import { vehicleSlug } from "@/lib/vehicleSlug";

/**
 * Endereço do site público visto de dentro do painel (atalhos "Ver site" / "Ver no site").
 *
 * 1. NEXT_PUBLIC_SITE_URL, se o build definir (domínio próprio da loja);
 * 2. senão deduz do endereço do painel: lcm.<domínio> → site.<domínio>,
 *    localhost:3000 → site.localhost:3000 (mesmo app, o proxy.ts troca pelo host);
 * 3. senão o domínio de produção atual.
 */
const PADRAO = "https://site.spacerstorepaineladmin.com";

export function urlDoSite(caminho = "/"): string {
  const base = (() => {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (typeof window === "undefined") return PADRAO;
    const { protocol, hostname, port } = window.location;
    const porta = port ? `:${port}` : "";
    if (hostname === "localhost" || hostname === "127.0.0.1") return `${protocol}//site.localhost${porta}`;
    if (hostname.startsWith("lcm.")) return `${protocol}//site.${hostname.slice(4)}${porta}`;
    return PADRAO;
  })();
  return base.replace(/\/$/, "") + (caminho.startsWith("/") ? caminho : `/${caminho}`);
}

/** Página do veículo no site (o mesmo endereço que o cliente recebe no WhatsApp). */
export function urlDoVeiculoNoSite(v: { id: string; marca: string; modelo: string; ano?: number | string }): string {
  return urlDoSite(`/veiculo/${vehicleSlug(v)}`);
}
