"use client";

import { useState, useMemo } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight,
  ArrowDownRight, ChevronLeft, ChevronRight,
  Car, ShoppingCart, User, Wrench, FileText, Briefcase,
  Home, Zap, Truck, CreditCard, Shield, AlertTriangle,
  Plus, Minus,
} from "lucide-react";
import { financialApi, reportsApi } from "@/lib/api";
import { FinancialEntry } from "@/types";
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

import { fmtCurrencyFull as fmt } from "@/lib/formatters";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const CATEGORY_COLORS: Record<string, string> = {
  venda_veiculo:  "#22c55e",
  compra_veiculo: "#ef4444",
  comissao:       "#f59e0b",
  manutencao:     "#f97316",
  documentacao:   "#38bdf8",
  salario:        "#818cf8",
  aluguel:        "#fb923c",
  utilidades:     "#34d399",
  marketing:      "#e879f9",
  guincho:        "#fb923c",
  ipva:           "#60a5fa",
  licenciamento:  "#a3e635",
  multa:          "#f43f5e",
  outros_entrada: "#22c55e",
  outros_saida:   "#ef4444",
};

const CATEGORY_LABELS: Record<string, string> = {
  venda_veiculo:  "Venda de Veículo",
  compra_veiculo: "Compra de Veículo",
  comissao:       "Comissão",
  manutencao:     "Manutenção",
  documentacao:   "Documentação",
  salario:        "Salário",
  aluguel:        "Aluguel",
  utilidades:     "Utilidades",
  marketing:      "Marketing",
  guincho:        "Guincho",
  ipva:           "IPVA",
  licenciamento:  "Licenciamento",
  multa:          "Multa",
  outros_entrada: "Outros",
  outros_saida:   "Outros",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CATEGORY_ICONS: Record<string, any> = {
  venda_veiculo:  Car,
  compra_veiculo: ShoppingCart,
  comissao:       User,
  manutencao:     Wrench,
  documentacao:   FileText,
  salario:        Briefcase,
  aluguel:        Home,
  utilidades:     Zap,
  marketing:      TrendingUp,
  guincho:        Truck,
  ipva:           CreditCard,
  licenciamento:  Shield,
  multa:          AlertTriangle,
  outros_entrada: Plus,
  outros_saida:   Minus,
};

const PAGE_SIZE = 10;
const LUCRO_PAGE_SIZE = 5;

export default function FinanceiroPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [typeFilter, setTypeFilter] = useState<"" | "entrada" | "saida">("");
  const { isMobile, isMobileOrTablet } = useBreakpoint();

  const [page, setPage] = useState(1);
  const [lucroPage, setLucroPage] = useState(1);
  const [period,    setPeriod]    = useState<"mensal" | "Diário">("mensal");
  const [visEntradas, setVisEntradas] = useState(true);
  const [visSaidas,   setVisSaidas]   = useState(true);
  const [visLucro,    setVisLucro]    = useState(true);

  const toggleEntradas = () => setVisEntradas(v => !v);
  const toggleSaidas   = () => setVisSaidas  (v => !v);
  const toggleLucro    = () => setVisLucro   (v => !v);

  const handleTypeFilter = (t: "" | "entrada" | "saida") => { setTypeFilter(t); setPage(1); };
  const handleYear       = (y: number)                   => { setYear(y);       setPage(1); };

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["financial-summary", year, month],
    queryFn: () => financialApi.getSummary(year, month),
    refetchInterval: 30_000,   // auto-atualiza a cada 30s
  });

  const { data: allYearEntries = [] } = useQuery<FinancialEntry[]>({
    queryKey: ["financial-chart", year],
    queryFn: () => financialApi.list({ year, limit: 500 }),
    refetchInterval: 30_000,
  });

  const { data: entries = [], isLoading } = useQuery<FinancialEntry[]>({
    queryKey: ["financial-entries", typeFilter, year],
    queryFn: () => financialApi.list({ year, limit: 500, tipo: typeFilter || undefined }),
    refetchInterval: 15_000,   // lista de lançamentos atualiza a cada 15s
  });

  // ── Lucratividade por veículo no mês selecionado ──────────────────────────
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayDate = new Date(year, month, 0);
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;

  const { data: lucratividadeData, isLoading: lucLoading } = useQuery({
    queryKey: ["lucratividade-mes", year, month],
    queryFn: () => reportsApi.lucratividade({ data_inicio: firstDay, data_fim: lastDay }),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const veiculosLucroAll: any[] = lucratividadeData?.veiculos ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resumoLucro: any = lucratividadeData?.resumo ?? null;

  // Paginação da lucratividade
  const lucroTotalPages = Math.ceil(veiculosLucroAll.length / LUCRO_PAGE_SIZE);
  const safeLucroPage = Math.min(lucroPage, Math.max(lucroTotalPages, 1));
  const veiculosLucro = veiculosLucroAll.slice((safeLucroPage - 1) * LUCRO_PAGE_SIZE, safeLucroPage * LUCRO_PAGE_SIZE);

  const lucro    = Number(summary?.lucro_liquido   ?? 0);
  const entradas = Number(summary?.total_entradas  ?? 0);
  const saidas   = Number(summary?.total_saidas    ?? 0);

  const monthlyChartData = MONTHS_SHORT.map((name, idx) => {
    const mes = idx + 1;
    const e = allYearEntries.filter(en => new Date(en.data + "T12:00:00").getMonth() + 1 === mes && en.tipo === "entrada");
    const s = allYearEntries.filter(en => new Date(en.data + "T12:00:00").getMonth() + 1 === mes && en.tipo === "saida");
    const entr = e.reduce((a, b) => a + Number(b.valor), 0);
    const said = s.reduce((a, b) => a + Number(b.valor), 0);
    return { name, entradas: entr, saidas: said, lucro: entr - said };
  });

  const dailyChartData = useMemo(() => {
    const monthEntries = allYearEntries.filter(en => {
      const d = new Date(en.data + "T12:00:00");
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    const today = new Date().getDate();
    const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1);
    const maxDay = isCurrentMonth ? today : new Date(year, month, 0).getDate();
    return Array.from({ length: maxDay }, (_, i) => {
      const dia = i + 1;
      const e = monthEntries.filter(en => new Date(en.data + "T12:00:00").getDate() === dia && en.tipo === "entrada");
      const s = monthEntries.filter(en => new Date(en.data + "T12:00:00").getDate() === dia && en.tipo === "saida");
      const entr = e.reduce((a, b) => a + Number(b.valor), 0);
      const said = s.reduce((a, b) => a + Number(b.valor), 0);
      return { name: String(dia), entradas: entr, saidas: said, lucro: entr - said };
    });
  }, [allYearEntries, year, month]);

  const chartData = period === "mensal" ? monthlyChartData : dailyChartData;

  const totalPages  = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const pageEntries = useMemo(() => entries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [entries, safePage]);

  const pageNumbers = useMemo<(number | "...")[]>(() => {
    const nums = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(p => totalPages <= 7 || p === 1 || p === totalPages || Math.abs(p - safePage) <= 1);
    return nums.reduce<(number | "...")[]>((acc, p, idx, arr) => {
      if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
  }, [totalPages, safePage]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobileOrTablet ? "16px" : "24px" }}>

      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{
          display: "flex",
          flexDirection: isMobileOrTablet ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobileOrTablet ? "flex-start" : "center",
          gap: isMobileOrTablet ? "12px" : "0",
        }}>
        <div>
          <h1 className="page-title">Financeiro</h1>
          {!isMobile && <p className="page-subtitle">Fluxo de caixa, entradas, saídas e demonstrativos</p>}
        </div>
        <div style={{
          display: "flex", gap: "1px",
          background: "var(--surface-2)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          overflow: "hidden",
          width: isMobileOrTablet ? "100%" : "auto",
        }}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="input"
            style={{ border: "none", borderRadius: 0, background: "transparent", flex: 1, height: "40px", fontSize: "13px" }}>
            {MONTHS.map((m, i) => (<option key={i} value={i + 1}>{m}</option>))}
          </select>
          <div style={{ width: "1px", background: "var(--border)" }} />
          <select value={year} onChange={e => handleYear(Number(e.target.value))} className="input"
            style={{ border: "none", borderRadius: 0, background: "transparent", width: isMobileOrTablet ? "auto" : "90px", height: "40px", fontSize: "13px" }}>
            {[2023, 2024, 2025, 2026].map(y => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
      </motion.div>

      {/* Summary KPI Cards — 5 métricas financeiras */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr 1fr"
          : isMobileOrTablet
          ? "repeat(3, 1fr)"
          : "repeat(5, 1fr)",
        gap: isMobileOrTablet ? "10px" : "12px",
      }}>
        {/* Receita Bruta */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="kpi-card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowUpRight size={16} color="#22c55e" />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "2px 7px", borderRadius: 20, border: "1px solid rgba(34,197,94,0.2)" }}>ENTRADAS</span>
          </div>
          {summaryLoading ? <div className="skeleton" style={{ height: 24, width: "70%", marginBottom: 6 }} /> : (
            <p style={{ fontSize: "clamp(13px,2.5vw,22px)", fontWeight: 800, color: "#22c55e", letterSpacing: "-0.5px", marginBottom: 4, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmt(entradas)}</p>
          )}
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Receita Bruta</p>
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{MONTHS[month - 1]} {year}</p>
        </motion.div>

        {/* Total Saídas */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="kpi-card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowDownRight size={16} color="#ef4444" />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 7px", borderRadius: 20, border: "1px solid rgba(239,68,68,0.2)" }}>SAÍDAS</span>
          </div>
          {summaryLoading ? <div className="skeleton" style={{ height: 24, width: "70%", marginBottom: 6 }} /> : (
            <p style={{ fontSize: "clamp(13px,2.5vw,22px)", fontWeight: 800, color: "#ef4444", letterSpacing: "-0.5px", marginBottom: 4, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmt(saidas)}</p>
          )}
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Total Saídas</p>
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>Custos e despesas</p>
        </motion.div>

        {/* Lucro Líquido */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="kpi-card" style={{ overflow: "hidden", gridColumn: isMobile ? "span 2" : isMobileOrTablet ? "span 1" : undefined, border: `1px solid ${lucro >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: lucro >= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", border: `1px solid ${lucro >= 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={16} color={lucro >= 0 ? "#22c55e" : "#ef4444"} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: lucro >= 0 ? "#22c55e" : "#ef4444", background: lucro >= 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", padding: "2px 7px", borderRadius: 20, border: `1px solid ${lucro >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>{lucro >= 0 ? "POSITIVO" : "NEGATIVO"}</span>
          </div>
          {summaryLoading ? <div className="skeleton" style={{ height: 24, width: "70%", marginBottom: 6 }} /> : (
            <p style={{ fontSize: "clamp(13px,2.5vw,22px)", fontWeight: 800, color: lucro >= 0 ? "#22c55e" : "#ef4444", letterSpacing: "-0.5px", marginBottom: 4, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lucro >= 0 ? "+" : ""}{fmt(lucro)}
            </p>
          )}
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>Lucro Líquido</p>
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>Resultado do período</p>
        </motion.div>

        {/* Veículos Vendidos */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="kpi-card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Car size={16} color="#F5A623" />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#F5A623", background: "rgba(245,166,35,0.1)", padding: "2px 7px", borderRadius: 20, border: "1px solid rgba(245,166,35,0.2)" }}>VENDAS</span>
          </div>
          {lucLoading ? <div className="skeleton" style={{ height: 24, width: "50%", marginBottom: 6 }} /> : (
            <p style={{ fontSize: "clamp(16px,3vw,28px)", fontWeight: 800, color: "#F5A623", letterSpacing: "-0.5px", marginBottom: 4, lineHeight: 1 }}>
              {resumoLucro?.total_vendidos ?? 0}
            </p>
          )}
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Veículos Vendidos</p>
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{MONTHS[month - 1]} {year}</p>
        </motion.div>

        {/* Margem Média */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="kpi-card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={16} color="#6366f1" />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#6366f1", background: "rgba(99,102,241,0.1)", padding: "2px 7px", borderRadius: 20, border: "1px solid rgba(99,102,241,0.2)" }}>MARGEM</span>
          </div>
          {lucLoading ? <div className="skeleton" style={{ height: 24, width: "50%", marginBottom: 6 }} /> : (
            <p style={{ fontSize: "clamp(16px,3vw,28px)", fontWeight: 800, color: "#6366f1", letterSpacing: "-0.5px", marginBottom: 4, lineHeight: 1 }}>
              {resumoLucro?.margem_media?.toFixed(1) ?? "0,0"}%
            </p>
          )}
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Margem Média</p>
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>Por veículo vendido</p>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: isMobileOrTablet ? "16px" : "22px" }}>

        <div style={{
          display: "flex",
          flexDirection: isMobileOrTablet ? "column" : "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
          gap: "10px",
        }}>
          <div>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Performance {period === "mensal" ? "Mensal" : "Diária"}
            </span>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "-0.3px", marginTop: 4 }}>
              Fluxo de Caixa — {period === "mensal" ? year : `${MONTHS[month - 1]} ${year}`}
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", flexWrap: "wrap" }}>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", padding: "2px", flexShrink: 0 }}>
              {(["mensal", "Diário"] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: "4px 10px", borderRadius: "6px", border: "none", cursor: "pointer",
                  fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em",
                  background: period === p ? "rgba(245,166,35,0.15)" : "transparent",
                  color: period === p ? "#F5A623" : "rgba(255,255,255,0.35)",
                  transition: "all 0.15s",
                }}>{p === "mensal" ? "Mensal" : "Diário"}</button>
              ))}
            </div>
            <div className="filter-chip-row" style={{ flex: 1 }}>
              {([
                { key: "entradas", label: "Entradas", color: "#22c55e", vis: visEntradas, toggle: toggleEntradas },
                { key: "saidas",   label: "Saídas",   color: "#ef4444", vis: visSaidas,   toggle: toggleSaidas   },
                { key: "lucro",    label: "Lucro",    color: "#6366f1", vis: visLucro,    toggle: toggleLucro    },
              ]).map(({ key, label, color, vis, toggle }) => (
                <button key={key} onClick={toggle} style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "4px 9px", borderRadius: "6px",
                  border: `1px solid ${vis ? color + "40" : "rgba(255,255,255,0.06)"}`,
                  background: vis ? color + "12" : "transparent",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: 2, background: vis ? color : "rgba(255,255,255,0.2)" }} />
                  <span style={{ fontSize: "10px", fontWeight: "600", color: vis ? color : "rgba(255,255,255,0.3)", transition: "color 0.15s" }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={isMobileOrTablet ? 160 : 200}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: isMobileOrTablet ? -24 : -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSaidasFin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: isMobileOrTablet ? 9 : 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false}
              interval={isMobileOrTablet ? (period === "mensal" ? 1 : 4) : 0} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={isMobileOrTablet ? 30 : 38} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const entradasVal = Number(payload.find(p => p.dataKey === "entradas")?.value ?? 0);
                const saidasVal   = Number(payload.find(p => p.dataKey === "saidas")?.value ?? 0);
                const lucroVal    = entradasVal - saidasVal;
                return (
                  <div style={{
                    background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px", padding: "10px 14px",
                    fontSize: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    minWidth: 170,
                  }}>
                    <p style={{ color: "var(--text-muted)", marginBottom: "8px", fontWeight: "600", fontSize: "11px" }}>{label}</p>
                    {visEntradas && (
                      <p style={{ color: "#22c55e", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                        Entradas: {fmt(entradasVal)}
                      </p>
                    )}
                    {visSaidas && (
                      <p style={{ color: "#ef4444", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                        Saídas: {fmt(saidasVal)}
                      </p>
                    )}
                    <div style={{ marginTop: "7px", paddingTop: "7px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Lucro</span>
                        <span style={{ color: lucroVal >= 0 ? "#6366f1" : "#ef4444", fontSize: 13 }}>
                          {lucroVal >= 0 ? "+" : ""}{fmt(lucroVal)}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            {visEntradas && (
              <Area type="monotone" dataKey="entradas" name="entradas"
                stroke="#22c55e" strokeWidth={2} fill="url(#gradEntradas)" dot={false}
                activeDot={{ r: 4, fill: "#22c55e", stroke: "var(--surface)", strokeWidth: 2 }} />
            )}
            {visSaidas && (
              <Area type="monotone" dataKey="saidas" name="saidas"
                stroke="#ef4444" strokeWidth={1.5} fill="url(#gradSaidasFin)" dot={false}
                strokeDasharray="4 2"
                activeDot={{ r: 4, fill: "#ef4444", stroke: "var(--surface)", strokeWidth: 2 }} />
            )}
            {visLucro && (
              <Area type="monotone" dataKey="lucro" name="lucro"
                stroke="#6366f1" strokeWidth={2} fill="url(#gradLucro)" dot={false}
                strokeDasharray="6 2"
                activeDot={{ r: 4, fill: "#6366f1", stroke: "var(--surface)", strokeWidth: 2 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Lucro por Veículo — redesenhado com fotos e cards premium */}
      {(lucLoading || veiculosLucro.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: isMobileOrTablet ? "16px 16px 14px" : "20px 22px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Lucratividade</span>
                <h3 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.4px", marginTop: 2 }}>
                  Lucro por Veículo — {MONTHS[month - 1]} {year}
                </h3>
              </div>
              {resumoLucro && (
                <div style={{ display: "flex", gap: isMobile ? 12 : 20, flexWrap: "wrap" }}>
                  {[
                    { label: "Vendidos", value: String(resumoLucro.total_vendidos), color: "#F5A623" },
                    { label: "Lucro total", value: (resumoLucro.lucro_total >= 0 ? "+" : "") + fmt(resumoLucro.lucro_total), color: resumoLucro.lucro_total >= 0 ? "#22c55e" : "#ef4444" },
                    { label: "Margem média", value: resumoLucro.margem_media?.toFixed(1) + "%", color: "#6366f1" },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{s.label}</p>
                      <p style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          {lucLoading ? (
            <div style={{ padding: "8px 0" }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: "flex", gap: 14, padding: isMobileOrTablet ? "14px 16px" : "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="skeleton" style={{ width: 72, height: 56, borderRadius: 10, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 14, width: "45%", marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 10, width: "30%", marginBottom: 10 }} />
                    <div className="skeleton" style={{ height: 4, width: "100%", borderRadius: 2 }} />
                  </div>
                  <div className="skeleton" style={{ width: 90, height: 32, borderRadius: 8, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          ) : veiculosLucro.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <Car size={32} color="var(--text-muted)" style={{ opacity: 0.35, marginBottom: 10 }} />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Nenhum veículo vendido em {MONTHS[month - 1]}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Selecione outro período ou registre uma venda</p>
            </div>
          ) : (
            <div>
              {veiculosLucro.map((v, i) => {
                const isProfit = v.lucro_bruto >= 0;
                const profitColor = isProfit ? "#22c55e" : "#ef4444";
                const custoBarPct = v.valor_vendido > 0 ? Math.min((v.custo_total / v.valor_vendido) * 100, 100) : 100;
                const lucroBarPct = Math.max(100 - custoBarPct, 0);
                const isMoto = v.tipo === "moto";
                const placeholderSrc = isMoto ? "/moto-placeholder.svg" : "/car-placeholder.svg";
                return (
                  <motion.div key={v.placa + i}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "center",
                      gap: isMobileOrTablet ? 12 : 16,
                      padding: isMobileOrTablet ? "14px 16px" : "16px 22px",
                      borderBottom: i < veiculosLucro.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      transition: "background 0.15s",
                    }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                  >
                    {/* Foto + Info — always horizontal row */}
                    <div style={{ display: "flex", gap: isMobileOrTablet ? 12 : 16, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                      {/* Foto */}
                      <div style={{
                        width: isMobile ? 64 : 80, height: isMobile ? 48 : 60,
                        borderRadius: 10, overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <img
                          src={v.foto_url || placeholderSrc}
                          alt={v.veiculo}
                          onError={e => { (e.target as HTMLImageElement).src = placeholderSrc; }}
                          style={{ width: "100%", height: "100%", objectFit: v.foto_url ? "cover" : "contain",
                            opacity: v.foto_url ? 1 : 0.4, padding: v.foto_url ? 0 : 8 }}
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                          <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? "180px" : "none" }}>
                            {v.veiculo}
                          </p>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {v.placa}
                          </span>
                        </div>
                        <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: isMobile ? 8 : 10 }}>
                          Vendido em {v.data_venda}{v.vendedor && v.vendedor !== "—" ? ` · ${v.vendedor}` : ""}
                        </p>

                        <div style={{ marginBottom: isMobile ? 6 : 8 }}>
                          <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", display: "flex" }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${custoBarPct}%` }} transition={{ delay: i * 0.05 + 0.3, duration: 0.6, ease: "easeOut" }}
                              style={{ height: "100%", background: "linear-gradient(90deg, #ef4444, #f97316)", borderRadius: "3px 0 0 3px" }} />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${lucroBarPct}%` }} transition={{ delay: i * 0.05 + 0.3, duration: 0.6, ease: "easeOut" }}
                              style={{ height: "100%", background: "linear-gradient(90deg, #10b981, #22c55e)" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                              <span style={{ color: "#f97316" }}>&#9632;</span> Custo {custoBarPct.toFixed(0)}%
                            </span>
                            <span style={{ fontSize: 9, color: isProfit ? "#22c55e" : "#ef4444" }}>
                              Lucro {lucroBarPct.toFixed(0)}% <span style={{ color: isProfit ? "#22c55e" : "#ef4444" }}>&#9632;</span>
                            </span>
                          </div>
                        </div>

                        {!isMobile && (
                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            {[
                              { label: "Compra", value: fmt(v.valor_compra), color: "#3b82f6" },
                              { label: "Gastos", value: fmt(v.total_despesas), color: "#f59e0b" },
                              { label: "Custo total", value: fmt(v.custo_total), color: "#f97316", bold: true },
                              { label: "Vendido por", value: fmt(v.valor_vendido), color: "#10b981", bold: true },
                            ].map(d => (
                              <div key={d.label}>
                                <p style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 1 }}>{d.label}</p>
                                <p style={{ fontSize: 11, fontWeight: d.bold ? 700 : 600, color: d.color }}>{d.value}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {isMobile && (
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <div>
                              <p style={{ fontSize: 9, color: "var(--text-muted)" }}>Custo total</p>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "#f97316" }}>{fmt(v.custo_total)}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 9, color: "var(--text-muted)" }}>Vendido por</p>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>{fmt(v.valor_vendido)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: isMobile ? "left" : "right", flexShrink: 0 }}>
                      <div style={{ padding: isMobile ? "8px 12px" : "10px 14px", borderRadius: 10, background: isProfit ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${isProfit ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`, display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: isMobile ? "center" : "flex-end", gap: isMobile ? 10 : 0 }}>
                        <p style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", marginBottom: isMobile ? 0 : 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Lucro</p>
                        <p style={{ fontSize: isMobile ? 18 : 20, fontWeight: 900, color: profitColor, letterSpacing: "-0.5px", lineHeight: 1 }}>
                          {isProfit ? "+" : ""}{fmt(v.lucro_bruto)}
                        </p>
                        {v.margem_pct !== 0 && (
                          <p style={{ fontSize: 10, fontWeight: 700, color: profitColor, marginTop: isMobile ? 0 : 3, marginLeft: isMobile ? "auto" : 0, opacity: 0.8 }}>
                            {v.margem_pct?.toFixed(1)}% margem
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Paginação lucratividade */}
          {!lucLoading && lucroTotalPages > 1 && (
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: isMobileOrTablet ? "10px 16px" : "10px 22px",
              borderTop: "1px solid var(--border)",
              background: "rgba(255,255,255,0.015)",
            }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {(safeLucroPage - 1) * LUCRO_PAGE_SIZE + 1}–{Math.min(safeLucroPage * LUCRO_PAGE_SIZE, veiculosLucroAll.length)} de{" "}
                <strong style={{ color: "var(--text-secondary)" }}>{veiculosLucroAll.length}</strong> veículos
              </span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <PaginationBtn onClick={() => setLucroPage(p => Math.max(1, p - 1))} disabled={safeLucroPage === 1} aria-label="Pagina anterior lucratividade">
                  <ChevronLeft size={13} />
                </PaginationBtn>
                <span style={{ fontSize: 11, color: "var(--text-muted)", padding: "0 6px" }}>{safeLucroPage}/{lucroTotalPages}</span>
                <PaginationBtn onClick={() => setLucroPage(p => Math.min(lucroTotalPages, p + 1))} disabled={safeLucroPage === lucroTotalPages} aria-label="Proxima pagina lucratividade">
                  <ChevronRight size={13} />
                </PaginationBtn>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Entries Feed */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>

        <div style={{
          display: "flex",
          flexDirection: isMobileOrTablet ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobileOrTablet ? "flex-start" : "center",
          padding: isMobileOrTablet ? "14px 16px" : "18px 22px",
          borderBottom: "1px solid var(--border)",
          gap: "10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Registros</span>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "-0.3px" }}>Lancamentos</h3>
            </div>
            {!isLoading && entries.length > 0 && (
              <span style={{
                fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.4)",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "20px", padding: "2px 8px",
              }}>{entries.length}</span>
            )}
          </div>
          <div style={{
            display: "flex",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.06)",
            padding: "3px",
            gap: "2px",
            width: isMobileOrTablet ? "100%" : "auto",
          }}>
            {(["", "entrada", "saida"] as const).map(t => {
              const active = typeFilter === t;
              const col = t === "entrada" ? "#22c55e" : t === "saida" ? "#ef4444" : "#F5A623";
              return (
                <button key={t} onClick={() => handleTypeFilter(t)} style={{
                  flex: isMobileOrTablet ? 1 : "none",
                  padding: "6px 13px", borderRadius: "7px", border: "none", cursor: "pointer",
                  fontSize: "11px", fontWeight: "700",
                  background: active ? col + "18" : "transparent",
                  color: active ? col : "rgba(255,255,255,0.3)",
                  transition: "all 0.15s",
                }}>
                  {t === "" ? "Todos" : t === "entrada" ? "Entradas" : "Saídas"}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: "8px 0" }}>
            {Array(PAGE_SIZE).fill(0).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", padding: isMobileOrTablet ? "12px 16px" : "14px 22px" }}>
                <div className="skeleton" style={{ width: 3, height: 36, borderRadius: 3, flexShrink: 0 }} />
                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 13, width: "60%", marginBottom: 7 }} />
                  <div className="skeleton" style={{ height: 11, width: "35%" }} />
                </div>
                <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 32px", gap: "12px" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={22} color="var(--text-muted)" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>Nenhum lançamento encontrado</p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Tente ajustar os filtros ou o período</p>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`page-${safePage}-${typeFilter}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
              {pageEntries.map((e, i) => {
                const isEntrada = e.tipo === "entrada";
                const color     = isEntrada ? "#22c55e" : "#ef4444";
                const d         = new Date(e.data + "T12:00:00");
                const catColor  = CATEGORY_COLORS[e.categoria] ?? (isEntrada ? "#22c55e" : "#ef4444");
                const CatIcon   = CATEGORY_ICONS[e.categoria] ?? (isEntrada ? ArrowUpRight : ArrowDownRight);
                const catLabel  = CATEGORY_LABELS[e.categoria] ?? e.categoria;
                return (
                  <motion.div key={e.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    style={{
                      display: "flex", alignItems: "center", gap: isMobileOrTablet ? "10px" : "14px",
                      padding: isMobileOrTablet ? "12px 16px 12px 0" : "14px 22px 14px 0",
                      borderBottom: i < pageEntries.length - 1 ? "1px solid rgba(255,255,255,0.035)" : "none",
                      transition: "background 0.15s",
                    }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                  >
                    {/* Barra lateral colorida */}
                    <div style={{ width: 3, alignSelf: "stretch", borderRadius: "0 3px 3px 0", background: catColor, flexShrink: 0, opacity: 0.8, minHeight: 36 }} />

                    {/* Foto do veículo ou ícone da categoria */}
                    <div style={{
                      width: isMobile ? 38 : 46, height: isMobile ? 38 : 46, borderRadius: 10,
                      flexShrink: 0, overflow: "hidden", position: "relative",
                      border: `1px solid ${catColor}22`,
                      background: `${catColor}14`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {e.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.foto_url}
                          alt="Foto do veículo"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(ev) => {
                            // Se a foto falhar, esconde img e mostra ícone de categoria
                            const img = ev.target as HTMLImageElement;
                            img.style.display = "none";
                            const parent = img.parentElement;
                            if (parent && !parent.querySelector(".cat-icon-fallback")) {
                              const iconDiv = document.createElement("div");
                              iconDiv.className = "cat-icon-fallback";
                              iconDiv.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;";
                              parent.appendChild(iconDiv);
                            }
                          }}
                        />
                      ) : (
                        <CatIcon size={isMobile ? 15 : 18} color={catColor} />
                      )}
                    </div>

                    {/* Descrição e detalhes */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: isMobileOrTablet ? "12px" : "13px", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                        {e.descricao}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.toLocaleDateString("pt-BR")}</span>
                        {/* Badge categoria */}
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${catColor}14`, color: catColor, border: `1px solid ${catColor}25`, letterSpacing: "0.02em" }}>
                          {catLabel}
                        </span>
                        {/* Badge tipo */}
                        {!isMobile && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${color}10`, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                            {isEntrada ? "Entrada" : "Saída"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Valor */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{
                        fontSize: "clamp(12px, 2.5vw, 15px)",
                        fontWeight: "800",
                        color,
                        letterSpacing: "-0.5px",
                        lineHeight: 1,
                      }}>
                        {isEntrada ? "+" : "-"}{fmt(Number(e.valor))}
                      </p>
                      {isMobile && (
                        <span style={{ fontSize: 9, color, opacity: 0.7, fontWeight: 600 }}>{isEntrada ? "Entrada" : "Saída"}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {!isLoading && totalPages > 1 && (
          <div style={{
            display: "flex",
            flexDirection: isMobileOrTablet ? "column" : "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobileOrTablet ? "12px 16px" : "12px 22px",
            borderTop: "1px solid var(--border)",
            background: "rgba(255,255,255,0.02)",
            gap: "10px",
          }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {(safePage - 1) * PAGE_SIZE + 1} ao {Math.min(safePage * PAGE_SIZE, entries.length)} de{" "}
              <strong style={{ color: "var(--text-secondary)" }}>{entries.length}</strong> registros
            </span>
            <div className="filter-chip-row" style={{ justifyContent: "center" }}>
              <PaginationBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Pagina anterior"><ChevronLeft size={13} /></PaginationBtn>
              {pageNumbers.map((p, idx) =>
                p === "..." ? (
                  <span key={`dots-${idx}`} style={{ width: "30px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "var(--text-muted)", userSelect: "none" }}>...</span>
                ) : (
                  <PaginationBtn key={p} active={safePage === p} onClick={() => setPage(p as number)} aria-label={`Pagina ${p}`} aria-current={safePage === p ? "page" : undefined}>{p}</PaginationBtn>
                )
              )}
              <PaginationBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Proxima pagina"><ChevronRight size={13} /></PaginationBtn>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function PaginationBtn({ children, onClick, disabled, active, "aria-label": ariaLabel, "aria-current": ariaCurrent }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; "aria-label"?: string; "aria-current"?: "page" | undefined; }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel} aria-current={ariaCurrent} style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: "30px", height: "30px", padding: "0 6px", borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: active ? "700" : "500", background: active ? "var(--brand)" : "var(--surface)", color: active ? "#fff" : "var(--text-secondary)", border: `1px solid ${active ? "transparent" : "var(--border)"}`, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, transition: "background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s" }}>
      {children}
    </button>
  );
}