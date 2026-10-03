/**
 * Serializa dados estruturados (schema.org) para <script type="application/ld+json">.
 * Escapa "<", ">", "&" e os separadores de linha U+2028/U+2029: sem isso, um texto
 * vindo do painel com "</script>" fecharia a tag e permitiria injetar HTML no site.
 */
const SEPARADOR_LINHA = new RegExp(String.fromCharCode(0x2028), "g");
const SEPARADOR_PARAGRAFO = new RegExp(String.fromCharCode(0x2029), "g");

export function jsonLd(dados: unknown): string {
  return JSON.stringify(dados)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(SEPARADOR_LINHA, "\\u2028")
    .replace(SEPARADOR_PARAGRAFO, "\\u2029");
}
