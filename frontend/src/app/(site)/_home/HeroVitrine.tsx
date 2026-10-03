"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

export type SlideVitrine = {
  id: string;
  href: string;
  foto: string;
  nome: string;
  detalhe: string;
  preco: string | null;
};

/**
 * Foto real dos veículos em destaque. Sem troca automática: o cliente decide quando
 * passar (carrossel que se mexe sozinho atrapalha quem está lendo).
 */
export default function HeroVitrine({ slides }: { slides: SlideVitrine[] }) {
  const [i, setI] = useState(0);
  const atual = slides[i];
  const ir = (d: number) => setI((x) => (x + d + slides.length) % slides.length);

  return (
    <div className="h-vitrine" aria-roledescription="carrossel" aria-label="Veículos em destaque">
      <div className="h-vitrine__foto">
        {/* A primeira foto é a maior da página: carrega com prioridade */}
        <img key={atual.id} src={atual.foto} alt={atual.nome} width={1600} height={1200} fetchPriority={i === 0 ? "high" : "auto"} />
        {slides.length > 1 && (
          <div className="h-vitrine__nav">
            <button type="button" onClick={() => ir(-1)} aria-label="Destaque anterior"><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => ir(1)} aria-label="Próximo destaque"><ChevronRight size={20} /></button>
          </div>
        )}
        <div className="h-vitrine__info" aria-live="polite">
          <div className="h-vitrine__nome">
            <h2>{atual.nome}</h2>
            <p>{atual.detalhe}</p>
          </div>
          <div className="h-vitrine__acao">
            {atual.preco && <span className="h-vitrine__preco">{atual.preco}</span>}
            <Link href={atual.href} className="s-btn s-btn--primary">
              Ver detalhes <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      {slides.length > 1 && (
        <div className="h-vitrine__dots">
          {slides.map((s, n) => (
            <button key={s.id} type="button" aria-label={`Destaque ${n + 1} de ${slides.length}`} aria-current={n === i} onClick={() => setI(n)} />
          ))}
        </div>
      )}
    </div>
  );
}
