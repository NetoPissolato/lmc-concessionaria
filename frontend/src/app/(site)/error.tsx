"use client";

import { RotateCcw } from "lucide-react";

export default function ErroSite({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="s-state" data-theme="light">
      <div className="s-state__box">
        <span className="s-state__icon"><RotateCcw size={26} aria-hidden="true" /></span>
        <h1 className="s-h2">Algo deu errado ao abrir esta página</h1>
        <p className="s-lead">Foi do nosso lado. Tente de novo em alguns segundos.</p>
        <button type="button" className="s-btn s-btn--primary s-btn--lg" onClick={reset}>Tentar de novo</button>
      </div>
    </section>
  );
}
