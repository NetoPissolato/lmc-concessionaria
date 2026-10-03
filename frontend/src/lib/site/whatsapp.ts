/**
 * Links de contato. Regra do site: sem número configurado no painel, o botão NÃO
 * aparece. Nunca usar número de exemplo (o site chegou a mandar clientes para um
 * 5511999999999 que não é da loja).
 */

export function soDigitos(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

/** wa.me exige DDI. Número com 10-11 dígitos (DDD + número) ganha o 55 do Brasil. */
export function numeroWhatsApp(v: string | null | undefined): string | null {
  const d = soDigitos(v);
  if (d.length < 10) return null;
  return d.length <= 11 ? `55${d}` : d;
}

export function waLink(numero: string | null | undefined, mensagem?: string): string | null {
  const n = numeroWhatsApp(numero);
  if (!n) return null;
  return mensagem ? `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}` : `https://wa.me/${n}`;
}

export function telLink(telefone: string | null | undefined): string | null {
  const d = soDigitos(telefone);
  return d.length >= 8 ? `tel:+${d.length <= 11 ? "55" + d : d}` : null;
}

export function mensagemVeiculo(v: { marca: string; modelo: string; versao?: string | null; ano: number }, url?: string): string {
  const nome = [v.marca, v.modelo, v.versao, v.ano].filter(Boolean).join(" ");
  return `Olá! Tenho interesse no ${nome}.${url ? ` ${url}` : ""}`;
}
