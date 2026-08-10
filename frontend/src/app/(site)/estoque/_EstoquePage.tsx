"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  SlidersHorizontal, X, ChevronRight,
  Search, LayoutGrid, List, Heart, Gauge, Fuel,
  Calendar, ArrowUpDown, GitCompare, Car, ChevronLeft,
} from "lucide-react";
import type { PublicVehicle } from "@/lib/publicApi";
import { FUEL_LABELS, CAMBIO_LABELS } from "@/lib/publicApi";


const PAGE_SIZE = 9;

function fmtPrice(v: number) { return new Intl.NumberFormat("pt-BR").format(v); }
function fmtKm(v: number)    { return new Intl.NumberFormat("pt-BR").format(v); }

type Vehicle = PublicVehicle;

interface Filters {
  tipo: string[];
  cambio: string[];
  combustivel: string[];
  precoMax: number;
  anoMin: string;
  marca: string;
  search: string;
}

const DEFAULT_FILTERS: Filters = {
  tipo: [], cambio: [], combustivel: [],
  precoMax: 999999, anoMin: "", marca: "", search: "",
};

// Brand colors for fallback logo
const BRAND_COLORS: Record<string, string> = {
  BMW:"#1C69D4", Toyota:"#EB0A1E", Honda:"#CC0000", Chevrolet:"#D4A017",
  Volkswagen:"#003DA5", Hyundai:"#002C5F", Ford:"#003476", Jeep:"#1A1A1A",
  Mitsubishi:"#CC0000", Yamaha:"#E60012", Kawasaki:"#3D9B1B", Suzuki:"#1A4699",
  Nissan:"#C3002F", Fiat:"#9B1C1F", Renault:"#FFCD00",
};

