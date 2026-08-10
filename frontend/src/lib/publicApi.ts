/**
 * publicApi.ts — Funções de acesso à API pública do backend.
 *
 * ✅ Sem autenticação — usadas pelo site público (não pelo dashboard).
 * ✅ Dados sensíveis NUNCA chegam aqui (filtrados no backend).
 * ✅ Fallback seguro: retorna array/null em caso de erro para o site não quebrar.
 */

// NEXT_PUBLIC_API_URL já termina em /api/v1 — apenas adicionamos /public
const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1") + "/public";

// Base do backend para resolver URLs relativas de fotos (ex: /uploads/...)
const BACKEND_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/api\/v1\/?$/, "");

/** Converte URL relativa de foto em URL absoluta. */
export function resolvePhotoUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return BACKEND_BASE + url;
}


// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface PublicPhoto {
  id: string;
  url: string;
  is_main: boolean;
  ordem: number;
}

export interface PublicVehicle {
  id: string;
  marca: string;
  modelo: string;
  versao: string | null;
  ano: number;
  cor: string;
  combustivel: string; // "flex" | "gasolina" | "diesel" | ...
  cambio: string;      // "manual" | "automatico" | "cvt" | "automatizado"
  quilometragem: number;
  tipo: "carro" | "moto";
  cilindrada: number | null;
  tipo_moto: string | null;
  valor_anunciado: number | null;
  status: "disponivel";
  destaque: boolean;
  observacoes: string | null;
  photos: PublicPhoto[];
  created_at: string;
}

export interface PublicStats {
  total_veiculos: number;
  total_marcas: number;
  total_carros: number;
  total_motos: number;
  satisfacao: number;
}

export interface PublicMarcas {
  marcas: string[];
}

// ─── Filtros aceitos na listagem ───────────────────────────────────────────────

export interface VehicleFilters {
  tipo?: "carro" | "moto";
  marca?: string;
  cambio?: string;
  combustivel?: string;
  ano_min?: number;
  preco_max?: number;
  destaque?: boolean;
  q?: string;
  skip?: number;
  limit?: number;
}

// ─── Mapeamentos de display ───────────────────────────────────────────────────
// O banco usa minúsculas sem acento — mapeamos para exibição amigável no site.

export const FUEL_LABELS: Record<string, string> = {
  flex:      "Flex",
  gasolina:  "Gasolina",
  etanol:    "Etanol",
  diesel:    "Diesel",
  eletrico:  "Elétrico",
  hibrido:   "Híbrido",
  gnv:       "GNV",
};

export const CAMBIO_LABELS: Record<string, string> = {
  manual:       "Manual",
  automatico:   "Automático",
  automatizado: "Automatizado",
  cvt:          "CVT",
};

// ─── Helper interno ────────────────────────────────────────────────────────────

async function fetchPublic<T>(
  path: string,
  params?: Record<string, string | number | boolean>
): Promise<T | null> {
  try {
    const url = new URL(`${API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }

    const res = await fetch(url.toString(), {
      // ISR: revalida a cada 60s no servidor (Next.js App Router)
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // Falha silenciosa — site nunca quebra se o backend cair
    return null;
  }
}

// ─── Funções públicas ──────────────────────────────────────────────────────────

/** Lista veículos disponíveis com filtros opcionais. */
export async function getPublicVehicles(
  filters: VehicleFilters = {}
): Promise<PublicVehicle[]> {
  const params: Record<string, string | number | boolean> = {};
  if (filters.tipo)        params.tipo        = filters.tipo;
  if (filters.marca)       params.marca       = filters.marca;
  if (filters.cambio)      params.cambio      = filters.cambio;
  if (filters.combustivel) params.combustivel = filters.combustivel;
  if (filters.ano_min)     params.ano_min     = filters.ano_min;
  if (filters.preco_max)   params.preco_max   = filters.preco_max;
  if (filters.destaque !== undefined) params.destaque = filters.destaque;
  if (filters.q)           params.q           = filters.q;
  if (filters.skip)        params.skip        = filters.skip;
  if (filters.limit)       params.limit       = filters.limit;

  const data = (await fetchPublic<PublicVehicle[]>("/vehicles", params)) ?? [];
  // Corrige URLs relativas de fotos para URLs absolutas
  return data.map(v => ({
    ...v,
    photos: v.photos.map(p => ({ ...p, url: resolvePhotoUrl(p.url) })),
  }));
}

/** Busca detalhe de um veículo pelo ID. Retorna null se não encontrado. */
export async function getPublicVehicle(id: string): Promise<PublicVehicle | null> {
  return fetchPublic<PublicVehicle>(`/vehicles/${id}`);
}

/** Retorna estatísticas para o hero do site (total veículos, marcas, satisfação). */
export async function getPublicStats(): Promise<PublicStats> {
  return (await fetchPublic<PublicStats>("/stats")) ?? {
    total_veiculos: 0,
    total_marcas: 0,
    total_carros: 0,
    total_motos: 0,
    satisfacao: 98,
  };
}

/** Lista marcas que têm veículos disponíveis no estoque. */
export async function getPublicMarcas(tipo?: "carro" | "moto"): Promise<string[]> {
  const params = tipo ? { tipo } : undefined;
  const result = await fetchPublic<PublicMarcas>("/marcas", params);
  return result?.marcas ?? [];
}

// ─── Configurações públicas da loja ───────────────────────────────────────────

export interface PublicSettings {
  whatsapp:       string;
  telefone:       string;
  email_contato:  string;
  instagram:      string;
  facebook:       string;
  youtube:        string;
  nome_loja:      string;
  slogan:         string;
  endereco:       string;
  cidade:         string;
  estado:         string;
  horario:        string;
  hero_titulo:    string;
  hero_subtitulo: string;
  stat_clientes:  number;
  stat_anos:      number;
  stat_satisfacao: number;
  modo_manutencao: boolean;
}

const DEFAULT_SETTINGS: PublicSettings = {
  whatsapp:        "",
  telefone:        "",
  email_contato:   "",
  instagram:       "",
  facebook:        "",
  youtube:         "",
  nome_loja:       "LMC Veículos",
  slogan:          "Seu próximo veículo está aqui",
  endereco:        "",
  cidade:          "",
  estado:          "",
  horario:         "Seg–Sex: 8h–18h | Sáb: 8h–13h",
  hero_titulo:     "Encontre seu próximo veículo",
  hero_subtitulo:  "Carros e motos selecionados com qualidade e transparência",
  stat_clientes:   0,
  stat_anos:       0,
  stat_satisfacao: 98,
  modo_manutencao: false,
};

/** Retorna configurações públicas da loja (ISR 30s). */
export async function getPublicSettings(): Promise<PublicSettings> {
  return (await fetchPublic<PublicSettings>("/settings")) ?? DEFAULT_SETTINGS;
}
