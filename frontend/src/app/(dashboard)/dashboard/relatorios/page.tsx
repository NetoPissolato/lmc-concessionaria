"use client";

import { useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, BarChart3, Users, Car, DollarSign,
  TrendingUp, Award, Calendar, ChevronLeft, ChevronRight,
  FileSpreadsheet, Loader2, CheckCircle2, AlertCircle,
  Bike, Banknote, Package,
} from "lucide-react";
import { reportsApi } from "@/lib/api";
import { toast } from "@/lib/toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type ReportKey = "vendas" | "estoque" | "financeiro" | "clientes" | "lucratividade" | "comissoes";
type ExportFormat = "pdf" | "excel";
type LoadState = "idle" | "loading" | "done" | "error";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

import { fmtCurrency as fmt } from "@/lib/formatters";

// ─── Config dos relatórios ────────────────────────────────────────────────────
const REPORTS: {
  key: ReportKey;
  title: string;
  description: string;
  details: string;
  icon: React.ElementType;
  color: string;
  secondIcon?: React.ElementType;
  hasMes?: boolean;
  hasDash?: boolean;
  tags: string[];
}[] = [
  {
    key: "vendas",
    title: "Relatório de Vendas",
    description: "Análise completa por período, cliente, vendedor e forma de pagamento",
    details: "Inclui: resumo executivo (total, ticket médio, status), tabela detalhada com cada venda, comissões e forma de pagamento.",
    icon: BarChart3,
    color: "#22c55e",
    hasMes: true,
    hasDash: true,
    tags: ["Vendas", "Período", "Vendedores", "Comissão"],
  },
  {
    key: "estoque",
    title: "Relatório de Estoque",
    description: "Inventário completo com custo, margem e status de cada veículo",
    details: "Inclui: resumo por status, carros e motos separados em abas, custo total, valor anunciado e margem % por item.",
    icon: Car,
    secondIcon: Bike,
    color: "#38bdf8",
    tags: ["Estoque", "Carros", "Motos", "Margem"],
  },
  {
    key: "financeiro",
    title: "Relatório Financeiro",
    description: "DRE mensal com entradas, saídas e lucro líquido do período",
    details: "Inclui: DRE mês a mês (jan–dez), total anual consolidado e listagem de todos os lançamentos financeiros.",
    icon: DollarSign,
    color: "#f59e0b",
    hasDash: true,
    tags: ["Financeiro", "DRE", "Entradas", "Saídas"],
  },
  {
    key: "clientes",
    title: "Relatório de Clientes",
    description: "Cadastro, histórico de compras e segmentação da carteira",
    details: "Inclui: resumo da carteira, ranking por total gasto, histórico de veículos por cliente e clientes recorrentes.",
    icon: Users,
    color: "#a78bfa",
    tags: ["Clientes", "CRM", "Histórico", "Recorrentes"],
  },
  {
    key: "lucratividade",
    title: "Lucratividade",
    description: "Ranking de lucro e margem por veículo, com análise de custo total",
    details: "Inclui: ranking do mais ao menos lucrativo, custo total (compra + multas + despesas), margem % e lucro bruto de cada venda.",
    icon: TrendingUp,
    color: "#f97316",
    hasDash: true,
    tags: ["Lucro", "Margem", "Análise", "Ranking"],
  },
  {
    key: "comissoes",
    title: "Comissões",
    description: "Desempenho e comissões detalhadas por vendedor no período",
    details: "Inclui: ranking de vendedores, receita gerada por cada um, total de comissões e detalhamento venda a venda.",
    icon: Award,
    color: "#ec4899",
    hasMes: true,
    tags: ["Vendedores", "Comissão", "RH", "Performance"],
  },
];