function BrandLogo({ marca, size = 40 }: { marca: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const key = marca.toLowerCase().replace(/\s+/g, "");
  if (failed) {
    const color = BRAND_COLORS[marca] ?? "#555";
    return (
      <div style={{
        width: size, height: size, borderRadius: 8,
        background: color, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: size * 0.35, fontWeight: 900,
        color: "#fff", letterSpacing: -0.5, flexShrink: 0,
      }}>
        {marca.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <Image
      src={`/logos/${key}.png`}
      alt={marca}
      width={size}
      height={size}
      style={{ objectFit: "contain", width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: "#fff", border: "1px solid #E4E6EA", borderRadius: 16, overflow: "hidden" }}>
      <div className="s-skeleton" style={{ height: 190 }} />
      <div style={{ padding: "14px 16px 16px" }}>
        <div className="s-skeleton" style={{ height: 10, width: "40%", marginBottom: 10 }} />
        <div className="s-skeleton" style={{ height: 18, width: "80%", marginBottom: 6 }} />
        <div className="s-skeleton" style={{ height: 12, width: "60%", marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[1,2,3].map(i => <div key={i} className="s-skeleton" style={{ height: 26, flex: 1, borderRadius: 6 }} />)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="s-skeleton" style={{ height: 24, width: "45%" }} />
          <div className="s-skeleton" style={{ height: 36, width: "30%", borderRadius: 10 }} />
        </div>
      </div>
    </div>
  );
}

function CheckRow({ label, count, checked, onToggle }: { label:string; count:number; checked:boolean; onToggle():void }) {
  return (
    <div className="s-filter-item" onClick={onToggle} role="checkbox" aria-checked={checked} tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onToggle()}>
      <div className={"s-filter-cb" + (checked ? " on" : "")}>
        {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>}
      </div>
      <span className="s-filter-label">{label}</span>
      <span className="s-filter-count">{count}</span>
    </div>
  );
}

function FilterSidebar({ filters, onChange, onClear, vehicles, onClose }: {
  filters: Filters; onChange(f: Partial<Filters>): void; onClear(): void; vehicles: Vehicle[]; onClose?():void;
}) {
  function toggleArr(arr: string[], val: string) { return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]; }
  function countBy(key: keyof Vehicle, val: string) { return vehicles.filter(v => String(v[key]) === val).length; }
  const marcas = [...new Set(vehicles.map(v => v.marca))].sort();
  const activeCount = filters.tipo.length + filters.cambio.length + filters.combustivel.length +
    (filters.precoMax < 999999 ? 1 : 0) + (filters.anoMin ? 1 : 0) + (filters.marca ? 1 : 0);
  return (
    <aside className="s-sidebar" style={{ position:"sticky", top:"calc(var(--s-header-h) + 20px)" }}>
      <div style={{ display:"flex", alignItems:"center", marginBottom:20 }}>
        <SlidersHorizontal size={15} strokeWidth={2} color="var(--s-orange)" />
        <span style={{ fontSize:14, fontWeight:800, color:"var(--s-text-1)", marginLeft:8 }}>Filtros</span>
        {activeCount > 0 && (
          <button onClick={onClear} style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:4, background:"var(--s-orange-muted)", border:"none", color:"var(--s-orange)", fontSize:11, fontWeight:700, cursor:"pointer", borderRadius:99, padding:"4px 10px" }}>
            <X size={11} /> Limpar {activeCount}
          </button>
        )}
        {onClose && <button onClick={onClose} style={{ marginLeft:8, background:"none", border:"none", cursor:"pointer", color:"var(--s-text-3)" }}><X size={18} /></button>}
      </div>
      <div className="s-filter-group">
        <p className="s-filter-group-title">Tipo</p>
        <CheckRow label="Carros" count={countBy("tipo","carro")} checked={filters.tipo.includes("carro")} onToggle={() => onChange({ tipo: toggleArr(filters.tipo,"carro") })} />
        <CheckRow label="Motos"  count={countBy("tipo","moto")}  checked={filters.tipo.includes("moto")}  onToggle={() => onChange({ tipo: toggleArr(filters.tipo,"moto")  })} />
      </div>
      <div className="s-filter-group">
        <p className="s-filter-group-title">Câmbio</p>
        {["Automatico","CVT","Manual"].map(c => (
          <CheckRow key={c} label={c} count={countBy("cambio",c)} checked={filters.cambio.includes(c)} onToggle={() => onChange({ cambio: toggleArr(filters.cambio,c) })} />
        ))}
      </div>
      <div className="s-filter-group">
        <p className="s-filter-group-title">Combustível</p>
        {["Flex","Gasolina","Diesel"].map(c => (
          <CheckRow key={c} label={c} count={countBy("combustivel",c)} checked={filters.combustivel.includes(c)} onToggle={() => onChange({ combustivel: toggleArr(filters.combustivel,c) })} />
        ))}
      </div>
      <div className="s-filter-group">
        <p className="s-filter-group-title">Marca</p>
        <select className="s-select-light" value={filters.marca} onChange={e => onChange({ marca: e.target.value })} style={{ width:"100%" }}>
          <option value="">Todas</option>
          {marcas.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="s-filter-group">
        <p className="s-filter-group-title">Ano mínimo</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {["2020","2021","2022","2023","2024"].map(y => (
            <button key={y} onClick={() => onChange({ anoMin: filters.anoMin === y ? "" : y })}
              style={{ padding:"5px 12px", borderRadius:99, fontSize:12, fontWeight:600, fontFamily:"inherit", cursor:"pointer",
                background: filters.anoMin === y ? "var(--s-orange)" : "transparent",
                color:      filters.anoMin === y ? "#fff"            : "var(--s-text-2)",
                border:     filters.anoMin === y ? "1.5px solid var(--s-orange)" : "1.5px solid var(--s-border)",
              }}>
              {y}
            </button>
          ))}
        </div>
      </div>
      <div className="s-filter-group">
        <p className="s-filter-group-title">Preço máximo</p>
        {[
          { label:"até R$ 80.000",  val:80000  },
          { label:"até R$ 120.000", val:120000 },
          { label:"até R$ 180.000", val:180000 },
          { label:"até R$ 300.000", val:300000 },
        ].map(p => (
          <CheckRow key={p.val} label={p.label} count={vehicles.filter(v=>(v.valor_anunciado ?? 0)<=p.val).length}
            checked={filters.precoMax===p.val} onToggle={()=>onChange({precoMax: filters.precoMax===p.val?999999:p.val})} />
        ))}
      </div>
    </aside>
  );
}

// Compare bar (floating)
function CompareBar({ ids, vehicles, onRemove, onClear }: { ids: string[]; vehicles: Vehicle[]; onRemove(id:string):void; onClear():void }) {
  if (ids.length === 0) return null;
  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:400,
      background:"var(--s-dark)", borderTop:"1px solid rgba(255,255,255,0.10)",
      padding:"12px 20px", display:"flex", alignItems:"center", gap:12,
      animation:"s-fadeInUp 0.3s both",
    }}>
      <GitCompare size={18} color="var(--s-orange)" strokeWidth={2} />
      <span style={{ fontSize:13, color:"rgba(255,255,255,0.70)", fontWeight:600 }}>
        {ids.length} veículo{ids.length > 1 ? "s" : ""} para comparar
      </span>
      <div style={{ display:"flex", gap:6 }}>
        {ids.map(id => {
          const v = vehicles.find(x => x.id === id);
          if (!v) return null;
          return (
            <span key={id} style={{
              display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,0.07)",
              border:"1px solid rgba(255,255,255,0.12)", borderRadius:99, padding:"4px 10px",
              fontSize:12, color:"rgba(255,255,255,0.80)", fontWeight:500,
            }}>
              {v.marca} {v.modelo}
              <button onClick={() => onRemove(id)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.40)", padding:0, display:"flex" }}><X size={12} /></button>
            </span>
          );
        })}
      </div>
      <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
        <button onClick={onClear} style={{ background:"none", border:"1.5px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.50)", fontSize:12, fontWeight:600, cursor:"pointer", borderRadius:8, padding:"7px 14px", fontFamily:"inherit" }}>Limpar</button>
        <Link href={`/comparador?v=${ids.join(",")}`} style={{
          background:"var(--s-orange)", color:"#fff", fontSize:13, fontWeight:700,
          padding:"8px 18px", borderRadius:8, textDecoration:"none", display:"flex", alignItems:"center", gap:6,
        }}>
          Comparar agora <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function VehicleCard({ v, compareIds, onToggleCompare, staggerIndex }: {
  v: Vehicle; compareIds: string[]; onToggleCompare(id:string):void; staggerIndex: number;
}) {
  const [fav, setFav] = useState(false);
  const isComparing = compareIds.includes(v.id);
  const mainPhoto = v.photos?.find((p: {is_main:boolean}) => p.is_main) ?? v.photos?.[0];
  const imgSrc = mainPhoto?.url
    ? mainPhoto.url
    : (v.tipo === "moto" ? "/moto-placeholder.png" : "/car-placeholder.png");
  const isPlaceholder = !mainPhoto?.url;
  const isReservado = (v.status as string) === "reservado";
  const badgeClass = isReservado ? "s-v-badge s-v-badge-reservado" : "s-v-badge s-v-badge-disponivel";

  return (
    <div
      className="s-v-card"
      style={{ textDecoration:"none" } as React.CSSProperties}
    >
      <Link href={`/estoque/${v.id}`} style={{ textDecoration:"none", display:"contents" }}>
        <div className="s-v-img" style={isPlaceholder ? { background:"transparent", display:"flex", alignItems:"center", justifyContent:"center" } : {}}>
          {isPlaceholder ? (
            <img src={imgSrc} alt={`${v.marca} ${v.modelo}`} style={{ width:"70%", height:"70%", objectFit:"contain", opacity:0.55 }} />
          ) : (
            <Image src={imgSrc} alt={`${v.marca} ${v.modelo}`} fill style={{ objectFit:"cover" }} />
          )}
          <span className={badgeClass}>{isReservado ? "Reservado" : "Disponível"}</span>
          <button
            className={`s-v-fav${fav ? " active" : ""}`}
            onClick={e => { e.preventDefault(); setFav(x => !x); }}
            aria-label={fav ? "Remover dos favoritos" : "Favoritar"}
          >
            <Heart size={14} fill={fav ? "currentColor" : "none"} strokeWidth={2} />
          </button>
        </div>
        <div className="s-v-info">
          <p className="s-v-make">{v.marca}</p>
          <p className="s-v-name">{v.modelo}</p>
          <p className="s-v-version">{v.versao}</p>
          <div className="s-v-specs">
            <span className="s-v-spec"><Calendar size={11} strokeWidth={2} />{v.ano}</span>
            <span className="s-v-spec"><Gauge size={11} strokeWidth={2} />{fmtKm(v.quilometragem)} km</span>
            <span className="s-v-spec"><ArrowUpDown size={11} strokeWidth={2} />{v.cambio}</span>
            <span className="s-v-spec"><Fuel size={11} strokeWidth={2} />{v.combustivel}</span>
          </div>
          <div className="s-v-divider" />
          <div className="s-v-bottom">
            <div>
              <p className="s-v-price-label">Preço</p>
              <p className="s-v-price"><span className="s-v-price-cur">R$</span>{fmtPrice(v.valor_anunciado ?? 0)}</p>
            </div>
            <span className="s-btn s-btn-primary s-btn-sm" style={{ pointerEvents:"none" }}>Ver <ChevronRight size={13} strokeWidth={2.5} /></span>
          </div>
        </div>
      </Link>
      {/* Compare button */}
      <button
        onClick={() => onToggleCompare(v.id)}
        style={{
          position:"absolute", bottom:14, left:16,
          display:"flex", alignItems:"center", gap:5,
          background: isComparing ? "rgba(244,121,32,0.12)" : "transparent",
          border: isComparing ? "1.5px solid var(--s-orange)" : "1.5px solid var(--s-border)",
          color: isComparing ? "var(--s-orange)" : "var(--s-text-3)",
          fontSize:11, fontWeight:700, cursor:"pointer", borderRadius:6,
          padding:"4px 10px", fontFamily:"inherit",
          transition:"all 180ms",
        }}
      >
        <GitCompare size={11} strokeWidth={2} />
        {isComparing ? "Adicionado" : "Comparar"}
      </button>
    </div>
  );
}

