"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Portal } from "@/components/Portal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Car, Plus, Search, Eye, Edit, Trash2, X,
  Clock, TrendingUp, Gauge, CheckCircle2, AlertCircle, AlertTriangle,
  Wrench, Package, Receipt, SlidersHorizontal, SlidersHorizontal as FilterIcon, Camera,
} from "lucide-react";
import { vehiclesApi } from "@/lib/api";
import { Vehicle, VehicleStatus, VEHICLE_STATUS_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from "@/types";
import { toast } from "@/lib/toast";
import { fmtCurrency as fmt, fmtKm } from "@/lib/formatters";
import { maskKM, maskCurrency, parseCurrency } from "@/lib/masks";
import {
  daysInStock, DaysChip, VEHICLE_STATUS_CFG as STATUS_CFG,
  VehicleStatusBadge as StatusBadge, MarginBar, ColorDot, ColorDot as CarColor,
  SidebarSection, FilterCheckbox,
} from "@/components/vehicle/shared";
import { useBreakpoint } from "@/hooks/useBreakpoint";

// Sort Types
type SortKey = "data_compra" | "valor_anunciado" | "quilometragem" | "margem_percentual";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "data_compra",       label: "Mais recente" },
  { key: "valor_anunciado",   label: "Maior preço"  },
  { key: "quilometragem",     label: "Menor km"     },
  { key: "margem_percentual", label: "Maior margem" },
];

