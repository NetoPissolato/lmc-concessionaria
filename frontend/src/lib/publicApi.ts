/**
 * Acesso à API pública do backend (site da loja, sem autenticação).
 *
 * - Dados sensíveis nunca chegam aqui: o backend filtra (custo, placa, observações).
 * - No servidor, as respostas ficam em cache por REVALIDAR segundos: um pico de
 *   visitas não vira um pico de consultas no banco, e carro novo aparece em até 30s.
 * - Falha do backend é diferente de "não existe": getPublicVehicleResult devolve
 *   `erro: true` para a página mostrar "tente de novo" em vez de um 404 que o Google
 *   indexaria como página morta.
 */
import { CAMBIO, COMBUSTIVEL, CARROCERIA, CATEGORIA_MOTO, CONDICAO } from "@/lib/site/labels";

const isServer = typeof window === "undefined";

const API_BASE = isServer
  ? (process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000") + "/api/v1/public"
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1") + "/public";

/** Segundos de cache das respostas no servidor. */
const REVALIDAR = 30;

/** URLs de foto ficam relativas: o nginx dos dois domínios roteia /uploads/ para o backend. */
export function resolvePhotoUrl(url: string | null | undefined): string {
  return url ?? "";
}

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface PublicPhoto {
  id: string;
  url: string;
  /** Miniatura (~640px) para cards. Fotos antigas podem não ter. */
  thumb_url?: string | null;
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
  combustivel: string;
  cambio: string;
  quilometragem: number;
  tipo: "carro" | "moto";
  cilindrada: number | null;
  tipo_moto: string | null;
  carroceria: string | null;
  condicao: string;
  portas: number | null;
  opcionais: string[];
  valor_anunciado: number | null;
  status: "disponivel";
  destaque: boolean;
  video_url: string | null;
  photos: PublicPhoto[];
  visualizacoes: number;
  created_at: string;
}

export interface PublicModeloDestaque {
  id: string;
  marca: string;
  modelo: string;
  carroceria: string;
  imagem_url: string | null;
  total_disponiveis: number;
  ordem: number;
}

/** Gerado automaticamente pelo /popular-models (mais vistos do estoque). */
export interface PublicPopularModel {
  marca: string;
  modelo: string;
  tipo: string;
  carroceria: string | null;
  total_disponiveis: number;
  min_price: number | null;
  total_views: number;
  photo_url: string | null;
}

export interface PublicStats {
  total_veiculos: number;
  total_marcas: number;
  total_carros: number;
  total_motos: number;
  /** Média das avaliações aprovadas (null sem avaliações). */
  avaliacao_media: number | null;
  total_avaliacoes: number;
}

export interface PublicReview {
  id: string;
  nome: string;
  nota: number;
  texto: string;
  foto_url: string | null;
  cidade: string | null;
  created_at: string | null;
}

export interface PublicTeamMember {
  id: string;
  nome: string;
  cargo: string;
  foto: string | null;
  data_contratacao: string | null;
}

/** Campo vazio = null: o site esconde o item em vez de mostrar dado de exemplo. */
export interface PublicSettings {
  nome_loja: string;
  slogan: string | null;
  whatsapp: string | null;
  telefone: string | null;
  email_contato: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  cnpj: string | null;
  horario: string | null;
  hero_titulo: string | null;
  hero_subtitulo: string | null;
  stat_clientes: number | null;
  stat_anos: number | null;
  stat_satisfacao: number | null;
  modo_manutencao: boolean;
  ga_id: string | null;
  pixel_id: string | null;
}

export const DEFAULT_SETTINGS: PublicSettings = {
  nome_loja: "LMC Veículos",
  slogan: null,
  whatsapp: null,
  telefone: null,
  email_contato: null,
  instagram: null,
  facebook: null,
  youtube: null,
  endereco: null,
  cidade: null,
  estado: null,
  cep: null,
  cnpj: null,
  horario: null,
  hero_titulo: null,
  hero_subtitulo: null,
  stat_clientes: null,
  stat_anos: null,
  stat_satisfacao: null,
  modo_manutencao: false,
  ga_id: null,
  pixel_id: null,
};

export interface VehicleFilters {
  tipo?: "carro" | "moto";
  marca?: string;
  modelo?: string;
  cambio?: string;
  combustivel?: string;
  carroceria?: string;
  condicao?: string;
  ano_min?: number;
  ano_max?: number;
  preco_min?: number;
  preco_max?: number;
  km_max?: number;
  destaque?: boolean;
  q?: string;
  skip?: number;
  limit?: number;
}

// Compatibilidade com código antigo que importava os rótulos daqui
export const FUEL_LABELS = COMBUSTIVEL;
export const CAMBIO_LABELS = CAMBIO;
export const CARROCERIA_LABELS: Record<string, string> = { ...CARROCERIA, ...CATEGORIA_MOTO };
export const CONDICAO_LABELS = CONDICAO;

// ─── Núcleo ────────────────────────────────────────────────────────────────────

type Resposta<T> = { dados: T | null; status: number | "erro" };

async function chamar<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<Resposta<T>> {
  try {
    const url = new URL(`${API_BASE}${path}`, isServer ? undefined : window.location.origin);
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      ...(isServer ? { next: { revalidate: REVALIDAR } } : { cache: "no-store" as const }),
    });
    clearTimeout(timer);
    if (!res.ok) return { dados: null, status: res.status };
    return { dados: (await res.json()) as T, status: res.status };
  } catch {
    // Backend fora do ar ou lento: o site continua de pé (com aviso onde fizer sentido)
    return { dados: null, status: "erro" };
  }
}

