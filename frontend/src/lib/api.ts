import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { AuthResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ─── Axios Instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ─── Token Management ─────────────────────────────────────────────────────────
const TokenStorage = {
  getAccess: () => (typeof window !== "undefined" ? localStorage.getItem("lmc_access_token") : null),
  getRefresh: () => (typeof window !== "undefined" ? localStorage.getItem("lmc_refresh_token") : null),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem("lmc_access_token", access);
    localStorage.setItem("lmc_refresh_token", refresh);
  },
  clear: () => {
    localStorage.removeItem("lmc_access_token");
    localStorage.removeItem("lmc_refresh_token");
    localStorage.removeItem("lmc_user");
  },
  getUser: () => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("lmc_user") : null;
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  setUser: (user: unknown) => {
    localStorage.setItem("lmc_user", JSON.stringify(user));
  },
};

// ─── Request Interceptor - Attach Bearer Token ────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = TokenStorage.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor - Handle 401 & Refresh Token ───────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  failedQueue = [];
};

/**
 * Renova o access token. O refresh é ROTATIVO (cada uso queima o anterior), então duas
 * abas renovando juntas faziam a segunda usar um refresh já queimado e ser jogada para o
 * login — a cada 30 min, com o painel aberto em mais de uma aba. Agora:
 * - um cadeado entre abas (Web Locks) deixa só uma renovar por vez;
 * - quem chega depois vê que o token já mudou e aproveita o novo, sem gastar o refresh.
 */
async function renovarToken(tokenQueFalhou: string | null): Promise<string> {
  const executar = async (): Promise<string> => {
    const atual = TokenStorage.getAccess();
    if (atual && atual !== tokenQueFalhou) return atual; // outra aba já renovou
    const refreshToken = TokenStorage.getRefresh();
    if (!refreshToken) throw new Error("Sem refresh token");
    try {
      const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
      TokenStorage.setTokens(data.access_token, data.refresh_token ?? refreshToken);
      return data.access_token as string;
    } catch (e) {
      // Navegador sem Web Locks: a outra aba pode ter renovado no meio do caminho
      const depois = TokenStorage.getAccess();
      if (depois && depois !== tokenQueFalhou && TokenStorage.getRefresh() !== refreshToken) return depois;
      throw e;
    }
  };
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("lmc-renovar-token", executar);
  }
  return executar();
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Não interceptar rotas de auth — deixa o erro chegar no catch da página de login
      const url = originalRequest.url ?? "";
      if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      if (!TokenStorage.getRefresh()) {
        isRefreshing = false;
        TokenStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const enviado = String(originalRequest.headers?.Authorization ?? "").replace(/^Bearer\s+/i, "") || null;
        const newToken = await renovarToken(enviado);
        processQueue(null, newToken);
        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        TokenStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (identifier: string, senha: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/login", { identifier, senha });
    TokenStorage.setTokens(data.access_token, data.refresh_token);
    TokenStorage.setUser(data.user);
    return data;
  },
  logout: async () => {
    const refresh = TokenStorage.getRefresh();
    if (refresh) {
      try { await api.post("/auth/logout", { refresh_token: refresh }); } catch {}
    }
    TokenStorage.clear();
  },
  getUser: () => TokenStorage.getUser(),
  isAuthenticated: () => !!TokenStorage.getAccess(),
};

