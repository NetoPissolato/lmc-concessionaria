"use client";

import { useState } from "react";
import Link from "next/link";
import { Car, Bike } from "lucide-react";

export type CardModelo = {
  chave: string;
  marca: string;
  modelo: string;
  categoria: string | null;
  categoriaRotulo: string | null;
  tipo: string;
  foto: string | null;
  total: number;
  aPartirDe: string | null;
};

/** Mantém a seção que o dono montou (mais vistos + escolhidos no painel), agora legível no tema claro. */
export default function ModelosBuscados({ modelos }: { modelos: CardModelo[] }) {
  const categorias = [...new Map(
    modelos.filter((m) => m.categoria).map((m) => [m.categoria!, m.categoriaRotulo ?? m.categoria!]),
  ).entries()];
  const [aba, setAba] = useState<string>("todos");
  const visiveis = aba === "todos" ? modelos : modelos.filter((m) => m.categoria === aba);

  return (
    <>
      {categorias.length > 1 && (
        <div className="h-modelos__tabs" role="group" aria-label="Filtrar por categoria">
          <button type="button" className="s-chip" aria-pressed={aba === "todos"} onClick={() => setAba("todos")}>Todos</button>
          {categorias.map(([valor, rotulo]) => (
            <button key={valor} type="button" className="s-chip" aria-pressed={aba === valor} onClick={() => setAba(valor)}>
              {rotulo}
            </button>
          ))}
        </div>
      )}
      <div className="s-rail s-rail--grid-desk">
        {visiveis.slice(0, 8).map((m) => {
          const q = new URLSearchParams({ marca: m.marca, modelo: m.modelo });
          return (
            <Link key={m.chave} href={`/estoque?${q.toString()}`} className="h-modelo">
              <div className="h-modelo__foto">
                {m.foto ? (
                  <img src={m.foto} alt={`${m.marca} ${m.modelo}`} width={640} height={400} loading="lazy" decoding="async" />
                ) : (
                  <div className="s-nophoto">{m.tipo === "moto" ? <Bike size={32} strokeWidth={1.5} /> : <Car size={32} strokeWidth={1.5} />}</div>
                )}
              </div>
              <div className="h-modelo__txt">
                <strong>{m.marca} {m.modelo}</strong>
                <span>
                  {m.total} {m.total === 1 ? "disponível" : "disponíveis"}
                  {m.aPartirDe && <> · a partir de <b>{m.aPartirDe}</b></>}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
