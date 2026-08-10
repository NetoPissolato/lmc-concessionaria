"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Car, Bike, Plus, X, ChevronRight, Trophy,
  Gauge, Calendar, Settings, Droplets, Zap,
  ArrowRight, CheckCircle, Star,
} from "lucide-react";
import type { PublicVehicle } from "@/lib/publicApi";
import { FUEL_LABELS, CAMBIO_LABELS } from "@/lib/publicApi";

type Vehicle = PublicVehicle;

function fmtPrice(v: number) { return "R$ " + new Intl.NumberFormat("pt-BR").format(v); }
function fmtKm(v: number)    { return new Intl.NumberFormat("pt-BR").format(v) + " km"; }

const ROWS: { key: keyof Vehicle; label: string; icon: React.ElementType; lowerBetter?: boolean }[] = [
  { key:"valor_anunciado", label:"Preco",         icon: Star,     lowerBetter: true  },
  { key:"ano",             label:"Ano",            icon: Calendar                     },
  { key:"quilometragem",   label:"Quilometragem",  icon: Gauge,    lowerBetter: true  },
  { key:"cambio",          label:"Cambio",         icon: Settings                     },
  { key:"combustivel",     label:"Combustivel",    icon: Droplets                     },
  { key:"cor",             label:"Cor",            icon: Zap                          },
  { key:"tipo",            label:"Tipo",           icon: Car                          },
];

function formatVal(key: keyof Vehicle, val: unknown) {
  if (key === "valor_anunciado") return fmtPrice((val as number) ?? 0);
  if (key === "quilometragem")   return fmtKm((val as number) ?? 0);
  if (key === "combustivel")     return FUEL_LABELS[String(val)] ?? String(val);
  if (key === "cambio")         return CAMBIO_LABELS[String(val)] ?? String(val);
  if (key === "tipo")           return String(val) === "moto" ? "Moto" : "Carro";
  if (val === null || val === undefined) return "—";
  return String(val);
}

function isBest(key: keyof Vehicle, val: unknown, others: Vehicle[], lowerBetter?: boolean) {
  const nums = others.map(v => v[key] as number);
  if (!nums.every(n => typeof n === "number")) return false;
  if (lowerBetter) return (val as number) === Math.min(...nums);
  return (val as number) === Math.max(...nums);
}

// Score: count how many rows this vehicle "wins"
function getScore(v: Vehicle, all: Vehicle[]) {
  return ROWS.filter(r => {
    const nums = all.map(x => x[r.key] as number);
    if (!nums.every(n => typeof n === "number")) return false;
    return r.lowerBetter
      ? (v[r.key] as number) === Math.min(...nums)
      : (v[r.key] as number) === Math.max(...nums);
  }).length;
}

const BRAND_COLORS: Record<string, string> = {
  BMW:"#0066b1", Toyota:"#eb0a1e", Honda:"#cc0000", Hyundai:"#002c5f",
  Jeep:"#78866b", Volkswagen:"#001e50", Yamaha:"#003087", Chevrolet:"#d4a017",
};

