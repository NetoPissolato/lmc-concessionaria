// ─── Enums ────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "funcionario";

export type VehicleStatus =
  | "disponivel"
  | "reservado"
  | "em_preparacao"
  | "em_manutencao"
  | "vendido";

export type FuelType =
  | "flex"
  | "gasolina"
  | "etanol"
  | "diesel"
  | "eletrico"
  | "hibrido"
  | "gnv";

export type TransmissionType = "manual" | "automatico" | "automatizado" | "cvt";

export type CarroceriaType =
  | "suv"
  | "hatch"
  | "sedan"
  | "picape"
  | "coupe"
  | "minivan"
  | "conversivel"
  | "perua"
  | "van";

export type CondicaoType = "novo" | "seminovo" | "usado";

export type ExpenseCategory =
  | "mecanica"
  | "funilaria"
  | "pintura"
  | "lavagem"
  | "documentacao"
  | "pneus"
  | "eletrica"
  | "combustivel"
  | "acessorios"
  | "guincho"
  | "ipva"
  | "licenciamento"
  | "comissao"
  | "outros";

export type PaymentMethod =
  | "dinheiro"
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "transferencia"
  | "boleto";

export type SaleStatus = "pendente" | "concluida" | "cancelada";

export type PaymentType =
  | "dinheiro"
  | "pix"
  | "financiamento"
  | "consorcio"
  | "cartao"
  | "transferencia"
  | "permuta"
  | "misto";

export type EntryType = "entrada" | "saida";

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role: UserRole;
  ativo: boolean;
  created_at: string;
}

// ─── Vehicle Photo ────────────────────────────────────────────────────────────
export interface VehiclePhoto {
  id: string;
  vehicle_id: string;
  url: string;
  is_main: boolean;
  ordem: number;
  created_at: string;
}

// ─── Vehicle ──────────────────────────────────────────────────────────────────
export interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  versao?: string;
  ano: number;
  cor: string;
  combustivel: FuelType;
  cambio: TransmissionType;
  quilometragem: number;
  placa: string;
  chassi: string;
  renavam?: string;
  valor_compra: number;
  valor_multas?: number;
  data_compra: string;
  vendedor_nome?: string;
  vendedor_telefone?: string;
  valor_anunciado?: number;
  valor_minimo?: number;
  valor_vendido?: number;
  status: VehicleStatus;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  tipo?: "carro" | "moto";
  cilindrada?: number;
  tipo_moto?: string;
  carroceria?: CarroceriaType;
  condicao?: CondicaoType;
  portas?: number;
  opcionais?: string[];
  visualizacoes?: number;
  destaque?: boolean;
  video_url?: string;
  // Computed
  total_despesas?: number;
  custo_total?: number;
  lucro_bruto?: number;
  margem_percentual?: number;
  // Gallery
  photos?: VehiclePhoto[];
}

// ─── ModeloDestaque ───────────────────────────────────────────────────────────
export interface ModeloDestaque {
  id: string;
  marca: string;
  modelo: string;
  carroceria: CarroceriaType | string;
  imagem_url?: string | null;
  ativo: boolean;
  ordem: number;
  total_disponiveis?: number;
  created_at: string;
}

export interface VehicleExpense {
  id: string;
  vehicle_id: string;
  data: string;
  categoria: ExpenseCategory;
  descricao: string;
  valor: number;
  forma_pagamento: PaymentMethod;
  parcelas?: number;
  responsavel?: string;
  fornecedor?: string;
  nota_fiscal?: string;
  observacoes?: string;
  km_atual?: number;
  valor_multas?: number;
  created_at: string;
}

export interface CostCenter {
  vehicle_id: string;
  valor_compra: number;
  valor_multas?: number;
  despesas: VehicleExpense[];
  total_despesas: number;
  custo_total: number;
  valor_anunciado?: number;
  valor_minimo?: number;
  valor_vendido?: number;
  lucro_bruto?: number;
  margem_percentual?: number;
}

// ─── Customer ─────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  nome: string;
  cpf_cnpj?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  created_at: string;
  total_compras?: number;
}

