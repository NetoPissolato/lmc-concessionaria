"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Car, Bike } from "lucide-react";

/** Índice enxuto do estoque (só o que a busca precisa), montado no servidor. */
export type ItemBusca = { tipo: "carro" | "moto"; marca: string; modelo: string; preco: number | null };

const FAIXAS = [30_000, 50_000, 80_000, 120_000, 180_000, 250_000];
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function HeroBusca({ itens }: { itens: ItemBusca[] }) {
  const router = useRouter();
  const totais = useMemo(() => ({
    carro: itens.filter((i) => i.tipo === "carro").length,
    moto: itens.filter((i) => i.tipo === "moto").length,
  }), [itens]);
  const [tipo, setTipo] = useState<"carro" | "moto">(totais.carro === 0 && totais.moto > 0 ? "moto" : "carro");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [precoMax, setPrecoMax] = useState("");

  const doTipo = useMemo(() => itens.filter((i) => i.tipo === tipo), [itens, tipo]);
  const marcas = useMemo(() => [...new Set(doTipo.map((i) => i.marca))].sort((a, b) => a.localeCompare(b, "pt-BR")), [doTipo]);
  const modelos = useMemo(
    () => [...new Set(doTipo.filter((i) => !marca || i.marca === marca).map((i) => i.modelo))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [doTipo, marca],
  );
  const resultado = useMemo(() => doTipo.filter((i) =>
    (!marca || i.marca === marca) &&
    (!modelo || i.modelo === modelo) &&
    (!precoMax || (i.preco != null && i.preco <= Number(precoMax))),
  ).length, [doTipo, marca, modelo, precoMax]);

  function trocarTipo(t: "carro" | "moto") {
    setTipo(t); setMarca(""); setModelo("");
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({ tipo });
    if (marca) q.set("marca", marca);
    if (modelo) q.set("modelo", modelo);
    if (precoMax) q.set("preco_max", precoMax);
    router.push(`/estoque?${q.toString()}`);
  }

  return (
    <form className="h-busca" onSubmit={buscar} role="search" aria-label="Buscar no estoque">
      <div className="h-busca__tabs" role="group" aria-label="Tipo de veículo">
        <button type="button" aria-pressed={tipo === "carro"} onClick={() => trocarTipo("carro")}>
          <Car size={17} aria-hidden="true" /> Carros <small>{totais.carro}</small>
        </button>
        <button type="button" aria-pressed={tipo === "moto"} onClick={() => trocarTipo("moto")}>
          <Bike size={17} aria-hidden="true" /> Motos <small>{totais.moto}</small>
        </button>
      </div>

      <div className="h-busca__campos">
        <div className="s-field">
          <label className="s-label" htmlFor="busca-marca">Marca</label>
          <select id="busca-marca" className="s-select" value={marca} onChange={(e) => { setMarca(e.target.value); setModelo(""); }}>
            <option value="">Todas</option>
            {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="s-field">
          <label className="s-label" htmlFor="busca-modelo">Modelo</label>
          <select id="busca-modelo" className="s-select" value={modelo} onChange={(e) => setModelo(e.target.value)} disabled={modelos.length === 0}>
            <option value="">Todos</option>
            {modelos.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="s-field">
          <label className="s-label" htmlFor="busca-preco">Preço até</label>
          <select id="busca-preco" className="s-select" value={precoMax} onChange={(e) => setPrecoMax(e.target.value)}>
            <option value="">Qualquer valor</option>
            {FAIXAS.map((f) => <option key={f} value={f}>{brl(f)}</option>)}
          </select>
        </div>
      </div>

      <button type="submit" className="s-btn s-btn--primary s-btn--lg s-btn--block" disabled={resultado === 0}>
        <Search size={18} aria-hidden="true" />
        {resultado === 0 ? "Nenhum veículo com esses filtros" : `Ver ${resultado} ${resultado === 1 ? "veículo" : "veículos"}`}
      </button>
    </form>
  );
}
