"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, ArrowRight } from "lucide-react";
import Logo from "@/components/site/Logo";
import WhatsAppIcon from "@/components/site/WhatsAppIcon";
import { waLink, telLink } from "@/lib/site/whatsapp";

const LINKS = [
  { href: "/estoque", label: "Estoque" },
  { href: "/estoque?tipo=carro", label: "Carros" },
  { href: "/estoque?tipo=moto", label: "Motos" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

export default function Header({ whatsapp, telefone, nomeLoja }: { whatsapp: string | null; telefone: string | null; nomeLoja: string }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const wa = waLink(whatsapp, `Olá! Vim pelo site da ${nomeLoja}.`);
  const tel = telLink(telefone);

  // Fecha o menu ao trocar de página
  useEffect(() => { setAberto(false); }, [pathname]);

  // Menu aberto: trava a rolagem do fundo e fecha com Esc
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", onKey);
      botaoRef.current?.focus();
    };
  }, [aberto]);

  const atual = (href: string) => (href === "/estoque" ? pathname === "/estoque" : pathname === href) ? "page" : undefined;

  return (
    <header className="s-header" data-theme="dark">
      <div className="s-container s-header__inner">
        <Link href="/home" className="s-header__logo" aria-label={`${nomeLoja}, página inicial`}>
          {/* Só o símbolo: em 30px de altura o "VEÍCULOS" ficaria ilegível (aparece no rodapé) */}
          <Logo tom="escuro" comTexto={false} />
        </Link>

        <nav className="s-nav" aria-label="Principal">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} aria-current={l.label === "Estoque" ? atual("/estoque") : l.href.includes("?") ? undefined : atual(l.href)}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="s-header__actions">
          {tel && telefone && (
            <a href={tel} className="s-header__phone">
              <Phone size={16} aria-hidden="true" /> {telefone}
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="s-btn s-btn--wa s-btn--sm" aria-label="Falar no WhatsApp">
              <WhatsAppIcon size={18} />
              <span className="s-header__wa-text">WhatsApp</span>
            </a>
          )}
          <button
            ref={botaoRef}
            type="button"
            className="s-btn s-btn--ghost s-btn--icon s-menu-btn"
            aria-label="Abrir menu"
            aria-expanded={aberto}
            aria-controls="menu-celular"
            onClick={() => setAberto(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {aberto && (
        <div id="menu-celular" className="s-sheet" role="dialog" aria-modal="true" aria-label="Menu" data-theme="dark">
          <div className="s-sheet__top">
            <Link href="/home" className="s-header__logo" onClick={() => setAberto(false)} aria-label={nomeLoja}>
              <Logo tom="escuro" comTexto={false} />
            </Link>
            <button type="button" className="s-btn s-btn--ghost s-btn--icon" aria-label="Fechar menu" onClick={() => setAberto(false)} autoFocus>
              <X size={22} />
            </button>
          </div>
          <nav aria-label="Principal">
            <Link href="/home">Início <ArrowRight size={20} aria-hidden="true" /></Link>
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href}>{l.label} <ArrowRight size={20} aria-hidden="true" /></Link>
            ))}
          </nav>
          <div className="s-sheet__foot">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="s-btn s-btn--wa s-btn--lg s-btn--block">
                <WhatsAppIcon size={20} /> Falar no WhatsApp
              </a>
            )}
            {tel && (
              <a href={tel} className="s-btn s-btn--secondary s-btn--lg s-btn--block">
                <Phone size={18} aria-hidden="true" /> Ligar para a loja
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
