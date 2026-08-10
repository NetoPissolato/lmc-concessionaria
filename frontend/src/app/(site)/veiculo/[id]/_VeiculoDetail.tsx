"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight, Calendar, Gauge, Settings, Droplets,
  Palette, Zap, MessageCircle, Phone, Share2,
  CheckCircle, Heart, ShieldCheck, FileCheck,
  CreditCard, ChevronLeft,
} from "lucide-react";

const ALL_VEHICLES = [
  { id:"1",  marca:"BMW",        modelo:"320i Sport",         versao:"2.0 Turbo 16V 184cv",  ano:2023, quilometragem:32000,  combustivel:"Gasolina", cambio:"8-Speed Automatico", cor:"Preto",  valor_anunciado:189900, status:"disponivel", tipo:"carro", observacoes:"Veiculo em excelente estado, unico dono, revisoes em dia. Possui pacote M-Sport completo, central multimidia com tela de 10.25 polegadas, camera de re, sensores de estacionamento dianteiro e traseiro, head-up display, bancos em couro eletrico com memoria, teto solar panoramico." },
  { id:"2",  marca:"Toyota",     modelo:"Corolla XEi",        versao:"2.0 Flex 16V 177cv",   ano:2022, quilometragem:48000,  combustivel:"Flex",     cambio:"CVT",               cor:"Prata",  valor_anunciado:128500, status:"disponivel", tipo:"carro", observacoes:"Corolla em otimo estado, com todas as revisoes Toyota realizadas." },
  { id:"3",  marca:"Honda",      modelo:"Civic EXL",          versao:"1.5 Turbo 173cv",      ano:2023, quilometragem:29000,  combustivel:"Flex",     cambio:"CVT",               cor:"Branco", valor_anunciado:155000, status:"reservado",  tipo:"carro", observacoes:"" },
  { id:"4",  marca:"Hyundai",    modelo:"HB20S Premium",      versao:"1.0 Turbo 120cv",      ano:2024, quilometragem:8000,   combustivel:"Flex",     cambio:"7-Speed DCT",       cor:"Vermelho",valor_anunciado:89900, status:"disponivel",  tipo:"carro", observacoes:"" },
  { id:"5",  marca:"Jeep",       modelo:"Renegade Sport",     versao:"1.3 Turbo Flex",       ano:2022, quilometragem:42000,  combustivel:"Flex",     cambio:"Automatico",        cor:"Azul",   valor_anunciado:118000, status:"disponivel", tipo:"carro", observacoes:"" },
  { id:"6",  marca:"Honda",      modelo:"CB 500F",            versao:"471cc Parallel Twin",   ano:2023, quilometragem:9000,   combustivel:"Gasolina", cambio:"Manual",            cor:"Preto",  valor_anunciado:38900,  status:"disponivel", tipo:"moto",  observacoes:"" },
  { id:"7",  marca:"Volkswagen", modelo:"Polo Track",         versao:"1.0 Flex 6V",          ano:2023, quilometragem:18000,  combustivel:"Flex",     cambio:"Manual",            cor:"Branco", valor_anunciado:72900,  status:"disponivel", tipo:"carro", observacoes:"" },
  { id:"8",  marca:"Chevrolet",  modelo:"Onix Plus LTZ",      versao:"1.0 Turbo 116cv",      ano:2024, quilometragem:8000,   combustivel:"Flex",     cambio:"Automatico",        cor:"Preto",  valor_anunciado:89500,  status:"disponivel", tipo:"carro", observacoes:"" },
  { id:"9",  marca:"Ford",       modelo:"Territory Titanium", versao:"1.5 EcoBoost 150cv",   ano:2023, quilometragem:26000,  combustivel:"Gasolina", cambio:"Automatico",        cor:"Prata",  valor_anunciado:142900, status:"disponivel", tipo:"carro", observacoes:"" },
  { id:"10", marca:"Mitsubishi", modelo:"Eclipse Cross HPE",  versao:"1.5 Turbo MIVEC",      ano:2024, quilometragem:5000,   combustivel:"Flex",     cambio:"CVT",               cor:"Branco", valor_anunciado:168000, status:"disponivel", tipo:"carro", observacoes:"" },
  { id:"11", marca:"Yamaha",     modelo:"MT-07",              versao:"689cc 74cv",            ano:2023, quilometragem:12000,  combustivel:"Gasolina", cambio:"Manual",            cor:"Azul",   valor_anunciado:52900,  status:"disponivel", tipo:"moto",  observacoes:"" },
  { id:"12", marca:"Toyota",     modelo:"Hilux SRX",          versao:"2.8 Diesel 204cv",     ano:2022, quilometragem:58000,  combustivel:"Diesel",   cambio:"Automatico",        cor:"Branco", valor_anunciado:278000, status:"disponivel", tipo:"carro", observacoes:"" },
];

