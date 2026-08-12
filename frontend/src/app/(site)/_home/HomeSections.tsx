"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ArrowRight, ShieldCheck, FileCheck, CreditCard, Handshake, ChevronRight, Car, TrendingUp } from "lucide-react";
import type { PublicVehicle, PublicStats, PublicSettings, PublicModeloDestaque, PublicPopularModel } from "@/lib/publicApi";
import { FUEL_LABELS, CAMBIO_LABELS, CARROCERIA_LABELS } from "@/lib/publicApi";
import { vehicleSlug } from "@/components/vehicle/shared";
import ReviewsSection from "../sobre/_ReviewsSection";

// Cores fallback por marca
const BRAND_COLORS: Record<string,string> = {
  BMW:"#1C69D4", Toyota:"#EB0A1E", Honda:"#CC0000", Chevrolet:"#D4A017",
  Volkswagen:"#003DA5", Hyundai:"#002C5F", Ford:"#003476", Jeep:"#1A1A1A",
  Mitsubishi:"#CC0000", Yamaha:"#E60012", Kawasaki:"#3D9B1B", Suzuki:"#1A4699",
  Nissan:"#C3002F", Fiat:"#9B1C1F", Renault:"#FFCD00",
};

const BrandLogos: Record<string, React.FC<{ size?: number }>> = {
  BMW: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="48" stroke="#1C69D4" strokeWidth="4"/><circle cx="50" cy="50" r="36" fill="none" stroke="#1C69D4" strokeWidth="1.5"/><path d="M50 14 A36 36 0 0 1 86 50 L50 50 Z" fill="#1C69D4"/><path d="M50 86 A36 36 0 0 1 14 50 L50 50 Z" fill="#1C69D4"/><path d="M50 14 A36 36 0 0 0 14 50 L50 50 Z" fill="white"/><path d="M50 86 A36 36 0 0 0 86 50 L50 50 Z" fill="white"/></svg>
  ),
  Toyota: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><ellipse cx="50" cy="50" rx="22" ry="32" stroke="#EB0A1E" strokeWidth="5" fill="none"/><ellipse cx="50" cy="50" rx="42" ry="20" stroke="#EB0A1E" strokeWidth="5" fill="none"/><line x1="50" y1="18" x2="50" y2="82" stroke="white" strokeWidth="3"/></svg>
  ),
  Honda: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><rect x="8" y="20" width="84" height="60" rx="6" fill="#CC0000"/><text x="50" y="63" textAnchor="middle" fontSize="46" fontWeight="900" fontFamily="Arial" fill="white">H</text></svg>
  ),
  Chevrolet: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><path d="M10 40 H40 V30 H60 V40 H90 V60 H60 V70 H40 V60 H10 Z" fill="#D4A017" stroke="#B8860B" strokeWidth="2"/></svg>
  ),
  Volkswagen: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="46" fill="#003DA5"/><circle cx="50" cy="50" r="36" fill="none" stroke="white" strokeWidth="2"/><text x="50" y="64" textAnchor="middle" fontSize="38" fontWeight="900" fontFamily="Arial" fill="white">VW</text></svg>
  ),
  Hyundai: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><ellipse cx="50" cy="50" rx="46" ry="32" fill="#002C5F"/><text x="50" y="62" textAnchor="middle" fontSize="52" fontWeight="900" fontFamily="Georgia,serif" fill="white" fontStyle="italic">H</text></svg>
  ),
  Ford: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><ellipse cx="50" cy="50" rx="46" ry="30" fill="#003476"/><text x="50" y="62" textAnchor="middle" fontSize="28" fontWeight="700" fontFamily="Arial" fill="white" fontStyle="italic">Ford</text></svg>
  ),
  Jeep: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><rect x="5" y="25" width="90" height="50" rx="8" fill="#1A1A1A"/><text x="50" y="61" textAnchor="middle" fontSize="26" fontWeight="900" fontFamily="Arial" fill="white" letterSpacing="3">JEEP</text></svg>
  ),
  Mitsubishi: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><polygon points="50,5 65,30 80,55 50,55 20,55 35,30" fill="#CC0000"/><polygon points="50,55 65,55 80,80 50,95 20,80 35,55" fill="#CC0000" opacity="0.6"/></svg>
  ),
  Fiat: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><rect x="5" y="5" width="90" height="90" rx="18" fill="#9B1C1F"/><text x="50" y="66" textAnchor="middle" fontSize="30" fontWeight="900" fontFamily="Arial" fill="white" letterSpacing="2">FIAT</text></svg>
  ),
  Renault: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><rect x="5" y="5" width="90" height="90" rx="18" fill="#EFDF00"/><polygon points="50,15 70,35 60,50 80,65 50,85 20,65 40,50 30,35" fill="#000" opacity="0.85"/></svg>
  ),
  Nissan: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><rect x="5" y="5" width="90" height="90" rx="18" fill="#C3002F"/><text x="50" y="60" textAnchor="middle" fontSize="18" fontWeight="900" fontFamily="Arial" fill="white" letterSpacing="1">NISSAN</text><line x1="15" y1="68" x2="85" y2="68" stroke="white" strokeWidth="3"/></svg>
  ),
  Yamaha: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><rect x="5" y="5" width="90" height="90" rx="18" fill="#1A1A1A"/><text x="50" y="62" textAnchor="middle" fontSize="14" fontWeight="900" fontFamily="Arial" fill="#E60012" letterSpacing="1">YAMAHA</text></svg>
  ),
  Kawasaki: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><rect x="5" y="5" width="90" height="90" rx="18" fill="#3D9B1B"/><text x="50" y="58" textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="Arial" fill="white" letterSpacing="0.5">KAWASAKI</text></svg>
  ),
  Suzuki: ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"><rect x="5" y="5" width="90" height="90" rx="18" fill="#1A4699"/><text x="50" y="62" textAnchor="middle" fontSize="15" fontWeight="900" fontFamily="Arial" fill="white" letterSpacing="1">SUZUKI</text></svg>
  ),
};