// ─── Vehicles API ─────────────────────────────────────────────────────────────
export const vehiclesApi = {
  list: (params?: Record<string, unknown>) => api.get("/vehicles", { params }).then((r) => r.data),
  /** Lista + total (paginação, filtros e ordenação no servidor) */
  listPaged: (params?: Record<string, unknown>) =>
    api.get("/vehicles", { params }).then((r) => ({ items: r.data, total: totalDoCabecalho(r.headers, r.data) })),
  get: (id: string) => api.get(`/vehicles/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post("/vehicles", data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/vehicles/${id}`, data).then((r) => r.data),
  patch:  (id: string, data: unknown) => api.patch(`/vehicles/${id}`, data).then((r) => r.data),
  toggleDestaque: (id: string) => api.patch(`/vehicles/${id}/destaque`).then((r) => r.data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
  getCostCenter: (id: string) => api.get(`/vehicles/${id}/cost-center`).then((r) => r.data),
  getExpenses: (id: string) => api.get(`/vehicles/${id}/expenses`).then((r) => r.data),
  addExpense: (id: string, data: unknown) => api.post(`/vehicles/${id}/expenses`, data).then((r) => r.data),
  updateExpense: (vehicleId: string, expenseId: string, data: unknown) =>
    api.put(`/vehicles/${vehicleId}/expenses/${expenseId}`, data).then((r) => r.data),
  deleteExpense: (vehicleId: string, expenseId: string) =>
    api.delete(`/vehicles/${vehicleId}/expenses/${expenseId}`),
  brandsModels: () => api.get("/vehicles/brands-models").then((r) => r.data) as Promise<{marca:string;modelo:string;tipo:string;carroceria:string|null}[]>,

  getAudit: (id: string) => api.get(`/vehicles/${id}/audit`).then((r) => r.data),
  payFines: (id: string) => api.post(`/vehicles/${id}/pay-fines`).then((r) => r.data),
  // ─── Gallery ───────────────────────────────────────────────────────────────
  getPhotos: (id: string) => api.get(`/vehicles/${id}/photos`).then((r) => r.data),
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    // Foto pelo 4G do pátio passa fácil de 15 s (o limite padrão): upload tem 2 min
    return api.post(`/vehicles/${id}/photos`, form, {
      headers: { "Content-Type": "multipart/form-data" }, timeout: 120_000,
    }).then((r) => r.data);
  },
  setMainPhoto: (id: string, photoId: string) =>
    api.patch(`/vehicles/${id}/photos/${photoId}/main`).then((r) => r.data),
  deletePhoto: (id: string, photoId: string) =>
    api.delete(`/vehicles/${id}/photos/${photoId}`),
};

// ─── Customers API ────────────────────────────────────────────────────────────
export const customersApi = {
  list: (params?: Record<string, unknown>) => api.get("/customers", { params }).then((r) => r.data),
  listPaged: (params?: Record<string, unknown>) =>
    api.get("/customers", { params }).then((r) => ({ items: r.data, total: totalDoCabecalho(r.headers, r.data) })),
  get: (id: string) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post("/customers", data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/customers/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  getPurchases: (id: string) => api.get(`/customers/${id}/purchases`).then((r) => r.data),
};

// ─── Sales API ────────────────────────────────────────────────────────────────
export const salesApi = {
  list: (params?: Record<string, unknown>) => api.get("/sales", { params }).then((r) => r.data),
  get: (id: string) => api.get(`/sales/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post("/sales", data).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/sales/${id}/status`, { status }).then((r) => r.data),
  getDashboard: (year: number, month: number) =>
    api.get("/sales/dashboard", { params: { year, month } }).then((r) => r.data),
};

// ─── Financial API ────────────────────────────────────────────────────────────
export const financialApi = {
  list: (params?: Record<string, unknown>) => api.get("/financial", { params }).then((r) => r.data),
  /** Lista + total sem paginação (cabeçalho X-Total-Count) */
  listPaged: (params?: Record<string, unknown>) =>
    api.get("/financial", { params }).then((r) => ({ items: r.data, total: totalDoCabecalho(r.headers, r.data) })),
  getSummary: (year: number, month: number) =>
    api.get("/financial/summary", { params: { year, month } }).then((r) => r.data),
  /** Série dos 12 meses agregada no servidor */
  getAnnual: (year: number) =>
    api.get("/financial/summary", { params: { year } }).then((r) => r.data),
};

// ─── Leads / avaliações / alertas / configurações ─────────────────────────────
// Passam pelo mesmo cliente (renovação automática do token). Antes essas telas usavam
// fetch próprio e quebravam em silêncio quando o token vencia.
export const leadsApi = {
  list: (params?: Record<string, unknown>) => api.get("/leads", { params }).then((r) => r.data),
  update: (id: string, data: { status?: string; observacoes?: string }) =>
    api.patch(`/leads/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/leads/${id}`).then((r) => r.data),
};

export const reviewsApi = {
  list: (params?: Record<string, unknown>) => api.get("/reviews", { params }).then((r) => r.data),
  update: (id: string, data: { aprovado?: boolean; texto?: string; nota?: number }) =>
    api.patch(`/reviews/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/reviews/${id}`).then((r) => r.data),
};

export const alertsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/availability-alerts", { params }).then((r) => ({ items: r.data, total: totalDoCabecalho(r.headers, r.data) })),
  update: (id: string, status: "pendente" | "atendido") =>
    api.patch(`/availability-alerts/${id}`, { status }).then((r) => r.data),
  delete: (id: string) => api.delete(`/availability-alerts/${id}`).then((r) => r.data),
};

