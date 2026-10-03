import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NaoEncontrado() {
  return (
    <section className="s-state" data-theme="light">
      <div className="s-state__box">
        <span className="s-state__icon"><SearchX size={26} aria-hidden="true" /></span>
        <h1 className="s-h2">Esta página não existe mais</h1>
        <p className="s-lead">Se era um veículo, ele provavelmente já foi vendido. Veja o que chegou de novo.</p>
        <Link href="/estoque" className="s-btn s-btn--primary s-btn--lg">Ver o estoque</Link>
      </div>
    </section>
  );
}