function fmtPrice(v: number) { return new Intl.NumberFormat("pt-BR").format(v); }
function fmtKm(v: number)    { return new Intl.NumberFormat("pt-BR").format(v) + " km"; }

const DIFERENCIAIS = [
  { icon: ShieldCheck, text: "Vistoria de 100 pontos" },
  { icon: FileCheck,   text: "Historico verificado"   },
  { icon: CreditCard,  text: "Aceita financiamento"   },
  { icon: CheckCircle, text: "IPVA 2024 pago"         },
];

export default function VeiculoDetail({ id }: { id: string }) {
  const vehicle    = ALL_VEHICLES.find(v => v.id === id) ?? ALL_VEHICLES[0];
  const related    = ALL_VEHICLES.filter(v => v.id !== id && v.tipo === vehicle.tipo).slice(0, 3);
  const imgSrc     = vehicle.tipo === "moto" ? "/hero-moto.png" : "/hero-carro.jpeg";
  const PHOTOS     = 4;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    "name": `${vehicle.marca} ${vehicle.modelo} ${vehicle.versao}`,
    "offers": {
      "@type": "Offer",
      "price": vehicle.valor_anunciado,
      "priceCurrency": "BRL",
      "availability": vehicle.status === "disponivel"
        ? "https://schema.org/InStock"
        : "https://schema.org/LimitedAvailability",
      "seller": { "@type": "AutoDealer", "name": "LMC Veículos" },
    },
    "vehicleModelDate": String(vehicle.ano),
    "mileageFromOdometer": { "@type": "QuantitativeValue", "value": vehicle.quilometragem, "unitCode": "KMT" },
    "fuelType": vehicle.combustivel,
    "color": vehicle.cor,
  };

  const [active, setActive] = useState(0);
  const [fav,    setFav]    = useState(false);
  const [name,   setName]   = useState("");
  const [phone,  setPhone]  = useState("");
  const [msg,    setMsg]    = useState("Ola! Tenho interesse no " + vehicle.marca + " " + vehicle.modelo + " " + vehicle.ano + ".");
  const [sent,   setSent]   = useState(false);

  const prev = () => setActive(i => (i - 1 + PHOTOS) % PHOTOS);
  const next = () => setActive(i => (i + 1) % PHOTOS);

  const wppMsg  = encodeURIComponent("Ola! Vi o " + vehicle.marca + " " + vehicle.modelo + " " + vehicle.ano + " (R$ " + fmtPrice(vehicle.valor_anunciado) + ") no site e tenho interesse.");
  const wppLink = "https://wa.me/5511999999999?text=" + wppMsg;
  const installment = Math.round(vehicle.valor_anunciado / 60);

  const SPECS = [
    { icon: Calendar,  label:"Ano",           value: String(vehicle.ano) },
    { icon: Gauge,     label:"Quilometragem",  value: fmtKm(vehicle.quilometragem) },
    { icon: Settings,  label:"Cambio",         value: vehicle.cambio },
    { icon: Droplets,  label:"Combustivel",    value: vehicle.combustivel },
    { icon: Palette,   label:"Cor",            value: vehicle.cor },
    { icon: Zap,       label:"Tipo",           value: vehicle.tipo === "moto" ? "Moto" : "Carro" },
  ];

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); setSent(true); }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* breadcrumb */}
      <div style={{ background:"var(--s-dark)", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"14px 0" }}>
        <div className="s-container">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
            <nav style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, flexWrap:"wrap" }}>
              <Link href="/"       style={{ color:"rgba(255,255,255,0.35)", textDecoration:"none" }}>Inicio</Link>
              <ChevronRight size={11} color="rgba(255,255,255,0.20)" />
              <Link href="/estoque" style={{ color:"rgba(255,255,255,0.35)", textDecoration:"none" }}>Estoque</Link>
              <ChevronRight size={11} color="rgba(255,255,255,0.20)" />
              <span style={{ color:"rgba(255,255,255,0.65)", fontWeight:500 }}>{vehicle.marca} {vehicle.modelo}</span>
            </nav>
            <Link href="/estoque" style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"rgba(255,255,255,0.40)", textDecoration:"none", whiteSpace:"nowrap", flexShrink:0 }}>
              <ChevronLeft size={13} /> Voltar
            </Link>
          </div>
        </div>
      </div>

      <div className="s-section-sm" style={{ paddingBottom:100 }}>
        <div className="s-container">

          {/* ═══ 3-area grid ═══
              Desktop: [gallery][info]
                       [content][info]
              Mobile:  gallery → info → content   */}
          <div className="s-vd-layout">

            {/* ── GALLERY ── */}
            <div className="s-vd-gallery">
              {/* Main photo */}
              <div className="s-vd-main-photo" style={{ position:"relative", borderRadius:16, overflow:"hidden", aspectRatio:"16/10", background:"#1a1d24" }}>
                <Image key={active} src={imgSrc} alt={vehicle.marca + " " + vehicle.modelo} fill
                  className="s-gallery-fade-in" style={{ objectFit:"cover" }} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,transparent 60%,rgba(0,0,0,.28) 100%)" }} />

                {/* status badge */}
                <div style={{ position:"absolute", top:14, left:14, display:"flex", gap:6 }}>
                  <span className={"s-v-badge " + (vehicle.status === "disponivel" ? "s-v-badge-disponivel" : "s-v-badge-reservado")}>
                    {vehicle.status === "disponivel" ? "Disponivel" : "Reservado"}
                  </span>
                </div>

                {/* fav + share */}
                <div style={{ position:"absolute", top:14, right:14, display:"flex", gap:8 }}>
                  <button onClick={() => setFav(f => !f)} aria-label="Favoritar"
                    style={{ width:36, height:36, borderRadius:"50%", background:"rgba(0,0,0,.50)", backdropFilter:"blur(8px)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color: fav ? "#ef4444" : "#fff", transition:"color 200ms" }}>
                    <Heart size={16} fill={fav ? "currentColor" : "none"} strokeWidth={2} />
                  </button>
                  <button aria-label="Compartilhar"
                    onClick={() => navigator.share?.({ title: vehicle.marca + " " + vehicle.modelo, url: window.location.href })}
                    style={{ width:36, height:36, borderRadius:"50%", background:"rgba(0,0,0,.50)", backdropFilter:"blur(8px)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}>
                    <Share2 size={16} strokeWidth={2} />
                  </button>
                </div>

                {/* arrows */}
                <button onClick={prev} aria-label="Foto anterior" className="s-gal-arrow" style={{ left:14 }}><ChevronLeft  size={20} /></button>
                <button onClick={next} aria-label="Proxima foto"  className="s-gal-arrow" style={{ right:14 }}><ChevronRight size={20} /></button>

                {/* counter */}
                <span style={{ position:"absolute", bottom:14, right:14, background:"rgba(0,0,0,.60)", backdropFilter:"blur(8px)", color:"#fff", fontSize:12, fontWeight:600, padding:"5px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.10)" }}>
                  {active + 1} / {PHOTOS}
                </span>
              </div>

              {/* thumbs */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginTop:10 }}>
                {Array.from({ length: PHOTOS }, (_, i) => (
                  <button key={i} onClick={() => setActive(i)}
                    style={{ position:"relative", aspectRatio:"4/3", borderRadius:10, overflow:"hidden", border:"2.5px solid", padding:0, cursor:"pointer", background:"#1a1d24",
                      borderColor: active === i ? "var(--s-orange)" : "rgba(255,255,255,.06)",
                      boxShadow:   active === i ? "0 0 0 3px rgba(244,121,32,.18)" : "none",
                      transition:"border-color 200ms, box-shadow 200ms" }}>
                    <Image src={imgSrc} alt={"Foto " + (i+1)} fill style={{ objectFit:"cover",
                      filter: active === i ? "brightness(1)" : "brightness(.45) grayscale(.3)",
                      transition:"filter 220ms ease" }} />
                    {active === i && <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:"var(--s-orange)", animation:"thumbBarSlide .28s ease" }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* ── INFO (right sticky panel) ── */}
            <div className="s-vd-info">
              {/* badges + title */}
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                  <span className={"s-badge " + (vehicle.status === "disponivel" ? "s-badge-green" : "s-badge-purple")}>
                    {vehicle.status === "disponivel" ? "Disponivel" : "Reservado"}
                  </span>
                  <span className="s-badge s-badge-orange">{vehicle.tipo === "moto" ? "Moto" : "Sedan"}</span>
                  {vehicle.quilometragem < 15000 && <span className="s-badge s-badge-blue">Seminovo</span>}
                </div>
                <h1 className="s-vd-title" style={{ fontSize:"clamp(20px,3vw,30px)", fontWeight:900, letterSpacing:"-0.8px", lineHeight:1.15, color:"var(--s-text-1)", marginBottom:6 }}>
                  {vehicle.marca} {vehicle.modelo}
                </h1>
                <p style={{ fontSize:13, color:"var(--s-text-3)" }}>{vehicle.versao} &middot; {vehicle.ano} &middot; {fmtKm(vehicle.quilometragem)}</p>
              </div>

              {/* price box */}
              <div style={{ background:"var(--s-bg)", border:"1.5px solid var(--s-border)", borderRadius:14, padding:"18px 20px 16px", marginBottom:14 }}>
                <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, color:"var(--s-text-3)", marginBottom:5 }}>Preco de venda</p>
                <p style={{ fontSize:36, fontWeight:900, letterSpacing:"-2px", lineHeight:1, color:"var(--s-text-1)", marginBottom:10 }}>
                  <span style={{ fontSize:14, fontWeight:600, color:"var(--s-text-3)", verticalAlign:"super", marginRight:2 }}>R$</span>
                  {fmtPrice(vehicle.valor_anunciado)}
                </p>
                <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px", background:"rgba(22,163,74,.06)", borderRadius:8, border:"1px solid rgba(22,163,74,.15)" }}>
                  <CreditCard size={13} color="var(--s-green)" />
                  <p style={{ fontSize:12, color:"#15803d", fontWeight:600, lineHeight:1.4 }}>
                    Parcele em ate 60x de <strong>R$ {fmtPrice(installment)}</strong>
                  </p>
                </div>
              </div>

              {/* quick specs */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {SPECS.map(s => (
                  <div key={s.label} style={{ background:"var(--s-white)", border:"1px solid var(--s-border)", borderRadius:10, padding:"11px 13px", display:"flex", alignItems:"center", gap:9 }}>
                    <s.icon size={15} color="var(--s-orange)" strokeWidth={2} />
                    <div>
                      <p style={{ fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:.5, color:"var(--s-text-3)", marginBottom:1 }}>{s.label}</p>
                      <p style={{ fontSize:12.5, fontWeight:700, color:"var(--s-text-1)" }}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTAs — hidden on mobile (bottom bar takes over) */}
              <div className="s-vd-ctas">
                <a href={wppLink} target="_blank" rel="noopener noreferrer"
                  style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%", height:50, borderRadius:12, background:"#25D366", color:"#fff", textDecoration:"none", fontFamily:"inherit", fontSize:15, fontWeight:800, marginBottom:10, border:"none", cursor:"pointer", boxShadow:"0 4px 20px rgba(37,211,102,.28)" }}>
                  <MessageCircle size={19} strokeWidth={2} /> Tenho interesse - WhatsApp
                </a>
                <a href="tel:+5511999999999"
                  style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:9, width:"100%", height:44, borderRadius:12, background:"transparent", color:"var(--s-text-2)", textDecoration:"none", fontFamily:"inherit", fontSize:13, fontWeight:700, marginBottom:18, border:"1.5px solid var(--s-border)", cursor:"pointer" }}>
                  <Phone size={16} strokeWidth={2} /> Ligar para a concessionaria
                </a>
              </div>

              {/* mini form */}
              <div className="s-card">
                <h3 style={{ fontSize:14, fontWeight:800, marginBottom:3 }}>Solicitar informacoes</h3>
                <p style={{ fontSize:12, color:"var(--s-text-3)", marginBottom:12 }}>Respondemos em ate 2 horas</p>
                {sent ? (
                  <div style={{ textAlign:"center", padding:"18px 0" }}>
                    <CheckCircle size={36} strokeWidth={1.5} color="var(--s-green)" style={{ margin:"0 auto 10px" }} />
                    <p style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>Mensagem enviada!</p>
                    <p style={{ fontSize:12, color:"var(--s-text-3)" }}>Nossa equipe retorna em breve.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:9 }}>
                    <input className="s-input-light" type="text"  placeholder="Seu nome"          value={name}  onChange={e => setName(e.target.value)}  required />
                    <input className="s-input-light" type="tel"   placeholder="WhatsApp / Telefone" value={phone} onChange={e => setPhone(e.target.value)} required />
                    <textarea className="s-textarea-light" placeholder="Mensagem" value={msg} onChange={e => setMsg(e.target.value)} rows={3} style={{ minHeight:70 }} />
                    <button type="submit" className="s-btn s-btn-primary s-btn-md s-btn-full">Enviar mensagem</button>
                  </form>
                )}
              </div>

              {/* trust */}
              <div style={{ marginTop:12, padding:"13px 15px", borderRadius:12, background:"var(--s-orange-muted)", border:"1.5px solid rgba(244,121,32,.20)", display:"flex", alignItems:"center", gap:11 }}>
                <ShieldCheck size={19} color="var(--s-orange)" strokeWidth={2} />
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:"var(--s-text-1)" }}>LCM Veiculos - verificada</p>
                  <p style={{ fontSize:11, color:"var(--s-text-3)" }}>Garantia de procedencia e documentacao</p>
                </div>
              </div>
            </div>

            {/* ── CONTENT (desc + full specs) ── */}
            <div className="s-vd-content">

              {/* diferenciais — mobile only (desktop shows in gallery col above) */}
              <div className="s-vd-dif-mobile" style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:16 }}>
                {DIFERENCIAIS.map(d => (
                  <div key={d.text} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:"var(--s-white)", border:"1px solid var(--s-border)", borderRadius:12 }}>
                    <d.icon size={17} color="var(--s-orange)" strokeWidth={2} />
                    <span style={{ fontSize:12.5, fontWeight:600, color:"var(--s-text-2)" }}>{d.text}</span>
                  </div>
                ))}
              </div>

              <div className="s-card" style={{ marginBottom:16 }}>
                <h3 style={{ fontSize:15, fontWeight:800, marginBottom:4, color:"var(--s-text-1)" }}>Descricao do veiculo</h3>
                <p style={{ fontSize:13, color:"var(--s-text-3)", marginBottom:14 }}>Informacoes do vendedor</p>
                {vehicle.observacoes
                  ? <p style={{ fontSize:14, color:"var(--s-text-2)", lineHeight:1.8 }}>{vehicle.observacoes}</p>
                  : <p style={{ fontSize:14, color:"var(--s-text-3)", fontStyle:"italic" }}>Sem descricao adicional cadastrada.</p>}
              </div>
              <div className="s-card">
                <h3 style={{ fontSize:15, fontWeight:800, marginBottom:14, color:"var(--s-text-1)" }}>Especificacoes tecnicas</h3>
                {[["Marca",vehicle.marca],["Modelo",vehicle.modelo],["Versao",vehicle.versao],["Ano",String(vehicle.ano)],
                  ["Quilometragem",fmtKm(vehicle.quilometragem)],["Cambio",vehicle.cambio],["Combustivel",vehicle.combustivel],
                  ["Cor",vehicle.cor],["Tipo",vehicle.tipo === "moto" ? "Moto" : "Carro"]].map(([label,value],i,arr) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--s-border)" : "none" }}>
                    <span style={{ fontSize:13, color:"var(--s-text-3)", fontWeight:500 }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"var(--s-text-1)" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* related */}
          {related.length > 0 && (
            <div style={{ marginTop:56 }}>
              <div className="s-section-head" style={{ marginBottom:22 }}>
                <div>
                  <h2 className="s-section-title">Voce tambem pode gostar</h2>
                  <p className="s-section-sub">Outros veiculos disponiveis</p>
                </div>
                <Link href="/estoque" className="s-see-all">Ver todos <ChevronRight size={14} strokeWidth={2.5} /></Link>
              </div>
              <div className="s-grid-3">
                {related.map(v => {
                  const vi = v.tipo === "moto" ? "/hero-moto.png" : "/hero-carro.jpeg";
                  return (
                    <Link key={v.id} href={"/veiculo/" + v.id} className="s-v-card" style={{ textDecoration:"none" }}>
                      <div className="s-v-img">
                        <Image src={vi} alt={v.marca + " " + v.modelo} fill style={{ objectFit:"cover", transition:"transform .5s ease" }} />
                        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,transparent 55%,rgba(0,0,0,.15) 100%)" }} />
                        <div style={{ position:"absolute", top:10, left:10, display:"flex", gap:6 }}>
                          <span className={"s-v-badge " + (v.status === "reservado" ? "s-v-badge-reservado" : "s-v-badge-disponivel")}>
                            {v.status === "reservado" ? "Reservado" : "Disponivel"}
                          </span>
                        </div>
                      </div>
                      <div className="s-v-info">
                        <p className="s-v-make">{v.marca}</p>
                        <p className="s-v-name">{v.modelo}</p>
                        <p className="s-v-version">{v.versao}</p>
                        <div className="s-v-specs" style={{ marginBottom:10 }}>
                          <span className="s-v-spec"><Calendar size={10} strokeWidth={2} />{v.ano}</span>
                          <span className="s-v-spec"><Gauge size={10} strokeWidth={2} />{fmtKm(v.quilometragem)}</span>
                          <span className="s-v-spec"><Droplets size={10} strokeWidth={2} />{v.combustivel}</span>
                        </div>
                        <div className="s-v-divider" />
                        <div className="s-v-bottom">
                          <div>
                            <p className="s-v-price-label">Preco</p>
                            <p className="s-v-price"><span className="s-v-price-cur">R$</span>{fmtPrice(v.valor_anunciado)}</p>
                          </div>
                          <span className="s-btn s-btn-primary s-btn-sm" style={{ pointerEvents:"none" }}>
                            Ver <ChevronRight size={12} strokeWidth={2.5} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── VEÍCULOS SIMILARES ─── */}
      {related.length > 0 && (
        <section style={{ background:"var(--s-bg)", borderTop:"1px solid var(--s-border)", padding:"52px 0" }} aria-label="Veículos similares">
          <div className="s-container">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
              <div>
                <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, color:"var(--s-orange)", marginBottom:6 }}>Veja também</p>
                <h2 style={{ fontSize:"clamp(18px,2.5vw,24px)", fontWeight:900, color:"var(--s-text-1)", letterSpacing:"-0.4px" }}>Veículos similares</h2>
              </div>
              <Link href="/estoque" style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, fontWeight:700, color:"var(--s-orange)", textDecoration:"none" }}>
                Ver todo o estoque <ChevronRight size={15} />
              </Link>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }} className="s-similares-grid">
              {related.map(v => {
                const src = v.tipo === "moto" ? "/hero-moto.png" : "/hero-carro.jpeg";
                return (
                  <Link key={v.id} href={`/veiculo/${v.id}`} className="s-v-card" style={{ textDecoration:"none" }}>
                    <div className="s-v-img">
                      <Image src={src} alt={`${v.marca} ${v.modelo}`} fill style={{ objectFit:"cover" }} />
                      <span className={`s-v-badge ${v.status === "reservado" ? "s-v-badge-reservado" : "s-v-badge-disponivel"}`}>
                        {v.status === "reservado" ? "Reservado" : "Disponível"}
                      </span>
                    </div>
                    <div className="s-v-info">
                      <p className="s-v-make">{v.marca}</p>
                      <p className="s-v-name">{v.modelo}</p>
                      <p className="s-v-version">{v.versao}</p>
                      <div className="s-v-divider" />
                      <div className="s-v-bottom">
                        <div>
                          <p className="s-v-price-label">Preço</p>
                          <p className="s-v-price"><span className="s-v-price-cur">R$</span>{fmtPrice(v.valor_anunciado)}</p>
                        </div>
                        <span className="s-btn s-btn-primary s-btn-sm" style={{ pointerEvents:"none" }}>Ver <ChevronRight size={13} /></span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          <style>{`
            @media (max-width:640px) { .s-similares-grid { grid-template-columns:1fr !important; } }
            @media (max-width:900px) { .s-similares-grid { grid-template-columns:1fr 1fr !important; } }
          `}</style>
        </section>
      )}

      {/* mobile bottom CTA bar */}
      <div className="s-vd-mobile-bar">
        <a href={wppLink} target="_blank" rel="noopener noreferrer"
          style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, height:50, borderRadius:12, background:"#25D366", color:"#fff", textDecoration:"none", fontSize:15, fontWeight:800 }}>
          <MessageCircle size={18} strokeWidth={2} /> WhatsApp
        </a>
        <a href="tel:+5511999999999"
          style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, height:50, borderRadius:12, background:"var(--s-dark-3)", color:"#fff", textDecoration:"none", fontSize:15, fontWeight:700, border:"1.5px solid rgba(255,255,255,.12)" }}>
          <Phone size={17} strokeWidth={2} /> Ligar
        </a>
      </div>

      <style>{`
        @keyframes galleryFadeIn {
          from { opacity:0; transform:scale(1.03); }
          to   { opacity:1; transform:scale(1); }
        }
        .s-gallery-fade-in { animation: galleryFadeIn .35s cubic-bezier(.4,0,.2,1) both; }

        @keyframes thumbBarSlide {
          from { transform:scaleX(0); }
          to   { transform:scaleX(1); }
        }

        .s-gal-arrow {
          position:absolute; top:50%; transform:translateY(-50%);
          width:40px; height:40px; border-radius:50%;
          background:rgba(0,0,0,.55); backdrop-filter:blur(8px);
          border:1.5px solid rgba(255,255,255,.12);
          color:#fff; display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:all 160ms;
        }
        .s-gal-arrow:hover {
          background:rgba(244,121,32,.75) !important;
          border-color:var(--s-orange) !important;
          transform:translateY(-50%) scale(1.08) !important;
        }

        .s-v-card:hover img { transform:scale(1.05); }

        /* Desktop 2-column grid */
        .s-vd-layout {
          display:grid;
          grid-template-columns: 1.45fr 1fr;
          grid-template-rows: auto auto;
          column-gap: 40px;
          row-gap: 20px;
          align-items: start;
          width:100%;
        }
        .s-vd-gallery { grid-column:1; grid-row:1; }
        .s-vd-content { grid-column:1; grid-row:2; }
        .s-vd-info    { grid-column:2; grid-row:1 / 3; position:sticky; top:calc(var(--s-header-h) + 20px); }

        /* Tablet/mobile: single column */
        @media (max-width: 900px) {
          .s-vd-layout   { display:flex !important; flex-direction:column !important; gap:14px; }
          .s-vd-gallery  { order:1; width:100%; }
          .s-vd-info     { order:2; position:static; width:100%; }
          .s-vd-content  { order:3; width:100%; }
          /* Taller photo on tablet */
          .s-vd-main-photo { aspect-ratio:16/9 !important; }
        }

        /* Mobile only */
        .s-vd-mobile-bar { display:none; }

        @media (max-width: 640px) {
          .s-vd-layout   { gap:10px; }
          .s-section-sm  { padding-top:12px !important; }
          /* Even taller photo on small phone */
          .s-vd-main-photo { aspect-ratio:4/3 !important; }
          /* Tighter thumbs */
          .s-vd-gallery > div:nth-child(2) { gap:5px !important; margin-top:5px !important; }
          /* Title smaller */
          .s-vd-title { font-size:20px !important; }
          /* Bottom bar */
          .s-vd-mobile-bar {
            display:flex; gap:10px;
            position:fixed; bottom:0; left:0; right:0; z-index:300;
            padding:10px 14px;
            background:rgba(14,15,17,.96);
            backdrop-filter:blur(16px);
            border-top:1px solid rgba(255,255,255,.08);
            box-shadow:0 -6px 24px rgba(0,0,0,.40);
          }
          .s-vd-ctas { display:none; }
          .s-section-sm:last-of-type { padding-bottom:80px !important; }
        }
        @media (max-width: 440px) {
          .s-vd-gallery > div:nth-child(3) { grid-template-columns:1fr !important; }
        }
      `}</style>
    </>
  );
}