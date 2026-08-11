/**
 * Gera URL amigável para veículo: /veiculo/honda-civic-2022-[uuid]
 * UUID tem exatamente 36 chars, então podemos extraí-lo do final do slug.
 */
export function vehicleSlug(v: { marca: string; modelo: string; ano?: number | string; id: string }): string {
  const text = `${v.marca} ${v.modelo}${v.ano ? " " + v.ano : ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${text}-${v.id}`;
}

/** Extrai o UUID (36 chars) do final do slug */
export function vehicleIdFromSlug(slug: string): string {
  return slug.length >= 36 ? slug.slice(-36) : slug;
}