export default function ComparadorClient({ initialVehicles }: { initialVehicles: Vehicle[] }) {
  const [selected, setSelected] = useState<(Vehicle | null)[]>([null, null, null]);
  const [pickSlot, setPickSlot] = useState<number | null>(null);

  function choose(v: Vehicle) {
    if (pickSlot === null) return;
    setSelected(s => { const n = [...s]; n[pickSlot] = v; return n; });
    setPickSlot(null);
  }
  function remove(i: number) {
    setSelected(s => { const n = [...s]; n[i] = null; return n; });
  }

  const chosen  = selected.filter(Boolean) as Vehicle[];
  const avail   = initialVehicles.filter(v => !chosen.find(c => c.id === v.id));
  const scores  = chosen.map(v => getScore(v, chosen));
  const maxScore = Math.max(...scores, 0);

  return (
    <>
      <div className="s-comp-hero" style={{
        background:"linear-gradient(135deg, #0e0f11 0%, #13151a 40%, #1a1008 100%)",
        borderBottom:"1px solid rgba(255,255,255,0.07)",
        position:"relative", overflow:"hidden",
      }}>
        {/* decorative glow */}
        <div style={{ position:"absolute", top:-60, left:"30%", width:400, height:400, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(244,121,32,0.10) 0%, transparent 70%)", pointerEvents:"none" }} />
        <div className="s-container" style={{ position:"relative", zIndex:1 }}>
          <nav style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:20 }}>
            <Link href="/" style={{ color:"inherit", textDecoration:"none" }}>Inicio</Link>
            <ChevronRight size={11} />
            <span style={{ color:"rgba(255,255,255,0.65)" }}>Comparador</span>
          </nav>
          <div style={{ display:"flex", alignItems:"flex-end", gap:20, flexWrap:"wrap" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"var(--s-orange-muted)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Trophy size={18} color="var(--s-orange)" strokeWidth={2} />
                </div>
                <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, color:"var(--s-orange)" }}>Comparador</span>
              </div>
              <h1 style={{ fontSize:"clamp(24px,4vw,40px)", fontWeight:900, letterSpacing:"-1.5px", color:"#fff", lineHeight:1.1, marginBottom:8 }}>
                Compare veiculos<br />
                <span style={{ backgroundImage:"linear-gradient(90deg,#f47920,#ffb347)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  lado a lado
                </span>
              </h1>
              <p style={{ fontSize:14, color:"rgba(255,255,255,0.45)" }}>
                Selecione ate 3 veiculos e compare todos os detalhes
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="s-section-sm s-comp-section" style={{ background:"var(--s-bg)" }}>
        <div className="s-container">

          {/* ── Slot selector ── */}
          <div className="s-comp-slots" style={{ marginBottom: chosen.length >= 2 ? 40 : 20 }}>
            {selected.map((v, i) => (
              <div key={i}>
                {v ? (
                  /* Filled slot */
                  <div style={{
                    background:"var(--s-white)", border:"2px solid var(--s-border)", borderRadius:16,
                    overflow:"hidden", position:"relative",
                    boxShadow:"0 4px 24px rgba(0,0,0,0.08)",
                    transition:"box-shadow 200ms",
                  }}>
                    {/* brand color bar */}
                    <div style={{ height:4, background:BRAND_COLORS[v.marca] ?? "var(--s-orange)" }} />
                    {/* remove */}
                    <button onClick={() => remove(i)} aria-label="Remover"
                      style={{ position:"absolute", top:16, right:14, width:28, height:28, borderRadius:"50%",
                        background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.20)",
                        color:"#ef4444", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <X size={14} />
                    </button>
                    {/* image placeholder */}
                    <div style={{ height:120, background:`linear-gradient(135deg,${BRAND_COLORS[v.marca] ?? "#1a1d24"}22,#1a1d24)`,
                      display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                      <Image src={v.tipo === "moto" ? "/hero-moto.png" : "/hero-carro.jpeg"} alt={v.modelo}
                        fill style={{ objectFit:"cover", opacity:0.6, mixBlendMode:"luminosity" }} />
                      <div style={{ position:"relative", zIndex:1 }}>
                        {v.tipo === "moto" ? <Bike size={52} strokeWidth={0.7} color="rgba(255,255,255,0.5)" /> : <Car size={52} strokeWidth={0.7} color="rgba(255,255,255,0.5)" />}
                      </div>
                    </div>
                    <div style={{ padding:"14px 16px 16px" }}>
                      <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:1.2, color:BRAND_COLORS[v.marca] ?? "var(--s-orange)", marginBottom:3 }}>{v.marca}</p>
                      <p style={{ fontSize:16, fontWeight:900, color:"var(--s-text-1)", letterSpacing:"-0.4px", marginBottom:2 }}>{v.modelo}</p>
                      <p style={{ fontSize:11, color:"var(--s-text-3)", marginBottom:10 }}>{v.versao}</p>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <p style={{ fontSize:10, color:"var(--s-text-3)", fontWeight:600 }}>Preco</p>
                          <p style={{ fontSize:18, fontWeight:900, color:"var(--s-orange)", letterSpacing:"-0.5px" }}>{fmtPrice(v.valor_anunciado)}</p>
                        </div>
                        <Link href={"/veiculo/" + v.id}
                          style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, color:"var(--s-orange)", textDecoration:"none" }}>
                          Ver <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Empty slot */
                  <button onClick={() => setPickSlot(i)}
                    className="s-comp-empty-slot"
                    style={{ width:"100%", minHeight:270, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      gap:12, borderRadius:16, border:"2px dashed rgba(244,121,32,0.30)",
                      background:"linear-gradient(135deg,rgba(244,121,32,0.03),rgba(244,121,32,0.01))",
                      cursor:"pointer", transition:"all 200ms", fontFamily:"inherit" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="var(--s-orange)"; (e.currentTarget as HTMLElement).style.background="rgba(244,121,32,0.06)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(244,121,32,0.30)"; (e.currentTarget as HTMLElement).style.background="linear-gradient(135deg,rgba(244,121,32,0.03),rgba(244,121,32,0.01))"; }}>
                    <div style={{ width:52, height:52, borderRadius:14, background:"var(--s-orange-muted)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Plus size={24} color="var(--s-orange)" strokeWidth={2} />
                    </div>
                    <div>
                      <p style={{ fontSize:14, fontWeight:700, color:"var(--s-text-2)", marginBottom:3 }}>Adicionar veiculo</p>
                      <p style={{ fontSize:12, color:"var(--s-text-3)" }}>Slot {i + 1} de 3</p>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ── Comparison table ── */}
          {chosen.length >= 2 ? (
            <div>
              {/* Score / winner banner */}
              <div className="s-comp-scores" style={{ marginBottom:24 }}>
                {chosen.map((v, i) => {
                  const isWinner = scores[i] === maxScore && maxScore > 0;
                  return (
                    <div key={v.id} className="s-comp-score-card" style={{ background:"var(--s-white)", border:`2px solid ${isWinner ? "var(--s-orange)" : "var(--s-border)"}`,
                      borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12,
                      boxShadow: isWinner ? "0 4px 20px rgba(244,121,32,0.15)" : "none" }}>
                      {isWinner && <Trophy size={18} color="var(--s-orange)" strokeWidth={2} style={{ flexShrink:0 }} />}
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:11, fontWeight:700, color:"var(--s-text-3)", marginBottom:2 }}>{v.marca}</p>
                        <p style={{ fontSize:14, fontWeight:800, color:"var(--s-text-1)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{v.modelo}</p>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <p style={{ fontSize:10, color:"var(--s-text-3)", fontWeight:600 }}>Pontos</p>
                        <p style={{ fontSize:22, fontWeight:900, color: isWinner ? "var(--s-orange)" : "var(--s-text-1)", letterSpacing:"-1px" }}>{scores[i]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table */}
              <div className="s-comp-table-wrap">
                <table className="s-comp-table">
                  <thead>
                    <tr style={{ background:"var(--s-bg)" }}>
                      <th className="s-comp-label-col" style={{ padding:"14px 20px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--s-text-3)", borderBottom:"1px solid var(--s-border)" }}>
                        Caracteristica
                      </th>
                      {chosen.map((v, i) => {
                        const isWinner = scores[i] === maxScore && maxScore > 0;
                        return (
                          <th key={v.id} style={{ padding:"14px 20px", textAlign:"center", borderBottom:"1px solid var(--s-border)",
                            borderTop: isWinner ? "3px solid var(--s-orange)" : "3px solid transparent" }}>
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                              {isWinner && (
                                <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700,
                                  color:"var(--s-orange)", background:"var(--s-orange-muted)", padding:"2px 8px", borderRadius:999, marginBottom:2 }}>
                                  <Trophy size={10} /> Melhor opcao
                                </span>
                              )}
                              <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:BRAND_COLORS[v.marca] ?? "var(--s-text-3)" }}>{v.marca}</p>
                              <p style={{ fontSize:14, fontWeight:800, color:"var(--s-text-1)" }}>{v.modelo}</p>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row, ri) => (
                      <tr key={row.key} style={{ background: ri % 2 === 0 ? "var(--s-white)" : "var(--s-bg)" }}>
                        <td style={{ padding:"13px 20px", borderBottom:"1px solid var(--s-border)" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:28, height:28, borderRadius:7, background:"var(--s-orange-muted)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              <row.icon size={13} color="var(--s-orange)" strokeWidth={2} />
                            </div>
                            <span style={{ fontSize:13, fontWeight:600, color:"var(--s-text-2)" }}>{row.label}</span>
                          </div>
                        </td>
                        {chosen.map(v => {
                          const val  = v[row.key];
                          const best = isBest(row.key, val, chosen, row.lowerBetter);
                          return (
                            <td key={v.id} style={{ padding:"13px 20px", textAlign:"center", borderBottom:"1px solid var(--s-border)" }}>
                              <span style={{ fontSize:14, fontWeight: best ? 800 : 500,
                                color: best ? "var(--s-orange)" : "var(--s-text-1)",
                                background: best ? "var(--s-orange-muted)" : "transparent",
                                padding: best ? "3px 10px" : "0", borderRadius: best ? 999 : 0,
                                display:"inline-block" }}>
                                {formatVal(row.key, val)}
                              </span>
                              {best && (
                                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3, marginTop:3 }}>
                                  <CheckCircle size={10} color="var(--s-green)" />
                                  <span style={{ fontSize:10, color:"var(--s-green)", fontWeight:700 }}>Melhor</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* CTA row */}
                    <tr style={{ background:"var(--s-bg)" }}>
                      <td style={{ padding:"16px 20px" }}>
                        <span style={{ fontSize:12, fontWeight:700, color:"var(--s-text-3)" }}>Acao</span>
                      </td>
                      {chosen.map((v, i) => {
                        const isWinner = scores[i] === maxScore && maxScore > 0;
                        return (
                          <td key={v.id} style={{ padding:"16px 20px", textAlign:"center" }}>
                            <Link href={"/veiculo/" + v.id}
                              className={"s-btn s-btn-sm " + (isWinner ? "s-btn-primary" : "s-btn-outline")}>
                              Ver detalhes <ArrowRight size={13} strokeWidth={2.5} />
                            </Link>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="s-comp-empty">
              <div style={{ width:72, height:72, borderRadius:20, background:"var(--s-orange-muted)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
                <Trophy size={32} color="var(--s-orange)" strokeWidth={1.5} />
              </div>
              <p style={{ fontSize:17, fontWeight:700, color:"var(--s-text-1)", marginBottom:6 }}>Selecione pelo menos 2 veiculos</p>
              <p style={{ fontSize:13, color:"var(--s-text-3)" }}>Clique nos slots acima para adicionar veiculos ao comparador</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Vehicle picker modal ── */}
      {pickSlot !== null && (
        <div className="s-comp-modal-wrap" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:16, backdropFilter:"blur(6px)" }}>
          <div className="s-comp-modal-box">
            {/* modal header */}
            <div style={{ padding:"20px 22px 18px", borderBottom:"1px solid var(--s-border)", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:16, fontWeight:800, color:"var(--s-text-1)", marginBottom:2 }}>Selecionar veiculo</p>
                <p style={{ fontSize:12, color:"var(--s-text-3)" }}>Slot {(pickSlot ?? 0) + 1} &mdash; escolha um veiculo</p>
              </div>
              <button onClick={() => setPickSlot(null)}
                style={{ width:34, height:34, borderRadius:"50%", background:"var(--s-bg)", border:"1px solid var(--s-border)", color:"var(--s-text-3)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={16} />
              </button>
            </div>
            {/* modal list */}
            <div style={{ overflowY:"auto", padding:"12px 16px", display:"flex", flexDirection:"column", gap:8 }}>
              {avail.length === 0 ? (
                <p style={{ textAlign:"center", padding:"30px 0", color:"var(--s-text-3)", fontSize:14 }}>Todos os veiculos ja foram adicionados.</p>
              ) : avail.map(v => (
                <button key={v.id} onClick={() => choose(v)}
                  style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 14px", borderRadius:12,
                    border:"1.5px solid var(--s-border)", background:"transparent", cursor:"pointer",
                    textAlign:"left", transition:"border-color 140ms, background 140ms, box-shadow 140ms", fontFamily:"inherit",
                    width:"100%" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="var(--s-orange)"; (e.currentTarget as HTMLElement).style.background="rgba(244,121,32,0.04)"; (e.currentTarget as HTMLElement).style.boxShadow="0 2px 12px rgba(244,121,32,0.10)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="var(--s-border)"; (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}>
                  <div style={{ width:48, height:48, borderRadius:10, background:`linear-gradient(135deg,${BRAND_COLORS[v.marca] ?? "#1a1d24"}33,#1a1d24)`,
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative", overflow:"hidden" }}>
                    <Image src={v.tipo === "moto" ? "/hero-moto.png" : "/hero-carro.jpeg"} alt={v.modelo}
                      fill style={{ objectFit:"cover", opacity:0.5, mixBlendMode:"luminosity" }} />
                    <div style={{ position:"relative", zIndex:1 }}>
                      {v.tipo === "moto" ? <Bike size={20} strokeWidth={1} color="rgba(255,255,255,0.8)" /> : <Car size={20} strokeWidth={1} color="rgba(255,255,255,0.8)" />}
                    </div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:BRAND_COLORS[v.marca] ?? "var(--s-orange)", marginBottom:2 }}>{v.marca}</p>
                    <p style={{ fontSize:14, fontWeight:700, color:"var(--s-text-1)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{v.modelo}</p>
                    <p style={{ fontSize:11, color:"var(--s-text-3)" }}>{v.versao} &middot; {v.ano}</p>
                  </div>
                  <div style={{ flexShrink:0, textAlign:"right" }}>
                    <p style={{ fontSize:10, color:"var(--s-text-3)", fontWeight:600, marginBottom:2 }}>Preco</p>
                    <p style={{ fontSize:15, fontWeight:900, color:"var(--s-orange)", letterSpacing:"-0.5px" }}>{fmtPrice(v.valor_anunciado)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── Hero responsive ── */
        .s-comp-hero { padding: 48px 0 44px; }
        @media (max-width: 640px) {
          .s-comp-hero { padding: 28px 0 26px; }
        }

        /* ── Slots grid
           Desktop:  3 cols
           Tablet:   3 cols (smaller, keeps all slots visible)
           Mobile:   1 col (scrollable list)
        ── */
        .s-comp-slots {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 680px) {
          /* On mobile: 1 column (user adds vehicles one by one) */
          .s-comp-slots { grid-template-columns: 1fr; gap: 12px; }
          /* Slim down the empty slot on mobile */
          .s-comp-empty-slot { min-height: 100px !important; flex-direction: row !important; gap: 14px !important; padding: 16px 20px !important; }
        }
        /* Tablet: keep 3 cols but allow content to shrink */
        @media (max-width: 860px) and (min-width: 681px) {
          .s-comp-slots { gap: 10px; }
        }

        /* ── Score banner ── */
        .s-comp-scores {
          display: flex;
          gap: 12px;
          flex-wrap: nowrap;
          overflow-x: auto;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .s-comp-scores::-webkit-scrollbar { display: none; }
        .s-comp-score-card {
          flex: 1;
          min-width: 140px;
        }
        @media (max-width: 640px) {
          .s-comp-score-card { min-width: 160px; flex: 0 0 auto; }
        }

        /* ── Comparison table ── */
        .s-comp-table-wrap {
          overflow-x: auto;
          border-radius: 16px;
          border: 1px solid var(--s-border);
          background: var(--s-white);
          -webkit-overflow-scrolling: touch;
        }
        .s-comp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 440px;
        }
        .s-comp-label-col { width: 140px; }
        @media (max-width: 640px) {
          .s-comp-label-col { width: 110px; }
          .s-comp-table { min-width: 360px; }
        }

        /* ── Modal responsive ── */
        .s-comp-modal-box {
          background: var(--s-white);
          border-radius: 20px;
          width: 100%;
          max-width: 580px;
          max-height: 85vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 80px rgba(0,0,0,0.40);
        }
        @media (max-width: 480px) {
          .s-comp-modal-box {
            border-radius: 16px 16px 0 0;
            max-height: 90vh;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            max-width: 100%;
          }
          /* When modal is open on mobile, align to bottom */
          .s-comp-modal-wrap { align-items: flex-end !important; padding: 0 !important; }
        }

        /* ── Empty state ── */
        .s-comp-empty {
          text-align: center;
          padding: 60px 20px;
        }
        @media (max-width: 640px) {
          .s-comp-empty { padding: 32px 16px; }
        }

        /* ── Section padding ── */
        @media (max-width: 640px) {
          .s-comp-section { padding-top: 20px !important; padding-bottom: 40px !important; }
        }
      `}</style>
    </>
  );
}
