"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronRight, MapPin, Phone, Mail, Clock,
  MessageCircle, CheckCircle, Send, ArrowRight,
} from "lucide-react";

const CONTACT_ITEMS = [
  {
    icon: MapPin,
    label: "Endereco",
    value: "Rua das Flores, 123\nBairro, Cidade / UF — CEP 00000-000",
    color: "#f47920",
  },
  {
    icon: Phone,
    label: "Telefone / WhatsApp",
    value: "(11) 9 9999-9999",
    color: "#22c55e",
  },
  {
    icon: Mail,
    label: "E-mail",
    value: "contato@lcmveiculos.com.br",
    color: "#3b82f6",
  },
  {
    icon: Clock,
    label: "Horario de atendimento",
    value: "Seg–Sex: 8h as 18h\nSabado: 8h as 13h\nDomingo: Fechado",
    color: "#a855f7",
  },
];

export default function ContatoClient() {
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [subject, setSubject] = useState("");
  const [msg,     setMsg]     = useState("");
  const [sent,    setSent]    = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <>
      {/* ─── Hero ─── */}
      <div style={{
        background: "linear-gradient(135deg, #0e0f11 0%, #13151a 45%, #1a1008 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "clamp(48px,7vw,80px) 0",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position:"absolute", top:-80, right:"15%", width:450, height:450, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(244,121,32,0.11) 0%, transparent 65%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
          background:"linear-gradient(90deg, transparent, var(--s-orange), transparent)" }} />

        <div className="s-container" style={{ position:"relative", zIndex:1 }}>
          <nav style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:28 }}>
            <Link href="/" style={{ color:"inherit", textDecoration:"none" }}>Inicio</Link>
            <ChevronRight size={11} />
            <span style={{ color:"rgba(255,255,255,0.70)" }}>Contato</span>
          </nav>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:24, flexWrap:"wrap" }}>
            <div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:18 }}>
                <div style={{ width:3, height:22, background:"var(--s-orange)", borderRadius:2 }} />
                <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:2, color:"var(--s-orange)" }}>Fale conosco</span>
              </div>
              <h1 style={{ fontSize:"clamp(28px,5vw,52px)", fontWeight:900, letterSpacing:"-2px", color:"#fff", lineHeight:1.1, marginBottom:16 }}>
                Entre em{" "}
                <span style={{ backgroundImage:"linear-gradient(90deg,#f47920,#ffb347)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  contato
                </span>
              </h1>
              <p style={{ fontSize:"clamp(13px,1.5vw,16px)", color:"rgba(255,255,255,0.50)", lineHeight:1.7, maxWidth:460 }}>
                Estamos prontos para te atender. Envie uma mensagem ou entre em contato pelo WhatsApp.
              </p>
            </div>
            <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:12, padding:"14px 26px", borderRadius:14,
                background:"#25D366", color:"#fff", textDecoration:"none", fontWeight:800, fontSize:15,
                boxShadow:"0 8px 32px rgba(37,211,102,0.25)", transition:"all 180ms",
                border:"none", cursor:"pointer" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="#1cb857"; (e.currentTarget as HTMLElement).style.transform="translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="#25D366"; (e.currentTarget as HTMLElement).style.transform="none"; }}>
              <MessageCircle size={20} strokeWidth={2} />
              Falar no WhatsApp
              <ArrowRight size={16} strokeWidth={2.5} />
            </a>
          </div>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <div className="s-section-sm" style={{ background:"var(--s-bg)" }}>
        <div className="s-container">
          <div className="s-contato-layout">

            {/* ── Left: info + map ── */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

              {/* Contact info cards */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {CONTACT_ITEMS.map(item => (
                  <div key={item.label} style={{
                    display:"flex", alignItems:"flex-start", gap:14,
                    padding:"16px 18px", borderRadius:14,
                    background:"var(--s-white)", border:"1px solid var(--s-border)",
                    boxShadow:"0 2px 10px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:item.color + "18",
                      border:`1px solid ${item.color}30`, display:"flex", alignItems:"center",
                      justifyContent:"center", flexShrink:0 }}>
                      <item.icon size={18} color={item.color} strokeWidth={2} />
                    </div>
                    <div style={{ paddingTop:2 }}>
                      <p style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:1,
                        color:"var(--s-text-3)", marginBottom:4 }}>{item.label}</p>
                      <p style={{ fontSize:13.5, color:"var(--s-text-1)", lineHeight:1.65, whiteSpace:"pre-line", fontWeight:500 }}>
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Map placeholder */}
              <div style={{
                flex:1, minHeight:200, borderRadius:16, overflow:"hidden",
                background:"#13151a", border:"1px solid rgba(255,255,255,0.08)",
                display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", gap:12, position:"relative",
              }}>
                <div style={{ position:"absolute", inset:0,
                  backgroundImage:"linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
                  backgroundSize:"32px 32px" }} />
                <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:"var(--s-orange-muted)",
                    display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                    <MapPin size={24} color="var(--s-orange)" strokeWidth={1.5} />
                  </div>
                  <p style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.70)", marginBottom:4 }}>Rua das Flores, 123</p>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:16 }}>Bairro, Cidade / UF</p>
                  <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer"
                    style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 18px",
                      borderRadius:8, background:"var(--s-orange)", color:"#fff",
                      textDecoration:"none", fontSize:12, fontWeight:700 }}>
                    <MapPin size={12} /> Ver no Google Maps
                  </a>
                </div>
              </div>
            </div>

            {/* ── Right: form ── */}
            <div style={{
              background:"var(--s-white)", border:"1px solid var(--s-border)",
              borderRadius:20, padding:"clamp(24px,4vw,40px)",
              boxShadow:"0 4px 32px rgba(0,0,0,0.07)",
            }}>
              {sent ? (
                <div style={{ textAlign:"center", padding:"48px 20px" }}>
                  <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(34,197,94,0.12)",
                    border:"2px solid rgba(34,197,94,0.30)", display:"flex", alignItems:"center",
                    justifyContent:"center", margin:"0 auto 20px" }}>
                    <CheckCircle size={34} strokeWidth={1.5} color="var(--s-green)" />
                  </div>
                  <p style={{ fontSize:20, fontWeight:900, color:"var(--s-text-1)", marginBottom:8, letterSpacing:"-0.5px" }}>
                    Mensagem enviada!
                  </p>
                  <p style={{ fontSize:14, color:"var(--s-text-3)", lineHeight:1.7, maxWidth:320, margin:"0 auto 28px" }}>
                    Nossa equipe recebeu sua mensagem e entrara em contato em breve.
                  </p>
                  <button onClick={() => setSent(false)} className="s-btn s-btn-outline s-btn-md">
                    Enviar outra mensagem
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom:28 }}>
                    <h2 style={{ fontSize:"clamp(18px,2.5vw,24px)", fontWeight:900, color:"var(--s-text-1)",
                      letterSpacing:"-0.5px", marginBottom:6 }}>Envie uma mensagem</h2>
                    <p style={{ fontSize:13, color:"var(--s-text-3)" }}>
                      Nossa equipe retornara em ate 24 horas.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    <div className="s-contato-form-row">
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:"var(--s-text-2)", textTransform:"uppercase", letterSpacing:0.8 }}>
                          Nome completo <span style={{ color:"var(--s-orange)" }}>*</span>
                        </label>
                        <input
                          type="text" placeholder="Seu nome completo"
                          value={name} onChange={e => setName(e.target.value)} required
                          style={inputStyle} />
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:"var(--s-text-2)", textTransform:"uppercase", letterSpacing:0.8 }}>
                          E-mail <span style={{ color:"var(--s-orange)" }}>*</span>
                        </label>
                        <input
                          type="email" placeholder="seu@email.com"
                          value={email} onChange={e => setEmail(e.target.value)} required
                          style={inputStyle} />
                      </div>
                    </div>

                    <div className="s-contato-form-row">
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:"var(--s-text-2)", textTransform:"uppercase", letterSpacing:0.8 }}>
                          WhatsApp / Telefone
                        </label>
                        <input
                          type="tel" placeholder="(11) 9 0000-0000"
                          value={phone} onChange={e => setPhone(e.target.value)}
                          style={inputStyle} />
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:"var(--s-text-2)", textTransform:"uppercase", letterSpacing:0.8 }}>
                          Assunto
                        </label>
                        <select
                          value={subject} onChange={e => setSubject(e.target.value)}
                          style={{ ...inputStyle, cursor:"pointer" }}>
                          <option value="">Selecione um assunto</option>
                          <option>Interesse em veiculo</option>
                          <option>Avaliacao do meu carro</option>
                          <option>Financiamento</option>
                          <option>Outro assunto</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <label style={{ fontSize:12, fontWeight:700, color:"var(--s-text-2)", textTransform:"uppercase", letterSpacing:0.8 }}>
                        Mensagem <span style={{ color:"var(--s-orange)" }}>*</span>
                      </label>
                      <textarea
                        placeholder="Escreva sua mensagem aqui..."
                        value={msg} onChange={e => setMsg(e.target.value)} required
                        rows={5}
                        style={{ ...inputStyle, resize:"vertical", minHeight:130, lineHeight:1.7 }} />
                    </div>

                    <button type="submit"
                      style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                        height:52, borderRadius:13, background:"var(--s-orange)", color:"#fff",
                        border:"none", fontWeight:800, fontSize:15, cursor:"pointer",
                        letterSpacing:"0.2px", transition:"all 160ms", fontFamily:"inherit",
                        boxShadow:"0 4px 20px rgba(244,121,32,0.30)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="#e06910"; (e.currentTarget as HTMLElement).style.boxShadow="0 6px 24px rgba(244,121,32,0.40)"; (e.currentTarget as HTMLElement).style.transform="translateY(-1px)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="var(--s-orange)"; (e.currentTarget as HTMLElement).style.boxShadow="0 4px 20px rgba(244,121,32,0.30)"; (e.currentTarget as HTMLElement).style.transform="none"; }}>
                      <Send size={17} strokeWidth={2} />
                      Enviar mensagem
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .s-contato-layout {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 28px;
          align-items: start;
        }
        .s-contato-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 900px) {
          .s-contato-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 560px) {
          .s-contato-form-row { grid-template-columns: 1fr; }
        }

        /* Focus ring on inputs */
        .s-contato-layout input:focus,
        .s-contato-layout select:focus,
        .s-contato-layout textarea:focus {
          outline: none;
          border-color: var(--s-orange) !important;
          box-shadow: 0 0 0 3px rgba(244,121,32,0.15) !important;
        }
      `}</style>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  padding: "0 14px",
  borderRadius: 11,
  border: "1.5px solid var(--s-border)",
  background: "var(--s-bg)",
  color: "var(--s-text-1)",
  fontSize: 14,
  fontFamily: "inherit",
  transition: "border-color 150ms, box-shadow 150ms",
  boxSizing: "border-box",
};
