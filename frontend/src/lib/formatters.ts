/**
 * Formatters centralizados - única fonte de verdade para formatação de dados.
 * Importe daqui em vez de definir localmente em cada página.
 */

// ─── Moeda ────────────────────────────────────────────────────────────────────

/** Formata número como BRL sem centavos. Retorna "-" para null/undefined. */
export const fmtCurrency = (v: number | null | undefined): string =>
  v != null
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(v)
    : "-";

/** Formata número como BRL com centavos (2 casas). Retorna "-" para null/undefined. */
export const fmtCurrencyFull = (v: number | null | undefined): string =>
  v != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
    : "-";

// ─── Data ─────────────────────────────────────────────────────────────────────

/**
 * Formata string de data (YYYY-MM-DD) para pt-BR.
 * Usa T12:00:00 para evitar que o timezone desloque o dia.
 */
export const fmtDate = (d: string): string =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

/**
 * Formata data com mês abreviado (ex: "06 ago. 2026").
 */
export const fmtDateLong = (d: string): string =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/**
 * Formata data com mês por extenso (ex: "06 de agosto de 2026").
 */
export const fmtDateFull = (d: string): string =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

// ─── Quilometragem ────────────────────────────────────────────────────────────

/** Formata número como quilometragem (ex: "45.000 km"). */
export const fmtKm = (v: number): string =>
  new Intl.NumberFormat("pt-BR").format(v) + " km";

// ─── Texto ────────────────────────────────────────────────────────────────────

/** Converte string para Title Case (ex: "FULANO DA SILVA" → "Fulano Da Silva"). */
export const toTitleCase = (s: string): string =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Data LOCAL no formato YYYY-MM-DD. Não use toISOString() para isso: ele converte para
 * UTC e, depois das 21h em São Paulo, a venda/compra/despesa sai com a data de amanhã.
 */
export function dataISO(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