export const settingsApi = {
  get: () => api.get("/settings").then((r) => r.data),
  /** Campos públicos (inclui o limite de fotos por veículo) — qualquer usuário logado lê */
  publicas: () => api.get("/public/settings").then((r) => r.data as { max_fotos_veiculo?: number }),
  update: (data: Record<string, unknown>) => api.put("/settings", data).then((r) => r.data),
};

/** Total sem paginação mandado pelo backend; sem o cabeçalho, usa o tamanho da página. */
export function totalDoCabecalho(headers: unknown, data: unknown): number {
  const h = headers as Record<string, string | undefined> | undefined;
  const bruto = h?.["x-total-count"];
  const n = bruto != null ? Number(bruto) : NaN;
  return Number.isFinite(n) ? n : Array.isArray(data) ? data.length : 0;
}

// ─── Users API ────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/users", { params }).then((r) => r.data),
  get: (id: string) => api.get(`/users/${id}`).then((r) => r.data),
  me: () => api.get("/users/me").then((r) => r.data),
  create: (data: unknown) => api.post("/users", data).then((r) => r.data),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data).then((r) => r.data),
  changeRole: (id: string, role: string) =>
    api.patch(`/users/${id}/role`, null, { params: { role } }).then((r) => r.data),
  // Admin changes any user's password (no current password needed)
  adminChangePassword: (id: string, nova_senha: string) =>
    api.post(`/users/${id}/change-password`, { nova_senha }),
  // User changes their own password (requires current password)
  changeMyPassword: (senha_atual: string, nova_senha: string, confirmar_senha: string) =>
    api.post("/users/me/change-password", { senha_atual, nova_senha, confirmar_senha }),
  // Avatar upload (multipart/form-data)
  uploadAvatar: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/users/${id}/avatar`, form, {
      headers: { "Content-Type": "multipart/form-data" }, timeout: 120_000,
    }).then((r) => r.data);
  },
  deleteAvatar: (id: string) => api.delete(`/users/${id}/avatar`).then((r) => r.data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// ─── Reports API ─────────────────────────────────────────────────────────────
type PeriodParams = { data_inicio?: string; data_fim?: string };
export const reportsApi = {
  vendas:        (params?: PeriodParams) => api.get("/reports/vendas",        { params }).then(r => r.data),
  estoque:       ()                      => api.get("/reports/estoque"                 ).then(r => r.data),
  financeiro:    (params?: PeriodParams) => api.get("/reports/financeiro",    { params }).then(r => r.data),
  clientes:      ()                      => api.get("/reports/clientes"                ).then(r => r.data),
  lucratividade: (params?: PeriodParams) => api.get("/reports/lucratividade", { params }).then(r => r.data),
  comissoes:     (params?: PeriodParams) => api.get("/reports/comissoes",     { params }).then(r => r.data),
};

// ─── Modelos Destaque API ─────────────────────────────────────────────────────
export const modelosDestaqueApi = {
  list: () => api.get("/modelos-destaque").then((r) => r.data),
  create: (data: { marca: string; modelo: string; carroceria: string; ativo?: boolean; ordem?: number }) =>
    api.post("/modelos-destaque", data).then((r) => r.data),
  update: (id: string, data: Partial<{ marca: string; modelo: string; carroceria: string; ativo: boolean; ordem: number }>) =>
    api.put(`/modelos-destaque/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/modelos-destaque/${id}`),
  uploadImagem: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/modelos-destaque/${id}/imagem`, form, {
      headers: { "Content-Type": "multipart/form-data" }, timeout: 120_000,
    }).then((r) => r.data);
  },
  removeImagem: (id: string) => api.delete(`/modelos-destaque/${id}/imagem`).then((r) => r.data),
};

export { TokenStorage };
export default api;