// Vehicle Card
function VehicleCard({ v, onView, onEdit, onDelete, onExpenses, delay }: {
  v: Vehicle; onView: () => void; onEdit: () => void; onDelete: () => void; onExpenses: () => void; delay: number;
}) {
  const days   = daysInStock(v.data_compra);
  const margin = v.margem_percentual ?? 0;
  const cfg    = STATUS_CFG[v.status];
  const mainPhoto = v.photos?.find(p => p.is_main) ?? v.photos?.[0];
  const photoUrl  = mainPhoto ? mainPhoto.url : "/car-placeholder.svg";
  const isPlaceholder = !mainPhoto;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column", transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s", cursor: "pointer" }}
      whileHover={{ y: -4, borderColor: `${cfg.color}40`, boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.color}20` }}
      onClick={onView}
    >
      {/* Photo */}
      <div style={{ position: "relative", width: "100%", height: "190px", overflow: "hidden", background: "#080808" }}>
        {isPlaceholder ? (
          <img src={photoUrl} alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", padding: "28px", opacity: 0.15, filter: "brightness(0) invert(1)" }} />
        ) : (
          <img src={photoUrl} alt={`${v.marca} ${v.modelo}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transition: "transform 0.4s ease" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.75) 100%)" }} />
        <div style={{ position: "absolute", top: 10, left: 10 }}><StatusBadge status={v.status} /></div>
        {days !== null && <div style={{ position: "absolute", top: 10, right: 10 }}><DaysChip days={days} /></div>}
        {v.photos && v.photos.length > 0 && (
          <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 5 }}>
            <Camera size={11} /> {v.photos.length} foto{v.photos.length !== 1 ? "s" : ""}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${cfg.color}00, ${cfg.color}, ${cfg.color}00)` }} />
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        <div>
          <p style={{ fontSize: "15px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.4px", lineHeight: 1.2, marginBottom: "2px" }}>{v.marca} {v.modelo}</p>
          {v.versao && <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{v.versao}</p>}
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {[{ label: String(v.ano), show: !!v.ano }, { label: FUEL_LABELS[v.combustivel] || v.combustivel, show: !!v.combustivel }, { label: TRANSMISSION_LABELS[v.cambio] || v.cambio, show: !!v.cambio }]
            .filter(c => c.show && c.label)
            .map(({ label }) => (
              <span key={label} style={{ fontSize: "10px", fontWeight: "600", color: "var(--text-secondary)", background: "var(--surface-2)", border: "1px solid var(--border)", padding: "2px 7px", borderRadius: "4px" }}>{label}</span>
            ))}
          {v.cor && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: "600", color: "var(--text-secondary)", background: "var(--surface-2)", border: "1px solid var(--border)", padding: "2px 7px", borderRadius: "4px" }}>
              <CarColor cor={v.cor} />{v.cor}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Gauge size={11} color="var(--text-muted)" />
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{fmtKm(v.quilometragem)}</span>
          {v.placa && (<><span style={{ color: "var(--border)", fontSize: "10px" }}>•</span><span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>{v.placa}</span></>)}
        </div>
        {margin > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}><TrendingUp size={10} />Margem estimada</span>
            </div>
            <MarginBar pct={margin} />
          </div>
        )}
        <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: "20px", fontWeight: "900", color: "var(--brand)", letterSpacing: "-0.8px", lineHeight: 1 }}>{fmt(v.valor_anunciado)}</p>
          {v.valor_compra && <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>Compra: {fmt(v.valor_compra)}</p>}
          {(v.valor_multas ?? 0) > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px", padding: "4px 8px", borderRadius: "6px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <AlertTriangle size={11} color="#ef4444" />
              <span style={{ fontSize: "10px", fontWeight: "600", color: "#ef4444" }}>Multa: {fmt(v.valor_multas)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }} onClick={e => e.stopPropagation()}>
        {[{ Icon: Eye,     label: "Ver",      action: onView,     color: "var(--brand)"          },
          { Icon: Receipt, label: "Despesas", action: onExpenses, color: "#a78bfa"               },
          { Icon: Edit,    label: "Editar",   action: onEdit,     color: "var(--text-secondary)"  }]
          .map(({ Icon, label, action, color }, i) => (
            <button key={label} onClick={action} title={label}
              style={{ flex: 1, height: "44px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color, borderRight: i < 2 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              <Icon size={18} strokeWidth={1.8} />
            </button>
          ))}
      </div>
    </motion.div>
  );
}

// ─── SidebarSectionContent ────────────────────────────────────────────────────
// Shared filter content rendered in both mobile accordion and desktop sidebar
function SidebarSectionContent({ accent, allActive, dispCount, prepCount, manutCount, resvCount,
  search, setSearch, statusFilter, setStatusFilter,
  marcas, marcaFilter, setMarcaFilter,
  anos, anoMin, setAnoMin, anoMax, setAnoMax,
  combustiveis, combustivelFilter, setCombustivelFilter,
  cambios, cambioFilter, setCambioFilter,
  precoMin, setPrecoMin, precoMax, setPrecoMax,
  kmMin, setKmMin, kmMax, setKmMax,
  cores, corFilter, setCorFilter,
  hasFilters, clearFilters,
}: {
  accent: string; allActive: Vehicle[]; dispCount: number; prepCount: number; manutCount: number; resvCount: number;
  search: string; setSearch: (v: string) => void; statusFilter: string; setStatusFilter: (v: VehicleStatus | "") => void;
  marcas: string[]; marcaFilter: string[]; setMarcaFilter: React.Dispatch<React.SetStateAction<string[]>>;
  anos: number[]; anoMin: string; setAnoMin: (v: string) => void; anoMax: string; setAnoMax: (v: string) => void;
  combustiveis: string[]; combustivelFilter: string[]; setCombustivelFilter: React.Dispatch<React.SetStateAction<string[]>>;
  cambios: string[]; cambioFilter: string[]; setCambioFilter: React.Dispatch<React.SetStateAction<string[]>>;
  precoMin: string; setPrecoMin: (v: string) => void; precoMax: string; setPrecoMax: (v: string) => void;
  kmMin: string; setKmMin: (v: string) => void; kmMax: string; setKmMax: (v: string) => void;
  cores: string[]; corFilter: string[]; setCorFilter: React.Dispatch<React.SetStateAction<string[]>>;
  hasFilters: boolean; clearFilters: () => void;
}) {
  return (
    <>
      <SidebarSection title="Estoque">
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            { label: "Total em estoque", value: allActive.length, color: "#38bdf8", icon: Package      },
            { label: "Disponíveis",      value: dispCount,        color: "#22c55e", icon: CheckCircle2 },
            { label: "Em Preparação",    value: prepCount,        color: "#38bdf8", icon: Wrench       },
            { label: "Em Manutenção",    value: manutCount,       color: "#f97316", icon: AlertCircle  },
            { label: "Reservados",       value: resvCount,        color: "#f59e0b", icon: Clock        },
          ].map(({ label, value, color, icon: Ic }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}><Ic size={11} color={color} /><span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{label}</span></div>
              <span style={{ fontSize: "13px", fontWeight: "800", color }}>{value}</span>
            </div>
          ))}
        </div>
      </SidebarSection>
      <SidebarSection title="Buscar">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0 12px", height: "36px" }}>
          <Search size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Marca, modelo, placa..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "12px", color: "var(--text-primary)" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 0 }}><X size={12} /></button>}
        </div>
      </SidebarSection>
      <SidebarSection title="Status">
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {([ { value: "", label: "Todos", color: "#64748b" }, { value: "disponivel", label: "Disponível", color: "#22c55e" }, { value: "reservado", label: "Reservado", color: "#f59e0b" }, { value: "em_preparacao", label: "Em Preparação", color: "#38bdf8" }, { value: "em_manutencao", label: "Em Manutenção", color: "#f97316" } ] as const).map(({ value, label, color }) => {
            const active = statusFilter === value;
            const count  = value === "" ? allActive.length : allActive.filter(v => v.status === value).length;
            return (
              <button key={value} onClick={() => setStatusFilter(value as VehicleStatus | "")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: "8px", border: `1px solid ${active ? color : "transparent"}`, background: active ? `${color}14` : "transparent", cursor: "pointer", transition: "all 0.15s", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, opacity: active ? 1 : 0.35 }} />
                  <span style={{ fontSize: "12px", color: active ? color : "var(--text-secondary)", fontWeight: active ? 700 : 400 }}>{label}</span>
                </div>
                <span style={{ fontSize: "10px", color: active ? color : "var(--text-muted)", fontWeight: 700 }}>{count}</span>
              </button>
            );
          })}
        </div>
      </SidebarSection>
      {marcas.length > 0 && (
        <SidebarSection title="Marca">
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {marcas.map(marca => (
              <FilterCheckbox key={marca} label={marca} count={allActive.filter(v => v.marca === marca).length}
                active={marcaFilter.includes(marca)} accent={accent}
                onChange={() => setMarcaFilter(p => p.includes(marca) ? p.filter(m => m !== marca) : [...p, marca])} />
            ))}
          </div>
        </SidebarSection>
      )}
      <SidebarSection title="Ano">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "10px" }}>
          <input value={anoMin} onChange={e => setAnoMin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Mín." inputMode="numeric" maxLength={4} style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
          <input value={anoMax} onChange={e => setAnoMax(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Máx." inputMode="numeric" maxLength={4} style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {anos.slice(0, 12).map(ano => { const active = anoMin === String(ano) && anoMax === String(ano); return (<button key={ano} onClick={() => { if (active) { setAnoMin(""); setAnoMax(""); } else { setAnoMin(String(ano)); setAnoMax(String(ano)); } }} style={{ height: "26px", padding: "0 10px", borderRadius: "20px", border: `1px solid ${active ? accent : "var(--border)"}`, background: active ? `${accent}14` : "var(--surface-2)", color: active ? accent : "var(--text-muted)", fontSize: "11px", fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>{ano}</button>); })}
        </div>
      </SidebarSection>
      <SidebarSection title="Combustível">
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {combustiveis.length > 0 ? combustiveis.map(key => { const label = FUEL_LABELS[key as keyof typeof FUEL_LABELS] ?? key; const count = allActive.filter(v => (v.combustivel || "").toLowerCase() === key).length; return <FilterCheckbox key={key} label={label} count={count} active={combustivelFilter.includes(key)} accent={accent} onChange={() => setCombustivelFilter(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])} />; }) : <p style={{ fontSize: "11px", color: "var(--text-muted)", padding: "4px 0" }}>Nenhum dado disponível</p>}
        </div>
      </SidebarSection>
      <SidebarSection title="Câmbio">
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {cambios.length > 0 ? cambios.map(key => { const label = TRANSMISSION_LABELS[key as keyof typeof TRANSMISSION_LABELS] ?? key; const count = allActive.filter(v => (v.cambio || "").toLowerCase() === key).length; return <FilterCheckbox key={key} label={label} count={count} active={cambioFilter.includes(key)} accent={accent} onChange={() => setCambioFilter(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])} />; }) : <p style={{ fontSize: "11px", color: "var(--text-muted)", padding: "4px 0" }}>Nenhum dado disponível</p>}
        </div>
      </SidebarSection>
      <SidebarSection title="Preço (R$)">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          <input value={precoMin} onChange={e => setPrecoMin(maskCurrency(e.target.value))} placeholder="0,00" inputMode="numeric" style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
          <input value={precoMax} onChange={e => setPrecoMax(maskCurrency(e.target.value))} placeholder="0,00" inputMode="numeric" style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
        </div>
      </SidebarSection>
      <SidebarSection title="Quilometragem">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          <input value={kmMin} onChange={e => setKmMin(maskKM(e.target.value))} placeholder="Mín." inputMode="numeric" style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
          <input value={kmMax} onChange={e => setKmMax(maskKM(e.target.value))} placeholder="Máx." inputMode="numeric" style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
        </div>
      </SidebarSection>
      {cores.length > 0 && (
        <SidebarSection title="Cor">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {cores.map(cor => { const active = corFilter.includes(cor); return (<button key={cor} onClick={() => setCorFilter(p => p.includes(cor) ? p.filter(c => c !== cor) : [...p, cor])} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 8px", borderRadius: "20px", border: `1px solid ${active ? accent : "var(--border)"}`, background: active ? `${accent}14` : "var(--surface-2)", cursor: "pointer", transition: "all 0.15s" }}><ColorDot cor={cor} /><span style={{ fontSize: "11px", color: active ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: active ? 700 : 400, textTransform: "capitalize" }}>{cor}</span></button>); })}
          </div>
        </SidebarSection>
      )}
      {hasFilters && (
        <button onClick={clearFilters} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "38px", borderRadius: "10px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>
          <X size={13} /> Limpar Filtros
        </button>
      )}
    </>
  );
}

// ─── Vehicles Page ────────────────────────────────────────────────────────────
export default function VeiculosPage() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [search,            setSearch]           = useState("");
  const [statusFilter,      setStatusFilter]     = useState<VehicleStatus | "">("");
  const [sortKey,           setSortKey]          = useState<SortKey>("data_compra");
  const [marcaFilter,       setMarcaFilter]      = useState<string[]>([]);
  const [combustivelFilter, setCombustivelFilter] = useState<string[]>([]);
  const [cambioFilter,      setCambioFilter]     = useState<string[]>([]);
  const [corFilter,         setCorFilter]        = useState<string[]>([]);
  const [anoMin,            setAnoMin]           = useState("");
  const [anoMax,            setAnoMax]           = useState("");
  const [kmMin,             setKmMin]            = useState("");
  const [kmMax,             setKmMax]            = useState("");
  const [precoMin,          setPrecoMin]         = useState("");
  const [precoMax,          setPrecoMax]         = useState("");
  const [deleteTarget,      setDeleteTarget]     = useState<Vehicle | null>(null);

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles", "carros-all"],
    queryFn: () => vehiclesApi.list({ tipo: "carro", limit: 200 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehiclesApi.delete(id),
    onSuccess: () => {
      toast.success("Veículo excluído com sucesso");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-carros"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
    },
    onError: () => toast.error("Erro ao excluir veículo"),
  });

  const allActive  = useMemo(() => vehicles.filter(v => v.status !== "vendido"), [vehicles]);
  const dispCount  = allActive.filter(v => v.status === "disponivel").length;
  const prepCount  = allActive.filter(v => v.status === "em_preparacao").length;
  const manutCount = allActive.filter(v => v.status === "em_manutencao").length;
  const resvCount  = allActive.filter(v => v.status === "reservado").length;

  const marcas      = useMemo(() => [...new Set(allActive.map(v => v.marca))].sort(), [allActive]);
  const cores        = useMemo(() => [...new Set(allActive.map(v => (v.cor || "").toLowerCase()).filter(Boolean))].sort(), [allActive]);
  const anos         = useMemo(() => [...new Set(allActive.map(v => v.ano))].sort((a, b) => b - a), [allActive]);
  const combustiveis = useMemo(() => [...new Set(allActive.map(v => (v.combustivel || "").toLowerCase()).filter(Boolean))].sort(), [allActive]);
  const cambios      = useMemo(() => [...new Set(allActive.map(v => (v.cambio || "").toLowerCase()).filter(Boolean))].sort(), [allActive]);

  const filtered = useMemo(() => {
    let list = statusFilter ? allActive.filter(v => v.status === statusFilter) : allActive;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => v.marca.toLowerCase().includes(q) || v.modelo.toLowerCase().includes(q) || (v.placa || "").toLowerCase().includes(q) || (v.cor || "").toLowerCase().includes(q) || String(v.ano).includes(q));
    }
    if (marcaFilter.length)       list = list.filter(v => marcaFilter.includes(v.marca));
    if (combustivelFilter.length) list = list.filter(v => combustivelFilter.includes((v.combustivel || "").toLowerCase()));
    if (cambioFilter.length)      list = list.filter(v => cambioFilter.includes((v.cambio || "").toLowerCase()));
    if (corFilter.length)         list = list.filter(v => corFilter.includes((v.cor || "").toLowerCase()));
    if (anoMin)   list = list.filter(v => v.ano >= Number(anoMin));
    if (anoMax)   list = list.filter(v => v.ano <= Number(anoMax));
    if (kmMin)    list = list.filter(v => v.quilometragem >= parseInt(kmMin.replace(/\./g, "") || "0"));
    if (kmMax)    list = list.filter(v => v.quilometragem <= parseInt(kmMax.replace(/\./g, "") || "0"));
    if (precoMin) list = list.filter(v => (v.valor_anunciado ?? 0) >= parseCurrency(precoMin));
    if (precoMax) list = list.filter(v => (v.valor_anunciado ?? 0) <= parseCurrency(precoMax));
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "valor_anunciado":   return (b.valor_anunciado   ?? 0) - (a.valor_anunciado   ?? 0);
        case "quilometragem":     return (a.quilometragem     ?? 0) - (b.quilometragem     ?? 0);
        case "margem_percentual": return (b.margem_percentual ?? 0) - (a.margem_percentual ?? 0);
        default: return new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime();
      }
    });
  }, [allActive, search, statusFilter, marcaFilter, combustivelFilter, cambioFilter, corFilter, anoMin, anoMax, kmMin, kmMax, precoMin, precoMax, sortKey]);

  const hasFilters = !!(search || statusFilter || marcaFilter.length || combustivelFilter.length || cambioFilter.length || corFilter.length || anoMin || anoMax || kmMin || kmMax || precoMin || precoMax);
  const clearFilters = () => { setSearch(""); setStatusFilter(""); setSortKey("data_compra"); setMarcaFilter([]); setCombustivelFilter([]); setCambioFilter([]); setCorFilter([]); setAnoMin(""); setAnoMax(""); setKmMin(""); setKmMax(""); setPrecoMin(""); setPrecoMax(""); };

  const accent = "#F5A623";
  const { isMobileOrTablet } = useBreakpoint();
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        style={{ position: "relative", borderRadius: "20px", overflow: "hidden", height: "clamp(120px, 18vw, 200px)", background: "#060606", border: "1px solid rgba(245,166,35,0.15)" }}>
        <img src="/BANNERHERO.png" alt="Banner" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center right", opacity: 0.7 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(6,6,6,0.96) 30%, rgba(6,6,6,0.4) 70%, rgba(6,6,6,0.1) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, padding: "clamp(16px,4vw,32px) clamp(16px,4vw,36px)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ paddingRight: "clamp(120px, 30%, 170px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Car size={13} color={accent} strokeWidth={2} />
              <p style={{ fontSize: "11px", fontWeight: "700", color: accent, letterSpacing: "0.12em", textTransform: "uppercase" }}>Painel de Estoque - Carros</p>
            </div>
            <h1 style={{ fontSize: "clamp(16px, 3.5vw, 26px)", fontWeight: "900", color: "#fff", letterSpacing: "-0.8px", lineHeight: 1.15 }}>
              Gerencie seu estoque<br/><span style={{ color: accent }}>com controle total</span>
            </h1>
          </div>
          <div className="hero-chips">
            {[{ icon: Package, text: "Visão do inventário" }, { icon: TrendingUp, text: "Margem e rentabilidade" }, { icon: CheckCircle2, text: "Status em tempo real" }].map(({ icon: Ic, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic size={13} color={accent} strokeWidth={2} />
                </div>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", fontWeight: "600" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        {/* "Novo Veículo" button - inside banner, never overlaps header */}
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => router.push("/dashboard/veiculos/novo")}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 2, display: "flex", alignItems: "center", gap: "7px", background: `linear-gradient(135deg, ${accent}, #e8920e)`, color: "#000", border: "none", borderRadius: "12px", padding: "9px 16px", cursor: "pointer", fontSize: "13px", fontWeight: "800", boxShadow: "0 4px 20px rgba(245,166,35,0.4)" }}>
          <Plus size={15} strokeWidth={2.5} /> Novo Veículo
        </motion.button>
      </motion.div>


      {/* Sidebar + Grid */}
      <div style={{ display: "flex", gap: "18px", alignItems: "flex-start",
        flexDirection: isMobileOrTablet ? "column" : "row" }}>

        {/* SIDEBAR */}
        {isMobileOrTablet ? (
          /* Mobile/Tablet: collapsible filter accordion */
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={() => setFilterOpen(v => !v)} style={{
              width: "100%", height: "40px", display: "flex", alignItems: "center",
              justifyContent: "space-between", padding: "0 14px",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "10px", cursor: "pointer", color: "var(--text-secondary)",
              fontSize: "13px", fontWeight: "700",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <FilterIcon size={14} color="var(--brand)" />
                Filtros{hasFilters ? ` (${[statusFilter, ...marcaFilter, ...combustivelFilter, ...cambioFilter, ...corFilter].filter(Boolean).length})` : ""}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{filterOpen ? "▲ Fechar" : "▼ Abrir"}</span>
            </button>
            <AnimatePresence>
              {filterOpen && (
                <motion.div key="filters" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                  style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <SidebarSectionContent accent={accent} allActive={allActive} dispCount={dispCount} prepCount={prepCount} manutCount={manutCount} resvCount={resvCount}
                    search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                    marcas={marcas} marcaFilter={marcaFilter} setMarcaFilter={setMarcaFilter}
                    anos={anos} anoMin={anoMin} setAnoMin={setAnoMin} anoMax={anoMax} setAnoMax={setAnoMax}
                    combustiveis={combustiveis} combustivelFilter={combustivelFilter} setCombustivelFilter={setCombustivelFilter}
                    cambios={cambios} cambioFilter={cambioFilter} setCambioFilter={setCambioFilter}
                    precoMin={precoMin} setPrecoMin={setPrecoMin} precoMax={precoMax} setPrecoMax={setPrecoMax}
                    kmMin={kmMin} setKmMin={setKmMin} kmMax={kmMax} setKmMax={setKmMax}
                    cores={cores} corFilter={corFilter} setCorFilter={setCorFilter}
                    hasFilters={hasFilters} clearFilters={clearFilters} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Desktop: always-visible sticky sidebar */
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
            style={{ width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "10px", position: "sticky", top: "16px", maxHeight: "calc(100vh - 100px)", overflowY: "auto", paddingRight: "2px" }}>
            <SidebarSectionContent accent={accent} allActive={allActive} dispCount={dispCount} prepCount={prepCount} manutCount={manutCount} resvCount={resvCount}
              search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              marcas={marcas} marcaFilter={marcaFilter} setMarcaFilter={setMarcaFilter}
              anos={anos} anoMin={anoMin} setAnoMin={setAnoMin} anoMax={anoMax} setAnoMax={setAnoMax}
              combustiveis={combustiveis} combustivelFilter={combustivelFilter} setCombustivelFilter={setCombustivelFilter}
              cambios={cambios} cambioFilter={cambioFilter} setCambioFilter={setCambioFilter}
              precoMin={precoMin} setPrecoMin={setPrecoMin} precoMax={precoMax} setPrecoMax={setPrecoMax}
              kmMin={kmMin} setKmMin={setKmMin} kmMax={kmMax} setKmMax={setKmMax}
              cores={cores} corFilter={corFilter} setCorFilter={setCorFilter}
              hasFilters={hasFilters} clearFilters={clearFilters} />
          </motion.div>
        )}

        {/* GRID */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--text-primary)", fontWeight: "800" }}>{filtered.length}</span>{" "}veículo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
              {hasFilters && <span style={{ color: "var(--text-muted)" }}> (filtrado)</span>}
            </p>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
              className="input" style={{ height: "34px", width: "140px", padding: "0 32px 0 10px", flexShrink: 0 }}>
              {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>

          {isLoading ? (
            <div className="vehicle-grid">
              {Array(6).fill(0).map((_, i) => <div key={i} style={{ height: "400px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)" }} className="skeleton" />)}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "64px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SlidersHorizontal size={24} color="var(--text-muted)" strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>Nenhum veículo encontrado</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{hasFilters ? "Ajuste os filtros na barra lateral" : "Adicione o primeiro veículo ao estoque"}</p>
              {hasFilters && <button onClick={clearFilters} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}><X size={12} /> Limpar filtros</button>}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="vehicle-grid">
              {filtered.map((v, i) => (
                <VehicleCard key={v.id} v={v} delay={Math.min(i * 0.03, 0.2)}
                  onView={() => router.push(`/dashboard/veiculos/${v.id}`)}
                  onEdit={() => router.push(`/dashboard/veiculos/${v.id}/editar`)}
                  onExpenses={() => router.push(`/dashboard/veiculos/${v.id}?tab=despesas`)}
                  onDelete={() => setDeleteTarget(v)} />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <Portal>
      <AnimatePresence>
        {deleteTarget && (
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(4px)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 60px))" }}>
            <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "22px", width: "100%", maxWidth: "400px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Trash2 size={18} color="#ef4444" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>Excluir Veículo</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: 2 }}>Esta ação não pode ser desfeita</p>
                </div>
                <button type="button" onClick={() => setDeleteTarget(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", width: 36, height: 36, alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={16} /></button>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "20px" }}>
                Confirmar exclusão de <strong style={{ color: "var(--text-primary)" }}>{deleteTarget.marca} {deleteTarget.modelo} {deleteTarget.ano}</strong>?
              </p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="button" onClick={() => setDeleteTarget(null)} style={{ height: "44px", padding: "0 16px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", flex: "0 1 auto" }}>Cancelar</button>
                <button type="button" onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}
                  style={{ height: "44px", padding: "0 16px", background: "#ef4444", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "700", color: "#fff", opacity: deleteMutation.isPending ? 0.7 : 1, flex: "1 1 auto" }}>
                  {deleteMutation.isPending ? "Excluindo..." : "Confirmar Exclusão"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </div>
  );
}