// ─── Sale ─────────────────────────────────────────────────────────────────────
export interface Sale {
  id: string;
  cliente_id: string;
  vehicle_id: string;
  vendedor_id: string;
  valor_venda: number;
  valor_entrada: number;
  valor_financiado: number;
  parcelas?: number;
  forma_pagamento: PaymentType;
  banco_financiamento?: string;
  comissao_percentual: number;
  comissao_valor: number;
  data_venda: string;
  data_entrega?: string;
  status: SaleStatus;
  observacoes?: string;
  created_at: string;
  // Enriched from API
  cliente_nome?: string;
  vehicle_info?: string;
  vendedor_nome?: string;
  vehicle_placa?: string;
  vehicle_cor?: string;
  vehicle_tipo?: "carro" | "moto";
  vehicle_photos?: { url: string; is_main: boolean }[];
  // Split payment methods (when forma_pagamento = misto)
  payment_methods?: {
    forma: string;
    valor: string;
    parcelas?: number;
    banco?: string;
    taxa?: string;
  }[];
}

// ─── Financial ────────────────────────────────────────────────────────────────
export interface FinancialEntry {
  id: string;
  tipo: EntryType;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  observacoes?: string;
  vehicle_id?: string | null;
  venda_id?: string | null;
  expense_id?: string | null;
  /** Preenchido quando este lançamento é um ESTORNO (valor negativo) de outro */
  estorno_de_id?: string | null;
  foto_url?: string | null;
  created_at?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  disponivel: number;
  reservado: number;
  em_preparacao: number;
  em_manutencao: number;
  vendido: number;
  valor_estoque: number;
  vendidos_hoje: number;
  vendidos_mes: number;
  faturamento_mes: number;
  /** Saldo de caixa do mês (entradas − saídas). NÃO é lucro. null para funcionário. */
  lucro_mes: number | null;
  /** Lucro de verdade: venda − custo total do veículo, das vendas concluídas no mês */
  lucro_bruto_mes?: number | null;
  margem_media_mes?: number | null;
  ticket_medio_mes?: number | null;
  saldo_caixa_mes?: number | null;
  custo_estoque?: number | null;
  estoque_parado_total?: number;
  estoque_parado?: EstoqueParado[];
  top_sellers: TopSeller[];
  ultimas_vendas: Sale[];
  annual_chart: ChartDataPoint[];
  daily_chart: DailyChartDataPoint[];
}

export interface EstoqueParado {
  id: string;
  marca: string;
  modelo: string;
  ano: number;
  tipo: "carro" | "moto";
  dias_em_estoque: number;
  valor_anunciado: number | null;
}

export interface TopSeller {
  vendedor_id: string;
  nome: string;
  total_vendas: number;
  total_valor: number;
}

export interface ChartDataPoint {
  mes: number;
  total_vendas: number;
  faturamento: number;
  saidas: number;
}

export interface DailyChartDataPoint {
  dia: number;
  total_vendas: number;
  faturamento: number;
  saidas: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

// ─── Audit ────────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  acao: string;
  descricao?: string;
  dados_antes?: Record<string, unknown>;
  dados_depois?: Record<string, unknown>;
  timestamp: string;
}

// ─── Label Maps ───────────────────────────────────────────────────────────────
export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  em_preparacao: "Em Preparação",
  em_manutencao: "Em Manutenção",
  vendido: "Vendido",
};

export const FUEL_LABELS: Record<FuelType, string> = {
  flex: "Flex",
  gasolina: "Gasolina",
  etanol: "Etanol",
  diesel: "Diesel",
  eletrico: "Elétrico",
  hibrido: "Híbrido",
  gnv: "GNV",
};

export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  manual: "Manual",
  automatico: "Automático",
  automatizado: "Automatizado",
  cvt: "CVT",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  mecanica: "Mecânica",
  funilaria: "Funilaria",
  pintura: "Pintura",
  lavagem: "Lavagem",
  documentacao: "Documentação",
  pneus: "Pneus",
  eletrica: "Elétrica",
  combustivel: "Combustível",
  acessorios: "Acessórios",
  guincho: "Guincho",
  ipva: "IPVA",
  licenciamento: "Licenciamento",
  comissao: "Comissão",
  outros: "Outros",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  financiamento: "Financiamento",
  consorcio: "Consórcio",
  cartao: "Cartão",
  transferencia: "Transferência",
  permuta: "Permuta",
  misto: "Misto",
};
