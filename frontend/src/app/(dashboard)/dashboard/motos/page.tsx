"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Bike, Plus, Search, Eye, Edit, Trash2, X,
  Clock, TrendingUp, Gauge, CheckCircle2, AlertCircle, AlertTriangle,
  Wrench, Receipt, Zap, Package, SlidersHorizontal, Camera,
} from "lucide-react";
import { vehiclesApi } from "@/lib/api";
import { Vehicle, VehicleStatus, VEHICLE_STATUS_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from "@/types";
import { toast } from "@/lib/toast";
import { fmtCurrency as fmt, fmtKm } from "@/lib/formatters";
import { maskKM, maskCurrency, parseCurrency } from "@/lib/masks";
import {
  daysInStock, DaysChip, VEHICLE_STATUS_CFG as STATUS_CFG,
  VehicleStatusBadge as StatusBadge, MarginBar, ColorDot,
  SidebarSection, FilterCheckbox,
} from "@/components/vehicle/shared";
import { useBreakpoint } from "@/hooks/useBreakpoint";


// Moto Card
function MotoCard({ v, onView, onEdit, onDelete, onExpenses, delay }: {
  v: Vehicle; onView: () => void; onEdit: () => void; onDelete: () => void; onExpenses: () => void; delay: number;
}) {
  const days   = daysInStock(v.data_compra);
  const margin = v.margem_percentual ?? 0;
  const cfg    = STATUS_CFG[v.status];
  const mainPhoto = v.photos?.find(p => p.is_main) ?? v.photos?.[0];
  const photoUrl  = mainPhoto ? mainPhoto.url : "/moto-placeholder.svg";
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
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #f9731600, #f97316, #f9731600)" }} />
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        <div>
          <p style={{ fontSize: "15px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.4px", lineHeight: 1.2, marginBottom: "2px" }}>{v.marca} {v.modelo}</p>
          <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{v.ano}</p>
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {v.cilindrada && (
            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", fontWeight: "700", color: "#f97316", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", padding: "2px 8px", borderRadius: "4px" }}>
              <Zap size={9} />{v.cilindrada}cc
            </span>
          )}
          {v.combustivel && <span style={{ fontSize: "10px", fontWeight: "600", color: "var(--text-secondary)", background: "var(--surface-2)", border: "1px solid var(--border)", padding: "2px 7px", borderRadius: "4px" }}>{FUEL_LABELS[v.combustivel] || v.combustivel}</span>}
          {v.cor && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: "600", color: "var(--text-secondary)", background: "var(--surface-2)", border: "1px solid var(--border)", padding: "2px 7px", borderRadius: "4px" }}>
              <ColorDot cor={v.cor} />{v.cor}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Gauge size={11} color="var(--text-muted)" />
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{fmtKm(v.quilometragem)}</span>
          {v.placa && <><span style={{ color: "var(--border)", fontSize: "10px" }}>•</span><span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>{v.placa}</span></>}
        </div>
        {margin > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}><TrendingUp size={10} /> Margem estimada</span>
            </div>
            <MarginBar pct={margin} />
          </div>
        )}
        <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: "20px", fontWeight: "900", color: "#f97316", letterSpacing: "-0.8px", lineHeight: 1 }}>{fmt(v.valor_anunciado)}</p>
          {v.valor_compra && <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>Compra: {fmt(v.valor_compra)}</p>}
          {(v.valor_multas ?? 0) > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px", padding: "4px 8px", borderRadius: "6px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <AlertTriangle size={11} color="#ef4444" />
              <span style={{ fontSize: "10px", fontWeight: "600", color: "#ef4444" }}>Multa: {fmt(v.valor_multas)}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }} onClick={e => e.stopPropagation()}>
        {[{ Icon: Eye,     label: "Ver",      action: onView,     color: "#f97316"               },
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

// Motos Page
export default function MotosPage() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [search,            setSearch]           = useState("");
  const [statusFilter,      setStatusFilter]     = useState<VehicleStatus | "">("");
  const [sortKey,           setSortKey]          = useState<"data_compra" | "valor_anunciado" | "quilometragem">("data_compra");
  const [marcaFilter,       setMarcaFilter]      = useState<string[]>([]);
  const [combustivelFilter, setCombustivelFilter] = useState<string[]>([]);
  const [corFilter,         setCorFilter]        = useState<string[]>([]);
  const [anoMin,            setAnoMin]           = useState("");
  const [anoMax,            setAnoMax]           = useState("");
  const [kmMin,             setKmMin]            = useState("");
  const [kmMax,             setKmMax]            = useState("");
  const [precoMin,          setPrecoMin]         = useState("");
  const [precoMax,          setPrecoMax]         = useState("");
  const [deleteTarget,      setDeleteTarget]     = useState<Vehicle | null>(null);

  const { data: motos = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles", "motos-all"],
    queryFn: () => vehiclesApi.list({ tipo: "moto", limit: 200 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehiclesApi.delete(id),
    onSuccess: () => { toast.success("Moto excluída com sucesso"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["vehicles"] }); },
    onError: () => toast.error("Erro ao excluir moto"),
  });

  const allActive  = useMemo(() => motos.filter(v => v.status !== "vendido"), [motos]);
  const dispCount  = allActive.filter(v => v.status === "disponivel").length;
  const prepCount  = allActive.filter(v => v.status === "em_preparacao").length;
  const manutCount = allActive.filter(v => v.status === "em_manutencao").length;
  const resvCount  = allActive.filter(v => v.status === "reservado").length;

  const marcas      = useMemo(() => [...new Set(allActive.map(v => v.marca))].sort(), [allActive]);
  const cores        = useMemo(() => [...new Set(allActive.map(v => (v.cor || "").toLowerCase()).filter(Boolean))].sort(), [allActive]);
  const anos         = useMemo(() => [...new Set(allActive.map(v => v.ano))].sort((a, b) => b - a), [allActive]);
  const combustiveis = useMemo(() => [...new Set(allActive.map(v => (v.combustivel || "").toLowerCase()).filter(Boolean))].sort(), [allActive]);

  const filtered = useMemo(() => {
    let list = statusFilter ? allActive.filter(v => v.status === statusFilter) : allActive;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => v.marca.toLowerCase().includes(q) || v.modelo.toLowerCase().includes(q) || (v.placa || "").toLowerCase().includes(q) || (v.cor || "").toLowerCase().includes(q) || String(v.ano).includes(q));
    }
    if (marcaFilter.length)       list = list.filter(v => marcaFilter.includes(v.marca));
    if (combustivelFilter.length) list = list.filter(v => combustivelFilter.includes((v.combustivel || "").toLowerCase()));
    if (corFilter.length)         list = list.filter(v => corFilter.includes((v.cor || "").toLowerCase()));
    if (anoMin)   list = list.filter(v => v.ano >= Number(anoMin));
    if (anoMax)   list = list.filter(v => v.ano <= Number(anoMax));
    if (kmMin)    list = list.filter(v => v.quilometragem >= parseInt(kmMin.replace(/\./g, "") || "0"));
    if (kmMax)    list = list.filter(v => v.quilometragem <= parseInt(kmMax.replace(/\./g, "") || "0"));
    if (precoMin) list = list.filter(v => (v.valor_anunciado ?? 0) >= parseCurrency(precoMin));
    if (precoMax) list = list.filter(v => (v.valor_anunciado ?? 0) <= parseCurrency(precoMax));
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "valor_anunciado": return (b.valor_anunciado ?? 0) - (a.valor_anunciado ?? 0);
        case "quilometragem":   return (a.quilometragem ?? 0) - (b.quilometragem ?? 0);
        default: return new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime();
      }
    });
  }, [allActive, search, statusFilter, marcaFilter, combustivelFilter, corFilter, anoMin, anoMax, kmMin, kmMax, precoMin, precoMax, sortKey]);

  const hasFilters = !!(search || statusFilter || marcaFilter.length || combustivelFilter.length || corFilter.length || anoMin || anoMax || kmMin || kmMax || precoMin || precoMax);
  const clearFilters = () => { setSearch(""); setStatusFilter(""); setSortKey("data_compra"); setMarcaFilter([]); setCombustivelFilter([]); setCorFilter([]); setAnoMin(""); setAnoMax(""); setKmMin(""); setKmMax(""); setPrecoMin(""); setPrecoMax(""); };

  const accent = "#f97316";
  const { isMobileOrTablet } = useBreakpoint();
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

      {/* Hero Banner */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        style={{ position: "relative", borderRadius: "20px", overflow: "hidden", height: "clamp(120px, 18vw, 200px)", background: "#060606", border: "1px solid rgba(249,115,22,0.15)" }}>
        <img src="/BANNERHERO.png" alt="Banner" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center right", opacity: 0.7 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(6,6,6,0.97) 30%, rgba(6,6,6,0.4) 70%, rgba(6,6,6,0.1) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, padding: "clamp(16px,4vw,32px) clamp(16px,4vw,36px)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ paddingRight: "clamp(110px, 30%, 160px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Bike size={13} color={accent} strokeWidth={2} />
              <p style={{ fontSize: "11px", fontWeight: "700", color: accent, letterSpacing: "0.12em", textTransform: "uppercase" }}>Painel de Estoque - Motos</p>
            </div>
            <h1 style={{ fontSize: "clamp(16px, 3.5vw, 26px)", fontWeight: "900", color: "#fff", letterSpacing: "-0.8px", lineHeight: 1.15 }}>
              Controle de motos<br/><span style={{ color: accent }}>no seu estoque</span>
            </h1>
          </div>
          <div className="hero-chips">
            {[{ icon: Package, text: "Inventário de motos" }, { icon: TrendingUp, text: "Margem por unidade" }, { icon: CheckCircle2, text: "Status em tempo real" }].map(({ icon: Ic, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: `${accent}14`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic size={13} color={accent} strokeWidth={2} />
                </div>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", fontWeight: "600" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        {/* "Nova Moto" button - inside banner, never overlaps header */}
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => router.push("/dashboard/motos/nova")}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 2, display: "flex", alignItems: "center", gap: "7px", background: `linear-gradient(135deg, ${accent}, #ea580c)`, color: "#fff", border: "none", borderRadius: "12px", padding: "9px 16px", cursor: "pointer", fontSize: "13px", fontWeight: "800", boxShadow: "0 4px 20px rgba(249,115,22,0.4)" }}>
          <Plus size={15} strokeWidth={2.5} /> Nova Moto
        </motion.button>
      </motion.div>


      {/* Sidebar + Grid */}
      <div style={{ display: "flex", gap: "18px", alignItems: "flex-start", flexDirection: isMobileOrTablet ? "column" : "row" }}>

        {/* SIDEBAR */}
        {isMobileOrTablet ? (
          /* Mobile/Tablet: collapsible filter button */
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={() => setFilterOpen(v => !v)} style={{
              width: "100%", height: "40px", display: "flex", alignItems: "center",
              justifyContent: "space-between", padding: "0 14px",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "10px", cursor: "pointer", color: "var(--text-secondary)",
              fontSize: "13px", fontWeight: "700",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <SlidersHorizontal size={14} color="var(--brand)" />
                Filtros{hasFilters ? ` (${[statusFilter, ...marcaFilter, ...combustivelFilter, ...corFilter].filter(Boolean).length})` : ""}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{filterOpen ? "▲ Fechar" : "▼ Abrir"}</span>
            </button>
            <AnimatePresence>
              {filterOpen && (
                <motion.div key="moto-filters" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                  style={{ overflow: "hidden" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "4px" }}>

                    {/* Buscar */}
                    <SidebarSection title="Buscar">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0 12px", height: "36px" }}>
                        <Search size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Marca, modelo, placa..."
                          style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "12px", color: "var(--text-primary)" }} />
                        {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 0 }}><X size={12} /></button>}
                      </div>
                    </SidebarSection>

                    {/* Status */}
                    <SidebarSection title="Status">
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {([
                          { value: "",              label: "Todos",         color: "#64748b" },
                          { value: "disponivel",    label: "Disponível",    color: "#22c55e" },
                          { value: "reservado",     label: "Reservado",     color: "#f59e0b" },
                          { value: "em_preparacao", label: "Em Preparação", color: "#38bdf8" },
                          { value: "em_manutencao", label: "Em Manutenção", color: "#f97316" },
                        ] as const).map(({ value, label, color }) => {
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

                    {/* Estoque */}
                    <SidebarSection title="Estoque">
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[
                          { label: "Total em estoque", value: allActive.length, color: "#a78bfa", icon: Package      },
                          { label: "Disponíveis",      value: dispCount,        color: "#22c55e", icon: CheckCircle2 },
                          { label: "Em Preparação",    value: prepCount,        color: "#38bdf8", icon: Wrench       },
                          { label: "Em Manutenção",    value: manutCount,       color: "#f97316", icon: AlertCircle  },
                          { label: "Reservadas",       value: resvCount,        color: "#f59e0b", icon: Clock        },
                        ].map(({ label, value, color, icon: Ic }) => (
                          <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}><Ic size={11} color={color} /><span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{label}</span></div>
                            <span style={{ fontSize: "13px", fontWeight: "800", color }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </SidebarSection>

                    {/* Marca */}
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

                    {/* Ano */}
                    <SidebarSection title="Ano">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                        <input value={anoMin} onChange={e => setAnoMin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Mín." inputMode="numeric" maxLength={4}
                          style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                        <input value={anoMax} onChange={e => setAnoMax(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Máx." inputMode="numeric" maxLength={4}
                          style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {anos.slice(0, 12).map(ano => {
                          const active = anoMin === String(ano) && anoMax === String(ano);
                          return (
                            <button key={ano} onClick={() => { if (active) { setAnoMin(""); setAnoMax(""); } else { setAnoMin(String(ano)); setAnoMax(String(ano)); } }}
                              style={{ height: "26px", padding: "0 10px", borderRadius: "20px", border: `1px solid ${active ? accent : "var(--border)"}`, background: active ? `${accent}14` : "var(--surface-2)", color: active ? accent : "var(--text-muted)", fontSize: "11px", fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                              {ano}
                            </button>
                          );
                        })}
                      </div>
                    </SidebarSection>

                    {/* Combustível */}
                    <SidebarSection title="Combustível">
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {combustiveis.length > 0
                          ? combustiveis.map(key => {
                              const label = FUEL_LABELS[key as keyof typeof FUEL_LABELS] ?? key;
                              const count = allActive.filter(v => (v.combustivel || "").toLowerCase() === key).length;
                              return <FilterCheckbox key={key} label={label} count={count} active={combustivelFilter.includes(key)} accent={accent} onChange={() => setCombustivelFilter(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])} />;
                            })
                          : <p style={{ fontSize: "11px", color: "var(--text-muted)", padding: "4px 0" }}>Nenhum dado disponível</p>}
                      </div>
                    </SidebarSection>

                    {/* Preço */}
                    <SidebarSection title="Preço (R$)">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <input value={precoMin} onChange={e => setPrecoMin(maskCurrency(e.target.value))} placeholder="0,00" inputMode="numeric"
                          style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                        <input value={precoMax} onChange={e => setPrecoMax(maskCurrency(e.target.value))} placeholder="0,00" inputMode="numeric"
                          style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </SidebarSection>

                    {/* KM */}
                    <SidebarSection title="Quilometragem">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <input value={kmMin} onChange={e => setKmMin(maskKM(e.target.value))} placeholder="Mín." inputMode="numeric"
                          style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                        <input value={kmMax} onChange={e => setKmMax(maskKM(e.target.value))} placeholder="Máx." inputMode="numeric"
                          style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </SidebarSection>

                    {/* Cor */}
                    {cores.length > 0 && (
                      <SidebarSection title="Cor">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                          {cores.map(cor => {
                            const active = corFilter.includes(cor);
                            return (
                              <button key={cor} onClick={() => setCorFilter(p => p.includes(cor) ? p.filter(c => c !== cor) : [...p, cor])}
                                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 8px", borderRadius: "20px", border: `1px solid ${active ? accent : "var(--border)"}`, background: active ? `${accent}14` : "var(--surface-2)", cursor: "pointer", transition: "all 0.15s" }}>
                                <ColorDot cor={cor} />
                                <span style={{ fontSize: "11px", color: active ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: active ? 700 : 400, textTransform: "capitalize" }}>{cor}</span>
                              </button>
                            );
                          })}
                        </div>
                      </SidebarSection>
                    )}

                    {hasFilters && (
                      <button onClick={clearFilters}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "38px", borderRadius: "10px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>
                        <X size={13} /> Limpar Filtros
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Desktop: always-visible sticky sidebar with all filters */
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
            style={{ width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "10px", position: "sticky", top: "16px", maxHeight: "calc(100vh - 100px)", overflowY: "auto", paddingRight: "2px" }}>

          <SidebarSection title="Estoque">
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { label: "Total em estoque", value: allActive.length, color: "#a78bfa", icon: Package      },
                { label: "Disponíveis",      value: dispCount,        color: "#22c55e", icon: CheckCircle2 },
                { label: "Em Preparação",    value: prepCount,        color: "#38bdf8", icon: Wrench       },
                { label: "Em Manutenção",    value: manutCount,       color: "#f97316", icon: AlertCircle  },
                { label: "Reservadas",       value: resvCount,        color: "#f59e0b", icon: Clock        },
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
              {([
                { value: "",              label: "Todos",         color: "#64748b" },
                { value: "disponivel",    label: "Disponível",    color: "#22c55e" },
                { value: "reservado",     label: "Reservado",     color: "#f59e0b" },
                { value: "em_preparacao", label: "Em Preparação", color: "#38bdf8" },
                { value: "em_manutencao", label: "Em Manutenção", color: "#f97316" },
              ] as const).map(({ value, label, color }) => {
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
              <input value={anoMin} onChange={e => setAnoMin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Mín." inputMode="numeric" maxLength={4}
                style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
              <input value={anoMax} onChange={e => setAnoMax(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Máx." inputMode="numeric" maxLength={4}
                style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {anos.slice(0, 12).map(ano => {
                const active = anoMin === String(ano) && anoMax === String(ano);
                return (
                  <button key={ano} onClick={() => { if (active) { setAnoMin(""); setAnoMax(""); } else { setAnoMin(String(ano)); setAnoMax(String(ano)); } }}
                    style={{ height: "26px", padding: "0 10px", borderRadius: "20px", border: `1px solid ${active ? accent : "var(--border)"}`, background: active ? `${accent}14` : "var(--surface-2)", color: active ? accent : "var(--text-muted)", fontSize: "11px", fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                    {ano}
                  </button>
                );
              })}
            </div>
          </SidebarSection>

          <SidebarSection title="Combustível">
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {combustiveis.length > 0
                ? combustiveis.map(key => {
                    const label = FUEL_LABELS[key as keyof typeof FUEL_LABELS] ?? key;
                    const count = allActive.filter(v => (v.combustivel || "").toLowerCase() === key).length;
                    return <FilterCheckbox key={key} label={label} count={count} active={combustivelFilter.includes(key)} accent={accent} onChange={() => setCombustivelFilter(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])} />;
                  })
                : <p style={{ fontSize: "11px", color: "var(--text-muted)", padding: "4px 0" }}>Nenhum dado disponível</p>}
            </div>
          </SidebarSection>

          <SidebarSection title="Preço (R$)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <input value={precoMin} onChange={e => setPrecoMin(maskCurrency(e.target.value))} placeholder="0,00" inputMode="numeric"
                style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
              <input value={precoMax} onChange={e => setPrecoMax(maskCurrency(e.target.value))} placeholder="0,00" inputMode="numeric"
                style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
            </div>
          </SidebarSection>

          <SidebarSection title="Quilometragem">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <input value={kmMin} onChange={e => setKmMin(maskKM(e.target.value))} placeholder="Mín." inputMode="numeric"
                style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
              <input value={kmMax} onChange={e => setKmMax(maskKM(e.target.value))} placeholder="Máx." inputMode="numeric"
                style={{ width: "100%", height: "32px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0 10px", fontSize: "12px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }} />
            </div>
          </SidebarSection>

          {cores.length > 0 && (
            <SidebarSection title="Cor">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {cores.map(cor => {
                  const active = corFilter.includes(cor);
                  return (
                    <button key={cor} onClick={() => setCorFilter(p => p.includes(cor) ? p.filter(c => c !== cor) : [...p, cor])}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 8px", borderRadius: "20px", border: `1px solid ${active ? accent : "var(--border)"}`, background: active ? `${accent}14` : "var(--surface-2)", cursor: "pointer", transition: "all 0.15s" }}>
                      <ColorDot cor={cor} />
                      <span style={{ fontSize: "11px", color: active ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: active ? 700 : 400, textTransform: "capitalize" }}>{cor}</span>
                    </button>
                  );
                })}
              </div>
            </SidebarSection>
          )}

          {hasFilters && (
            <button onClick={clearFilters}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "38px", borderRadius: "10px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>
              <X size={13} /> Limpar Filtros
            </button>
          )}
        </motion.div>
        )}

        {/* GRID */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "12px" }}>


          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--text-primary)", fontWeight: "800" }}>{filtered.length}</span>{" "}moto{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
              {hasFilters && <span style={{ color: "var(--text-muted)" }}> (filtrado)</span>}
            </p>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as typeof sortKey)}
              className="input" style={{ height: "34px", width: "auto", minWidth: 140, padding: "0 32px 0 10px" }}>
              <option value="data_compra">Mais recente</option>
              <option value="valor_anunciado">Maior preço</option>
              <option value="quilometragem">Menor km</option>
            </select>
          </div>

          {isLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
              {Array(6).fill(0).map((_, i) => <div key={i} style={{ height: "400px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)" }} className="skeleton" />)}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "64px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SlidersHorizontal size={24} color="var(--text-muted)" strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>Nenhuma moto encontrada</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{hasFilters ? "Ajuste os filtros na barra lateral" : "Cadastre a primeira moto do estoque"}</p>
              {hasFilters && <button onClick={clearFilters} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}><X size={12} /> Limpar filtros</button>}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="vehicle-grid">
              {filtered.map((v, i) => (
                <MotoCard key={v.id} v={v} delay={Math.min(i * 0.03, 0.2)}
                  onView={() => router.push(`/dashboard/motos/${v.id}`)}
                  onEdit={() => router.push(`/dashboard/motos/${v.id}/editar`)}
                  onExpenses={() => router.push(`/dashboard/motos/${v.id}?tab=despesas`)}
                  onDelete={() => setDeleteTarget(v)} />
              ))}
            </motion.div>
          )}
        </div>
      </div>


      {/* Delete Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: "24px" }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "32px", maxWidth: "400px", width: "100%", textAlign: "center" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <Trash2 size={24} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>Excluir Moto?</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "24px" }}>
                Tem certeza que deseja excluir <strong>{deleteTarget.marca} {deleteTarget.modelo}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex: 1, background: "linear-gradient(135deg,#ef4444,#dc2626)" }}
                  onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? "Excluindo..." : "Sim, Excluir"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
