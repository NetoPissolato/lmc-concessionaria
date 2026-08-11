"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Search, Menu, X, Phone, Mail, MapPin, Clock,
  MessageCircle, ArrowUp,
} from "lucide-react";
import { useCountUp } from "./useAnimations";
import type { PublicSettings } from "@/lib/publicApi";

const SCHEDULE = [
  { day: "Seg", open: "08:00", close: "18:00", weekday: 1 },
  { day: "Ter", open: "08:00", close: "18:00", weekday: 2 },
  { day: "Qua", open: "08:00", close: "18:00", weekday: 3 },
  { day: "Qui", open: "08:00", close: "18:00", weekday: 4 },
  { day: "Sex", open: "08:00", close: "18:00", weekday: 5 },
  { day: "Sab", open: "08:00", close: "13:00", weekday: 6 },
  { day: "Dom", open: null,    close: null,    weekday: 0 },
];

function isOpen(): boolean {
  const now = new Date();
  const wd  = now.getDay();
  const s   = SCHEDULE.find(x => x.weekday === wd);
  if (!s || !s.open || !s.close) return false;
  const [oh, om] = s.open.split(":").map(Number);
  const [ch, cm] = s.close.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

const NAV = [
  { href: "/home",       label: "Inicio" },
  { href: "/estoque",   label: "Estoque" },
  { href: "/comparador",label: "Comparar" },
  { href: "/sobre",     label: "Sobre" },
  { href: "/contato",   label: "Contato" },
];

function SiteHeader({ s }: { s: PublicSettings }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const wppLink = "https://wa.me/" + (s.whatsapp || "5511999999999");
  const tel     = s.telefone      || "(11) 9 9999-9999";
  const email   = s.email_contato || "contato@lmcveiculos.com.br";
  const horario = s.horario       || "Seg-Sex 8h-18h | Sab 8h-13h";

  return (
    <>
      <div className="s-topbar">
        <div className="s-container s-topbar-inner">
          <div className="s-topbar-left">
            <a href={"tel:" + tel.replace(/\D/g,"")}>
              <Phone size={11} strokeWidth={2} />
              {tel}
            </a>
            <a href={"mailto:" + email}>
              <Mail size={11} strokeWidth={2} />
              {email}
            </a>
          </div>
          <div className="s-topbar-right">
            <span style={{ display:"flex", alignItems:"center", gap:5 }}>
              <Clock size={11} strokeWidth={2} />
              {horario}
            </span>
            {isOpen() ? (
              <span style={{ display:"flex", alignItems:"center", gap:5, color:"#22c55e", fontWeight:700 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", animation:"wpp-pulse 2s infinite" }} />
                Aberto agora
              </span>
            ) : (
              <span style={{ display:"flex", alignItems:"center", gap:5, color:"rgba(255,255,255,0.35)" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"rgba(255,255,255,0.25)" }} />
                Fechado
              </span>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:8, paddingLeft:12, borderLeft:"1px solid rgba(255,255,255,0.12)" }}>
              {s.instagram && s.instagram !== "#" && (
                <a href={s.instagram} target="_blank" rel="noopener" aria-label="Instagram" style={{ opacity:0.80, display:"flex", transition:"opacity 150ms" }}>
                  <img src="/logos/instagram.svg" alt="Instagram" width={14} height={14} />
                </a>
              )}
              {s.facebook && s.facebook !== "#" && (
                <a href={s.facebook} target="_blank" rel="noopener" aria-label="Facebook" style={{ opacity:0.80, display:"flex", transition:"opacity 150ms" }}>
                  <img src="/logos/facebook.svg" alt="Facebook" width={14} height={14} />
                </a>
              )}
              {s.youtube && s.youtube !== "#" && (
                <a href={s.youtube} target="_blank" rel="noopener" aria-label="YouTube" style={{ opacity:0.80, display:"flex", transition:"opacity 150ms" }}>
                  <img src="/logos/youtube.svg" alt="YouTube" width={16} height={14} />
                </a>
              )}
              <a href={wppLink} target="_blank" rel="noopener" aria-label="WhatsApp" style={{ opacity:0.80, display:"flex", transition:"opacity 150ms" }}>
                <img src="/logos/whatsapp.svg" alt="WhatsApp" width={14} height={14} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <header className="s-header">
        <div className="s-container s-header-inner">
          <Link href="/home" className="s-logo" style={{ gap:0 }}>
            <Image src="/LogoLMC.png" alt="LMC Veiculos" width={130} height={48} style={{ objectFit:"contain" }} priority />
          </Link>
          <div className="s-header-search">
            <span className="s-header-search-icon"><Search size={15} strokeWidth={2} /></span>
            <input type="text" placeholder="Pesquise marca, modelo, ano..." aria-label="Pesquisar veiculos" />
          </div>
          <nav className="s-nav" aria-label="Navegacao principal">
            {NAV.map(n => (
              <Link key={n.href} href={n.href} className={"s-nav-link " + (pathname === n.href ? "active" : "")}>
                {n.label}
              </Link>
            ))}
          </nav>
          <a href={wppLink} target="_blank" rel="noopener noreferrer" className="s-header-cta">
            <MessageCircle size={15} strokeWidth={2.5} />
            WhatsApp
          </a>
          <button className="s-menu-toggle" onClick={() => setMobileOpen(v => !v)} aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className={"s-mobile-nav " + (mobileOpen ? "open" : "")} aria-label="Navegacao mobile">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={"s-nav-link " + (pathname === n.href ? "active" : "")} onClick={() => setMobileOpen(false)}>
              {n.label}
            </Link>
          ))}
          <a href={wppLink} target="_blank" rel="noopener noreferrer" className="s-header-cta">
            <MessageCircle size={15} strokeWidth={2.5} />
            Falar no WhatsApp
          </a>
        </nav>
      </header>
    </>
  );
}

