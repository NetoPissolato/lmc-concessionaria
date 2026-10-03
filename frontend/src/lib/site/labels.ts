/**
 * Rótulos de exibição do site. O banco guarda códigos sem acento ("automatico",
 * "sedan"); o cliente sempre vê o português correto ("Automático", "Sedã").
 */

export const CAMBIO: Record<string, string> = {
  manual: "Manual",
  automatico: "Automático",
  automatizado: "Automatizado",
  cvt: "CVT",
};

export const COMBUSTIVEL: Record<string, string> = {
  flex: "Flex",
  gasolina: "Gasolina",
  etanol: "Etanol",
  diesel: "Diesel",
  eletrico: "Elétrico",
  hibrido: "Híbrido",
  gnv: "GNV",
};

export const CARROCERIA: Record<string, string> = {
  suv: "SUV",
  hatch: "Hatch",
  sedan: "Sedã",
  picape: "Picape",
  coupe: "Cupê",
  minivan: "Minivan",
  conversivel: "Conversível",
  perua: "Perua",
  van: "Van",
};

export const CATEGORIA_MOTO: Record<string, string> = {
  naked: "Naked",
  sport: "Esportiva",
  trail: "Trail",
  scooter: "Scooter",
  touring: "Touring",
  custom: "Custom",
  bigtrail: "Big Trail",
  enduro: "Enduro",
  motocross: "Motocross",
  chopper: "Chopper",
  street: "Street",
};

export const CONDICAO: Record<string, string> = {
  novo: "0 km",
  seminovo: "Seminovo",
  usado: "Usado",
};

/** Rótulo com fallback: código desconhecido vira "Primeira maiúscula", nunca some. */
export function rotulo(mapa: Record<string, string>, codigo?: string | null): string {
  if (!codigo) return "";
  const c = codigo.toLowerCase();
  return mapa[c] ?? c.charAt(0).toUpperCase() + c.slice(1);
}

export function categoriaDoVeiculo(v: { tipo: string; carroceria?: string | null; tipo_moto?: string | null }): string {
  if (v.tipo === "moto") return v.tipo_moto ? rotulo(CATEGORIA_MOTO, v.tipo_moto) : "Moto";
  return v.carroceria ? rotulo(CARROCERIA, v.carroceria) : "";
}
