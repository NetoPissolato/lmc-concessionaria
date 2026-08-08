"use client";

import { useState, useMemo, useCallback } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, Search, DollarSign, Calendar, Car,
  User, CreditCard, CheckCircle2, Banknote, ArrowRightLeft, Zap,
  Landmark, Users, Repeat, Clock, XCircle, Gauge,
  ChevronLeft, ChevronRight, X, TrendingUp, Filter,
  MapPin, LayoutGrid, LayoutList, SlidersHorizontal, Star,
} from "lucide-react";
import { salesApi, authApi } from "@/lib/api";
import { Sale, PAYMENT_TYPE_LABELS, SaleStatus } from "@/types";
import { useRouter } from "next/navigation";
import { PaymentBadge } from "@/components/PaymentBadge";
import { fmtCurrency as fmt, fmtDate, toTitleCase } from "@/lib/formatters";

// ─── Config ──────────────────────────────────────────────────────────────────
const CARDS_PER_PAGE = 10;
const COLOR = "#3b82f6";
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ─── Status config ───────────────────────────────────────────────────────────
const STATUS_CFG: Record<SaleStatus, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  concluida: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  icon: CheckCircle2, label: "Concluída" },
  pendente:  { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Clock,        label: "Pendente"  },
  cancelada: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",  icon: XCircle,      label: "Cancelada" },
};
const STATUS_FILTERS = [
  { value: "",          label: "Todas",      color: "#64748b" },
  { value: "concluida", label: "Concluídas", color: "#22c55e" },
  { value: "pendente",  label: "Pendentes",  color: "#f59e0b" },
  { value: "cancelada", label: "Canceladas", color: "#ef4444" },
] as const;

function getPayLabel(sale: Sale): string {
  if (sale.forma_pagamento !== "misto" || !sale.payment_methods?.length)
    return PAYMENT_TYPE_LABELS[sale.forma_pagamento] || sale.forma_pagamento;
  return sale.payment_methods
    .map(pm => PAYMENT_TYPE_LABELS[pm.forma as keyof typeof PAYMENT_TYPE_LABELS] || pm.forma)
    .join(" + ");
}