function comFotosOrdenadas(v: PublicVehicle): PublicVehicle {
  const photos = [...(v.photos ?? [])].sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.ordem - b.ordem);
  return { ...v, photos, opcionais: Array.isArray(v.opcionais) ? v.opcionais : [] };
}

// ─── Veículos ──────────────────────────────────────────────────────────────────

export async function getPublicVehicles(filters: VehicleFilters = {}): Promise<PublicVehicle[]> {
  const { dados } = await chamar<PublicVehicle[]>("/vehicles", { ...filters });
  return (dados ?? []).map(comFotosOrdenadas);
}

/** Todo o estoque disponível (o backend aceita até 500 por página). */
export async function getAllPublicVehicles(): Promise<{ veiculos: PublicVehicle[]; erro: boolean }> {
  const { dados, status } = await chamar<PublicVehicle[]>("/vehicles", { limit: 500 });
  return { veiculos: (dados ?? []).map(comFotosOrdenadas), erro: status === "erro" || (typeof status === "number" && status >= 500) };
}

export async function getPublicVehicleResult(id: string): Promise<{ veiculo: PublicVehicle | null; erro: boolean }> {
  const { dados, status } = await chamar<PublicVehicle>(`/vehicles/${encodeURIComponent(id)}`);
  if (dados) return { veiculo: comFotosOrdenadas(dados), erro: false };
  return { veiculo: null, erro: status !== 404 && status !== 422 };
}

export async function getPublicVehicle(id: string): Promise<PublicVehicle | null> {
  return (await getPublicVehicleResult(id)).veiculo;
}

export async function getPublicModelosDestaque(): Promise<PublicModeloDestaque[]> {
  return (await chamar<PublicModeloDestaque[]>("/modelos-destaque")).dados ?? [];
}

export async function getPublicPopularModels(limit = 8): Promise<PublicPopularModel[]> {
  return (await chamar<PublicPopularModel[]>("/popular-models", { limit })).dados ?? [];
}

/** Conta uma visualização (o backend ignora repetição do mesmo IP por 6h). */
export function trackVehicleView(vehicleId: string): void {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1") + "/public";
  fetch(`${base}/vehicles/${encodeURIComponent(vehicleId)}/view`, { method: "POST", keepalive: true }).catch(() => {});
}

export async function getPublicStats(): Promise<PublicStats> {
  return (await chamar<PublicStats>("/stats")).dados ?? {
    total_veiculos: 0, total_marcas: 0, total_carros: 0, total_motos: 0,
    avaliacao_media: null, total_avaliacoes: 0,
  };
}

export async function getPublicMarcas(tipo?: "carro" | "moto"): Promise<string[]> {
  return (await chamar<{ marcas: string[] }>("/marcas", { tipo })).dados?.marcas ?? [];
}

export async function getPublicReviews(limit = 12): Promise<PublicReview[]> {
  return (await chamar<PublicReview[]>("/reviews", { limit })).dados ?? [];
}

export async function getPublicTeam(): Promise<PublicTeamMember[]> {
  return (await chamar<PublicTeamMember[]>("/team")).dados ?? [];
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const { dados } = await chamar<Partial<PublicSettings>>("/settings");
  return { ...DEFAULT_SETTINGS, ...(dados ?? {}) };
}

// ─── Envio de formulários (navegador) ──────────────────────────────────────────

export interface EnvioResultado { ok: boolean; mensagem: string }

async function enviar(path: string, corpo: Record<string, unknown>): Promise<EnvioResultado> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    if (res.status === 429) return { ok: false, mensagem: "Muitos envios seguidos. Aguarde um minuto e tente de novo." };
    if (!res.ok) {
      const erro = await res.json().catch(() => null);
      const detalhe = Array.isArray(erro?.detail) ? erro.detail[0]?.msg : erro?.detail;
      return { ok: false, mensagem: detalhe ? `Não foi possível enviar: ${detalhe}` : "Não foi possível enviar. Tente de novo ou fale pelo WhatsApp." };
    }
    const dados = await res.json().catch(() => ({}));
    return { ok: true, mensagem: dados?.message ?? "Recebido! Entraremos em contato em breve." };
  } catch {
    return { ok: false, mensagem: "Sem conexão com a loja agora. Tente de novo ou fale pelo WhatsApp." };
  }
}

export const enviarLead = (corpo: {
  nome: string; telefone: string; email?: string; mensagem?: string;
  veiculo_id?: string; veiculo_descricao?: string; origem?: string; website?: string;
}) => enviar("/leads", corpo);

export const enviarAvaliacao = (corpo: { nome: string; nota: number; texto: string; cidade?: string; website?: string }) =>
  enviar("/reviews", corpo);

export const enviarAlerta = (corpo: {
  email: string; nome?: string; marca?: string; modelo?: string; tipo?: string;
  ano_min?: number; preco_max?: number; website?: string;
}) => enviar("/availability-alerts", corpo);
