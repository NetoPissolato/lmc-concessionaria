"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, SlidersHorizontal, X, RotateCcw } from "lucide-react";
import type { PublicVehicle } from "@/lib/publicApi";
import VehicleCard from "@/components/site/VehicleCard";
import { CAMBIO, COMBUSTIVEL, CARROCERIA, CATEGORIA_MOTO, rotulo } from "@/lib/site/labels";
import AviseMe from "./AviseMe";

const POR_PAGINA = 24;
const PRECOS = [30_000, 50_000, 70_000, 100_000, 150_000, 200_000, 300_000];
const KMS = [10_000, 30_000, 50_000, 80_000, 120_000];
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const ORDENS = {
  recentes: "Mais recentes",
  menor_preco: "Menor preço",
  maior_preco: "Maior preço",
  menor_km: "Menor quilometragem",
  mais_novos: "Mais novos",
} as const;
type Ordem = keyof typeof ORDENS;

/** Chaves de filtro que vivem na URL (o link do filtro pode ser compartilhado no WhatsApp). */
const CHAVES = ["q", "tipo", "marca", "modelo", "carroceria", "categoria", "cambio", "combustivel", "preco_min", "preco_max", "ano_min", "km_max", "ordem"] as const;
type Filtros = Partial<Record<(typeof CHAVES)[number], string>>;