// ─── Component: Report Card ───────────────────────────────────────────────────
function ReportCard({
  report,
  resolvedPeriod,
  delay,
}: {
  report: typeof REPORTS[number];
  resolvedPeriod: { data_inicio: string; data_fim: string };
  delay: number;
}) {
  const [pdfState,   setPdfState]   = useState<LoadState>("idle");
  const [excelState, setExcelState] = useState<LoadState>("idle");
  const [open,       setOpen]       = useState(false);

  const Icon  = report.icon;
  const Icon2 = report.secondIcon;

  const handleExport = async (format: ExportFormat) => {
    const setState = format === "pdf" ? setPdfState : setExcelState;
    setState("loading");
    try {
      const params = resolvedPeriod;
      const data   = await reportsApi[report.key](params as never);

      if (format === "pdf") {
        const { exportVendasPDF, exportEstoquePDF, exportFinanceiroPDF, exportClientesPDF, exportLucratividadePDF, exportComissoesPDF } =
          await import("@/lib/exportPDF");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fns: Record<ReportKey, (d: any) => void> = {
          vendas:        exportVendasPDF,
          estoque:       exportEstoquePDF,
          financeiro:    exportFinanceiroPDF,
          clientes:      exportClientesPDF,
          lucratividade: exportLucratividadePDF,
          comissoes:     exportComissoesPDF,
        };
        fns[report.key](data);
      } else {
        const { exportVendasExcel, exportEstoqueExcel, exportFinanceiroExcel, exportClientesExcel, exportLucratividadeExcel, exportComissoesExcel } =
          await import("@/lib/exportExcel");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fns: Record<ReportKey, (d: any) => void> = {
          vendas:        exportVendasExcel,
          estoque:       exportEstoqueExcel,
          financeiro:    exportFinanceiroExcel,
          clientes:      exportClientesExcel,
          lucratividade: exportLucratividadeExcel,
          comissoes:     exportComissoesExcel,
        };
        fns[report.key](data);
      }

      setState("done");
      toast.success(`${report.title} exportado com sucesso!`);
      setTimeout(() => setState("idle"), 3000);
    } catch (err: unknown) {
      console.error(err);
      setState("error");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (err as any)?.response?.status;
      if (status === 401) {
        toast.error("Sessão expirada. Redirecionando para login...");
        setTimeout(() => { window.location.href = "/login"; }, 1500);
      } else {
        toast.error("Erro ao gerar relatório. Tente novamente.");
      }
      setTimeout(() => setState("idle"), 4000);
    }
  };

  const BtnIcon = (state: LoadState, format: ExportFormat) => {
    if (state === "loading") return <Loader2 size={13} className="animate-spin" />;
    if (state === "done")    return <CheckCircle2 size={13} />;
    if (state === "error")   return <AlertCircle size={13} />;
    return format === "pdf" ? <FileText size={13} /> : <FileSpreadsheet size={13} />;
  };

  const btnColor = (state: LoadState, base: string) => {
    if (state === "done")  return { border: "1px solid #22c55e44", background: "rgba(34,197,94,0.08)", color: "#22c55e" };
    if (state === "error") return { border: "1px solid #ef444444", background: "rgba(239,68,68,0.08)",  color: "#ef4444" };
    return {};
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "var(--surface)",
        border: `1px solid var(--border)`,
        borderRadius: "16px",
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      whileHover={{
        borderColor: `${report.color}40`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px ${report.color}18`,
      }}
    >
      {/* Accent gradient bar */}
      <div style={{ height: "3px", background: `linear-gradient(90deg, transparent, ${report.color}, transparent)` }} />

      <div style={{ padding: "clamp(14px, 4vw, 22px) clamp(14px, 4vw, 24px) 18px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "14px" }}>
          <div style={{
            width: 50, height: 50, borderRadius: "14px", flexShrink: 0,
            background: `${report.color}14`, border: `1px solid ${report.color}25`,
            display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
          }}>
            <Icon size={22} color={report.color} strokeWidth={1.8} />
            {Icon2 && (
              <div style={{
                position: "absolute", bottom: -4, right: -4,
                width: 20, height: 20, borderRadius: "6px",
                background: "var(--surface)", border: `1px solid ${report.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon2 size={11} color={report.color} />
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "-0.3px", lineHeight: 1.2 }}>
              {report.title}
            </p>
            <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "5px", lineHeight: 1.55 }}>
              {report.description}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "14px" }}>
          {report.tags.map(tag => (
            <span key={tag} style={{
              fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px",
              background: `${report.color}10`, border: `1px solid ${report.color}20`, color: report.color,
            }}>{tag}</span>
          ))}
        </div>

        {/* "O que inclui" accordion */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: "100%", textAlign: "left", background: "none", border: "none",
            cursor: "pointer", fontSize: "11px", color: "var(--text-muted)",
            display: "flex", alignItems: "center", gap: "4px", marginBottom: open ? "10px" : "14px",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = report.color)}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <span style={{ fontWeight: 600 }}>O que inclui</span>
          <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "inline-block", marginTop: "1px" }}>▾</span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden", marginBottom: "14px" }}
            >
              <div style={{
                background: `${report.color}08`,
                border: `1px solid ${report.color}18`,
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "11px",
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}>
                {report.details}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--border)", marginBottom: "14px" }} />

        {/* Export buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 1fr))", gap: "8px" }}>
          {/* PDF */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleExport("pdf")}
            disabled={pdfState === "loading"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              padding: "10px 14px", borderRadius: "10px",
              background: pdfState === "idle" ? "rgba(239,68,68,0.06)" : undefined,
              border: pdfState === "idle" ? "1px solid rgba(239,68,68,0.2)" : undefined,
              color: pdfState === "idle" ? "#ef4444" : undefined,
              cursor: pdfState === "loading" ? "not-allowed" : "pointer",
              fontSize: "13px", fontWeight: "600",
              transition: "all 0.15s",
              ...btnColor(pdfState, "#ef4444"),
            }}
          >
            {BtnIcon(pdfState, "pdf")}
            {pdfState === "loading" ? "Gerando..." : pdfState === "done" ? "Baixado!" : "PDF"}
          </motion.button>

          {/* Excel */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleExport("excel")}
            disabled={excelState === "loading"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              padding: "10px 14px", borderRadius: "10px",
              background: excelState === "idle" ? "rgba(34,197,94,0.06)" : undefined,
              border: excelState === "idle" ? "1px solid rgba(34,197,94,0.2)" : undefined,
              color: excelState === "idle" ? "#22c55e" : undefined,
              cursor: excelState === "loading" ? "not-allowed" : "pointer",
              fontSize: "13px", fontWeight: "600",
              transition: "all 0.15s",
              ...btnColor(excelState, "#22c55e"),
            }}
          >
            {BtnIcon(excelState, "excel")}
            {excelState === "loading" ? "Gerando..." : excelState === "done" ? "Baixado!" : "Excel"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const now   = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Modo de filtro
  type PeriodMode = "hoje" | "semana" | "mes" | "ano" | "custom";
  const [mode,       setMode]       = useState<PeriodMode>("mes");
  const [ano,        setAno]        = useState(now.getFullYear());
  const [mes,        setMes]        = useState(now.getMonth() + 1);
  const [dataInicio, setDataInicio] = useState(todayStr);
  const [dataFim,    setDataFim]    = useState(todayStr);

  // Resolve data_inicio/data_fim para cada modo
  const resolvedPeriod = () => {
    const d  = new Date();
    if (mode === "hoje") {
      return { data_inicio: todayStr, data_fim: todayStr };
    }
    if (mode === "semana") {
      const day  = d.getDay();
      const mon  = new Date(d); mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
      const sun  = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { data_inicio: mon.toISOString().slice(0, 10), data_fim: sun.toISOString().slice(0, 10) };
    }
    if (mode === "mes") {
      const first = new Date(ano, mes - 1, 1).toISOString().slice(0, 10);
      const last  = new Date(ano, mes, 0).toISOString().slice(0, 10);
      return { data_inicio: first, data_fim: last };
    }
    if (mode === "ano") {
      return { data_inicio: `${ano}-01-01`, data_fim: `${ano}-12-31` };
    }
    // custom
    return { data_inicio: dataInicio, data_fim: dataFim };
  };

  const prevMonth = () => { if (mes === 1) { setMes(12); setAno(a => a - 1); } else setMes(m => m - 1); };
  const nextMonth = () => {
    const isNow = mes === now.getMonth() + 1 && ano === now.getFullYear();
    if (isNow) return;
    if (mes === 12) { setMes(1); setAno(a => a + 1); } else setMes(m => m + 1);
  };
  const isCurrentMonth = mes === now.getMonth() + 1 && ano === now.getFullYear();

  const PERIOD_MODES: { key: PeriodMode; label: string }[] = [
    { key: "hoje",   label: "Hoje"         },
    { key: "semana", label: "Esta Semana"  },
    { key: "mes",    label: "Mês"          },
    { key: "ano",    label: "Ano"          },
    { key: "custom", label: "Personalizado" },
  ];

  const periodLabel = () => {
    const { data_inicio, data_fim } = resolvedPeriod();
    const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    if (data_inicio === data_fim) return fmt(data_inicio);
    return `${fmt(data_inicio)} até ${fmt(data_fim)}`;
  };

  const { isMobile, isMobileOrTablet } = useBreakpoint();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobileOrTablet ? "16px" : "28px" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FileText size={18} color="var(--brand)" strokeWidth={1.8} />
            </div>
            <h1 style={{ fontSize: "clamp(16px, 4vw, 22px)", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
              Relatórios
            </h1>
          </div>
          {!isMobile && (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: 48 }}>
              Exportação profissional em PDF e Excel com dados reais
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 5, fontSize: "11px", fontWeight: "600",
            color: "var(--brand)", background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.15)",
            padding: "5px 12px", borderRadius: "20px", whiteSpace: "nowrap",
          }}>
            <Package size={11} /> {REPORTS.length} relatórios disponíveis
          </span>
        </div>
      </motion.div>

      {/* ── Filtros de período ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
        style={{
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px",
          padding: isMobileOrTablet ? "14px 16px" : "18px 22px", display: "flex", flexDirection: "column", gap: 12,
        }}>
        {/* Label + Pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Calendar size={15} color="var(--brand)" />
            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>Período</span>
          </div>
          {/* Mode pills - wraps naturally on small screens */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PERIOD_MODES.map(pm => {
              const active = mode === pm.key;
              return (
                <button key={pm.key} onClick={() => setMode(pm.key)}
                  style={{
                    padding: isMobileOrTablet ? "5px 10px" : "5px 14px",
                    borderRadius: 20,
                    fontSize: isMobileOrTablet ? "11px" : "12px",
                    fontWeight: active ? 700 : 500,
                    border: `1.5px solid ${active ? "var(--brand)" : "var(--border)"}`,
                    background: active ? "rgba(245,166,35,0.12)" : "var(--surface-2)",
                    color: active ? "var(--brand)" : "var(--text-muted)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {pm.label}
                </button>
              );
            })}
          </div>
          {/* Period label result - own row always visible */}
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", color: "var(--text-muted)" }}>
            <Calendar size={12} color="var(--brand)" />
            <strong style={{ color: "var(--text-primary)", fontSize: isMobileOrTablet ? "11px" : "12px" }}>{periodLabel()}</strong>
          </span>
        </div>

        {/* Controles dependentes do modo */}
        {mode === "mes" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <button onClick={prevMonth} style={{ width: 34, height: 38, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}><ChevronLeft size={13} /></button>
              <div style={{ padding: "0 14px", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", height: 38, display: "flex", alignItems: "center", gap: 8, minWidth: isMobileOrTablet ? 110 : 136, justifyContent: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>{MONTHS[mes - 1]} {ano}</span>
                {isCurrentMonth && <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--brand)", background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.2)", padding: "1px 6px", borderRadius: 20 }}>Atual</span>}
              </div>
              <button onClick={nextMonth} disabled={isCurrentMonth} style={{ width: 34, height: 38, background: "none", border: "none", cursor: isCurrentMonth ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isCurrentMonth ? "var(--border)" : "var(--text-muted)" }}><ChevronRight size={13} /></button>
            </div>
            {!isMobile && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Inclui todos os dias do mês selecionado</span>}
          </div>
        )}

        {mode === "ano" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <button onClick={() => setAno(a => a - 1)} style={{ width: 34, height: 34, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}><ChevronLeft size={13} /></button>
              <div style={{ padding: "0 20px", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--text-primary)" }}>{ano}</span>
              </div>
              <button onClick={() => setAno(a => Math.min(a + 1, now.getFullYear()))} style={{ width: 34, height: 34, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}><ChevronRight size={13} /></button>
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Relatório anual completo de 01/01 a 31/12</span>
          </div>
        )}

        {mode === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)" }}>De</label>
              <input type="date" value={dataInicio} max={dataFim}
                onChange={e => setDataInicio(e.target.value)}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: "13px", color: "var(--text-primary)", outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)" }}>até</label>
              <input type="date" value={dataFim} min={dataInicio} max={todayStr}
                onChange={e => setDataFim(e.target.value)}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: "13px", color: "var(--text-primary)", outline: "none" }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Info banner ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }}
        style={{
          background: "linear-gradient(135deg, rgba(245,166,35,0.06) 0%, rgba(245,166,35,0.02) 100%)",
          border: "1px solid rgba(245,166,35,0.15)", borderRadius: "12px",
          padding: isMobileOrTablet ? "12px 14px" : "14px 20px",
          display: "flex", alignItems: "flex-start", gap: isMobileOrTablet ? 10 : 14,
          flexWrap: "wrap",
        }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Download size={17} color="var(--brand)" strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* On mobile: stacked, on desktop: inline */}
          <div style={{ display: "flex", flexDirection: "column", gap: isMobileOrTablet ? 6 : 2 }}>
            <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <FileText size={13} color="#ef4444" style={{ flexShrink: 0 }} /> PDF profissional com cabeçalho, tabelas organizadas e rodapé numerado
            </p>
            <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <FileSpreadsheet size={13} color="#22c55e" style={{ flexShrink: 0 }} /> Excel com múltiplas abas, valores em R$ formatados e linha de totais
            </p>
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: isMobileOrTablet ? 4 : 2 }}>
            Clique em PDF ou Excel em cada relatório para gerar e baixar automaticamente. Dados em tempo real.
          </p>
        </div>
      </motion.div>

      {/* ── Grade de relatórios ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: isMobileOrTablet ? "12px" : "18px" }}>
        {REPORTS.map((r, i) => (
          <ReportCard key={r.key} report={r} resolvedPeriod={resolvedPeriod()} delay={i * 0.06 + 0.1} />
        ))}
      </div>

    </div>
  );
}