// ─── Card Grid (default) ─────────────────────────────────────────────────────
function SaleCardGrid({ sale, delay, onOpen, isAdmin }: { sale: Sale; delay: number; onOpen: () => void; isAdmin: boolean }) {
  const stCfg  = STATUS_CFG[sale.status as SaleStatus] ?? STATUS_CFG.concluida;
  const StIcon = stCfg.icon;
  const mainPhoto  = sale.vehicle_photos?.find((p: {is_main: boolean}) => p.is_main) ?? sale.vehicle_photos?.[0];
  const photoUrl   = mainPhoto ? mainPhoto.url : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onClick={onOpen}
      whileHover={{ y: -4 }}
      style={{
        background: "var(--surface)", borderRadius: "16px", overflow: "hidden",
        cursor: "pointer", display: "flex", flexDirection: "column",
        border: "1px solid var(--border)", transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${COLOR}50`;
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${COLOR}25`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.25)";
      }}
    >
      {/* Photo */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", background: "#080808" }}>
        {photoUrl ? (
          <img src={photoUrl} alt={sale.vehicle_info || "Veículo"}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transition: "transform 0.5s ease" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          />
        ) : (
          <img src="/car-placeholder.svg" alt="Sem foto"
            style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", opacity: 0.15, padding: "28px", filter: "brightness(0) invert(1)" }}
          />
        )}
        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 40%, rgba(0,0,0,0.75) 100%)" }} />

        {/* Status badge */}
        <div style={{ position: "absolute", top: 12, left: 12 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            fontSize: "10px", fontWeight: "700", color: stCfg.color,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
            border: `1px solid ${stCfg.color}40`, padding: "4px 10px", borderRadius: "20px",
            letterSpacing: "0.05em", textTransform: "uppercase",
          }}>
            <StIcon size={9} /> {stCfg.label}
          </span>
        </div>

        {/* Price overlay */}
        {isAdmin && (
          <div style={{ position: "absolute", bottom: 12, right: 14 }}>
            <p style={{ fontSize: "20px", fontWeight: "900", color: "#10b981", letterSpacing: "-0.8px", lineHeight: 1, textShadow: "0 0 18px rgba(16,185,129,0.55), 0 2px 8px rgba(0,0,0,0.9)", margin: 0 }}>
              {fmt(Number(sale.valor_venda))}
            </p>
          </div>
        )}

        {/* Accent line */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${COLOR}00, ${COLOR}90, ${COLOR}00)` }} />
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1, background: "linear-gradient(180deg, rgba(59,130,246,0.025) 0%, transparent 60%)" }}>

        {/* Vehicle name */}
        <p style={{ fontSize: "15px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.25, margin: "0 0 10px" }}>
          {toTitleCase(sale.vehicle_info || "Veículo")}
        </p>

        {/* Plate + Date */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
          {sale.vehicle_placa && (
            <span style={{ fontSize: "10px", fontFamily: "monospace", fontWeight: "700", color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", padding: "3px 8px", borderRadius: "6px", letterSpacing: "0.1em" }}>
              {sale.vehicle_placa}
            </span>
          )}
          {sale.vehicle_placa && <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
            <Calendar size={10} strokeWidth={1.8} />
            <span>{fmtDate(sale.data_venda)}</span>
          </div>
        </div>

        {/* Payment */}
        <div style={{ marginBottom: "auto", paddingBottom: 10 }}>
          <PaymentBadge forma={sale.forma_pagamento} banco={sale.payment_methods?.[0]?.banco} parcelas={sale.parcelas} size="sm" />
        </div>

        {/* Comprador / Vendedor */}
        <div style={{ paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: sale.vendedor_nome ? "1fr 1fr" : "1fr", gap: 8 }}>
            <div>
              <p style={{ fontSize: "8.5px", fontWeight: "800", color: "rgba(34,197,94,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 3px" }}>Comprador</p>
              <p style={{ fontSize: "11.5px", fontWeight: "600", color: "rgba(255,255,255,0.7)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {toTitleCase(sale.cliente_nome || "-")}
              </p>
            </div>
            {sale.vendedor_nome && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "8.5px", fontWeight: "800", color: "rgba(167,139,250,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 3px" }}>Vendedor</p>
                <p style={{ fontSize: "11.5px", fontWeight: "600", color: "rgba(255,255,255,0.5)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {toTitleCase(sale.vendedor_nome)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Card List (horizontal) ──────────────────────────────────────────────────
function SaleCardList({ sale, delay, onOpen, isAdmin }: { sale: Sale; delay: number; onOpen: () => void; isAdmin: boolean }) {
  const stCfg  = STATUS_CFG[sale.status as SaleStatus] ?? STATUS_CFG.concluida;
  const StIcon = stCfg.icon;
  const mainPhoto = sale.vehicle_photos?.find((p: {is_main: boolean}) => p.is_main) ?? sale.vehicle_photos?.[0];
  const photoUrl  = mainPhoto ? mainPhoto.url : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
      transition={{ delay, duration: 0.2 }}
      onClick={onOpen}
      whileHover={{ x: 2 }}
      className="sale-list-card"
      style={{
        background: "var(--surface)", borderRadius: "14px", overflow: "hidden",
        cursor: "pointer",
        border: "1px solid var(--border)", transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${COLOR}50`;
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${COLOR}20`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Photo */}
      <div className="sale-list-card-photo" style={{ background: "#080808" }}>
        {photoUrl ? (
          <img src={photoUrl} alt={sale.vehicle_info || "Veículo"}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transition: "transform 0.4s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          />
        ) : (
          <img src="/car-placeholder.svg" alt="Sem foto"
            style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", opacity: 0.12, padding: "20px", filter: "brightness(0) invert(1)" }}
          />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 60%, rgba(0,0,0,0.4) 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, top: 0, width: "3px", background: `linear-gradient(180deg, ${stCfg.color}80, ${stCfg.color}20)` }} />
      </div>

      {/* Content */}
      <div className="sale-list-card-body" style={{ flex: 1, padding: "14px 18px", display: "flex", alignItems: "center", gap: 20, overflow: "hidden" }}>
        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "14px", fontWeight: "800", color: "var(--text-primary)", margin: "0 0 4px", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {toTitleCase(sale.vehicle_info || "Veículo")}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
            {sale.vehicle_placa && (
              <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: "700", color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: "4px", letterSpacing: "0.08em" }}>
                {sale.vehicle_placa}
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: "600", color: stCfg.color, background: stCfg.bg, padding: "2px 8px", borderRadius: "12px" }}>
              <StIcon size={9} /> {stCfg.label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
              <User size={10} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{sale.cliente_nome || "-"}</span>
            </div>
            <div style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
              <Calendar size={10} /> {fmtDate(sale.data_venda)}
            </div>
          </div>
        </div>

        {/* Payment */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {isAdmin && (
            <p style={{ fontSize: "18px", fontWeight: "900", color: COLOR, letterSpacing: "-0.5px", lineHeight: 1, margin: 0 }}>
              {fmt(Number(sale.valor_venda))}
            </p>
          )}
          <PaymentBadge forma={sale.forma_pagamento} banco={sale.payment_methods?.[0]?.banco} parcelas={sale.parcelas} size="sm" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onPrev, onNext, onGoTo }: { page: number; totalPages: number; total: number; onPrev: () => void; onNext: () => void; onGoTo: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const from = page * CARDS_PER_PAGE + 1;
  const to   = Math.min((page + 1) * CARDS_PER_PAGE, total);
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) { for (let i = 0; i < totalPages; i++) pages.push(i); }
  else {
    pages.push(0);
    if (page > 2) pages.push("...");
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
    if (page < totalPages - 3) pages.push("...");
    pages.push(totalPages - 1);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 24px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={onPrev} disabled={page === 0}
          style={{ width: 34, height: 34, borderRadius: "9px", background: "var(--surface-2)", border: "1px solid var(--border)", cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.35 : 1, color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, idx) => p === "..." ? (
          <span key={`e-${idx}`} style={{ fontSize: "12px", color: "var(--text-muted)", padding: "0 4px" }}>…</span>
        ) : (
          <button key={p} onClick={() => onGoTo(p as number)}
            style={{ width: 34, height: 34, borderRadius: "9px", background: p === page ? COLOR : "transparent", border: `1px solid ${p === page ? COLOR : "var(--border)"}`, cursor: p === page ? "default" : "pointer", fontSize: "12px", fontWeight: p === page ? 700 : 500, color: p === page ? "#fff" : "var(--text-muted)", transition: "all 0.15s", boxShadow: p === page ? `0 0 12px ${COLOR}50` : "none" }}>
            {(p as number) + 1}
          </button>
        ))}
        <button onClick={onNext} disabled={page >= totalPages - 1}
          style={{ width: 34, height: 34, borderRadius: "9px", background: page < totalPages - 1 ? COLOR : "var(--surface-2)", border: `1px solid ${page < totalPages - 1 ? "transparent" : "var(--border)"}`, cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", opacity: page >= totalPages - 1 ? 0.35 : 1, color: page < totalPages - 1 ? "#fff" : "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
          <ChevronRight size={14} />
        </button>
      </div>
      <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
        Mostrando <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{from}–{to}</span> de <span style={{ color: COLOR, fontWeight: 700 }}>{total}</span> vendas
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VendasCarrosPage() {
  const router   = useRouter();
  const now      = new Date();
  const isAdmin  = authApi.getUser()?.role === "admin";

  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "">("concluida");
  const [page, setPage]                 = useState(0);
  const [month, setMonth]               = useState(now.getMonth() + 1);
  const [year, setYear]                 = useState(now.getFullYear());
  const [viewMode, setViewMode]         = useState<"grid" | "list">("grid");
  const { isMobile, isMobileOrTablet } = useBreakpoint();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); setSearch(""); setPage(0); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); setSearch(""); setPage(0); };
  const resetPage = useCallback(() => setPage(0), []);

  const { data: rawSales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ["sales-carros-page", month, year],
    queryFn: () => salesApi.list({ skip: 0, limit: 200, month, year }),
  });

  const sales = rawSales.filter(s =>
    !s.vehicle_tipo || s.vehicle_tipo === "carro" ||
    (s.vehicle_tipo as string) === "null"
  );


  const filtered = useMemo(() => {
    let list = [...sales];
    if (statusFilter)   list = list.filter(s => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.vehicle_info || "").toLowerCase().includes(q) ||
        (s.cliente_nome || "").toLowerCase().includes(q) ||
        (s.vehicle_placa || "").toLowerCase().includes(q) ||
        (s.vendedor_nome || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const da = new Date(a.data_venda + "T23:59:59").getTime();
      const db = new Date(b.data_venda + "T23:59:59").getTime();
      return db - da || String(b.id).localeCompare(String(a.id));
    });
    return list;
  }, [sales, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE));
  const safePage   = Math.min(page, totalPages - 1);
  const paged      = filtered.slice(safePage * CARDS_PER_PAGE, (safePage + 1) * CARDS_PER_PAGE);
  const totalValue = filtered.reduce((a, s) => a + Number(s.valor_venda), 0);
  const hasFilters = !!(statusFilter || search);

  const countByStatus = (st: string) => st ? sales.filter(s => s.status === st).length : sales.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Hero Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ position: "relative", borderRadius: "20px", overflow: "hidden", height: "clamp(120px, 18vw, 190px)", marginBottom: 24, background: "#060608", border: "1px solid rgba(59,130,246,0.15)" }}>
        <img src="/BANNERHERO.png" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", opacity: 0.35 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, rgba(6,6,8,0.98) 35%, rgba(6,6,8,0.5) 65%, transparent 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${COLOR}90, transparent)` }} />
        <div style={{ position: "relative", zIndex: 1, padding: "clamp(16px,4vw,28px) clamp(16px,4vw,36px)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ paddingRight: isMobile ? "clamp(110px, 30%, 150px)" : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLOR, boxShadow: `0 0 8px ${COLOR}` }} />
              <span style={{ fontSize: "11px", fontWeight: "800", color: COLOR, letterSpacing: "0.14em", textTransform: "uppercase" }}>Gestão de Vendas · Carros</span>
            </div>
            <h1 style={{ fontSize: "clamp(16px, 3.5vw, 28px)", fontWeight: "900", color: "#fff", letterSpacing: "-0.8px", lineHeight: 1.1, margin: 0 }}>
              Registro de vendas<br />
              <span style={{ color: COLOR }}>de automóveis</span>
            </h1>
          </div>
          <div className="hero-chips">
            {[{ icon: DollarSign, text: "Receita detalhada" }, { icon: TrendingUp, text: "Métricas em tempo real" }, { icon: Calendar, text: "Filtro por período" }].map(({ icon: Ic, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: `${COLOR}15`, border: `1px solid ${COLOR}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic size={13} color={COLOR} strokeWidth={2} />
                </div>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", fontWeight: "600" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        {/* "Nova Venda" button - inside banner */}
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/dashboard/vendas/nova?tipo=carro")}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 2, display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${COLOR}, #1d4ed8)`, color: "#fff", border: "none", borderRadius: "12px", padding: "9px 16px", cursor: "pointer", fontSize: "13px", fontWeight: "800", boxShadow: `0 4px 20px ${COLOR}50`, letterSpacing: "-0.2px" }}>
          <Plus size={15} strokeWidth={2.5} /> Nova Venda
        </motion.button>
      </motion.div>

      {/* ── KPI + MONTH NAV ──────────────────────────────────────── */}
      {isMobileOrTablet ? (
        /* ── MOBILE: month nav row + 2-col KPI grid ── */
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>

          {/* Month nav - full width on mobile */}
          <div style={{ display: "flex", alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
            <button onClick={prevMonth} style={{ width: 44, height: 44, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", borderRight: "1px solid var(--border)" }}>
              <ChevronLeft size={14} />
            </button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 44 }}>
              <Calendar size={13} color={COLOR} />
              <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>{MONTHS[month - 1]} {year}</span>
              {isCurrentMonth && <span style={{ fontSize: "9px", fontWeight: "800", color: COLOR, background: `${COLOR}15`, padding: "2px 7px", borderRadius: "20px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Atual</span>}
            </div>
            <button onClick={nextMonth} disabled={isCurrentMonth} style={{ width: 44, height: 44, background: "none", border: "none", cursor: isCurrentMonth ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isCurrentMonth ? "rgba(255,255,255,0.1)" : "var(--text-muted)", borderLeft: "1px solid var(--border)" }}>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* KPIs - 2-column grid on mobile */}
          {isAdmin && filtered.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Vendas",       value: String(filtered.length),                      icon: Car,        c: COLOR    },
                { label: "Receita",      value: fmt(totalValue),                              icon: DollarSign, c: "#22c55e" },
                { label: "Ticket médio", value: fmt(totalValue / filtered.length),            icon: TrendingUp, c: "#a78bfa" },
              ].map(({ label, value, icon: Ic, c }, i) => (
                <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px", display: "flex", alignItems: "center", gap: 10, ...(i === 2 ? { gridColumn: "span 2" } : {}) }}>
                  <div style={{ width: 32, height: 32, borderRadius: "9px", background: `${c}12`, border: `1px solid ${c}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ic size={14} color={c} strokeWidth={1.8} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "clamp(12px, 3.5vw, 15px)", fontWeight: "900", color: "var(--text-primary)", letterSpacing: "-0.4px", lineHeight: 1, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
                    <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: 2 }}>{label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      ) : (
        /* ── DESKTOP: original side-by-side layout ── */
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ display: "flex", alignItems: "stretch", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>

          {isAdmin && filtered.length > 0 && (
            <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap" }}>
              {[
                { label: "Vendas no período", value: String(filtered.length),               icon: Car,        c: COLOR    },
                { label: "Receita total",     value: fmt(totalValue),                       icon: DollarSign, c: "#22c55e" },
                { label: "Ticket médio",      value: fmt(totalValue / filtered.length),     icon: TrendingUp, c: "#a78bfa" },
              ].map(({ label, value, icon: Ic, c }, i) => (
                <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  style={{ flex: 1, minWidth: 160, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "10px", background: `${c}12`, border: `1px solid ${c}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ic size={16} color={c} strokeWidth={1.8} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: "clamp(11px, 1.6vw, 17px)", fontWeight: "900", color: "var(--text-primary)", letterSpacing: "-0.5px", lineHeight: 1, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 3 }}>{label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden", flexShrink: 0 }}>
            <button onClick={prevMonth} style={{ width: 40, height: 44, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", borderRight: "1px solid var(--border)" }}>
              <ChevronLeft size={14} />
            </button>
            <div style={{ padding: "0 14px", display: "flex", alignItems: "center", gap: 10, height: 44, minWidth: 158, justifyContent: "center" }}>
              <Calendar size={13} color={COLOR} />
              <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>{MONTHS[month - 1]} {year}</span>
              {isCurrentMonth && <span style={{ fontSize: "9px", fontWeight: "800", color: COLOR, background: `${COLOR}15`, padding: "2px 7px", borderRadius: "20px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Atual</span>}
            </div>
            <button onClick={nextMonth} disabled={isCurrentMonth} style={{ width: 40, height: 44, background: "none", border: "none", cursor: isCurrentMonth ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isCurrentMonth ? "rgba(255,255,255,0.1)" : "var(--text-muted)", borderLeft: "1px solid var(--border)" }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── SEARCH + CONTROLS BAR ────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>

        {/* Search */}
        <div style={{ flex: isMobile ? "1 1 100%" : 1, minWidth: isMobile ? 0 : 200, display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "12px", padding: "0 14px", height: 44, transition: "border-color 0.2s" }}
          onFocusCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = `${COLOR}60`}
          onBlurCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}>
          <Search size={14} color="var(--text-muted)" />
          <input value={search} onChange={e => { setSearch(e.target.value); resetPage(); }}
            placeholder="Buscar veículo, cliente, placa ou vendedor..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }} />
          {search && (
            <button onClick={() => { setSearch(""); resetPage(); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* View mode toggle */}
        <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", flexShrink: 0 }}>
          {(["grid", "list"] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: viewMode === mode ? `${COLOR}18` : "transparent", border: "none", cursor: "pointer", color: viewMode === mode ? COLOR : "var(--text-muted)", transition: "all 0.15s", borderRight: mode === "grid" ? "1px solid var(--border)" : "none" }}>
              {mode === "grid" ? <LayoutGrid size={15} /> : <LayoutList size={15} />}
            </button>
          ))}
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <motion.button initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => { setStatusFilter(""); setSearch(""); resetPage(); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: 44, borderRadius: "12px", background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.2)", color: "#ef4444", cursor: "pointer", fontSize: "12px", fontWeight: 600, flexShrink: 0 }}>
            <X size={12} /> Limpar
          </motion.button>
        )}
      </motion.div>

      {/* ── STATUS FILTER TABS ───────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20,
          overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
        className="scroll-x-hide">
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginRight: 4 }}>
          <SlidersHorizontal size={12} color="var(--text-muted)" />
          <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Status</span>
        </div>
        {STATUS_FILTERS.map(f => {
          const active = statusFilter === f.value;
          const cnt = countByStatus(f.value);
          return (
            <button key={f.value} onClick={() => { setStatusFilter(f.value as SaleStatus | ""); resetPage(); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: "10px",
                fontSize: "12px", fontWeight: active ? 700 : 500,
                border: `1.5px solid ${active ? f.color : "var(--border)"}`,
                background: active ? `${f.color}12` : "transparent",
                color: active ? f.color : "var(--text-muted)",
                cursor: "pointer", transition: "all 0.15s",
                boxShadow: active ? `0 0 12px ${f.color}20` : "none",
              }}>
              {active && <div style={{ width: 5, height: 5, borderRadius: "50%", background: f.color, boxShadow: `0 0 6px ${f.color}` }} />}
              {f.label}
              <span style={{ fontSize: "10px", fontWeight: 700, padding: "0 6px", borderRadius: "10px", background: active ? `${f.color}20` : "rgba(255,255,255,0.05)", color: active ? f.color : "var(--text-muted)" }}>{cnt}</span>
            </button>
          );
        })}

        {/* Results count */}
        {filtered.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--text-muted)" }}>
            <span style={{ color: COLOR, fontWeight: 700 }}>{filtered.length}</span> resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </motion.div>

      {/* ── CONTENT ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 290px), 1fr))", gap: 16 }}>
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 280, borderRadius: 16 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "72px 24px", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "18px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "20px", background: `${COLOR}10`, border: `1px solid ${COLOR}20`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Car size={28} color={COLOR} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 6px" }}>
            {search || hasFilters ? "Nenhuma venda encontrada" : `Sem vendas em ${MONTHS[month - 1]}/${year}`}
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: 280, lineHeight: 1.6, margin: 0 }}>
            {search ? `Sem resultados para "${search}".` : hasFilters ? "Tente remover os filtros." : "Não há vendas registradas neste período."}
          </p>
        </motion.div>
      ) : (
        <>
          <AnimatePresence mode="wait" initial={false}>
            {viewMode === "grid" ? (
              <motion.div key={`grid-${safePage}-${statusFilter}`}
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 290px), 1fr))", gap: 18, marginBottom: 20 }}>
                {paged.map((sale, i) => (
                  <SaleCardGrid key={sale.id} sale={sale} delay={i * 0.025} isAdmin={isAdmin}
                    onOpen={() => router.push(`/dashboard/vendas/${sale.id}`)} />
                ))}
              </motion.div>
            ) : (
              <motion.div key={`list-${safePage}-${statusFilter}`}
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {paged.map((sale, i) => (
                  <SaleCardList key={sale.id} sale={sale} delay={i * 0.02} isAdmin={isAdmin}
                    onOpen={() => router.push(`/dashboard/vendas/${sale.id}`)} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <Pagination page={safePage} totalPages={totalPages} total={filtered.length}
            onPrev={() => setPage(p => Math.max(0, p - 1))}
            onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            onGoTo={p => setPage(p)} />
        </>
      )}
    </div>
  );
}