function VehicleCardList({ v, compareIds, onToggleCompare }: { v: Vehicle; compareIds: string[]; onToggleCompare(id:string):void }) {
  const [fav, setFav] = useState(false);
  const isComparing = compareIds.includes(v.id);
  const mainPhoto = v.photos?.find((p: {is_main:boolean}) => p.is_main) ?? v.photos?.[0];
  const imgSrc = mainPhoto?.url
    ? mainPhoto.url
    : (v.tipo === "moto" ? "/moto-placeholder.png" : "/car-placeholder.png");
  const isPlaceholder = !mainPhoto?.url;
  return (
    <div className="s-v-card-list" style={{ textDecoration:"none", display:"grid", gridTemplateColumns:"220px 1fr auto", background:"var(--s-card)", border:"1px solid var(--s-border)", borderRadius:14, overflow:"hidden", transition:"all 220ms", position:"relative" }}>
      <Link href={"/estoque/" + v.id} style={{ display:"contents", textDecoration:"none" }}>
        <div style={{ position:"relative", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", background: isPlaceholder ? "transparent" : undefined }}>
          {isPlaceholder ? (
            <img src={imgSrc} alt={v.marca + " " + v.modelo} style={{ width:"65%", height:"65%", objectFit:"contain", opacity:0.55 }} />
          ) : (
            <Image src={imgSrc} alt={v.marca + " " + v.modelo} fill style={{ objectFit:"cover" }} />
          )}
          <span className={"s-v-badge " + ((v.status as string) === "reservado" ? "s-v-badge-reservado" : "s-v-badge-disponivel")} style={{ position:"absolute", top:8, left:8 }}>
            {(v.status as string) === "reservado" ? "Reservado" : "Disponivel"}
          </span>
        </div>
        <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--s-text-3)", marginBottom:2 }}>{v.marca}</p>
          <p style={{ fontSize:17, fontWeight:800, color:"var(--s-text-1)", letterSpacing:"-0.3px", marginBottom:2 }}>{v.modelo}</p>
          <p style={{ fontSize:12, color:"var(--s-text-3)", marginBottom:12 }}>{v.versao}</p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <span className="s-v-spec"><Calendar size={11} strokeWidth={2} />{v.ano}</span>
            <span className="s-v-spec"><Gauge size={11} strokeWidth={2} />{fmtKm(v.quilometragem)} km</span>
            <span className="s-v-spec"><ArrowUpDown size={11} strokeWidth={2} />{v.cambio}</span>
            <span className="s-v-spec"><Fuel size={11} strokeWidth={2} />{v.combustivel}</span>
          </div>
        </div>
        <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", alignItems:"flex-end", justifyContent:"space-between", borderLeft:"1px solid var(--s-border)", minWidth:160 }}>
          <button className={"s-v-fav" + (fav ? " active" : "")} style={{ position:"static", width:32, height:32 }} onClick={e => { e.preventDefault(); setFav(x => !x); }} aria-label="Favoritar">
            <Heart size={14} fill={fav ? "currentColor" : "none"} strokeWidth={2} />
          </button>
          <div style={{ textAlign:"right" }}>
            <p style={{ fontSize:10, color:"var(--s-text-3)", marginBottom:3 }}>a partir de</p>
            <p style={{ fontSize:22, fontWeight:900, color:"var(--s-text-1)", letterSpacing:"-1px", lineHeight:1, marginBottom:12 }}>
              <span style={{ fontSize:12, fontWeight:600, color:"var(--s-text-3)", verticalAlign:"super", marginRight:2 }}>R$</span>
              {fmtPrice(v.valor_anunciado ?? 0)}
            </p>
            <span className="s-btn s-btn-primary s-btn-sm">Ver oferta <ChevronRight size={13} strokeWidth={2.5} /></span>
          </div>
        </div>
      </Link>
      <button
        onClick={() => onToggleCompare(v.id)}
        style={{
          position:"absolute", bottom:12, left:12,
          display:"flex", alignItems:"center", gap:5,
          background: isComparing ? "rgba(244,121,32,0.12)" : "transparent",
          border: isComparing ? "1.5px solid var(--s-orange)" : "1.5px solid var(--s-border)",
          color: isComparing ? "var(--s-orange)" : "var(--s-text-3)",
          fontSize:11, fontWeight:700, cursor:"pointer", borderRadius:6,
          padding:"4px 10px", fontFamily:"inherit", transition:"all 180ms",
        }}
      >
        <GitCompare size={11} strokeWidth={2} />
        {isComparing ? "Adicionado" : "Comparar"}
      </button>
    </div>
  );
}

export default function EstoquePage({ initialVehicles }: { initialVehicles: Vehicle[] }) {
  // Filtra só disponíveis (redundante mas seguro)
  const vehicles = useMemo(
    () => initialVehicles.filter(v => (v.status as string).toLowerCase() === "disponivel"),
    [initialVehicles]
  );

  const searchParams  = useSearchParams();
  const router        = useRouter();

  // Init from URL
  const [filters, setFilters] = useState<Filters>(() => ({
    tipo:         searchParams.get("tipo")   ? [searchParams.get("tipo")!]  : [],
    marca:        searchParams.get("marca")  ?? "",
    anoMin:       searchParams.get("anoMin") ?? "",
    precoMax:     searchParams.get("preco")  ? Number(searchParams.get("preco")) : 999999,
    cambio:       [],
    combustivel:  [],
    search:       searchParams.get("q")      ?? "",
  }));
  const [sort, setSort]             = useState("recentes");
  const [viewMode, setViewMode]     = useState<"grid"|"list">("grid");
  const [mobileFiltersOpen, setMob] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [page, setPage]             = useState(1);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const loadingTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync URL when filters change
  const updateFilters = useCallback((p: Partial<Filters>) => {
    const next = (prev: Filters) => ({ ...prev, ...p });
    setFilters(prev => {
      const f = next(prev);
      const params = new URLSearchParams();
      if (f.tipo.length === 1)  params.set("tipo",  f.tipo[0]);
      if (f.marca)              params.set("marca",  f.marca);
      if (f.anoMin)             params.set("anoMin", f.anoMin);
      if (f.precoMax < 999999)  params.set("preco",  String(f.precoMax));
      if (f.search)             params.set("q",      f.search);
      router.replace(`/estoque${params.toString() ? "?" + params.toString() : ""}`, { scroll: false });
      return f;
    });
    setPage(1);
    // Skeleton loader 350ms
    setIsLoading(true);
    clearTimeout(loadingTimer.current ?? undefined);
    loadingTimer.current = setTimeout(() => setIsLoading(false), 350);
  }, [router]);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    router.replace("/estoque", { scroll: false });
  }, [router]);

  const result = useMemo(() => {
    let list = [...vehicles];
    if (filters.search)          list = list.filter(v => (v.marca+" "+v.modelo+" "+(v.versao??"")+" "+(v.cor??" ")).toLowerCase().includes(filters.search.toLowerCase()));
    if (filters.tipo.length)        list = list.filter(v => filters.tipo.includes(v.tipo));
    if (filters.cambio.length)      list = list.filter(v => filters.cambio.some(c => v.cambio?.toLowerCase().includes(c.toLowerCase())));
    if (filters.combustivel.length) list = list.filter(v => filters.combustivel.some(c => v.combustivel?.toLowerCase().includes(c.toLowerCase())));
    if (filters.precoMax < 999999)  list = list.filter(v => (v.valor_anunciado ?? 0) <= filters.precoMax);
    if (filters.anoMin)             list = list.filter(v => v.ano >= Number(filters.anoMin));
    if (filters.marca)              list = list.filter(v => v.marca === filters.marca);
    if (sort === "menor-preco") list.sort((a,b) => (a.valor_anunciado ?? 0) - (b.valor_anunciado ?? 0));
    if (sort === "maior-preco") list.sort((a,b) => (b.valor_anunciado ?? 0) - (a.valor_anunciado ?? 0));
    if (sort === "menor-km")    list.sort((a,b) => (a.quilometragem??0) - (b.quilometragem??0));
    if (sort === "maior-km")    list.sort((a,b) => (b.quilometragem??0) - (a.quilometragem??0));
    return list;
  }, [vehicles, filters, sort]);

  const paginated = result.slice(0, page * PAGE_SIZE);
  const hasMore   = result.length > page * PAGE_SIZE;

  const chips: { label:string; onRemove():void }[] = [
    ...filters.tipo.map(t        => ({ label: t === "carro" ? "Carros" : "Motos", onRemove: () => updateFilters({ tipo: filters.tipo.filter(x => x !== t) }) })),
    ...filters.cambio.map(c      => ({ label: c, onRemove: () => updateFilters({ cambio: filters.cambio.filter(x => x !== c) }) })),
    ...filters.combustivel.map(c => ({ label: c, onRemove: () => updateFilters({ combustivel: filters.combustivel.filter(x => x !== c) }) })),
    ...(filters.marca  ? [{ label: filters.marca, onRemove: () => updateFilters({ marca: "" }) }] : []),
    ...(filters.anoMin ? [{ label: "A partir de "+filters.anoMin, onRemove: () => updateFilters({ anoMin: "" }) }] : []),
    ...(filters.precoMax < 999999 ? [{ label: "Ate R$ "+fmtPrice(filters.precoMax), onRemove: () => updateFilters({ precoMax: 999999 }) }] : []),
  ];

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  };

  return (
    <>
      {/* Hero dark header */}
      <div style={{ background:"var(--s-dark)", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"32px 0 28px" }}>
        <div className="s-container">
          <nav className="s-breadcrumb" style={{ marginBottom:16 }}>
            <Link href="/" style={{ color:"rgba(255,255,255,0.35)", textDecoration:"none", fontSize:12 }}>Inicio</Link>
            <ChevronRight size={12} color="rgba(255,255,255,0.20)" />
            <span style={{ color:"rgba(255,255,255,0.60)", fontSize:12 }}>Estoque</span>
          </nav>
          <div className="s-estoque-header-row" style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:20, flexWrap:"wrap", marginBottom:20 }}>
            <div>
              <h1 style={{ fontSize:"clamp(22px,3vw,32px)", fontWeight:900, color:"#fff", letterSpacing:"-0.8px", marginBottom:4 }}>Estoque de Veiculos</h1>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.35)" }}><span style={{ color:"var(--s-orange)", fontWeight:700 }}>{vehicles.length}</span> veiculos disponiveis</p>
            </div>
            {/* Image cards — Carros / Motos */}
            <div className="s-tipo-cards-wrap" style={{ display:"flex", gap:10 }}>
              {([
                { val:"carro", label:"Carros", sub:`${vehicles.filter(v=>v.tipo==="carro").length} disponiveis`, img:"/hero-carro.jpeg" },
                { val:"moto",  label:"Motos",  sub:`${vehicles.filter(v=>v.tipo==="moto").length} disponiveis`,  img:"/hero-moto.png"  },
              ]).map(t => {
                const active = filters.tipo.includes(t.val) && filters.tipo.length === 1;
                return (
                  <button key={t.val}
                    className="s-tipo-card-btn"
                    onClick={() => updateFilters({ tipo: active ? [] : [t.val] })}
                    style={{
                      position:"relative", width:140, height:80, borderRadius:12,
                      overflow:"hidden", border:"2.5px solid",
                      borderColor: active ? "var(--s-orange)" : "rgba(255,255,255,0.10)",
                      cursor:"pointer", padding:0, transition:"border-color 200ms, box-shadow 200ms",
                      boxShadow: active ? "0 0 0 3px rgba(244,121,32,0.20)" : "none",
                      backgroundImage:`url(${t.img})`, backgroundSize:"cover", backgroundPosition:"center",
                    }}
                  >
                    <div style={{ position:"absolute", inset:0, background: active
                      ? "linear-gradient(90deg, rgba(14,15,17,0.65) 0%, rgba(14,15,17,0.25) 70%), linear-gradient(90deg, rgba(244,121,32,0.18) 0%, transparent 65%)"
                      : "linear-gradient(90deg, rgba(14,15,17,0.82) 0%, rgba(14,15,17,0.50) 70%)" }} />
                    <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", textAlign:"left" }}>
                      <p style={{ fontSize:15, fontWeight:900, letterSpacing:"-0.3px", color: active ? "var(--s-orange)" : "rgba(255,255,255,0.75)", marginBottom:2, transition:"color 220ms" }}>{t.label}</p>
                      <p style={{ fontSize:10, color:"rgba(255,255,255,0.38)", fontWeight:500 }}>{t.sub}</p>
                    </div>
                    {active && (
                      <div style={{ position:"absolute", top:7, right:7, width:18, height:18, borderRadius:"50%", background:"var(--s-orange)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,0.06)", border:"1.5px solid rgba(255,255,255,0.10)", borderRadius:12, padding:"0 16px", height:46, width:"100%", maxWidth:560 }}>
            <Search size={16} color="rgba(255,255,255,0.35)" strokeWidth={2} />
            <input value={filters.search} onChange={e => updateFilters({ search: e.target.value })} placeholder="Pesquise marca, modelo, versao..." style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:14, color:"#fff", fontFamily:"inherit" }} />
            {filters.search && <button onClick={() => updateFilters({ search: "" })} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.40)", padding:0 }}><X size={14} /></button>}
          </div>
        </div>
      </div>

      <div className="s-section-sm">
        <div className="s-container">
          {/* Topbar */}
          <div className="s-estoque-topbar" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, gap:12, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={() => setMob(true)} id="mobile-filter-btn" className="s-btn s-btn-outline s-btn-sm" style={{ display:"none" }}>
                <SlidersHorizontal size={14} /> Filtros
                {chips.length > 0 && <span style={{ background:"var(--s-orange)", color:"#fff", borderRadius:99, fontSize:10, fontWeight:700, padding:"1px 6px", marginLeft:2 }}>{chips.length}</span>}
              </button>
              <p style={{ fontSize:13, color:"var(--s-text-3)" }}><strong style={{ color:"var(--s-text-1)" }}>{result.length}</strong> veiculos encontrados</p>
            </div>
            <div className="s-estoque-topbar-right" style={{ display:"flex", alignItems:"center", gap:8 }}>
              <select className="s-select-light" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} aria-label="Ordenar por" style={{ minWidth:170 }}>
                <option value="recentes">Mais recentes</option>
                <option value="menor-preco">Menor preço</option>
                <option value="maior-preco">Maior preço</option>
                <option value="menor-km">Menor quilometragem</option>
                <option value="maior-km">Maior quilometragem</option>
              </select>
              <div style={{ display:"flex", border:"1.5px solid var(--s-border)", borderRadius:9, overflow:"hidden" }}>
                {(["grid","list"] as const).map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{ width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer", transition:"all 140ms", background: viewMode === m ? "var(--s-orange)" : "var(--s-white)", color: viewMode === m ? "#fff" : "var(--s-text-3)" }} aria-label={m === "grid" ? "Grade" : "Lista"}>
                    {m === "grid" ? <LayoutGrid size={15} /> : <List size={15} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chips */}
          {chips.length > 0 && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
              {chips.map((c, i) => (
                <button key={i} onClick={c.onRemove} style={{ display:"flex", alignItems:"center", gap:5, height:28, padding:"0 10px", borderRadius:99, background:"var(--s-orange-muted)", border:"1.5px solid rgba(244,121,32,0.25)", color:"var(--s-orange)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  {c.label} <X size={11} />
                </button>
              ))}
              <button onClick={clearFilters} style={{ height:28, padding:"0 10px", borderRadius:99, fontFamily:"inherit", background:"none", border:"1.5px solid var(--s-border)", color:"var(--s-text-3)", fontSize:12, fontWeight:600, cursor:"pointer" }}>Limpar tudo</button>
            </div>
          )}

          <div className="s-listing-layout">
            <div id="sidebar-desktop">
              <FilterSidebar filters={filters} onChange={updateFilters} onClear={clearFilters} vehicles={vehicles} />
            </div>
            <div>
              {isLoading ? (
                <div className="s-grid-3">
                  {[...Array(PAGE_SIZE)].map((_,i) => <SkeletonCard key={i} />)}
                </div>
              ) : result.length === 0 ? (
                <div style={{ textAlign:"center", padding:"80px 0", background:"var(--s-white)", border:"1px solid var(--s-border)", borderRadius:16 }}>
                  <Car size={52} strokeWidth={1} color="var(--s-text-3)" style={{ margin:"0 auto 16px" }} />
                  <p style={{ fontSize:18, fontWeight:700, color:"var(--s-text-1)", marginBottom:8 }}>Nenhum veiculo encontrado</p>
                  <p style={{ fontSize:14, color:"var(--s-text-3)", marginBottom:24 }}>Tente ajustar ou limpar os filtros</p>
                  <button onClick={clearFilters} className="s-btn s-btn-primary s-btn-md">Limpar filtros</button>
                </div>
              ) : viewMode === "grid" ? (
                <>
                  <div className="s-grid-3">
                    {paginated.map((v, i) => (
                      <VehicleCard key={v.id} v={v} compareIds={compareIds} onToggleCompare={toggleCompare} staggerIndex={i % PAGE_SIZE} />
                    ))}
                  </div>
                  {hasMore && (
                    <div style={{ textAlign:"center", marginTop:32 }}>
                      <button
                        onClick={() => setPage(p => p + 1)}
                        className="s-btn s-btn-outline s-btn-md"
                        style={{ minWidth:200 }}
                      >
                        Carregar mais ({result.length - paginated.length} restantes)
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {paginated.map(v => <VehicleCardList key={v.id} v={v} compareIds={compareIds} onToggleCompare={toggleCompare} />)}
                  {hasMore && (
                    <div style={{ textAlign:"center", marginTop:16 }}>
                      <button onClick={() => setPage(p => p + 1)} className="s-btn s-btn-outline s-btn-md">
                        Carregar mais ({result.length - paginated.length} restantes)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {mobileFiltersOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex" }}>
          <div style={{ flex:1, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)" }} onClick={() => setMob(false)} />
          <div style={{ width:"min(340px,100vw)", background:"var(--s-white)", overflowY:"auto", padding:20, boxShadow:"-8px 0 40px rgba(0,0,0,0.20)" }}>
            <FilterSidebar filters={filters} onChange={updateFilters} onClear={clearFilters} vehicles={vehicles} onClose={() => setMob(false)} />
          </div>
        </div>
      )}

      {/* Compare bar */}
      <CompareBar ids={compareIds} vehicles={vehicles} onRemove={id => setCompareIds(p => p.filter(x => x !== id))} onClear={() => setCompareIds([])} />

      <style>{`
        #mobile-filter-btn { display: none; }
        @media (max-width: 860px) {
          #mobile-filter-btn { display: flex !important; }
          #sidebar-desktop   { display: none; }
          .s-listing-layout  { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .s-grid-3 { grid-template-columns: 1fr !important; }
        }
        .s-v-card { position: relative; }
        .s-v-card-list:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.10); }
        .s-v-card-list { position: relative; }
      `}</style>
    </>
  );
}