function lerFiltros(params: URLSearchParams): Filtros {
  const f: Filtros = {};
  for (const k of CHAVES) {
    const v = params.get(k);
    if (v) f[k] = v;
  }
  return f;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function aplicar(vs: PublicVehicle[], f: Filtros): PublicVehicle[] {
  const termo = f.q ? norm(f.q) : "";
  const r = vs.filter((v) =>
    (!f.tipo || v.tipo === f.tipo) &&
    (!f.marca || norm(v.marca) === norm(f.marca)) &&
    (!f.modelo || norm(v.modelo) === norm(f.modelo)) &&
    (!f.carroceria || v.carroceria === f.carroceria) &&
    (!f.categoria || v.tipo_moto === f.categoria) &&
    (!f.cambio || v.cambio === f.cambio) &&
    (!f.combustivel || v.combustivel === f.combustivel) &&
    (!f.preco_min || (v.valor_anunciado ?? 0) >= Number(f.preco_min)) &&
    (!f.preco_max || (v.valor_anunciado != null && v.valor_anunciado <= Number(f.preco_max))) &&
    (!f.ano_min || v.ano >= Number(f.ano_min)) &&
    (!f.km_max || v.quilometragem <= Number(f.km_max)) &&
    (!termo || norm(`${v.marca} ${v.modelo} ${v.versao ?? ""} ${v.ano}`).includes(termo)),
  );
  const ordem = (f.ordem as Ordem) || "recentes";
  const preco = (v: PublicVehicle) => v.valor_anunciado ?? Number.POSITIVE_INFINITY;
  return r.sort((a, b) => {
    switch (ordem) {
      case "menor_preco": return preco(a) - preco(b);
      case "maior_preco": return (b.valor_anunciado ?? -1) - (a.valor_anunciado ?? -1);
      case "menor_km": return a.quilometragem - b.quilometragem;
      case "mais_novos": return b.ano - a.ano;
      default: return Date.parse(b.created_at) - Date.parse(a.created_at);
    }
  });
}

/** Rótulo legível de cada filtro ativo (vira um chip removível). */
function rotuloFiltro(k: string, v: string): string {
  switch (k) {
    case "q": return `"${v}"`;
    case "tipo": return v === "moto" ? "Motos" : "Carros";
    case "carroceria": return rotulo(CARROCERIA, v);
    case "categoria": return rotulo(CATEGORIA_MOTO, v);
    case "cambio": return rotulo(CAMBIO, v);
    case "combustivel": return rotulo(COMBUSTIVEL, v);
    case "preco_min": return `A partir de ${brl(Number(v))}`;
    case "preco_max": return `Até ${brl(Number(v))}`;
    case "ano_min": return `${v} ou mais novo`;
    case "km_max": return `Até ${Number(v).toLocaleString("pt-BR")} km`;
    default: return v;
  }
}

export default function EstoqueCliente({
  veiculos,
  whatsapp,
  agora,
  erro,
}: {
  veiculos: PublicVehicle[];
  whatsapp: string | null;
  agora: number;
  erro: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const f = useMemo(() => lerFiltros(new URLSearchParams(params.toString())), [params]);
  const [busca, setBusca] = useState(f.q ?? "");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [folha, setFolha] = useState(false);
  const [comparar, setComparar] = useState<string[]>([]);

  function mudar(novos: Filtros) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(novos)) {
      if (v) q.set(k, v); else q.delete(k);
    }
    setLimite(POR_PAGINA);
    router.replace(`${pathname}${q.size ? `?${q.toString()}` : ""}`, { scroll: false });
  }
  const limpar = () => { setBusca(""); router.replace(pathname, { scroll: false }); };

  // Busca por texto: aplica depois que a pessoa para de digitar
  useEffect(() => {
    const t = setTimeout(() => { if ((f.q ?? "") !== busca.trim()) mudar({ q: busca.trim() }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  useEffect(() => {
    if (!folha) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setFolha(false); };
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = anterior; window.removeEventListener("keydown", esc); };
  }, [folha]);

  const resultado = useMemo(() => aplicar(veiculos, f), [veiculos, f]);

  // Opções disponíveis consideram o tipo escolhido (não oferecer marca de moto filtrando carro)
  const base = useMemo(() => veiculos.filter((v) => !f.tipo || v.tipo === f.tipo), [veiculos, f.tipo]);
  const opcoes = useMemo(() => {
    const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const anos = [...new Set(base.map((v) => v.ano))].sort((a, b) => b - a);
    return {
      marcas: uniq(base.map((v) => v.marca)),
      modelos: uniq(base.filter((v) => !f.marca || norm(v.marca) === norm(f.marca)).map((v) => v.modelo)),
      carrocerias: uniq(base.filter((v) => v.tipo === "carro").map((v) => v.carroceria)),
      categorias: uniq(base.filter((v) => v.tipo === "moto").map((v) => v.tipo_moto)),
      cambios: uniq(base.map((v) => v.cambio)),
      combustiveis: uniq(base.map((v) => v.combustivel)),
      anos,
    };
  }, [base, f.marca]);

  const ativos = Object.entries(f).filter(([k]) => k !== "ordem");
  const qtdAtivos = ativos.filter(([k]) => k !== "q").length;
  const titulo = f.tipo === "moto" ? "Motos" : f.tipo === "carro" ? "Carros" : "Estoque";

  const painel = (sufixo: string) => (
    <>
      <div className="e-grupo">
        <span className="s-label">Tipo</span>
        <div className="e-opcoes" role="group" aria-label="Tipo de veículo">
          {[["", "Todos"], ["carro", "Carros"], ["moto", "Motos"]].map(([v, l]) => (
            <button key={v} type="button" className="s-chip" aria-pressed={(f.tipo ?? "") === v}
              onClick={() => mudar({ tipo: v, marca: "", modelo: "", carroceria: "", categoria: "" })}>{l}</button>
          ))}
        </div>
      </div>
      <div className="e-grupo">
        <label className="s-label" htmlFor={`f-marca${sufixo}`}>Marca</label>
        <select id={`f-marca${sufixo}`} className="s-select" value={f.marca ?? ""} onChange={(e) => mudar({ marca: e.target.value, modelo: "" })}>
          <option value="">Todas</option>
          {opcoes.marcas.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="e-grupo">
        <label className="s-label" htmlFor={`f-modelo${sufixo}`}>Modelo</label>
        <select id={`f-modelo${sufixo}`} className="s-select" value={f.modelo ?? ""} onChange={(e) => mudar({ modelo: e.target.value })} disabled={!opcoes.modelos.length}>
          <option value="">Todos</option>
          {opcoes.modelos.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      {opcoes.carrocerias.length > 1 && f.tipo !== "moto" && (
        <div className="e-grupo">
          <span className="s-label">Carroceria</span>
          <div className="e-opcoes">
            {opcoes.carrocerias.map((c) => (
              <button key={c} type="button" className="s-chip" aria-pressed={f.carroceria === c} onClick={() => mudar({ carroceria: f.carroceria === c ? "" : c })}>{rotulo(CARROCERIA, c)}</button>
            ))}
          </div>
        </div>
      )}
      {opcoes.categorias.length > 1 && f.tipo !== "carro" && (
        <div className="e-grupo">
          <span className="s-label">Estilo da moto</span>
          <div className="e-opcoes">
            {opcoes.categorias.map((c) => (
              <button key={c} type="button" className="s-chip" aria-pressed={f.categoria === c} onClick={() => mudar({ categoria: f.categoria === c ? "" : c })}>{rotulo(CATEGORIA_MOTO, c)}</button>
            ))}
          </div>
        </div>
      )}
      <div className="e-grupo">
        <span className="s-label">Preço</span>
        <div className="e-par">
          <select aria-label="Preço mínimo" className="s-select" value={f.preco_min ?? ""} onChange={(e) => mudar({ preco_min: e.target.value })}>
            <option value="">Mínimo</option>
            {PRECOS.map((p) => <option key={p} value={p}>{brl(p)}</option>)}
          </select>
          <select aria-label="Preço máximo" className="s-select" value={f.preco_max ?? ""} onChange={(e) => mudar({ preco_max: e.target.value })}>
            <option value="">Máximo</option>
            {PRECOS.map((p) => <option key={p} value={p}>{brl(p)}</option>)}
          </select>
        </div>
      </div>
      <div className="e-par">
        <div className="e-grupo">
          <label className="s-label" htmlFor={`f-ano${sufixo}`}>Ano a partir de</label>
          <select id={`f-ano${sufixo}`} className="s-select" value={f.ano_min ?? ""} onChange={(e) => mudar({ ano_min: e.target.value })}>
            <option value="">Todos</option>
            {opcoes.anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="e-grupo">
          <label className="s-label" htmlFor={`f-km${sufixo}`}>Km até</label>
          <select id={`f-km${sufixo}`} className="s-select" value={f.km_max ?? ""} onChange={(e) => mudar({ km_max: e.target.value })}>
            <option value="">Todas</option>
            {KMS.map((k) => <option key={k} value={k}>{k.toLocaleString("pt-BR")} km</option>)}
          </select>
        </div>
      </div>
      {opcoes.cambios.length > 1 && (
        <div className="e-grupo">
          <span className="s-label">Câmbio</span>
          <div className="e-opcoes">
            {opcoes.cambios.map((c) => (
              <button key={c} type="button" className="s-chip" aria-pressed={f.cambio === c} onClick={() => mudar({ cambio: f.cambio === c ? "" : c })}>{rotulo(CAMBIO, c)}</button>
            ))}
          </div>
        </div>
      )}
      {opcoes.combustiveis.length > 1 && (
        <div className="e-grupo">
          <span className="s-label">Combustível</span>
          <div className="e-opcoes">
            {opcoes.combustiveis.map((c) => (
              <button key={c} type="button" className="s-chip" aria-pressed={f.combustivel === c} onClick={() => mudar({ combustivel: f.combustivel === c ? "" : c })}>{rotulo(COMBUSTIVEL, c)}</button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <section className="e-topo" data-theme="dark">
        <div className="s-container">
          <h1 className="s-h1">{titulo}</h1>
          <p className="s-muted">
            {erro ? "Não conseguimos carregar o estoque agora. Atualize a página em instantes." :
              `${base.length} ${base.length === 1 ? "disponível" : "disponíveis"}, com fotos reais e preço à vista.`}
          </p>
        </div>
      </section>

      <section data-theme="light">
        <div className="s-container e-layout">
          <aside className="e-filtros" aria-label="Filtros">
            {painel("")}
            {qtdAtivos > 0 && <button type="button" className="s-btn s-btn--secondary s-btn--sm" onClick={limpar}><RotateCcw size={15} aria-hidden="true" /> Limpar filtros</button>}
          </aside>

          <div>
            <div className="e-barra">
              <div className="e-barra__esq">
                <div className="e-busca">
                  <Search size={18} aria-hidden="true" />
                  <label htmlFor="e-busca" className="s-sr-only">Buscar por marca ou modelo</label>
                  <input id="e-busca" className="s-input" type="search" placeholder="Buscar marca ou modelo" value={busca} onChange={(e) => setBusca(e.target.value)} />
                </div>
                <button type="button" className="s-btn s-btn--secondary e-btn-filtros" onClick={() => setFolha(true)} aria-haspopup="dialog">
                  <SlidersHorizontal size={17} aria-hidden="true" /> Filtros{qtdAtivos ? ` (${qtdAtivos})` : ""}
                </button>
              </div>
              <div className="e-barra__dir">
                <label htmlFor="e-ordem" className="s-sr-only">Ordenar por</label>
                <select id="e-ordem" className="s-select e-ordem" value={f.ordem ?? "recentes"} onChange={(e) => mudar({ ordem: e.target.value === "recentes" ? "" : e.target.value })}>
                  {Object.entries(ORDENS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="e-ativos" aria-live="polite">
              <span className="e-total"><b>{resultado.length}</b> {resultado.length === 1 ? "resultado" : "resultados"}</span>
              {ativos.map(([k, v]) => (
                <button key={k} type="button" className="s-chip" onClick={() => { if (k === "q") setBusca(""); mudar({ [k]: "" }); }} aria-label={`Remover filtro ${rotuloFiltro(k, v!)}`}>
                  {rotuloFiltro(k, v!)} <X size={14} aria-hidden="true" />
                </button>
              ))}
              {ativos.length > 1 && <button type="button" className="s-link" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={limpar}>Limpar tudo</button>}
            </div>

            {resultado.length > 0 ? (
              <>
                <div className="s-vgrid">
                  {resultado.slice(0, limite).map((v, n) => (
                    <VehicleCard
                      key={v.id}
                      v={v}
                      whatsapp={whatsapp}
                      prioridade={n < 3}
                      agora={agora}
                      nivelTitulo={2}
                      comparar={{
                        ativo: comparar.includes(v.id),
                        desabilitado: comparar.length >= 3,
                        onToggle: () => setComparar((c) => c.includes(v.id) ? c.filter((x) => x !== v.id) : [...c, v.id].slice(0, 3)),
                      }}
                    />
                  ))}
                </div>
                {resultado.length > limite && (
                  <div className="e-mais">
                    <button type="button" className="s-btn s-btn--secondary s-btn--lg" onClick={() => setLimite((l) => l + POR_PAGINA)}>
                      Mostrar mais {Math.min(POR_PAGINA, resultado.length - limite)} de {resultado.length - limite}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="s-empty">
                  <h2 className="s-h3">Nenhum veículo com esses filtros agora</h2>
                  <p className="s-muted">Tente tirar algum filtro ou peça para avisarmos quando chegar.</p>
                  {ativos.length > 0 && <button type="button" className="s-btn s-btn--secondary" onClick={limpar}><RotateCcw size={16} aria-hidden="true" /> Limpar filtros</button>}
                </div>
                {!erro && (
                  <AviseMe filtros={{
                    tipo: f.tipo, marca: f.marca, modelo: f.modelo,
                    ano_min: f.ano_min ? Number(f.ano_min) : undefined,
                    preco_max: f.preco_max ? Number(f.preco_max) : undefined,
                  }} />
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {folha && (
        <>
          <div className="e-sheet-fundo" onClick={() => setFolha(false)} aria-hidden="true" />
          <div className="e-sheet" role="dialog" aria-modal="true" aria-label="Filtros" data-theme="light">
            <div className="e-sheet__topo">
              <h2 className="s-h3">Filtros</h2>
              <button type="button" className="s-btn s-btn--ghost s-btn--icon" aria-label="Fechar filtros" onClick={() => setFolha(false)} autoFocus><X size={22} /></button>
            </div>
            <div className="e-sheet__corpo">{painel("-m")}</div>
            <div className="e-sheet__rodape">
              <button type="button" className="s-btn s-btn--secondary s-btn--lg" onClick={limpar} disabled={!qtdAtivos}>Limpar</button>
              <button type="button" className="s-btn s-btn--primary s-btn--lg" onClick={() => setFolha(false)}>
                Ver {resultado.length} {resultado.length === 1 ? "veículo" : "veículos"}
              </button>
            </div>
          </div>
        </>
      )}

      {comparar.length > 0 && (
        <div className="e-comparar" role="region" aria-label="Comparação" data-theme="light">
          <p>{comparar.length} de 3 para comparar</p>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="s-btn s-btn--ghost s-btn--sm" onClick={() => setComparar([])}>Limpar</button>
            <button type="button" className="s-btn s-btn--primary s-btn--sm" disabled={comparar.length < 2}
              onClick={() => router.push(`/comparador?ids=${comparar.join(",")}`)}>
              Comparar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
