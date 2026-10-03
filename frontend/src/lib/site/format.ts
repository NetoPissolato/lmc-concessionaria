/** Formatação de valores do site (pt-BR). */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("pt-BR");

/** Preço exato, sem arredondar para "mil": R$ 124.900. Null/0 = sem preço. */
export function preco(valor: number | null | undefined): string | null {
  if (!valor || valor <= 0) return null;
  return BRL.format(valor);
}

export function km(valor: number | null | undefined): string {
  if (valor == null) return "";
  if (valor === 0) return "0 km";
  return `${NUM.format(valor)} km`;
}

export function numero(valor: number): string {
  return NUM.format(valor);
}

/** Parcela de financiamento pela tabela Price (juros compostos). */
export function parcelaPrice(valorFinanciado: number, taxaMensalPct: number, meses: number): number {
  if (valorFinanciado <= 0 || meses <= 0) return 0;
  const i = taxaMensalPct / 100;
  if (i === 0) return valorFinanciado / meses;
  return (valorFinanciado * i) / (1 - Math.pow(1 + i, -meses));
}
