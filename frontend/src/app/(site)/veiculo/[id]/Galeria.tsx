"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X, Car, Bike } from "lucide-react";
import type { PublicPhoto } from "@/lib/publicApi";

/**
 * Galeria com deslizar nativo (scroll-snap): no celular o dedo funciona sem
 * biblioteca; no computador há setas, miniaturas e teclado. Clique abre tela cheia.
 */
export default function Galeria({ fotos, nome, tipo }: { fotos: PublicPhoto[]; nome: string; tipo: "carro" | "moto" }) {
  const [atual, setAtual] = useState(0);
  const [cheia, setCheia] = useState(false);
  const trilho = useRef<HTMLDivElement>(null);
  const trilhoCheio = useRef<HTMLDivElement>(null);

  const irPara = useCallback((n: number, el: HTMLDivElement | null = trilho.current, suave = true) => {
    if (!el || !fotos.length) return;
    const i = (n + fotos.length) % fotos.length;
    el.scrollTo({ left: i * el.clientWidth, behavior: suave ? "smooth" : "auto" });
    setAtual(i);
  }, [fotos.length]);

  // Índice acompanha o deslizar do dedo
  const aoRolar = (el: HTMLDivElement) => {
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (i !== atual) setAtual(i);
  };

  useEffect(() => {
    if (!cheia) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => irPara(atual, trilhoCheio.current, false));
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCheia(false);
      if (e.key === "ArrowRight") irPara(atual + 1, trilhoCheio.current);
      if (e.key === "ArrowLeft") irPara(atual - 1, trilhoCheio.current);
    };
    window.addEventListener("keydown", tecla);
    return () => { document.body.style.overflow = anterior; window.removeEventListener("keydown", tecla); };
  }, [cheia, atual, irPara]);

  if (!fotos.length) {
    return (
      <div className="v-gal__palco" style={{ aspectRatio: "4 / 3" }}>
        <div className="s-nophoto">
          {tipo === "moto" ? <Bike size={48} strokeWidth={1.4} /> : <Car size={48} strokeWidth={1.4} />}
          Fotos em breve
        </div>
      </div>
    );
  }

  return (
    <div className="v-gal">
      <div className="v-gal__palco" aria-roledescription="carrossel" aria-label={`Fotos do ${nome}`}>
        <div ref={trilho} className="v-gal__trilho" onScroll={(e) => aoRolar(e.currentTarget)}>
          {fotos.map((f, n) => (
            <button key={f.id} type="button" onClick={() => { setAtual(n); setCheia(true); }} aria-label={`Ampliar foto ${n + 1} de ${fotos.length}`}>
              <img
                src={f.url}
                alt={`${nome}, foto ${n + 1}`}
                width={1600}
                height={1200}
                loading={n === 0 ? "eager" : "lazy"}
                fetchPriority={n === 0 ? "high" : "auto"}
                decoding="async"
              />
            </button>
          ))}
        </div>
        {fotos.length > 1 && (
          <>
            <button type="button" className="v-gal__seta v-gal__seta--esq" onClick={() => irPara(atual - 1)} aria-label="Foto anterior"><ChevronLeft size={22} /></button>
            <button type="button" className="v-gal__seta v-gal__seta--dir" onClick={() => irPara(atual + 1)} aria-label="Próxima foto"><ChevronRight size={22} /></button>
            <span className="s-badge v-gal__contador" aria-live="polite">{atual + 1} / {fotos.length}</span>
          </>
        )}
        <button type="button" className="s-badge v-gal__ampliar" style={{ border: 0, cursor: "pointer" }} onClick={() => setCheia(true)}>
          <Expand size={13} aria-hidden="true" /> Tela cheia
        </button>
      </div>

      {fotos.length > 1 && (
        <div className="v-gal__miniaturas" role="group" aria-label="Miniaturas">
          {fotos.map((f, n) => (
            <button key={f.id} type="button" aria-current={n === atual} aria-label={`Ver foto ${n + 1}`} onClick={() => irPara(n)}>
              <img src={f.thumb_url || f.url} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}

      {cheia && (
        <div className="v-lightbox" role="dialog" aria-modal="true" aria-label={`Fotos do ${nome} em tela cheia`}>
          <div className="v-lightbox__topo">
            <span className="s-num">{atual + 1} de {fotos.length}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {fotos.length > 1 && (
                <>
                  <button type="button" className="v-gal__seta" style={{ position: "static", transform: "none", display: "grid" }} onClick={() => irPara(atual - 1, trilhoCheio.current)} aria-label="Foto anterior"><ChevronLeft size={22} /></button>
                  <button type="button" className="v-gal__seta" style={{ position: "static", transform: "none", display: "grid" }} onClick={() => irPara(atual + 1, trilhoCheio.current)} aria-label="Próxima foto"><ChevronRight size={22} /></button>
                </>
              )}
              <button type="button" className="v-gal__seta" style={{ position: "static", transform: "none", display: "grid" }} onClick={() => setCheia(false)} aria-label="Fechar" autoFocus><X size={22} /></button>
            </div>
          </div>
          <div ref={trilhoCheio} className="v-lightbox__trilho" onScroll={(e) => aoRolar(e.currentTarget)}>
            {fotos.map((f, n) => (
              <figure key={f.id}>
                <img src={f.url} alt={`${nome}, foto ${n + 1}`} loading={Math.abs(n - atual) <= 1 ? "eager" : "lazy"} />
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
