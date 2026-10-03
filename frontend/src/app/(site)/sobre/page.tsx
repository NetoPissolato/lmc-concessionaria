import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye, Gem, ShieldCheck, Handshake, Star } from "lucide-react";
import { getPublicSettings, getPublicTeam, getPublicReviews, getPublicStats, getAllPublicVehicles } from "@/lib/publicApi";
import { fotoCapa } from "@/components/site/VehicleCard";
import AvaliarLoja from "./AvaliarLoja";
import "../_home/home.css";
import "../institucional.css";

export const metadata: Metadata = {
  title: "Sobre a loja",
  description: "Conheça a LMC Veículos: nossa história, como trabalhamos, a equipe e o que os clientes dizem.",
  alternates: { canonical: "/sobre" },
};

export const dynamic = "force-dynamic";

const VALORES = [
  { icon: Eye, titulo: "Transparência", texto: "Negociação honesta, sem letras miúdas. O que você vê é o que você leva." },
  { icon: Gem, titulo: "Qualidade", texto: "Só entra no estoque o veículo que a gente entregaria para a própria família." },
  { icon: ShieldCheck, titulo: "Segurança", texto: "Documentação verificada, histórico conferido e vistoria antes da venda." },
  { icon: Handshake, titulo: "Relacionamento", texto: "Queremos ser a loja que você indica, não só a de uma venda." },
];

function iniciais(nome: string) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default async function SobrePage() {
  const [s, equipe, reviews, stats, { veiculos }] = await Promise.all([
    getPublicSettings(), getPublicTeam(), getPublicReviews(6), getPublicStats(), getAllPublicVehicles(),
  ]);
  const foto = veiculos.filter((v) => v.destaque).concat(veiculos).map((v) => fotoCapa(v, true)).find(Boolean);

  const numeros = [
    s.stat_anos ? { valor: `${s.stat_anos}`, rotulo: s.stat_anos === 1 ? "ano de mercado" : "anos de mercado" } : null,
    s.stat_clientes ? { valor: `${s.stat_clientes.toLocaleString("pt-BR")}+`, rotulo: "clientes atendidos" } : null,
    stats.total_veiculos ? { valor: `${stats.total_veiculos}`, rotulo: "veículos no estoque hoje" } : null,
    stats.avaliacao_media && stats.total_avaliacoes ? { valor: stats.avaliacao_media.toLocaleString("pt-BR", { minimumFractionDigits: 1 }), rotulo: `de nota em ${stats.total_avaliacoes} avaliações` } : null,
  ].filter(Boolean) as { valor: string; rotulo: string }[];

  return (
    <>
      <section className="i-topo" data-theme="dark">
        <div className="s-container so-historia">
          <div className="so-historia__texto">
            <h1 className="s-display so-titulo">Transparência e qualidade em cada negociação</h1>
            <p>
              A {s.nome_loja} nasceu da paixão por automóveis e do compromisso com a honestidade. Desde a fundação,
              a missão é a mesma: uma compra tranquila, com tudo explicado e nada escondido.
            </p>
            <p>
              Cada veículo do estoque passa por vistoria antes da venda, tem procedência verificada e documentação em dia.
              Porque um negócio justo é bom para todos.
            </p>
            <div><Link href="/estoque" className="s-btn s-btn--primary s-btn--lg">Ver o estoque <ArrowRight size={18} aria-hidden="true" /></Link></div>
          </div>
          {foto && <div className="so-foto"><img src={foto} alt="" /></div>}
        </div>
      </section>

      {numeros.length > 0 && (
        <section className="h-confianca" data-theme="dark" aria-label="Números da loja">
          <div className="s-container">
            <ul className="so-numeros">
              {numeros.map((n) => <li key={n.rotulo}><strong>{n.valor}</strong><span>{n.rotulo}</span></li>)}
            </ul>
          </div>
        </section>
      )}

      <section className="s-section" data-theme="light" aria-labelledby="valores-titulo">
        <div className="s-container">
          <div className="s-head"><h2 id="valores-titulo" className="s-h2">Como a gente trabalha</h2></div>
          <ul className="so-valores">
            {VALORES.map(({ icon: Icone, titulo, texto }) => (
              <li key={titulo}><Icone size={24} aria-hidden="true" /><strong>{titulo}</strong><p>{texto}</p></li>
            ))}
          </ul>
        </div>
      </section>

      {equipe.length > 0 && (
        <section className="s-section s-section--flush-top" data-theme="light" aria-labelledby="equipe-titulo">
          <div className="s-container">
            <div className="s-head"><h2 id="equipe-titulo" className="s-h2">Quem vai te atender</h2></div>
            <div className="so-equipe">
              {equipe.map((p) => (
                <div key={p.id} className="so-pessoa">
                  <div className="so-pessoa__foto">
                    {p.foto ? <img src={p.foto} alt={p.nome} loading="lazy" /> : <span aria-hidden="true">{iniciais(p.nome)}</span>}
                  </div>
                  <div><strong>{p.nome}</strong><small>{p.cargo}</small></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="s-section s-section--flush-top" data-theme="light" aria-labelledby="avaliar-titulo" id="avaliar">
        <div className="s-container so-avaliar">
          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <h2 id="avaliar-titulo" className="s-h2">O que os clientes dizem</h2>
            {reviews.length === 0 && <p className="s-muted">Ainda não há avaliações publicadas. Seja o primeiro.</p>}
            {reviews.slice(0, 3).map((r) => (
              <figure key={r.id} className="h-depo">
                <span className="h-estrelas" aria-label={`Nota ${r.nota} de 5`}>
                  {Array.from({ length: 5 }, (_, n) => <Star key={n} size={15} fill={n < r.nota ? "currentColor" : "none"} aria-hidden="true" />)}
                </span>
                <blockquote>“{r.texto}”</blockquote>
                <figcaption><b>{r.nome}</b>{r.cidade ? `, ${r.cidade}` : ""}</figcaption>
              </figure>
            ))}
          </div>
          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <h3 className="s-h3">Comprou com a gente? Conte como foi</h3>
            <AvaliarLoja />
          </div>
        </div>
      </section>
    </>
  );
}
