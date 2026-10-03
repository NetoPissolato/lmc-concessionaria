"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Award, Car, Bike } from "lucide-react";
import type { PublicVehicle } from "@/lib/publicApi";
import { vehicleSlug } from "@/lib/vehicleSlug";
import { preco, km } from "@/lib/site/format";
import { CAMBIO, COMBUSTIVEL, CARROCERIA, CATEGORIA_MOTO, rotulo } from "@/lib/site/labels";
import { fotoCapa } from "@/components/site/VehicleCard";

type Linha = { rotulo: string; valor: (v: PublicVehicle) => string; melhor?: (vs: PublicVehicle[]) => string | null; motivo?: string };

const menor = (f: (v: PublicVehicle) => number | null) => (vs: PublicVehicle[]) => {
  const validos = vs.filter((v) => f(v) != null);
  if (validos.length < 2) return null;
  return validos.reduce((a, b) => (f(b)! < f(a)! ? b : a)).id;
};
const maior = (f: (v: PublicVehicle) => number) => (vs: PublicVehicle[]) =>
  vs.length < 2 ? null : vs.reduce((a, b) => (f(b) > f(a) ? b : a)).id;

const LINHAS: Linha[] = [
  { rotulo: "Preço", valor: (v) => preco(v.valor_anunciado) ?? "Sob consulta", melhor: menor((v) => v.valor_anunciado), motivo: "Menor preço" },
  { rotulo: "Ano", valor: (v) => String(v.ano), melhor: maior((v) => v.ano), motivo: "Mais novo" },
  { rotulo: "Quilometragem", valor: (v) => km(v.quilometragem), melhor: menor((v) => v.quilometragem), motivo: "Menos rodado" },
  { rotulo: "Câmbio", valor: (v) => (v.tipo === "moto" ? "-" : rotulo(CAMBIO, v.cambio)) },
  { rotulo: "Combustível", valor: (v) => rotulo(COMBUSTIVEL, v.combustivel) },
  { rotulo: "Cor", valor: (v) => v.cor || "-" },
  { rotulo: "Categoria", valor: (v) => (v.tipo === "moto" ? (v.tipo_moto ? rotulo(CATEGORIA_MOTO, v.tipo_moto) : "Moto") : (v.carroceria ? rotulo(CARROCERIA, v.carroceria) : "-")) },
  { rotulo: "Portas / cilindrada", valor: (v) => (v.tipo === "moto" ? (v.cilindrada ? `${v.cilindrada} cc` : "-") : (v.portas ? `${v.portas} portas` : "-")) },
  { rotulo: "Opcionais", valor: (v) => (v.opcionais.length ? `${v.opcionais.length} itens` : "-") },
];

export default function ComparadorCliente({ veiculos }: { veiculos: PublicVehicle[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const ids = useMemo(() => (params.get("ids") ?? "").split(",").filter(Boolean).slice(0, 3), [params]);
  const escolhidos = ids.map((id) => veiculos.find((v) => v.id === id)).filter(Boolean) as PublicVehicle[];

  function trocar(posicao: number, id: string) {
    const novos = [...ids];
    if (id) novos[posicao] = id; else novos.splice(posicao, 1);
    const limpos = [...new Set(novos.filter(Boolean))];
    router.replace(limpos.length ? `/comparador?ids=${limpos.join(",")}` : "/comparador", { scroll: false });
  }

  const opcoes = [...veiculos].sort((a, b) => `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`, "pt-BR"));

  return (
    <>
      <div className="c-escolha">
        {[0, 1, 2].map((n) => (
          <div key={n} className="s-field">
            <label className="s-label" htmlFor={`comp-${n}`}>Veículo {n + 1}</label>
            <select id={`comp-${n}`} className="s-select" value={ids[n] ?? ""} onChange={(e) => trocar(n, e.target.value)} disabled={n > ids.length}>
              <option value="">{n === 0 ? "Escolha um veículo" : "Adicionar outro (opcional)"}</option>
              {opcoes.map((v) => (
                <option key={v.id} value={v.id} disabled={ids.includes(v.id) && ids[n] !== v.id}>
                  {v.marca} {v.modelo} {v.ano}{v.valor_anunciado ? ` · ${preco(v.valor_anunciado)}` : ""}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {escolhidos.length === 0 ? (
        <div className="s-empty">
          <h2 className="s-h3">Escolha até 3 veículos para comparar</h2>
          <p className="s-muted">Ou marque "Comparar" nos cards do estoque.</p>
          <Link href="/estoque" className="s-btn s-btn--primary">Ir para o estoque</Link>
        </div>
      ) : (
        <div className="c-tabela-wrap">
          <table className="c-tabela">
            <caption className="s-sr-only">Comparação lado a lado</caption>
            <thead>
              <tr>
                <td />
                {escolhidos.map((v) => {
                  const foto = fotoCapa(v);
                  return (
                    <th key={v.id} scope="col">
                      <div className="c-foto">
                        {foto ? <img src={foto} alt="" loading="lazy" /> : <div className="s-nophoto">{v.tipo === "moto" ? <Bike size={28} /> : <Car size={28} />}</div>}
                      </div>
                      <Link href={`/veiculo/${vehicleSlug(v)}`} className="c-nome">{v.marca} {v.modelo}</Link>
                      {v.versao && <p className="s-small s-muted">{v.versao}</p>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {LINHAS.map((l) => {
                const destaque = l.melhor?.(escolhidos) ?? null;
                return (
                  <tr key={l.rotulo}>
                    <th scope="row">{l.rotulo}</th>
                    {escolhidos.map((v) => (
                      <td key={v.id}>
                        <span className={l.rotulo === "Preço" ? "c-preco" : undefined}>{l.valor(v)}</span>
                        {destaque === v.id && <span className="c-melhor"><Award size={13} aria-hidden="true" />{l.motivo}</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <th scope="row" />
                {escolhidos.map((v) => (
                  <td key={v.id}><Link href={`/veiculo/${vehicleSlug(v)}`} className="s-btn s-btn--primary s-btn--sm">Ver anúncio</Link></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
