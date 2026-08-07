"use client";

/**
 * Componentes e constantes compartilhados entre as páginas de veículos.
 * Elimina a duplicação entre veiculos/ e motos/ pages.
 */

import { motion } from "framer-motion";
import {
  Clock, CheckCircle2, Wrench, Check,
} from "lucide-react";
import { VehicleStatus, VEHICLE_STATUS_LABELS } from "@/types";

// ─── Status Config ────────────────────────────────────────────────────────────
export const VEHICLE_STATUS_CFG: Record<
  VehicleStatus,
  { color: string; bg: string; icon: React.ElementType; label: string }
> = {
  disponivel:    { color: "#22c55e", bg: "rgba(34,197,94,0.08)",   icon: CheckCircle2, label: "Disponível"    },
  reservado:     { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  icon: Clock,        label: "Reservado"     },
  em_preparacao: { color: "#38bdf8", bg: "rgba(56,189,248,0.08)",  icon: Wrench,       label: "Em Preparação" },
  em_manutencao: { color: "#f97316", bg: "rgba(249,115,22,0.08)",  icon: Wrench,       label: "Em Manutenção" },
  vendido:       { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", icon: CheckCircle2, label: "Vendido"       },
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const c = VEHICLE_STATUS_CFG[status];
  const Icon = c.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      fontSize: "10px", fontWeight: "700", color: c.color, background: c.bg,
      border: `1px solid ${c.color}20`, padding: "3px 8px", borderRadius: "20px", whiteSpace: "nowrap",
    }}>
      <Icon size={9} />{VEHICLE_STATUS_LABELS[status]}
    </span>
  );
}

// ─── Mapa de Cores ────────────────────────────────────────────────────────────
export const COLOR_MAP: Record<string, string> = {
  branco: "#f1f5f9", pérola: "#f1f5f9", white: "#f1f5f9",
  preto: "#1e1e2e", black: "#1e1e2e",
  prata: "#94a3b8", cinza: "#64748b", grafite: "#475569", grey: "#64748b", gray: "#64748b",
  vermelho: "#ef4444", red: "#ef4444", bordô: "#9f1239",
  azul: "#3b82f6", blue: "#3b82f6", azul_marinho: "#1d4ed8",
  verde: "#22c55e", green: "#22c55e",
  amarelo: "#eab308", yellow: "#eab308",
  laranja: "#f97316", orange: "#f97316",
  marrom: "#92400e", brown: "#92400e", café: "#92400e",
  bege: "#d4b483", champagne: "#d4b483",
  roxo: "#a855f7", purple: "#a855f7", vinho: "#9f1239",
  rosa: "#ec4899", pink: "#ec4899",
  dourado: "#f59e0b", gold: "#f59e0b",
  prata_fosco: "#94a3b8",
};

// ─── Color Dot ────────────────────────────────────────────────────────────────
export function ColorDot({ cor }: { cor: string }) {
  const key = cor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const hex = COLOR_MAP[cor.toLowerCase()] ?? COLOR_MAP[key] ?? "#6b7280";
  const isLight = ["branco", "pérola", "white", "bege", "champagne", "amarelo", "yellow"].includes(
    cor.toLowerCase()
  );
  return (
    <div style={{
      width: "14px", height: "14px", borderRadius: "50%",
      background: hex,
      border: isLight ? "2px solid rgba(148,163,184,0.5)" : `2px solid ${hex}60`,
      flexShrink: 0, boxShadow: `0 0 6px ${hex}55`,
    }} />
  );
}

// ─── Dias em Estoque ──────────────────────────────────────────────────────────
export function daysInStock(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function DaysChip({ days }: { days: number | null }) {
  if (days === null) return null;
  const color = days < 30 ? "#22c55e" : days < 60 ? "#f59e0b" : "#ef4444";
  const bg    = days < 30 ? "rgba(34,197,94,0.08)" : days < 60 ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "4px",
      fontSize: "10px", fontWeight: "700", color, background: bg,
      border: `1px solid ${color}20`, padding: "3px 7px", borderRadius: "20px", flexShrink: 0,
    }}>
      <Clock size={9} />{days === 0 ? "Hoje" : `${days}d`}
    </div>
  );
}

// ─── Barra de Margem ──────────────────────────────────────────────────────────
export function MarginBar({ pct }: { pct: number }) {
  const n = Number(pct) || 0;
  const color = n >= 15 ? "#22c55e" : n >= 8 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ flex: 1, height: "3px", background: "var(--surface-3)", borderRadius: "2px", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(n, 100)}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: "2px" }}
        />
      </div>
      <span style={{ fontSize: "10px", fontWeight: "700", color, minWidth: "32px" }}>
        {n.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Cores por Categoria de Despesa ───────────────────────────────────────────
export const CAT_COLORS: Record<string, string> = {
  mecanica: "#3b82f6",    funilaria: "#f59e0b",   pintura: "#ec4899",
  lavagem: "#06b6d4",     documentacao: "#8b5cf6", pneus: "#10b981",
  eletrica: "#f97316",    combustivel: "#ef4444",  acessorios: "#6366f1",
  guincho: "#84cc16",     ipva: "#14b8a6",         licenciamento: "#a855f7",
  comissao: "#f43f5e",    outros: "#64748b",
};

// ─── Seção de Sidebar ─────────────────────────────────────────────────────────
export function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "14px", padding: "14px 16px",
    }}>
      <p style={{
        fontSize: "10px", fontWeight: "800", color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px",
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── Checkbox de Filtro ───────────────────────────────────────────────────────
export function FilterCheckbox({
  label, count, active, accent, onChange,
}: {
  label: string; count: number; active: boolean; accent: string; onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "6px 8px", borderRadius: "8px", border: "none",
        background: active ? `${accent}12` : "transparent", cursor: "pointer", transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          width: 14, height: 14, borderRadius: 3,
          border: `2px solid ${active ? accent : "var(--border)"}`,
          background: active ? accent : "transparent",
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
        }}>
          {active && <Check size={9} color="#000" strokeWidth={3} />}
        </div>
        <span style={{
          fontSize: "12px",
          color: active ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: active ? 700 : 400,
        }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>
        {count}
      </span>
    </button>
  );
}