// BrandLogoFallback: usa PNG real da pasta /logos/, SVG inline como fallback
function BrandLogoFallback({ marca, size = 44 }: { marca: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const key = marca.toLowerCase().replace(/\s+/g, "");

  if (!failed) {
    // Tenta carregar o PNG real
    return (
      <Image
        src={`/logos/${key}.png`}
        alt={marca}
        width={size}
        height={size}
        style={{ objectFit:"contain", width:size, height:size }}
        onError={() => setFailed(true)}
      />
    );
  }

  // Fallback: SVG inline se tiver, senão iniciais coloridas
  const Logo = BrandLogos[marca];
  if (Logo) return <Logo size={size} />;
  const color = BRAND_COLORS[marca] ?? "#555";
  return (
    <div style={{ width:size, height:size, borderRadius:10, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.3, fontWeight:900, color:"#fff", letterSpacing:-0.5 }}>
      {marca.slice(0,2).toUpperCase()}
    </div>
  );
}


// Mock de fallback — usado quando banco estiver vazio
const FEATURED_VEHICLES_FALLBACK: PublicVehicle[] = [];


const BRANDS_CARROS = ["Fiat","Renault","Volkswagen","Chevrolet","Toyota","Hyundai","Honda","BMW","Jeep","Ford","Mitsubishi","Nissan"];
const BRANDS_MOTOS  = ["Honda","Yamaha","Kawasaki","Suzuki"];

const WHY_ITEMS = [
  { icon: ShieldCheck, title:"Vistoria de 100 pontos",   text:"Todos os veículos são inspecionados rigorosamente antes de entrar no estoque." },
  { icon: FileCheck,   title:"Documentação garantida",   text:"Toda documentação regularizada e sem pendências antes da entrega." },
  { icon: CreditCard,  title:"Financiamento facilitado", text:"Parceiros dos principais bancos para as melhores condições de crédito." },
  { icon: Handshake,   title:"Aceito seu carro",         text:"Avaliação gratuita e aceitamos seu veículo como parte do pagamento." },
];

function fmtPrice(v: number) { return new Intl.NumberFormat("pt-BR").format(v); }
function fmtKm(v: number)    { return new Intl.NumberFormat("pt-BR").format(v) + " km"; }

// ─── Vehicle Card ─────────────────────────────────────────────────────
function VehicleCard({ v }: { v: PublicVehicle }) {
  const [fav, setFav] = useState(false);
  const mainPhoto = v.photos?.find(p => p.is_main) ?? v.photos?.[0];
  const imgSrc = mainPhoto?.url
    ? mainPhoto.url
    : (v.tipo === "moto" ? "/moto-placeholder.svg" : "/car-placeholder.svg");
  const isPlaceholder = !mainPhoto;
  const badgeClass =
    v.destaque ? "s-v-badge s-v-badge-destaque" : "s-v-badge s-v-badge-disponivel";
  const badgeLabel = v.destaque ? "Destaque" : "Disponível";

  return (
    <Link href={`/veiculo/${vehicleSlug(v)}`} className="s-v-card" style={{ textDecoration:"none" }}>
      <div className="s-v-img" style={isPlaceholder ? { background:"transparent", display:"flex", alignItems:"center", justifyContent:"center" } : {}}>
        {isPlaceholder ? (
          // PNG sem fundo — mesmo estilo do painel de gestão
          <img
            src={imgSrc}
            alt={`${v.marca} ${v.modelo}`}
            style={{ width:"70%", height:"70%", objectFit:"contain", opacity:0.55, display:"block" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={`${v.marca} ${v.modelo}`} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        )}
        <span className={badgeClass}>{badgeLabel}</span>
        <button
          className={`s-v-fav${fav ? " active" : ""}`}
          onClick={e => { e.preventDefault(); setFav(x => !x); }}
          aria-label={fav ? "Remover dos favoritos" : "Favoritar"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={fav ? "currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <div className="s-v-info">
        <p className="s-v-make">{v.marca}</p>
        <p className="s-v-name">{v.modelo}</p>
        <p className="s-v-version">{v.versao}</p>
        <div className="s-v-specs">
          <span className="s-v-spec">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {v.ano}
          </span>
          <span className="s-v-spec">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            {fmtKm(v.quilometragem)}
          </span>
          <span className="s-v-spec">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M4.93 4.93l14.14 14.14"/></svg>
            {CAMBIO_LABELS[v.cambio] ?? v.cambio}
          </span>
        </div>
        <div className="s-v-divider" />
        <div className="s-v-bottom">
          <div>
            <p className="s-v-price-label">Preço</p>
            <p className="s-v-price"><span className="s-v-price-cur">R$</span>{fmtPrice(v.valor_anunciado ?? 0)}</p>
          </div>
          <span className="s-btn s-btn-primary s-btn-sm" style={{ pointerEvents:"none" }}>
            Ver <ChevronRight size={13} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── AvalieSection component ──────────────────────────────────────────────────────
function AvalieSection({ whatsapp = "" }: { whatsapp?: string }) {
  const [form, setForm] = useState({ marca:"", modelo:"", ano:"", km:"" });
  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]:v }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = whatsapp.replace(/\D/g, "");
    const msg = `Olá! Gostaria de avaliar meu veículo:\n\nMarca: ${form.marca}\nModelo: ${form.modelo}\nAno: ${form.ano}\nQuilometragem: ${form.km} km`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };
  return (
    <section style={{ background:"var(--s-bg)", padding:"80px 0", borderTop:"1px solid var(--s-border)" }} aria-label="Avalie seu veículo">
      <div className="s-container">
        <div className="s-avalie-grid">
          {/* Texto */}
          <div>
            <span style={{ display:"inline-block", background:"var(--s-orange-muted)", color:"var(--s-orange)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, padding:"5px 14px", borderRadius:999, marginBottom:20 }}>Avaliação gratuita</span>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,38px)", fontWeight:900, color:"var(--s-text-1)", letterSpacing:"-0.8px", lineHeight:1.2, marginBottom:16 }}>
              Quanto vale o seu<br /><em style={{ color:"var(--s-orange)", fontStyle:"normal" }}>veículo?</em>
            </h2>
            <p style={{ fontSize:15, color:"var(--s-text-2)", lineHeight:1.75, marginBottom:28, maxWidth:400 }}>
              Preencha os dados ao lado e receba uma avaliação gratuita direto no WhatsApp em minutos. Sem compromisso.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[{icon:"01", text:"Preencha os dados do veículo"},{icon:"02", text:"Receba a avaliação via WhatsApp"},{icon:"03", text:"Negocie diretamente conosco"}].map(s => (
                <div key={s.icon} style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"var(--s-orange-muted)", border:"1px solid rgba(244,121,32,0.20)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:"var(--s-orange)", flexShrink:0 }}>{s.icon}</div>
                  <span style={{ fontSize:14, color:"var(--s-text-2)", fontWeight:500 }}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Formulário */}
          <div>
            <form onSubmit={handleSubmit} style={{ background:"var(--s-white)", border:"1px solid var(--s-border)", borderRadius:20, padding:"36px 32px", boxShadow:"0 4px 32px rgba(0,0,0,0.07)" }}>
              <p style={{ fontSize:17, fontWeight:900, color:"var(--s-text-1)", letterSpacing:"-0.4px", marginBottom:24 }}>Dados do seu veículo</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--s-text-3)", marginBottom:6 }}>Marca *</label>
                  <select className="s-select-light" required value={form.marca} onChange={e => update("marca",e.target.value)} style={{ width:"100%" }}>
                    <option value="">Selecione</option>
                    {["Fiat","Chevrolet","Volkswagen","Toyota","Hyundai","Honda","Renault","Jeep","Ford","BMW","Nissan","Mitsubishi","Yamaha","Honda Moto"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--s-text-3)", marginBottom:6 }}>Modelo *</label>
                  <input className="s-input-light" required placeholder="Ex: HB20, Onix..." value={form.modelo} onChange={e => update("modelo",e.target.value)} style={{ width:"100%" }} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--s-text-3)", marginBottom:6 }}>Ano *</label>
                  <select className="s-select-light" required value={form.ano} onChange={e => update("ano",e.target.value)} style={{ width:"100%" }}>
                    <option value="">Selecione</option>
                    {Array.from({length:15},(_,i)=>2024-i).map(y=><option key={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--s-text-3)", marginBottom:6 }}>Quilometragem *</label>
                  <input className="s-input-light" required placeholder="Ex: 45.000" value={form.km} onChange={e => update("km",e.target.value)} style={{ width:"100%" }} />
                </div>
              </div>
              <button type="submit" className="s-btn s-btn-wpp s-btn-lg s-btn-full" style={{ gap:10, marginTop:8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                Avaliar pelo WhatsApp
              </button>
              <p style={{ fontSize:11, color:"var(--s-text-3)", textAlign:"center", marginTop:12 }}>100% gratuito • Sem compromisso • Resposta em até 1h</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Modelos Mais Buscados ────────────────────────────────────────────────────

type ModeloCard = {
  id: string;
  marca: string;
  modelo: string;
  carroceria: string | null;
  photo_url: string | null;
  total_disponiveis: number;
  min_price: number | null;
  total_views: number;
  is_manual: boolean;
};

function fmtShortPrice(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}K`;
  return new Intl.NumberFormat("pt-BR").format(v);
}

// SVG silhuetas de carroceria
const CAT_ICONS: Record<string, React.ReactNode> = {
  suv: (
    <svg width="22" height="14" viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 16 L6 10 L10 6 L34 6 L39 10 L41 16"/>
      <path d="M1 16 L43 16"/>
      <circle cx="11" cy="18.5" r="2.5"/>
      <circle cx="33" cy="18.5" r="2.5"/>
    </svg>
  ),
  hatch: (
    <svg width="22" height="14" viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 16 L8 9 L16 5 L28 5 L36 9 L41 16"/>
      <path d="M1 16 L43 16"/>
      <circle cx="11" cy="18.5" r="2.5"/>
      <circle cx="33" cy="18.5" r="2.5"/>
    </svg>
  ),
  sedan: (
    <svg width="22" height="14" viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16 L7 10 L13 6 L31 6 L37 10 L42 14 L42 16"/>
      <path d="M1 16 L43 16"/>
      <circle cx="11" cy="18.5" r="2.5"/>
      <circle cx="33" cy="18.5" r="2.5"/>
    </svg>
  ),
  picape: (
    <svg width="22" height="14" viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16 L5 9 L10 6 L22 6 L22 10 L40 10 L42 16"/>
      <path d="M22 10 L22 16"/>
      <path d="M1 16 L43 16"/>
      <circle cx="11" cy="18.5" r="2.5"/>
      <circle cx="34" cy="18.5" r="2.5"/>
    </svg>
  ),
  coupe: (
    <svg width="22" height="14" viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16 L8 10 L14 5 L30 5 L38 9 L42 13 L42 16"/>
      <path d="M1 16 L43 16"/>
      <circle cx="11" cy="18.5" r="2.5"/>
      <circle cx="33" cy="18.5" r="2.5"/>
    </svg>
  ),
  minivan: (
    <svg width="22" height="14" viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16 L4 5 L38 5 L42 10 L42 16"/>
      <path d="M1 16 L43 16"/>
      <circle cx="10" cy="18.5" r="2.5"/>
      <circle cx="34" cy="18.5" r="2.5"/>
    </svg>
  ),
  van: (
    <svg width="22" height="14" viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="40" height="11" rx="2"/>
      <circle cx="10" cy="18.5" r="2.5"/>
      <circle cx="34" cy="18.5" r="2.5"/>
    </svg>
  ),
  perua: (
    <svg width="22" height="14" viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16 L7 10 L13 6 L38 6 L41 10 L42 16"/>
      <path d="M1 16 L43 16"/>
      <circle cx="11" cy="18.5" r="2.5"/>
      <circle cx="33" cy="18.5" r="2.5"/>
    </svg>
  ),
  conversivel: (
    <svg width="22" height="14" viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12 L8 9 L14 9 L30 9 L38 9 L42 12"/>
      <path d="M1 12 L43 12"/>
      <path d="M14 9 L18 5 L30 5 L30 9" strokeDasharray="2 1"/>
      <circle cx="11" cy="14.5" r="2.5"/>
      <circle cx="33" cy="14.5" r="2.5"/>
    </svg>
  ),
};

function ModelosMaisBuscados({
  modelos,
  popularModels = [],
}: {
  modelos: PublicModeloDestaque[];
  popularModels?: PublicPopularModel[];
}) {
  const [activeTab, setActiveTab]   = useState<string>("todos");
  const scrollRef                   = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]      = useState(false);
  const [canRight, setCanRight]     = useState(true);

  // Merge manual + auto
  const manuaisCards: ModeloCard[] = modelos.map(m => ({
    id: m.id, marca: m.marca, modelo: m.modelo, carroceria: m.carroceria,
    photo_url: m.imagem_url, total_disponiveis: m.total_disponiveis,
    min_price: null, total_views: 0, is_manual: true,
  }));
  const manuaisKeys = new Set(manuaisCards.map(m => `${m.marca}|${m.modelo}`.toLowerCase()));
  const autoCards: ModeloCard[] = popularModels
    .filter(p => !manuaisKeys.has(`${p.marca}|${p.modelo}`.toLowerCase()))
    .map((p, i) => ({
      id: `auto-${i}`, marca: p.marca, modelo: p.modelo, carroceria: p.carroceria,
      photo_url: p.photo_url, total_disponiveis: p.total_disponiveis,
      min_price: p.min_price, total_views: p.total_views, is_manual: false,
    }));
  const merged: ModeloCard[] = [...manuaisCards, ...autoCards].slice(0, 10);

  // Tabs
  const carroceriaSet = Array.from(new Set(merged.map(m => m.carroceria).filter(Boolean))) as string[];
  const tabs = [
    { value: "todos", label: "Todos", icon: null },
    ...carroceriaSet.map(c => ({ value: c, label: CARROCERIA_LABELS[c] ?? c, icon: CAT_ICONS[c] ?? null })),
  ];
  const visible = activeTab === "todos" ? merged : merged.filter(m => m.carroceria === activeTab);

  if (merged.length === 0) return null;

  // Scroll navigation
  function updateArrows() {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }

  function scrollBy(dir: -1 | 1) {
    scrollRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
    setTimeout(updateArrows, 350);
  }

  return (
    <section
      style={{ padding: "72px 0", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative" }}
      aria-label="Modelos mais buscados"
    >
      <div className="s-container">
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2.5, color: "rgba(255,255,255,0.22)", marginBottom: 6 }}>
              Popular no estoque
            </p>
            <h2 style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.6px", lineHeight: 1 }}>
              Modelos mais <em style={{ color: "var(--s-orange)", fontStyle: "normal" }}>buscados</em>
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Nav arrows */}
            {[canLeft && -1, canRight && 1].map((dir, i) => dir && (
              <button
                key={i}
                onClick={() => scrollBy(dir as -1|1)}
                style={{
                  width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px)",
                  color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.18s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,121,32,0.15)"; e.currentTarget.style.borderColor = "rgba(244,121,32,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {dir === -1 ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
                </svg>
              </button>
            ))}
            <Link href="/estoque" style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 13, fontWeight: 700, color: "var(--s-orange)",
              textDecoration: "none", padding: "0 4px",
              transition: "opacity 0.18s",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Ver todos <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        {/* ── Category tabs ── */}
        {tabs.length > 2 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", marginBottom: 28, paddingBottom: 4,
            scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {tabs.map(t => {
              const active = activeTab === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => { setActiveTab(t.value); scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" }); }}
                  style={{
                    flexShrink: 0,
                    height: 38, padding: t.icon ? "0 14px 0 10px" : "0 16px",
                    borderRadius: 999, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    border: `1px solid ${active ? "var(--s-orange)" : "rgba(255,255,255,0.10)"}`,
                    background: active ? "rgba(244,121,32,0.14)" : "rgba(255,255,255,0.03)",
                    color: active ? "var(--s-orange)" : "rgba(255,255,255,0.40)",
                    transition: "all 0.18s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "rgba(255,255,255,0.40)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}}
                >
                  {t.icon && <span style={{ display: "flex", opacity: active ? 1 : 0.5 }}>{t.icon}</span>}
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Cards carousel ── */}
        <div style={{ position: "relative" }}>
          <div
            ref={scrollRef}
            onScroll={updateArrows}
            style={{
              display: "flex", gap: 14,
              overflowX: "auto", scrollSnapType: "x mandatory",
              scrollbarWidth: "none", msOverflowStyle: "none",
              paddingBottom: 8,
              // fade edges
              maskImage: "linear-gradient(90deg, transparent 0%, #000 3%, #000 93%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 3%, #000 93%, transparent 100%)",
            }}
          >
            {visible.map(m => {
              const brandColor = (BRAND_COLORS as Record<string,string>)[m.marca] ?? "#444";
              return (
                <Link
                  key={m.id}
                  href={`/estoque?modelo=${encodeURIComponent(m.modelo)}&marca=${encodeURIComponent(m.marca)}`}
                  style={{ textDecoration: "none", flexShrink: 0, scrollSnapAlign: "start" }}
                >
                  <div
                    className="s-modelo-card"
                    style={{
                      position: "relative",
                      width: 252, height: 164,
                      borderRadius: 18,
                      background: "#18191f",
                      border: "1px solid rgba(255,255,255,0.07)",
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "transform 0.28s cubic-bezier(.22,.68,0,1.2), box-shadow 0.28s, border-color 0.28s",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "translateY(-5px) scale(1.02)";
                      el.style.boxShadow = `0 16px 48px rgba(0,0,0,0.45), 0 0 0 1px ${brandColor}44`;
                      el.style.borderColor = `${brandColor}55`;
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "";
                      el.style.boxShadow = "";
                      el.style.borderColor = "rgba(255,255,255,0.07)";
                    }}
                  >
                    {/* Brand color accent top bar */}
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, height: 2,
                      background: `linear-gradient(90deg, ${brandColor}, transparent)`,
                      opacity: 0.7,
                    }} />

                    {/* Vehicle photo — right side, larger */}
                    {m.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.photo_url}
                        alt={`${m.marca} ${m.modelo}`}
                        style={{
                          position: "absolute",
                          right: -12, top: 0,
                          width: "68%", height: "100%",
                          objectFit: "cover",
                          objectPosition: "center",
                        }}
                      />
                    ) : (
                      <div style={{
                        position: "absolute",
                        right: 0, top: 0,
                        width: "60%", height: "100%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0.25,
                      }}>
                        <BrandLogoFallback marca={m.marca} size={64} />
                      </div>
                    )}

                    {/* Left gradient — darker for text legibility */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: `linear-gradient(100deg, #18191f 30%, rgba(24,25,31,0.92) 52%, rgba(24,25,31,0.2) 75%, transparent 100%)`,
                    }} />
                    {/* Bottom gradient */}
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0, height: "55%",
                      background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 100%)",
                    }} />

                    {/* Content layer */}
                    <div style={{
                      position: "absolute", inset: 0, padding: "13px 14px",
                      display: "flex", flexDirection: "column", justifyContent: "space-between",
                      zIndex: 2,
                    }}>
                      {/* Top: brand logo + trending */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)",
                          border: "1px solid rgba(255,255,255,0.10)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                        }}>
                          <BrandLogoFallback marca={m.marca} size={22} />
                        </div>

                        {!m.is_manual && m.total_views > 0 && (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 4,
                            background: "rgba(244,121,32,0.88)", backdropFilter: "blur(8px)",
                            borderRadius: 999, padding: "3px 9px",
                            fontSize: 10, fontWeight: 700, color: "#fff",
                            boxShadow: "0 2px 8px rgba(244,121,32,0.35)",
                          }}>
                            <TrendingUp size={9} />
                            Em alta
                          </div>
                        )}
                      </div>

                      {/* Bottom: info */}
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.38)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>
                          {m.marca}
                        </p>
                        <p style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.1, marginBottom: 5 }}>
                          {m.modelo}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {m.min_price != null && (
                            <span style={{
                              fontSize: 12, fontWeight: 700, color: "#4ade80", letterSpacing: "-0.2px",
                            }}>
                              A partir de R$ {fmtShortPrice(m.min_price)}
                            </span>
                          )}
                          {m.total_disponiveis > 0 && (
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              background: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 999, padding: "2px 8px",
                              color: "rgba(255,255,255,0.5)",
                            }}>
                              {m.total_disponiveis} {m.total_disponiveis === 1 ? "un." : "un."}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────
interface HomeSectionsProps {
  featuredVehicles?: PublicVehicle[];
  recentVehicles?: PublicVehicle[];   // todos os disponíveis (sem filtro destaque)
  stats?: PublicStats;
  settings?: PublicSettings;
  modelosDestaque?: PublicModeloDestaque[];
  popularModels?: PublicPopularModel[];
}

const DEFAULT_SETTINGS: PublicSettings = {
  whatsapp: "", telefone: "", email_contato: "",
  instagram: "", facebook: "", youtube: "",
  nome_loja: "LMC Veículos", slogan: "Seu próximo veículo está aqui",
  endereco: "", cidade: "", estado: "", horario: "",
  hero_titulo: "Encontre seu próximo veículo",
  hero_subtitulo: "Carros e motos selecionados com qualidade e transparência",
  stat_clientes: 0, stat_anos: 0, stat_satisfacao: 98,
  modo_manutencao: false,
  ga_id: "", pixel_id: "",
};

export default function HomeSections({ featuredVehicles = [], recentVehicles = [], stats, settings = DEFAULT_SETTINGS, modelosDestaque = [], popularModels = [] }: HomeSectionsProps) {
  const [tab, setTab]               = useState<"carro" | "moto">("carro");
  const [marca, setMarca]           = useState("");
  const [modelo, setModelo]         = useState("");
  const [preco, setPreco]           = useState("");
  const [filter, setFilter]         = useState("todos");
  const [activeSlide, setActiveSlide] = useState(0);

  const marcasBusca = tab === "moto" ? BRANDS_MOTOS : BRANDS_CARROS;

  // Hero carousel: usa veículos com foto — sem foto, não entra no carousel
  const CAROUSEL = (recentVehicles.length > 0 ? recentVehicles : FEATURED_VEHICLES_FALLBACK)
    .filter(v => v.photos?.length > 0)
    .slice(0, 5);

  useEffect(() => {
    const t = setInterval(() => setActiveSlide(i => (i + 1) % CAROUSEL.length), 4000);
    return () => clearInterval(t);
  }, [CAROUSEL.length]);

  const featured = filter === "todos"
    ? featuredVehicles
    : featuredVehicles.filter(v => v.tipo === filter);

  const STATS = [
    { num: String(stats?.total_veiculos ?? 0), suffix:"+", label:"Veículos"  },
    { num: String(stats?.total_marcas  ?? 0), suffix:"+", label:"Marcas"    },
    { num: String(stats?.satisfacao    ?? 98), suffix:"%", label:"Satisfação" },
  ];

  return (
    <>
      {/* ============== HERO ============== */}
      <section className="s-hero" aria-label="Busca de veículos">
        <div className="s-hero-glow" />
        <div className="s-hero-grid" />

        <div className="s-container" style={{ position:"relative", zIndex:1 }}>
          <div className="s-hero-layout" style={{ gap:48, alignItems:"center", paddingTop:72, paddingBottom:80 }}>

            {/* ── COLUNA ESQUERDA ── */}
            <div>
              <h1 className="s-hero-title" style={{ fontSize:"clamp(30px,3.5vw,50px)", animation:"s-fadeInUp 0.65s 0ms both" }}>
                Encontre o veículo<br />
                <em>perfeito</em> para você
              </h1>
              <p className="s-hero-sub" style={{ marginBottom:28, hyphens:"none", wordBreak:"keep-all", animation:"s-fadeInUp 0.65s 120ms both" }}>
                Carros e motos selecionados, revisados e com procedência garantida.
              </p>

              {/* Seletor Carro / Moto */}
              <div className="s-hero-tabs" style={{ marginBottom:20, animation:"s-fadeInUp 0.65s 240ms both" }}>
                {(["carro","moto"] as const).map(tipo => (
                  <button
                    key={tipo}
                    onClick={() => { setTab(tipo); setMarca(""); setModelo(""); }}
                    style={{
                      flex:1, position:"relative", height:110, borderRadius:14, overflow:"hidden",
                      border: tab === tipo ? "2.5px solid var(--s-orange)" : "2px solid rgba(255,255,255,0.08)",
                      cursor:"pointer", transition:"border-color 220ms, box-shadow 220ms", padding:0,
                      boxShadow: tab === tipo ? "0 0 0 3px rgba(244,121,32,0.15)" : "none",
                    }}
                  >
                    <Image
                      src={tipo === "carro" ? "/hero-carro.jpeg" : "/hero-moto.png"}
                      alt={tipo === "carro" ? "Carros" : "Motos"}
                      fill
                      style={{ objectFit:"cover", objectPosition:"center", filter: tab === tipo ? "brightness(0.75)" : "brightness(0.3) grayscale(0.5)", transition:"filter 300ms" }}
                    />
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg, rgba(14,15,17,0.85) 0%, rgba(14,15,17,0.4) 55%, transparent 100%)" }} />
                    {tab === tipo && <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg, rgba(244,121,32,0.20) 0%, transparent 60%)", pointerEvents:"none" }} />}
                    <div style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)" }}>
                      <p style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.5px", color: tab === tipo ? "var(--s-orange)" : "rgba(255,255,255,0.60)", marginBottom:2, transition:"color 220ms" }}>
                        {tipo === "carro" ? "Carros" : "Motos"}
                      </p>
                      <p style={{ fontSize:11, color:"rgba(255,255,255,0.40)", fontWeight:500 }}>
                        {tipo === "carro"
                          ? `${stats?.total_carros ?? 0} disponíveis`
                          : `${stats?.total_motos ?? 0} disponíveis`}
                      </p>
                    </div>
                    {tab === tipo && (
                      <div style={{ position:"absolute", top:10, right:10, width:20, height:20, borderRadius:"50%", background:"var(--s-orange)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(244,121,32,0.5)" }}>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Search form — campos independentes */}
              <div className="s-hero-search-row" style={{ marginBottom:28, animation:"s-fadeInUp 0.65s 360ms both" }}>
                <div style={{ flex:1 }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"rgba(255,255,255,0.35)", marginBottom:6 }}>Marca</label>
                  <select className="s-select" value={marca} onChange={e => setMarca(e.target.value)} aria-label="Selecionar marca" style={{ width:"100%" }}>
                    <option value="">Todas as marcas</option>
                    {marcasBusca.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"rgba(255,255,255,0.35)", marginBottom:6 }}>Modelo</label>
                  <select className="s-select" value={modelo} onChange={e => setModelo(e.target.value)} aria-label="Selecionar modelo" style={{ width:"100%" }}>
                    <option value="">Todos os modelos</option>
                    <option>Corolla</option><option>Civic</option><option>HB20</option><option>320i</option>
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"rgba(255,255,255,0.35)", marginBottom:6 }}>Preço até</label>
                  <select className="s-select" value={preco} onChange={e => setPreco(e.target.value)} aria-label="Faixa de preço" style={{ width:"100%" }}>
                    <option value="">Qualquer preço</option>
                    <option value="40000">R$ 40.000</option>
                    <option value="80000">R$ 80.000</option>
                    <option value="120000">R$ 120.000</option>
                    <option value="200000">R$ 200.000</option>
                  </select>
                </div>
                <Link
                  href={`/estoque?tipo=${tab}${marca ? `&marca=${marca}` : ""}${preco ? `&preco=${preco}` : ""}`}
                  className="s-btn s-btn-primary s-btn-md"
                  style={{ gap:6, flexShrink:0, height:44 }}
                >
                  <Search size={15} strokeWidth={2.5} />
                  Buscar
                </Link>
              </div>


              {/* Stats com separadores */}
              <div style={{ display:"flex", alignItems:"center", animation:"s-fadeInUp 0.65s 480ms both" }}>
                {[
                  { num: String(stats?.total_veiculos ?? 0), suffix:"+", label:"Veículos",  countTarget: String(stats?.total_veiculos ?? 0) },
                  { num: String(stats?.total_marcas ?? 0),   suffix:"+", label:"Marcas",    countTarget: String(stats?.total_marcas ?? 0) },
                  { num: String(stats?.satisfacao ?? 98),    suffix:"%", label:"Satisfação", countTarget: String(stats?.satisfacao ?? 98) },
                ].map((s, i) => (
                  <div key={s.label} style={{ display:"flex", alignItems:"center" }}>
                    {i > 0 && <div style={{ width:1, height:28, background:"rgba(255,255,255,0.10)", margin:"0 20px" }} />}
                    <div>
                      <p style={{ fontSize:26, fontWeight:900, color:"#fff", lineHeight:1, letterSpacing:"-1px" }}>
                        <span data-count-target={s.countTarget + s.suffix}>{s.num}</span><span style={{ color:"var(--s-orange)", fontSize:17 }}>{s.suffix}</span>
                      </p>
                      <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontWeight:500, marginTop:3, letterSpacing:0.3 }}>{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            {/* ── COLUNA DIREITA — Carousel ── */}
            <div className="s-hero-right" style={{ position:"relative", height:520 }}>

              {/* Slides — usa foto real do veículo, fallback para imagem hero */}
              {CAROUSEL.length > 0 ? CAROUSEL.map((v, i) => {
                  const heroPhoto = v.photos?.find(p => p.is_main) ?? v.photos?.[0];
                const heroImg = heroPhoto?.url || (v.tipo === "moto" ? "/moto-placeholder.svg" : "/car-placeholder.svg");
                const isHeroPlaceholder = !heroPhoto?.url;
                return (
                  <div key={v.id} style={{ position:"absolute", inset:0, borderRadius:24, overflow:"hidden", opacity: i === activeSlide ? 1 : 0, transition:"opacity 800ms ease", pointerEvents: i === activeSlide ? "auto" : "none", background:"#0e0f11", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {isHeroPlaceholder ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroImg} alt={`${v.marca} ${v.modelo}`} style={{ width:"60%", height:"60%", objectFit:"contain", opacity:0.45 }} />
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={heroImg} alt={`${v.marca} ${v.modelo}`} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center" }} />
                        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg, rgba(14,15,17,0.05) 0%, rgba(14,15,17,0.30) 40%, rgba(14,15,17,0.90) 100%)" }} />
                        <div style={{ position:"absolute", inset:0, background:"linear-gradient(270deg, transparent 45%, rgba(14,15,17,0.92) 100%)" }} />
                      </>
                    )}
                  </div>
                );
              }) : (
                /* Empty state elegante — estoque vazio */
                <div style={{ position:"absolute", inset:0, borderRadius:24, overflow:"hidden", background:"#0e0f11", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, rgba(244,121,32,0.12) 0%, transparent 60%)" }} />
                  <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, padding:32 }}>
                    <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(244,121,32,0.15)", border:"1.5px solid rgba(244,121,32,0.30)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8 }}>
                      <Car size={28} color="var(--s-orange)" strokeWidth={1.5} />
                    </div>
                    <p style={{ fontSize:11, fontWeight:700, letterSpacing:3, textTransform:"uppercase", color:"rgba(244,121,32,0.80)" }}>Novidades chegando</p>
                    <p style={{ fontSize:22, fontWeight:900, color:"#fff", letterSpacing:"-0.5px", lineHeight:1.3, textAlign:"center", maxWidth:260 }}>Novos veículos em breve no estoque</p>
                    <p style={{ fontSize:13, color:"rgba(255,255,255,0.40)", textAlign:"center", lineHeight:1.6, maxWidth:220 }}>Cadastre-se para receber alertas das primeiras ofertas</p>
                    <Link href="/contato" className="s-btn s-btn-primary s-btn-md" style={{ marginTop:8, fontSize:13 }}>
                      Entrar em contato
                    </Link>
                  </div>
                </div>
              )}

              {/* Pill — Recém adicionados */}
              <div style={{ position:"absolute", top:18, left:18, zIndex:10, background:"rgba(14,15,17,0.55)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:999, padding:"6px 14px", display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--s-orange)" }} />
                <p style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.70)", letterSpacing:0.3 }}>Recém adicionados</p>
              </div>

              {/* Dots */}
              <div style={{ position:"absolute", top:22, right:18, zIndex:10, display:"flex", gap:5, alignItems:"center" }}>
                {CAROUSEL.map((_, i) => (
                  <button key={i} onClick={() => setActiveSlide(i)} style={{ width: i === activeSlide ? 18 : 6, height:6, borderRadius:999, background: i === activeSlide ? "var(--s-orange)" : "rgba(255,255,255,0.25)", border:"none", cursor:"pointer", padding:0, transition:"all 350ms ease" }} aria-label={`Slide ${i+1}`} />
                ))}
              </div>

              {/* Info overlay dentro da foto */}
              {CAROUSEL.map((v, i) => (
                <div key={v.id} style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:10, padding:"28px 24px 22px", opacity: i === activeSlide ? 1 : 0, transform: i === activeSlide ? "translateY(0)" : "translateY(8px)", transition:"opacity 500ms ease, transform 500ms ease", pointerEvents: i === activeSlide ? "auto" : "none" }}>
                  <p style={{ fontSize:9, fontWeight:800, letterSpacing:2, textTransform:"uppercase", color:"var(--s-orange)", marginBottom:6 }}>
                    {v.destaque ? "Destaque" : "Novo no estoque"}
                  </p>
                  <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:12 }}>
                    <div>
                      <p style={{ fontSize:20, fontWeight:900, color:"#fff", letterSpacing:"-0.5px", lineHeight:1.2, marginBottom:5 }}>
                        {v.marca} {v.modelo}
                      </p>
                      <p style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>
                        {v.ano} · {new Intl.NumberFormat("pt-BR").format(v.quilometragem)} km · {v.cambio}
                      </p>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:4 }}>a partir de</p>
                      <p style={{ fontSize:20, fontWeight:900, color:"var(--s-orange)", letterSpacing:"-0.5px", lineHeight:1, marginBottom:10 }}>
                        R$ {new Intl.NumberFormat("pt-BR").format(v.valor_anunciado ?? 0)}
                      </p>
                      <Link href={`/veiculo/${vehicleSlug(v)}`} className="s-btn s-btn-primary s-btn-sm" style={{ fontSize:11 }}>
                        Ver oferta
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ============== BRANDS ============== */}
      <section className="s-brands-section" aria-label="Marcas disponíveis">
        <div className="s-container">
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
            <div>
              <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:2.5, color:"rgba(255,255,255,0.22)", marginBottom:6 }}>Estoque por marca</p>
              <h2 style={{ fontSize:"clamp(20px,3vw,26px)", fontWeight:900, color:"#fff", letterSpacing:"-0.5px", lineHeight:1 }}>
                Encontre pela <em style={{ color:"var(--s-orange)", fontStyle:"normal" }}>sua marca</em>
              </h2>
            </div>
            <Link href={`/estoque?tipo=${tab}`} className="s-see-all" style={{ color:"rgba(255,255,255,0.35)", fontSize:13 }}>
              Ver estoque <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>

          <div style={{ display:"flex", flexWrap:"wrap", gap:12, justifyContent:"center" }}>
            {(tab === "carro" ? [
              { key:"fiat",       label:"Fiat"       },
              { key:"renault",    label:"Renault"    },
              { key:"nissan",     label:"Nissan"     },
              { key:"bmw",        label:"BMW"        },
              { key:"toyota",     label:"Toyota"     },
              { key:"honda",      label:"Honda"      },
              { key:"chevrolet",  label:"Chevrolet"  },
              { key:"volkswagen", label:"Volkswagen" },
              { key:"hyundai",    label:"Hyundai"    },
              { key:"ford",       label:"Ford"       },
              { key:"jeep",       label:"Jeep"       },
              { key:"mitsubishi", label:"Mitsubishi" },
            ] : [
              { key:"honda",    label:"Honda"    },
              { key:"yamaha",   label:"Yamaha"   },
              { key:"kawasaki", label:"Kawasaki" },
              { key:"suzuki",   label:"Suzuki"   },
            ]).map((b, i) => (
              <Link
                key={b.key}
                href={`/estoque?tipo=${tab === "carro" ? "carro" : "moto"}&marca=${b.label}`}
                className="s-brand-item"
                style={{ transitionDelay:`${i * 40}ms` }}
              >
                <div className="s-brand-circle">
                  <BrandLogoFallback marca={b.label} size={36} />
                </div>
                <span className="s-brand-label">{b.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============== MODELOS MAIS BUSCADOS ============== */}
      <ModelosMaisBuscados modelos={modelosDestaque} popularModels={popularModels} />

      {/* ============== DESTAQUES DA SEMANA ============== */}
      <section className="s-section" aria-label="Destaques da semana">
        <div className="s-container">
          <div className="s-section-head" style={{ marginBottom:28 }}>
            <div>
              <h2 className="s-section-title">Destaques da <em>semana</em></h2>
              <p className="s-section-sub">Selecionados especialmente para você</p>
            </div>
            <Link href="/estoque" className="s-see-all">
              Ver todos <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
          </div>

          {featuredVehicles.length > 0 ? (
            <>
              <div className="s-carousel-wrap" style={{ margin:"0 -8px", padding:"0 8px" }}>
                <button className="s-carousel-btn s-carousel-btn-prev" onClick={() => { const el = document.getElementById("featured-track"); if (el) el.scrollBy({ left: -300, behavior:"smooth" }); }} aria-label="Anterior">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div id="featured-track" className="s-carousel-track">
                  {featuredVehicles.map(v => <VehicleCard key={v.id} v={v} />)}
                </div>
                <button className="s-carousel-btn s-carousel-btn-next" onClick={() => { const el = document.getElementById("featured-track"); if (el) el.scrollBy({ left: 300, behavior:"smooth" }); }} aria-label="Próximo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              <div style={{ textAlign:"center", marginTop:36 }}>
                <Link href="/estoque" className="s-btn s-btn-outline s-btn-md">
                  Ver estoque completo <ArrowRight size={15} strokeWidth={2.5} />
                </Link>
              </div>
            </>
          ) : (
            /* Estado vazio — card dark premium sobre fundo claro */
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "64px 24px 56px",
              gap: 0,
              borderRadius: 20,
              background: "linear-gradient(160deg, #16181C 0%, #1E2026 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            }}>
              {/* Glow sutil */}
              <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, background:"radial-gradient(ellipse 80% 50% at 50% 20%, rgba(244,121,32,0.10) 0%, transparent 70%)", pointerEvents:"none" }}/>

              {/* Placeholder do carro */}
              <div style={{ position:"relative", zIndex:1, marginBottom:24 }}>
                <img
                  src="/car-placeholder.svg"
                  alt="Destaques em breve"
                  style={{ width:200, height:"auto", objectFit:"contain", opacity:0.35, filter:"brightness(0) invert(1) drop-shadow(0 12px 28px rgba(0,0,0,0.8))", display:"block" }}
                />
              </div>

              {/* Texto */}
              <div style={{ textAlign:"center", position:"relative", zIndex:1, marginBottom:28 }}>
                <span style={{ display:"inline-block", background:"rgba(244,121,32,0.20)", color:"var(--s-orange)", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:2, padding:"4px 14px", borderRadius:999, marginBottom:14 }}>
                  Em breve
                </span>
                <p style={{ fontSize:22, fontWeight:900, color:"#FFFFFF", letterSpacing:"-0.5px", marginBottom:12, lineHeight:1.2 }}>
                  Nossos destaques estão<br/>chegando
                </p>
                <p style={{ fontSize:14, color:"rgba(255,255,255,0.55)", lineHeight:1.75, maxWidth:300 }}>
                  Selecionamos os melhores veículos<br/>para você. Confira o estoque completo.
                </p>
              </div>

              {/* CTA */}
              <Link href="/estoque" className="s-btn s-btn-primary s-btn-md" style={{ position:"relative", zIndex:1 }}>
                Ver estoque completo <ArrowRight size={14} strokeWidth={2.5} />
              </Link>

            </div>
          )}
        </div>
      </section>

      {/* ============== SHOWROOM ============== */}
      {/* Mostra estoque em grid profissional — visível só quando há veículos */}
      {recentVehicles.length > 0 && (
        <section style={{ background:"var(--s-dark-2)", padding:"72px 0 80px", borderTop:"1px solid rgba(255,255,255,0.05)" }} aria-label="Nosso estoque">
          <div className="s-container">
            {/* Header */}
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:44, flexWrap:"wrap", gap:16 }}>
              <div>
                <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:2.5, color:"var(--s-orange)", marginBottom:10 }}>Disponíveis agora</p>
                <h2 style={{ fontSize:"clamp(22px,3.5vw,32px)", fontWeight:900, color:"#fff", letterSpacing:"-0.6px", lineHeight:1.1 }}>
                  Nosso <em style={{ color:"var(--s-orange)", fontStyle:"normal" }}>estoque</em>
                </h2>
              </div>
              <Link href="/estoque" className="s-see-all">
                Ver todos os veículos <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            </div>

            {/* Grid de veículos — 3 colunas */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:24 }}>
              {recentVehicles.slice(0, 6).map((v, i) => {
                const mainPhoto = v.photos.find(p => p.is_main) ?? v.photos[0];
                const fmtPrice = (n: number) => n >= 1000 ? (n / 1000).toFixed(0) + ".000" : String(n);
                const fmtKm = (n: number) => n >= 1000 ? (n / 1000).toFixed(0) + " mil km" : n + " km";
                return (
                  <Link
                    key={v.id}
                    href={`/veiculo/${vehicleSlug(v)}`}
                    style={{ textDecoration:"none", borderRadius:18, overflow:"hidden", background:"var(--s-dark)", border:"1px solid rgba(255,255,255,0.07)", display:"flex", flexDirection:"column", transition:"all 220ms ease", animation:`s-fadeInUp 0.5s ${i * 80}ms both` }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,121,32,0.35)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(0,0,0,0.4)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    {/* Imagem */}
                    <div style={{ position:"relative", height:200, background:"rgba(255,255,255,0.03)", overflow:"hidden" }}>
                      {mainPhoto?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mainPhoto.url} alt={`${v.marca} ${v.modelo}`} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                      ) : (
                        <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <img
                            src={v.tipo === "moto" ? "/moto-placeholder.svg" : "/car-placeholder.svg"}
                            alt={`${v.marca} ${v.modelo}`}
                            style={{ width:"60%", height:"60%", objectFit:"contain", opacity:0.5 }}
                          />
                        </div>
                      )}
                      {/* Tipo badge */}
                      <div style={{ position:"absolute", top:12, left:12, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(8px)", borderRadius:999, padding:"4px 10px", fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.80)", textTransform:"uppercase", letterSpacing:1.2 }}>
                        {v.tipo === "moto" ? "Moto" : "Carro"}
                      </div>
                      {v.destaque && (
                        <div style={{ position:"absolute", top:12, right:12, background:"var(--s-orange)", borderRadius:999, padding:"4px 10px", fontSize:9, fontWeight:700, color:"#fff", textTransform:"uppercase", letterSpacing:1.2 }}>
                          Destaque
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding:"20px 20px 22px", flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                      <div>
                        <p style={{ fontSize:11, fontWeight:700, color:"rgba(244,121,32,0.70)", letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>{v.marca}</p>
                        <p style={{ fontSize:17, fontWeight:900, color:"#fff", letterSpacing:"-0.4px", lineHeight:1.2 }}>{v.modelo}{v.versao ? <span style={{ fontWeight:500, color:"rgba(255,255,255,0.45)", fontSize:14 }}> {v.versao}</span> : ""}</p>
                      </div>

                      {/* Specs */}
                      <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                        {[
                          { icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, val:v.ano },
                          { icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2z"/><path d="M12 6v6l4 2"/></svg>, val:fmtKm(v.quilometragem) },
                          { icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>, val:v.cambio },
                        ].map((s, idx) => (
                          <span key={idx} style={{ fontSize:11, color:"rgba(255,255,255,0.40)", display:"flex", alignItems:"center", gap:5 }}>
                            <span style={{ color:"rgba(255,255,255,0.25)" }}>{s.icon}</span> {s.val}
                          </span>
                        ))}
                      </div>

                      {/* Preço + CTA */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"auto", paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                        <div>
                          <p style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:2 }}>Preço</p>
                          <p style={{ fontSize:20, fontWeight:900, color:"var(--s-orange)", letterSpacing:"-0.5px" }}>
                            {v.valor_anunciado ? `R$ ${fmtPrice(v.valor_anunciado)}` : "Consulte"}
                          </p>
                        </div>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(244,121,32,0.12)", border:"1px solid rgba(244,121,32,0.30)", borderRadius:10, padding:"8px 14px", fontSize:12, fontWeight:700, color:"var(--s-orange)" }}>
                          Ver mais <ArrowRight size={12} strokeWidth={2.5} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* CTA */}
            <div style={{ textAlign:"center", marginTop:48 }}>
              <Link href="/estoque" className="s-btn s-btn-primary s-btn-md">
                Ver estoque completo <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </section>
      )}


      {/* ============== WHY ============== */}
      <section className="s-why-section" style={{ background:"var(--s-dark)", position:"relative", overflow:"hidden" }} aria-label="Diferenciais LMC">
        {/* glow decorativo */}
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:300, background:"radial-gradient(ellipse, rgba(244,121,32,0.08) 0%, transparent 70%)", pointerEvents:"none" }} />

        <div className="s-container" style={{ position:"relative", zIndex:1 }}>
          {/* Header */}
          <div className="s-why-section-head" style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:52, flexWrap:"wrap", gap:16 }}>
            <div>
              <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:2, color:"var(--s-orange)", marginBottom:10 }}>Nossos diferenciais</p>
              <h2 style={{ fontSize:"clamp(22px, 4.5vw, 34px)", fontWeight:900, color:"#fff", letterSpacing:"-0.8px", lineHeight:1.15 }}>
                Por que escolher<br />a <em style={{ color:"var(--s-orange)", fontStyle:"normal" }}>LMC Veículos</em>?
              </h2>
            </div>
            <p className="s-why-desc" style={{ fontSize:15, color:"rgba(255,255,255,0.35)", maxWidth:320, lineHeight:1.65 }}>
              Cada detalhe foi pensado para garantir a melhor experiência na compra do seu veículo.
            </p>
          </div>

          {/* Cards */}
          <div className="s-why-grid">
            {WHY_ITEMS.map((item, i) => (
              <div
                key={item.title}
                className="s-why-card"
                style={{
                  background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:20,
                  padding:"28px 24px",
                  position:"relative",
                  overflow:"hidden",
                  transition:"border-color 220ms, background 220ms, transform 220ms",
                  cursor:"default",
                  transitionDelay:`${i * 80}ms`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,121,32,0.35)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(244,121,32,0.04)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {/* Número decorativo */}
                <span style={{ position:"absolute", top:-8, right:16, fontSize:72, fontWeight:900, color:"rgba(255,255,255,0.04)", lineHeight:1, userSelect:"none" }}>
                  {String(i+1).padStart(2,"0")}
                </span>
                {/* Ícone */}
                <div style={{ width:48, height:48, borderRadius:14, background:"rgba(244,121,32,0.12)", border:"1px solid rgba(244,121,32,0.20)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20, color:"var(--s-orange)" }}>
                  <item.icon size={22} strokeWidth={1.8} />
                </div>
                <p style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:8, letterSpacing:"-0.2px" }}>{item.title}</p>
                <p style={{ fontSize:13, color:"rgba(255,255,255,0.40)", lineHeight:1.65 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== AVALIE SEU CARRO ============== */}
      <AvalieSection whatsapp={settings.whatsapp} />

      {/* ============== CTA ============== */}
      <section className="s-cta-section" style={{ background:"var(--s-dark-2)", position:"relative", overflow:"hidden", borderTop:"1px solid rgba(255,255,255,0.06)" }} aria-label="Call to action">
        {/* Glow laranja à esquerda */}
        <div style={{ position:"absolute", top:"50%", left:"-5%", transform:"translateY(-50%)", width:500, height:400, background:"radial-gradient(ellipse, rgba(244,121,32,0.12) 0%, transparent 65%)", pointerEvents:"none" }} />

        <div className="s-container" style={{ position:"relative", zIndex:1 }}>
          <div className="s-cta-grid">

            {/* Esquerda — texto + botões */}
            <div>
              <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:2, color:"var(--s-orange)", marginBottom:12 }}>Fale com a gente</p>
              <h2 style={{ fontSize:"clamp(28px,3vw,44px)", fontWeight:900, color:"#fff", letterSpacing:"-1px", lineHeight:1.15, marginBottom:16 }}>
                Pronto para o seu<br /><em style={{ color:"var(--s-orange)", fontStyle:"normal" }}>próximo veículo</em>?
              </h2>
              <p style={{ color:"rgba(255,255,255,0.38)", fontSize:15, marginBottom:36, maxWidth:420, lineHeight:1.7 }}>
                Nossa equipe está pronta para te ajudar a encontrar o veículo perfeito com as melhores condições de pagamento.
              </p>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                <Link href="/estoque" className="s-btn s-btn-primary s-btn-lg">
                  Ver estoque completo <ArrowRight size={17} strokeWidth={2.5} />
                </Link>
                {settings.whatsapp && (
                  <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="s-btn s-btn-wpp s-btn-lg">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                    Falar no WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Stats — só mostra se a loja já configurou os números */}
            {(settings.stat_clientes > 0 || settings.stat_anos > 0) && (
              <div className="s-cta-stats">
                {([
                  settings.stat_clientes > 0
                    ? { num: String(settings.stat_clientes), suffix: "+", label: "Clientes satisfeitos", sub: settings.stat_anos > 0 ? `em ${settings.stat_anos} anos` : "e contando" }
                    : null,
                  settings.stat_anos > 0
                    ? { num: String(settings.stat_anos), suffix: " anos", label: "De experiência", sub: "no mercado" }
                    : null,
                  { num: String(settings.stat_satisfacao), suffix: "%", label: "Satisfação", sub: "dos clientes" },
                ].filter(Boolean) as { num: string; suffix: string; label: string; sub: string }[]).map((s, i) => (
                  <div key={s.label}>
                    {i > 0 && <div style={{ height:1, background:"rgba(255,255,255,0.06)", margin:"24px 0" }} />}
                    <p style={{ fontSize:42, fontWeight:900, color:"#fff", letterSpacing:"-2px", lineHeight:1 }}>
                      {s.num}<span style={{ color:"var(--s-orange)", fontSize:24 }}>{s.suffix}</span>
                    </p>
                    <p style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.70)", marginTop:5 }}>{s.label}</p>
                    <p style={{ fontSize:11, color:"rgba(255,255,255,0.25)", marginTop:2 }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </section>

      <ReviewsSection />

      <style>{`
        /* ── Hero layout ── */
        .s-hero-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .s-hero-tabs { display: flex; gap: 12px; }
        .s-hero-search-row { display: flex; gap: 8px; }

        @media (max-width: 860px) {
          .s-hero-layout {
            grid-template-columns: 1fr;
            padding-top: 48px !important;
            padding-bottom: 48px !important;
          }
          .s-hero-right { display: none; }
          .s-hero-tabs button { height: 80px !important; }
        }
        @media (max-width: 560px) {
          .s-hero-layout {
            padding-top: 36px !important;
            padding-bottom: 36px !important;
          }
          .s-hero-search-row {
            flex-direction: column;
            gap: 12px;
          }
          .s-hero-search-row > div { flex: unset !important; width: 100%; }
          .s-hero-search-row > a { width: 100%; justify-content: center; height: 48px !important; }
          .s-hero-tabs { gap: 8px; }
          .s-hero-tabs button { height: 70px !important; }
        }

        /* ── WHY section ── */
        .s-why-section { padding: clamp(40px, 8vw, 80px) 0; }
        .s-cta-section { padding: clamp(40px, 8vw, 80px) 0; }

        @media (max-width: 768px) {
          .s-why-desc { display: none; }
        }

        /* ── WHY grid ── */
        .s-why-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 900px) {
          .s-why-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .s-why-grid { grid-template-columns: 1fr; }
        }

        /* ── CTA grid ── */
        .s-cta-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 64px;
          align-items: center;
        }
        .s-cta-stats {
          display: flex;
          flex-direction: column;
          gap: 0;
          border-left: 1px solid rgba(255,255,255,0.07);
          padding-left: 64px;
        }
        @media (max-width: 860px) {
          .s-cta-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .s-cta-stats {
            border-left: none;
            border-top: 1px solid rgba(255,255,255,0.07);
            padding-left: 0;
            padding-top: 36px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0;
          }
        }
        @media (max-width: 560px) {
          .s-cta-stats { grid-template-columns: 1fr; }
        }

        /* ── Section padding reduction on mobile ── */
        @media (max-width: 768px) {
          .s-section { padding: 48px 0; }
          .s-section-dark { padding: 48px 0; }
        }
        @media (max-width: 480px) {
          .s-section { padding: 36px 0; }
          .s-section-dark { padding: 36px 0; }
        }

        /* ── Carousel buttons hide on mobile touch ── */
        @media (max-width: 640px) {
          .s-carousel-btn { display: none; }
          .s-carousel-track .s-v-card { flex: 0 0 260px; }
        }

        /* ── Brands section ── */
        @media (max-width: 560px) {
          .s-brands-section .s-container > div:first-child {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 24px;
          }
          .s-brands-section h2 { font-size: 22px !important; }
        }

        /* ── Section heads ── */
        @media (max-width: 560px) {
          .s-section-head { flex-direction: column; align-items: flex-start; margin-bottom: 20px; }
          .s-section-title { font-size: 22px; }
        }

        /* ── WHY section heading ── */
        @media (max-width: 768px) {
          .s-why-section-head { flex-direction: column !important; gap: 12px !important; margin-bottom: 32px !important; }
        }

        /* ── Brands marquee ── */
        @keyframes s-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .s-brands-marquee {
          display: flex;
          gap: 12px;
          animation: s-marquee 28s linear infinite;
          width: max-content;
          padding: 16px 12px;
        }
        .s-brands-marquee:hover { animation-play-state: paused; }
        .s-brand-item {
          flex-shrink: 0;
          cursor: pointer;
        }

        /* ── Avalie grid ── */
        .s-avalie-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        @media (max-width: 860px) {
          .s-avalie-grid { grid-template-columns: 1fr; gap: 36px; }
        }
        .s-input-light {
          height: 44px;
          padding: 0 14px;
          border: 1.5px solid var(--s-border);
          border-radius: 10px;
          font-size: 14px;
          color: var(--s-text-1);
          background: var(--s-bg);
          font-family: inherit;
          outline: none;
          width: 100%;
        }
        .s-input-light:focus { border-color: var(--s-orange); box-shadow: 0 0 0 3px rgba(244,121,32,0.10); }

        /* ── CTA section ── */
        @media (max-width: 768px) {
          .s-cta-grid h2 { font-size: clamp(24px, 5vw, 36px) !important; }
        }
      `}</style>

    </>
  );
}