function SiteFooter({ s }: { s: PublicSettings }) {
  const wppLink   = "https://wa.me/" + (s.whatsapp || "5511999999999");
  const tel       = s.telefone      || "";
  const email     = s.email_contato || "";
  const nomeLoja  = s.nome_loja     || "LMC Veiculos";
  const cnpj      = (s as unknown as { cnpj?: string }).cnpj || "00.000.000/0001-00";
  const parts = [s.endereco, s.cidade, s.estado].filter(Boolean);
  const endereco  = parts.length ? parts.join(", ") : "Rua das Flores, 123 - SP";

  return (
    <footer className="s-footer" role="contentinfo">
      <div className="s-container">
        <div className="s-footer-grid">
          <div>
            <Link href="/home" style={{ display:"block", marginBottom:0 }}>
              <Image src="/LogoLMC.png" alt={nomeLoja} width={120} height={44} style={{ objectFit:"contain" }} />
            </Link>
            <p className="s-footer-brand-desc">
              Sua concessionaria de confianca. Transparencia, qualidade e as melhores condicoes para voce realizar o sonho do seu veiculo ideal.
            </p>
            <div className="s-footer-socials">
              {s.facebook && s.facebook !== "#" && (
                <a href={s.facebook} className="s-social-btn" aria-label="Facebook" target="_blank" rel="noopener">
                  <img src="/logos/facebook.svg" alt="Facebook" width={18} height={18} />
                </a>
              )}
              {s.instagram && s.instagram !== "#" && (
                <a href={s.instagram} className="s-social-btn" aria-label="Instagram" target="_blank" rel="noopener">
                  <img src="/logos/instagram.svg" alt="Instagram" width={18} height={18} />
                </a>
              )}
              {s.youtube && s.youtube !== "#" && (
                <a href={s.youtube} className="s-social-btn" aria-label="YouTube" target="_blank" rel="noopener">
                  <img src="/logos/youtube.svg" alt="YouTube" width={20} height={18} />
                </a>
              )}
              <a href={wppLink} className="s-social-btn" aria-label="WhatsApp" target="_blank" rel="noopener">
                <img src="/logos/whatsapp.svg" alt="WhatsApp" width={18} height={18} />
              </a>
            </div>
          </div>

          <div>
            <p className="s-footer-col-title">Estoque</p>
            <div className="s-footer-links">
              <Link href="/estoque">Todos os veiculos</Link>
              <Link href="/estoque?tipo=carro">Carros</Link>
              <Link href="/estoque?tipo=moto">Motos</Link>
              <Link href="/comparador">Comparador</Link>
            </div>
          </div>

          <div>
            <p className="s-footer-col-title">Institucional</p>
            <div className="s-footer-links">
              <Link href="/sobre">Sobre a LMC</Link>
              <Link href="/contato">Contato</Link>
              <Link href="#">Politica de privacidade</Link>
              <Link href="#">Termos de uso</Link>
            </div>
          </div>

          <div>
            <p className="s-footer-col-title">Contato</p>
            <div className="s-footer-links">
              <a href="#" style={{ display:"flex", alignItems:"center", gap:8 }}>
                <MapPin size={13} strokeWidth={2} style={{ flexShrink:0 }} />
                {endereco}
              </a>
              {tel && (
                <a href={"tel:" + tel.replace(/\D/g,"")} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Phone size={13} strokeWidth={2} style={{ flexShrink:0 }} />
                  {tel}
                </a>
              )}
              {email && (
                <a href={"mailto:" + email} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Mail size={13} strokeWidth={2} style={{ flexShrink:0 }} />
                  {email}
                </a>
              )}
            </div>
            <div style={{ marginTop:20 }}>
              <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, color:"rgba(255,255,255,0.30)", marginBottom:10 }}>Horario</p>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {SCHEDULE.map(sc => {
                  const today = new Date().getDay() === sc.weekday;
                  const open  = isOpen() && today;
                  return (
                    <div key={sc.day} style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"5px 10px", borderRadius:7,
                      background: today ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
                      border: today ? "1px solid rgba(34,197,94,0.20)" : "1px solid transparent",
                    }}>
                      <span style={{ fontSize:11, fontWeight: today ? 700 : 500, color: today ? "#fff" : "rgba(255,255,255,0.38)", display:"flex", alignItems:"center", gap:5 }}>
                        {today && <span style={{ width:5, height:5, borderRadius:"50%", background: open ? "#22c55e" : "rgba(255,255,255,0.30)", flexShrink:0 }} />}
                        {sc.day}
                      </span>
                      <span style={{ fontSize:11, color: today ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.28)" }}>
                        {sc.open ? sc.open + "-" + sc.close : "Fechado"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="s-footer-bottom">
          <span>2025 {nomeLoja}. Todos os direitos reservados.</span>
          <span>CNPJ: {cnpj}</span>
        </div>
      </div>
    </footer>
  );
}

export default function SiteShell({ settings, children }: { settings: PublicSettings; children: React.ReactNode }) {
  useCountUp();
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const wppLink = "https://wa.me/" + (settings.whatsapp || "5511999999999");

  return (
    <div className="site-root">
      <SiteHeader s={settings} />
      <main id="main-content" className="s-page-enter" suppressHydrationWarning>{children}</main>
      <SiteFooter s={settings} />
      <div className="s-wpp-wrap">
        <span className="s-wpp-tooltip">Atendimento imediato</span>
        <a href={wppLink} className="s-wpp-float" target="_blank" rel="noopener noreferrer" aria-label="Falar no WhatsApp">
          <img src="/logos/whatsapp.svg" alt="WhatsApp" width={30} height={30} />
        </a>
      </div>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Voltar ao topo"
        style={{
          position:"fixed", bottom:100, right:28, width:42, height:42,
          borderRadius:"50%", background:"var(--s-dark-2)",
          border:"1.5px solid rgba(255,255,255,0.12)", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          color:"rgba(255,255,255,0.70)", zIndex:299, fontFamily:"inherit",
          boxShadow:"0 4px 16px rgba(0,0,0,0.30)",
          transition:"opacity 0.25s, transform 0.25s",
          opacity: showTop ? 1 : 0,
          transform: showTop ? "translateY(0)" : "translateY(8px)",
          pointerEvents: showTop ? "auto" : "none",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="var(--s-orange)"; (e.currentTarget as HTMLElement).style.color="#fff"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="var(--s-dark-2)"; (e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.70)"; }}
      >
        <ArrowUp size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}
