"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Search, Menu, X, Phone, Mail, MapPin, Clock,
  MessageCircle, ArrowUp,
} from "lucide-react";
import { useCountUp } from "./useAnimations";
import type { PublicSettings, PublicVehicle } from "@/lib/publicApi";
import { vehicleSlug } from "@/components/vehicle/shared";

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
  const pathname   = usePathname();
  const router     = useRouter();
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState<PublicVehicle[]>([]);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL ?? "/api/v1") + "/public";

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/vehicles?q=${encodeURIComponent(searchQuery)}&limit=6`);
        if (res.ok) {
          const data: PublicVehicle[] = await res.json();
          setSearchResults(data);
          setSearchOpen(true);
        }
      } catch { /* silently fail */ }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, BACKEND_URL]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
    if (e.key === "Enter" && searchQuery.trim()) {
      setSearchOpen(false);
      router.push(`/estoque?q=${encodeURIComponent(searchQuery)}`);
    }
  }

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
          </div>
        </div>
      </div>

      <header className="s-header">
        <div className="s-container s-header-inner">
          <Link href="/home" className="s-logo" style={{ gap:0 }}>
            <Image src="/LogoLMC.png" alt="LMC Veiculos" width={130} height={48} style={{ objectFit:"contain" }} priority />
          </Link>
          <div className="s-header-search" ref={searchRef} style={{ position:"relative" }}>
            <span className="s-header-search-icon"><Search size={15} strokeWidth={2} /></span>
            <input
              type="text"
              placeholder="Pesquise marca, modelo, ano..."
              aria-label="Pesquisar veiculos"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              onKeyDown={handleKeyDown}
            />
            {searchLoading && (
              <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontSize:11, color:"rgba(255,255,255,0.4)" }}>...</span>
            )}
            {searchOpen && searchResults.length > 0 && (
              <div style={{ position:"absolute", top:"calc(100% + 8px)", left:0, right:0, background:"#1a1d24", border:"1px solid rgba(255,255,255,0.10)", borderRadius:14, boxShadow:"0 16px 48px rgba(0,0,0,0.6)", zIndex:1000, overflow:"hidden" }}>
                {searchResults.map((v) => {
                  const mainPhoto = v.photos?.find(p => p.is_main) ?? v.photos?.[0];
                  const preco = v.valor_anunciado ? `R$ ${new Intl.NumberFormat("pt-BR").format(v.valor_anunciado)}` : "Consulte";
                  return (
                    <Link
                      key={v.id}
                      href={`/veiculo/${vehicleSlug(v)}`}
                      onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", textDecoration:"none", transition:"background 150ms", borderBottom:"1px solid rgba(255,255,255,0.05)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ width:44, height:36, borderRadius:8, overflow:"hidden", flexShrink:0, background:"#0d0f14" }}>
                        {mainPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mainPhoto.url} alt={v.modelo} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        ) : (
                          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Search size={14} color="rgba(255,255,255,0.2)" />
                          </div>
                        )}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:700, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{v.marca} {v.modelo} {v.ano}</p>
                        <p style={{ fontSize:11, color:"rgba(255,255,255,0.45)" }}>{preco} &middot; {v.cambio}</p>
                      </div>
                    </Link>
                  );
                })}
                <Link
                  href={`/estoque?q=${encodeURIComponent(searchQuery)}`}
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                  style={{ display:"block", padding:"10px 14px", textAlign:"center", fontSize:12, fontWeight:700, color:"var(--s-orange)", textDecoration:"none", background:"rgba(244,121,32,0.05)" }}
                >
                  Ver todos os resultados para "{searchQuery}" &rarr;
                </Link>
              </div>
            )}
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
              <a href={s.facebook || "#"} className="s-social-btn" aria-label="Facebook" target="_blank" rel="noopener">
                <img src="/logos/facebook.svg" alt="Facebook" width={50} height={50} />
              </a>
              <a href={s.instagram || "#"} className="s-social-btn" aria-label="Instagram" target="_blank" rel="noopener">
                <img src="/logos/instagram.svg" alt="Instagram" width={50} height={50} />
              </a>
              <a href={s.youtube || "#"} className="s-social-btn" aria-label="YouTube" target="_blank" rel="noopener">
                <img src="/logos/youtube.svg" alt="YouTube" width={50} height={50} />
              </a>
              <a href={wppLink} className="s-social-btn" aria-label="WhatsApp" target="_blank" rel="noopener">
                <img src="/logos/whatsapp.svg" alt="WhatsApp" width={50} height={50} />
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
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
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

