"use client";

import { useEffect, useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Car, Bike, TrendingUp, DollarSign, ShoppingBag,
  Package, Activity,
  CalendarDays, ChevronRight, BarChart2, AlertTriangle, Clock,
} from "lucide-react";
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { salesApi, authApi } from "@/lib/api";
import { DashboardStats, DailyChartDataPoint, Sale, VehicleStatus, VEHICLE_STATUS_LABELS } from "@/types";


import { fmtCurrency as fmt } from "@/lib/formatters";

// --- Formatters ---------------------------------------------------------------
const fmtShort = (value: number) => fmt(value);

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// --- Animated Counter ---------------------------------------------------------
function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const startTime = performance.now();
    const duration = 1000;
    const animate = (t: number) => {
      const p = Math.min((t - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setDisplayed(value * eased);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  const formatted = decimals > 0
    ? displayed.toFixed(decimals)
    : Math.round(displayed).toLocaleString("pt-BR");
  return <span className="animated-number">{prefix}{formatted}{suffix}</span>;
}

// --- Sale Status Config -------------------------------------------------------
// ──────────────────────────────────────────────────────────────────────────────────
const SALE_STATUS_CFG = {
  concluida: { label: "Concluída", color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  pendente:  { label: "Pendente",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  cancelada: { label: "Cancelada", color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
};

// ─── Sale Card (Últimas Vendas) ───────────────────────────────────────────────
function SaleCard({ sale, isAdmin, delay = 0 }: { sale: Sale; isAdmin: boolean; delay?: number }) {
  const mainPhoto     = sale.vehicle_photos?.find(p => p.is_main) ?? sale.vehicle_photos?.[0];
  const photoUrl      = mainPhoto?.url ?? (sale.vehicle_tipo === "moto" ? "/moto-placeholder.svg" : "/car-placeholder.svg");
  const isPlaceholder = !mainPhoto;
  const stCfg         = SALE_STATUS_CFG[sale.status as keyof typeof SALE_STATUS_CFG] ?? SALE_STATUS_CFG.concluida;
  const isMoto        = sale.vehicle_tipo === "moto";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      exit={{ opacity: 0, scale: 0.96, y: -6, transition: { duration: 0.22 } }}
      layout
      style={{
        display: "flex", alignItems: "center", gap: "14px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "12px 14px",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      whileHover={{
        borderColor: "rgba(245,166,35,0.25)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
      }}
    >
      {/* Thumbnail flutuante */}
      <div style={{
        width: "72px", height: "54px", flexShrink: 0,
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.03)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <img
          src={photoUrl}
          alt={sale.vehicle_info || "Veículo"}
          style={{
            width: "100%", height: "100%",
            objectFit: isPlaceholder ? "contain" : "cover",
            objectPosition: "center",
            padding: isPlaceholder ? "10px" : "0",
            opacity: isPlaceholder ? 0.3 : 1,
            filter: isPlaceholder ? "brightness(0) invert(0.5)" : "none",
          }}
        />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Linha 1: nome + status */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
          <p style={{
            fontSize: "13px", fontWeight: "700", color: "var(--text-primary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            flex: 1, minWidth: 0,
          }}>
            {sale.vehicle_info || "Veículo"}
          </p>
          <span style={{
            fontSize: "11px", fontWeight: "700", flexShrink: 0,
            color: stCfg.color, background: stCfg.bg,
            padding: "2px 8px", borderRadius: "20px",
            textTransform: "uppercase", letterSpacing: "0.07em",
            border: `1px solid ${stCfg.color}28`,
          }}>
            {stCfg.label}
          </span>
        </div>

        {/* Linha 2: tipo badge + placa + cliente · data */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {sale.vehicle_tipo && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "3px",
              fontSize: "11px", fontWeight: "800",
              color: isMoto ? "#f97316" : "#38bdf8",
              background: isMoto ? "rgba(249,115,22,0.1)" : "rgba(56,189,248,0.1)",
              border: `1px solid ${isMoto ? "rgba(249,115,22,0.2)" : "rgba(56,189,248,0.2)"}`,
              padding: "1px 6px", borderRadius: "4px",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {isMoto ? <Bike size={8} /> : <Car size={8} />}
              &nbsp;{isMoto ? "Moto" : "Carro"}
            </span>
          )}
          {sale.vehicle_placa && (
            <span style={{
              fontSize: "11.5px", fontFamily: "monospace", fontWeight: "700",
              color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em",
              background: "rgba(255,255,255,0.04)", padding: "1px 6px",
              borderRadius: "4px", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {sale.vehicle_placa}
            </span>
          )}
          <span style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sale.cliente_nome || "-"}
          </span>
          <span style={{ fontSize: "11.5px", color: "var(--text-muted)", opacity: 0.5, flexShrink: 0 }}>
            · {new Date(sale.data_venda).toLocaleDateString("pt-BR")}
          </span>
        </div>

        {/* Linha 3: preço (admin) */}
        {isAdmin && (
          <p style={{
            fontSize: "14px", fontWeight: "800", color: "#22c55e",
            letterSpacing: "-0.8px", marginTop: "5px", lineHeight: 1,
          }}>
            {fmtShort(Number(sale.valor_venda))}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string }> = {
  disponivel:    { color: "#22c55e" },
  reservado:     { color: "#f59e0b" },
  em_preparacao: { color: "#38bdf8" },
  em_manutencao: { color: "#f97316" },
  vendido:       { color: "#a78bfa" },
};

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "var(--radius-md)", padding: "10px 14px",
      fontSize: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      <p style={{ color: "var(--text-muted)", marginBottom: "6px", fontWeight: "600", fontSize: "11px" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: p.color, display: "inline-block" }} />
          {p.name === "faturamento"
            ? `Fat: ${fmt(p.value)}`
            : p.name === "saidas"
            ? `Saídas: ${fmt(p.value)}`
            : `Vendas: ${p.value} und.`}
        </p>
      ))}
    </div>
  );
};


// ─── Dashboard Page ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());

  // Update clock every minute so greeting stays accurate
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard", year, month],
    queryFn: () => salesApi.getDashboard(year, month),
    refetchInterval: 30_000,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const user      = authApi.getUser();
  const isAdmin   = user?.role === "admin";
  const { isMobileOrTablet } = useBreakpoint();


  // ─── Chart state ──────────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<"mensal" | "diario">("mensal");
  const [vis, setVis] = useState({ faturamento: true, vendas: true, saidas: true });
  const toggleSeries = (k: keyof typeof vis) => setVis(prev => ({ ...prev, [k]: !prev[k] }));

  const apiAnnual = stats?.annual_chart ?? [];
  const apiDaily  = (stats as (DashboardStats & { daily_chart?: DailyChartDataPoint[] }))?.daily_chart ?? [];

  const chartData = period === "mensal"
    ? MONTH_NAMES.map((name, i) => {
        const mes   = i + 1;
        const found = apiAnnual.find(d => d.mes === mes);
        return {
          name,
          faturamento: found ? Number(found.faturamento) : 0,
          vendas:      found ? found.total_vendas         : 0,
          saidas:      found ? Number(found.saidas ?? 0) : 0,
        };
      })
    : (() => {
        const today = now.getDate();
        const lastDay = apiDaily.length > 0 ? Math.max(...apiDaily.map(d => d.dia)) : today;
        const maxDay  = Math.max(today, lastDay);
        return Array.from({ length: maxDay }, (_, i) => {
          const dia   = i + 1;
          const found = apiDaily.find(d => d.dia === dia);
          return {
            name:        String(dia),
            faturamento: found ? Number(found.faturamento) : 0,
            vendas:      found ? found.total_vendas         : 0,
            saidas:      found ? Number(found.saidas ?? 0) : 0,
          };
        });
      })();

  const statusItems = [
    { key: "disponivel",    value: stats?.disponivel    ?? 0 },
    { key: "reservado",     value: stats?.reservado     ?? 0 },
    { key: "em_preparacao", value: stats?.em_preparacao ?? 0 },
    { key: "em_manutencao", value: stats?.em_manutencao ?? 0 },
    { key: "vendido",       value: stats?.vendido       ?? 0 },
  ];
  // "Total em estoque" não inclui vendidos
  const totalVehicles = statusItems
    .filter(s => s.key !== "vendido")
    .reduce((a, b) => a + b.value, 0);
  // Total geral (com vendidos) usado apenas para calcular percentuais
  const totalAll = statusItems.reduce((a, b) => a + b.value, 0);




  if (isLoading) return <DashboardSkeleton />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── Cabeçalho compacto (o banner decorativo de 240px saiu: o topo é para números) ── */}
      <div className="dash-topo">
        <div>
          <h1 className="dash-topo__titulo">
            {now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite"}{user?.nome ? `, ${String(user.nome).split(" ")[0]}` : ""}
          </h1>
          <p className="dash-topo__sub">
            {(() => { const d = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }); return d.charAt(0).toUpperCase() + d.slice(1); })()}
          </p>
        </div>
        <div className="dash-topo__acoes">
          <button className="btn btn-secondary" onClick={() => router.push("/dashboard/veiculos/novo")}>
            <Car size={16} /> Cadastrar veículo
          </button>
          <button className="btn btn-primary" onClick={() => router.push("/dashboard/vendas/nova")}>
            <ShoppingBag size={16} /> Nova venda
          </button>
        </div>
      </div>

      {(stats?.estoque_parado_total ?? 0) > 0 && (
        <button className="dash-alerta" onClick={() => document.getElementById("estoque-parado")?.scrollIntoView({ behavior: "smooth" })}>
          <AlertTriangle size={18} />
          <span>
            <strong>{stats!.estoque_parado_total} {stats!.estoque_parado_total === 1 ? "veículo parado" : "veículos parados"} há mais de 60 dias.</strong>{" "}
            Vale revisar preço ou anúncio.
          </span>
          <ChevronRight size={16} />
        </button>
      )}

      {/* ── KPI STRIP ────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="kpi-strip"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        {([
          { label: "Disponíveis",    formatted: String(stats?.disponivel || 0),              sub: (stats?.reservado ? `${stats.reservado} reservado(s)` : "à venda agora"), color: "#38bdf8", icon: Package },
          ...(isAdmin ? [
            { label: "Faturamento",  formatted: fmtShort(Number(stats?.faturamento_mes||0)), sub: "vendas concluídas no mês", color: "#22c55e", icon: DollarSign },
            // Lucro de verdade: preço de venda − custo total do veículo (compra, despesas e multas).
            // O antigo "Lucro Líquido" era o saldo do caixa e incluía a COMPRA de carros como "prejuízo".
            { label: "Lucro bruto",  formatted: fmtShort(Number(stats?.lucro_bruto_mes||0)),  sub: `margem média ${Number(stats?.margem_media_mes||0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, color: "#a78bfa", icon: TrendingUp },
          ] : []),
          { label: "Vendidos no mês", formatted: String(stats?.vendidos_mes || 0),            sub: isAdmin && stats?.ticket_medio_mes ? `ticket médio ${fmtShort(Number(stats.ticket_medio_mes))}` : `${stats?.vendidos_hoje || 0} hoje`, color: "#f59e0b", icon: ShoppingBag },
          { label: "Parados +60 dias", formatted: String(stats?.estoque_parado_total || 0),   sub: "sem vender",      color: (stats?.estoque_parado_total ? "#ef4444" : "#22c55e"), icon: Clock },
        ] as { label: string; formatted: string; sub: string; color: string; icon: React.ElementType }[])
          .map((item, i, arr) => {
            const Ic = item.icon;
            return (
              <div key={item.label} style={{
                padding: "22px 24px",
                borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                position: "relative",
              }}>
                <div style={{
                  position: "absolute", left: 0, top: "18%", bottom: "18%",
                  width: "3px", background: item.color, borderRadius: "0 3px 3px 0",
                }} />
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "10px" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `${item.color}14`, border: `1px solid ${item.color}22`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Ic size={13} color={item.color} strokeWidth={2} />
                  </div>
                  <p style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {item.label}
                  </p>
                </div>
                <p style={{ fontSize: "clamp(14px, 2.5vw, 28px)", fontWeight: "800", color: "#fff", letterSpacing: "-1.5px", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                  {item.formatted}
                </p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "5px" }}>
                  {item.sub}
                </p>
              </div>
            );
          })
        }
      </motion.div>

      {/* ── CHART + STATUS ───────────────────────────────────────────────────── */}
      <div className="dash-grid-2-1">

        {/* Annual Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "16px", padding: "22px",
          }}
        >
          {/* Chart header: title + period toggle + series toggles */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <BarChart2 size={12} color="var(--text-muted)" />
                <span style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Performance {period === "mensal" ? "Mensal" : "Diária"}</span>
              </div>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
                {isAdmin
                  ? `Faturamento & Vendas - ${period === "mensal" ? year : `${MONTH_NAMES[month - 1]} ${year}`}`
                  : `Vendas - ${period === "mensal" ? year : `${MONTH_NAMES[month - 1]} ${year}`}`}
              </h3>
            </div>

            {/* Quebra linha em vez de rolar: com "flex-end" numa linha rolável o botão "Mensal" ficava cortado no celular */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
              {/* Period toggle */}
              <div style={{
                display: "flex", background: "rgba(255,255,255,0.04)",
                borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", padding: "2px",
              }}>
                {(["mensal", "diario"] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    padding: "4px 10px", borderRadius: "6px", border: "none", cursor: "pointer",
                    fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em",
                    background: period === p ? "rgba(245,166,35,0.15)" : "transparent",
                    color: period === p ? "#F5A623" : "rgba(255,255,255,0.35)",
                    transition: "all 0.15s",
                  }}>{p === "mensal" ? "Mensal" : "Diário"}</button>
                ))}
              </div>

              {/* Series toggles */}
              <div className="filter-chip-row">
                {([
                  ...(isAdmin ? [{ key: "faturamento" as const, label: "Faturamento", color: "#22c55e" }] : []),
                  { key: "vendas" as const, label: "Vendas", color: "#F5A623" },
                  // Saídas do caixa: só o administrador vê (o backend nem manda para funcionário)
                  ...(isAdmin ? [{ key: "saidas" as const, label: "Saídas", color: "#ef4444" }] : []),
                ]).map(({ key, label, color }) => (
                  <button key={key} onClick={() => toggleSeries(key)} style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "4px 9px", borderRadius: "6px", border: `1px solid ${vis[key] ? color + "40" : "rgba(255,255,255,0.06)"}`,
                    background: vis[key] ? color + "12" : "transparent",
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: vis[key] ? color : "rgba(255,255,255,0.2)" }} />
                    <span style={{ fontSize: "11.5px", fontWeight: "600", color: vis[key] ? color : "rgba(255,255,255,0.3)", transition: "color 0.15s" }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: isAdmin ? -16 : -28, bottom: 0 }}>
              <defs>
                <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11.5, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              {isAdmin && vis.faturamento && (
                <YAxis yAxisId="fat" tick={{ fontSize: 11.5, fill: "var(--text-muted)" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              )}
              <YAxis yAxisId="vnd" orientation={isAdmin && vis.faturamento ? "right" : "left"}
                tick={{ fontSize: 11.5, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              {/* Faturamento - area */}
              {isAdmin && vis.faturamento && (
                <Area yAxisId="fat" type="monotone" dataKey="faturamento" name="faturamento"
                  stroke="#22c55e" strokeWidth={2} fill="url(#gradFat)" dot={false}
                  activeDot={{ r: 4, fill: "#22c55e", stroke: "var(--surface)", strokeWidth: 2 }} />
              )}
              {/* Saídas - area */}
              {isAdmin && vis.saidas && (
                <Area yAxisId={isAdmin && vis.faturamento ? "fat" : "vnd"}
                  type="monotone" dataKey="saidas" name="saidas"
                  stroke="#ef4444" strokeWidth={1.5} fill="url(#gradSaidas)" dot={false}
                  strokeDasharray="4 2"
                  activeDot={{ r: 4, fill: "#ef4444", stroke: "var(--surface)", strokeWidth: 2 }} />
              )}
              {/* Vendas - bar */}
              {vis.vendas && (
                <Bar yAxisId="vnd" dataKey="vendas" name="vendas" fill="#F5A623" opacity={0.75}
                  radius={[3, 3, 0, 0]} maxBarSize={14} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status Distribution "” progress bars */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "16px", padding: "22px",
            display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <Package size={12} color="var(--text-muted)" />
            <span style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Estoque</span>
          </div>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "20px", letterSpacing: "-0.3px" }}>
            Por Status
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
            {statusItems.map(({ key, value }) => {
              const cfg = STATUS_CFG[key];
              const pct = totalAll > 0 ? Math.round((value / totalAll) * 100) : 0;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{VEHICLE_STATUS_LABELS[key as VehicleStatus]}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{pct}%</span>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "#fff", minWidth: "20px", textAlign: "right" }}>{value}</span>
                    </div>
                  </div>
                  <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.05)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
                      style={{ height: "100%", borderRadius: "2px", background: cfg.color, minWidth: pct > 0 ? 4 : 0 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Total em estoque</span>
            <span style={{ fontSize: "18px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px" }}>{totalVehicles}</span>
          </div>
        </motion.div>
      </div>

      {/* -- ESTOQUE PARADO: o que o dono precisa decidir --------------------- */}
      {(stats?.estoque_parado?.length ?? 0) > 0 && (
        <section id="estoque-parado" className="dash-card">
          <div className="dash-card__topo">
            <div>
              <h3 className="dash-card__titulo">Parados há mais de 60 dias</h3>
              <p className="dash-card__sub">Do mais antigo para o mais recente. Clique para abrir e ajustar.</p>
            </div>
          </div>
          <ul className="dash-parados">
            {stats!.estoque_parado!.map((v) => (
              <li key={v.id}>
                <button onClick={() => router.push(`/dashboard/${v.tipo === "moto" ? "motos" : "veiculos"}/${v.id}`)}>
                  {v.tipo === "moto" ? <Bike size={16} /> : <Car size={16} />}
                  <span className="dash-parados__nome">{v.marca} {v.modelo} {v.ano}</span>
                  <span className="dash-parados__preco">{v.valor_anunciado ? fmt(Number(v.valor_anunciado)) : "sem preço"}</span>
                  <span className="dash-parados__dias">{v.dias_em_estoque} dias</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* -- ÚLTIMAS VENDAS -------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "16px", padding: "22px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <CalendarDays size={12} color="var(--text-muted)" />
              <span style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Histórico</span>
            </div>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "-0.3px" }}>Últimas Vendas</h3>
          </div>
          <button
            onClick={() => router.push("/dashboard/vendas")}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              fontSize: "11px", fontWeight: "600", color: "var(--brand)",
              background: "none", border: "none", cursor: "pointer", padding: "4px 0",
            }}
          >
            Ver todas <ChevronRight size={12} />
          </button>
        </div>

        {stats?.ultimas_vendas?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <AnimatePresence initial={false} mode="popLayout">
              {stats.ultimas_vendas.slice(0, 6).map((sale, i) => (
                <SaleCard key={sale.id} sale={sale} isAdmin={isAdmin} delay={i * 0.05} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState icon={ShoppingBag} message="Nenhuma venda recente" />
        )}
      </motion.div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "36px 20px", gap: "10px",
    }}>
      <div style={{
        width: "48px", height: "48px", borderRadius: "var(--radius-md)",
        background: "var(--surface-2)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={20} color="var(--text-muted)" strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>{message}</p>
      <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Os dados aparecerão aqui</p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ height: "clamp(130px,18vw,200px)", borderRadius: "20px", background: "var(--surface)", border: "1px solid var(--border)" }} className="skeleton" />
      <div style={{ height: "88px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)" }} className="skeleton" />
      <div className="dash-grid-2-1">
        <div className="skeleton" style={{ height: "280px", borderRadius: "16px" }} />
        <div className="skeleton" style={{ height: "280px", borderRadius: "16px" }} />
      </div>
      <div className="skeleton" style={{ height: "200px", borderRadius: "16px" }} />
    </div>
  );
}

