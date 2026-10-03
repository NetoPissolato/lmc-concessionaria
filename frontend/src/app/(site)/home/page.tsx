import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Star, ShieldCheck, FileCheck2, Landmark, Repeat, CarFront, Car } from "lucide-react";
import {
  getAllPublicVehicles, getPublicStats, getPublicSettings, getPublicModelosDestaque,
  getPublicPopularModels, getPublicReviews, type PublicVehicle,
} from "@/lib/publicApi";
import { vehicleSlug } from "@/lib/vehicleSlug";
import { preco, km } from "@/lib/site/format";
import { CAMBIO, CARROCERIA, CATEGORIA_MOTO, rotulo } from "@/lib/site/labels";
import VehicleCard, { fotoCapa } from "@/components/site/VehicleCard";
import HeroBusca, { type ItemBusca } from "../_home/HeroBusca";
import HeroVitrine, { type SlideVitrine } from "../_home/HeroVitrine";
import ModelosBuscados, { type CardModelo } from "../_home/ModelosBuscados";
import VendaSeuVeiculo from "../_home/VendaSeuVeiculo";
import "../_home/home.css";

export const metadata: Metadata = {
  title: { absolute: "LMC Veículos | Carros e motos seminovos" },
  description: "Carros e motos seminovos com procedência, documentação em dia e financiamento. Veja fotos, preços e fale com a loja pelo WhatsApp.",
  alternates: { canonical: "/" },
};

// O backend não existe durante o build da imagem: a página é montada a cada visita
// (os dados vêm do cache de 30s do publicApi, então não pesa no banco).
export const dynamic = "force-dynamic";

const LOGOS = new Set(["bmw", "chevrolet", "fiat", "ford", "honda", "hyundai", "jeep", "kawasaki", "mitsubishi", "nissan", "renault", "suzuki", "toyota", "volkswagen", "yamaha"]);
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");

const MOTIVOS = [
  { icon: ShieldCheck, titulo: "Vistoria antes da venda", texto: "Cada veículo passa por revisão antes de entrar no estoque." },
  { icon: FileCheck2, titulo: "Documentação em dia", texto: "Transferência acompanhada e sem pendências na entrega." },
  { icon: Landmark, titulo: "Financiamento", texto: "Simulação com os principais bancos, com ou sem entrada." },
  { icon: Repeat, titulo: "Seu usado na troca", texto: "Avaliamos seu carro ou moto como parte do pagamento." },
];

function detalhe(v: PublicVehicle) {
  const partes = [String(v.ano), km(v.quilometragem)];
  if (v.tipo === "moto" && v.cilindrada) partes.push(`${v.cilindrada} cc`);
  else if (v.cambio) partes.push(rotulo(CAMBIO, v.cambio));
  return partes.join(" · ");
}

export default async function HomePage() {
  const [{ veiculos }, stats, s, manuais, populares, reviews] = await Promise.all([
    getAllPublicVehicles(),
    getPublicStats(),
    getPublicSettings(),
    getPublicModelosDestaque(),
    getPublicPopularModels(12),
    getPublicReviews(6),
  ]);
  const agora = Date.now();
  const ano = new Date().getFullYear();

  // ── Vitrine: destaques com foto; sem destaque, os mais recentes com foto
  const comFoto = veiculos.filter((v) => v.photos.length > 0);
  const destaques = comFoto.filter((v) => v.destaque);
  const vitrine: SlideVitrine[] = (destaques.length ? destaques : comFoto).slice(0, 5).map((v) => ({
    id: v.id,
    href: `/veiculo/${vehicleSlug(v)}`,
    foto: fotoCapa(v, true)!,
    nome: `${v.marca} ${v.modelo}${v.versao ? ` ${v.versao}` : ""}`,
    detalhe: detalhe(v),
    preco: preco(v.valor_anunciado),
  }));

  // ── Busca do hero (índice leve)
  const itensBusca: ItemBusca[] = veiculos.map((v) => ({ tipo: v.tipo, marca: v.marca, modelo: v.modelo, preco: v.valor_anunciado }));

  // ── Recém-chegados (o primeiro preço aparece cedo no celular)
  const recentes = [...veiculos].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 8);

  // ── Categorias com estoque, cada uma com a foto de um veículo real dela
  const grupos = new Map<string, PublicVehicle[]>();
  for (const v of veiculos) {
    const chave = v.tipo === "moto" ? "moto" : v.carroceria || "";
    if (!chave) continue;
    grupos.set(chave, [...(grupos.get(chave) ?? []), v]);
  }
  const categorias = [...grupos.entries()]
    .map(([chave, vs]) => ({
      chave,
      nome: chave === "moto" ? "Motos" : rotulo(CARROCERIA, chave),
      total: vs.length,
      foto: vs.map((v) => fotoCapa(v)).find(Boolean) ?? null,
      href: chave === "moto" ? "/estoque?tipo=moto" : `/estoque?tipo=carro&carroceria=${chave}`,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // ── Modelos mais buscados: os escolhidos no painel primeiro, depois os mais vistos
  const porModelo = new Map<string, PublicVehicle[]>();
  for (const v of veiculos) {
    const k = `${v.marca}|${v.modelo}`.toLowerCase();
    porModelo.set(k, [...(porModelo.get(k) ?? []), v]);
  }
  const vistos = new Set<string>();
  const modelos: CardModelo[] = [];
  const adicionar = (marca: string, modelo: string, fotoManual?: string | null) => {
    const k = `${marca}|${modelo}`.toLowerCase();
    const vs = porModelo.get(k);
    if (!vs || vistos.has(k)) return;
    vistos.add(k);
    const precos = vs.map((v) => v.valor_anunciado).filter((p): p is number => !!p);
    const ref = vs[0];
    const categoria = ref.tipo === "moto" ? ref.tipo_moto : ref.carroceria;
    modelos.push({
      chave: k,
      marca: ref.marca,
      modelo: ref.modelo,
      tipo: ref.tipo,
      categoria: categoria || null,
      categoriaRotulo: categoria ? rotulo(ref.tipo === "moto" ? CATEGORIA_MOTO : CARROCERIA, categoria) : null,
      foto: fotoManual || vs.map((v) => fotoCapa(v)).find(Boolean) || null,
      total: vs.length,
      aPartirDe: precos.length ? preco(Math.min(...precos)) : null,
    });
  };
  manuais.forEach((m) => adicionar(m.marca, m.modelo, m.imagem_url));
  populares.forEach((p) => adicionar(p.marca, p.modelo));

  // ── Marcas com estoque
  const marcas = [...veiculos.reduce((acc, v) => acc.set(v.marca, (acc.get(v.marca) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1]);

  const titulo = s.hero_titulo || s.slogan || "Seu próximo veículo está aqui.";
  const subtitulo = s.hero_subtitulo || "Estoque revisado, documentação em dia e negociação direta com a loja.";

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="h-hero" data-theme="dark" aria-labelledby="hero-titulo">
        <div className="s-container h-hero__grid">
          <div className="h-hero__copy">
            <h1 id="hero-titulo" className="s-display h-hero__titulo">{titulo}</h1>
            <p className="s-lead">{subtitulo}</p>
            <HeroBusca itens={itensBusca} />
          </div>
          {vitrine.length > 0 ? (
            <HeroVitrine slides={vitrine} />
          ) : (
            <div className="h-vitrine h-vitrine--vazia">
              <div className="h-vitrine__foto">
                <div className="s-state__box">
                  <CarFront size={48} strokeWidth={1.4} aria-hidden="true" />
                  <p className="s-muted">As fotos do estoque aparecem aqui assim que os veículos forem cadastrados.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Confiança (só dados reais) ───────────────────────────────────── */}
      <section className="h-confianca" data-theme="dark" aria-label="Números da loja">
        <div className="s-container">
          <ul>
            <li><CarFront size={22} aria-hidden="true" /><span><strong className="s-num">{stats.total_veiculos || veiculos.length}</strong> veículos à pronta entrega</span></li>
            {stats.avaliacao_media && stats.total_avaliacoes > 0 && (
              <li><Star size={22} aria-hidden="true" /><span><strong className="s-num">{stats.avaliacao_media.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</strong> de 5 em {stats.total_avaliacoes} {stats.total_avaliacoes === 1 ? "avaliação" : "avaliações"}</span></li>
            )}
            {s.stat_anos && <li><ShieldCheck size={22} aria-hidden="true" /><span><strong className="s-num">{s.stat_anos} anos</strong> no mercado</span></li>}
            <li><Landmark size={22} aria-hidden="true" /><span><strong>Financiamento</strong> e troca do seu usado</span></li>
          </ul>
        </div>
      </section>

      {/* ── Recém-chegados ───────────────────────────────────────────────── */}
      {recentes.length > 0 && (
        <section className="s-section" data-theme="light" aria-labelledby="recentes-titulo">
          <div className="s-container">
            <div className="s-head">
              <div>
                <p className="s-eyebrow">Estoque</p>
                <h2 id="recentes-titulo" className="s-h2">Chegaram agora</h2>
              </div>
              <Link href="/estoque" className="s-link">Ver os {veiculos.length} veículos <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className="s-rail s-rail--grid-desk">
              {recentes.map((v, n) => (
                <VehicleCard key={v.id} v={v} whatsapp={s.whatsapp} prioridade={n < 2} agora={agora} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Categorias ───────────────────────────────────────────────────── */}
      {categorias.length > 1 && (
        <section className="s-section s-section--tight s-section--flush-top" data-theme="light" aria-labelledby="cat-titulo">
          <div className="s-container">
            <div className="s-head"><h2 id="cat-titulo" className="s-h2">Procure pelo tipo</h2></div>
            <div className={categorias.length === 5 ? "h-cats" : "h-cats h-cats--simples"}>
              {categorias.map((c) => (
                <Link key={c.chave} href={c.href} className="h-cat">
                  {c.foto ? <img src={c.foto} alt="" loading="lazy" decoding="async" /> : <Car size={40} aria-hidden="true" />}
                  <span className="h-cat__txt">
                    <strong>{c.nome}</strong>
                    <span>{c.total} {c.total === 1 ? "disponível" : "disponíveis"}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Modelos mais buscados ────────────────────────────────────────── */}
      {modelos.length > 0 && (
        <section className="s-section s-section--tight s-section--flush-top" data-theme="light" aria-labelledby="modelos-titulo">
          <div className="s-container">
            <div className="s-head"><h2 id="modelos-titulo" className="s-h2">Modelos mais buscados</h2></div>
            <ModelosBuscados modelos={modelos} />
          </div>
        </section>
      )}

      {/* ── Marcas ───────────────────────────────────────────────────────── */}
      {marcas.length > 1 && (
        <section className="s-section s-section--tight s-section--flush-top" data-theme="light" aria-labelledby="marcas-titulo">
          <div className="s-container">
            <div className="s-head"><h2 id="marcas-titulo" className="s-h2">Marcas no estoque</h2></div>
            <div className="h-marcas">
              {marcas.map(([marca, total]) => (
                <Link key={marca} href={`/estoque?marca=${encodeURIComponent(marca)}`} className="h-marca">
                  <span className="h-marca__logo">
                    {LOGOS.has(slug(marca)) ? <img src={`/logos/${slug(marca)}.png`} alt="" loading="lazy" /> : <span aria-hidden="true">{marca[0]}</span>}
                  </span>
                  {marca} <small>{total}</small>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Por que a LMC ────────────────────────────────────────────────── */}
      <section className="s-section s-section--tight" data-theme="light" aria-labelledby="porque-titulo">
        <div className="s-container">
          <div className="h-porque" data-theme="dark">
            <div style={{ display: "grid", gap: 14 }}>
              <h2 id="porque-titulo" className="s-h2">Por que comprar na {s.nome_loja}</h2>
              <p className="s-lead">Você fala direto com quem vende, vê o carro como ele é e sai com a documentação resolvida.</p>
              <div><Link href="/sobre" className="s-link">Conheça a loja <ArrowRight size={16} aria-hidden="true" /></Link></div>
            </div>
            <ul className="h-porque__lista">
              {MOTIVOS.map(({ icon: Icone, titulo, texto }) => (
                <li key={titulo}>
                  <Icone size={24} aria-hidden="true" />
                  <strong>{titulo}</strong>
                  <p>{texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Avaliações reais ─────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <section className="s-section s-section--tight" data-theme="light" aria-labelledby="aval-titulo">
          <div className="s-container h-aval">
            <div className="h-aval__nota">
              <h2 id="aval-titulo" className="s-h2">Quem comprou recomenda</h2>
              {stats.avaliacao_media && (
                <>
                  <strong className="s-num">{stats.avaliacao_media.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</strong>
                  <span className="h-estrelas" aria-label={`Nota ${stats.avaliacao_media} de 5`}>
                    {Array.from({ length: 5 }, (_, n) => <Star key={n} size={18} fill={n < Math.round(stats.avaliacao_media!) ? "currentColor" : "none"} aria-hidden="true" />)}
                  </span>
                  <span className="s-muted s-small">{stats.total_avaliacoes} {stats.total_avaliacoes === 1 ? "avaliação" : "avaliações"} de clientes</span>
                </>
              )}
              <div style={{ marginTop: 8 }}><Link href="/sobre#avaliar" className="s-link">Deixe sua avaliação <ArrowRight size={16} aria-hidden="true" /></Link></div>
            </div>
            <div className="h-aval__cards">
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
          </div>
        </section>
      )}

      {/* ── Venda ou troque ──────────────────────────────────────────────── */}
      <section className="s-section s-section--flush-top" data-theme="light" aria-labelledby="venda-titulo">
        <div className="s-container">
          <div className="h-venda" data-theme="dark">
            <div className="h-venda__texto">
              <h2 id="venda-titulo" className="s-h2">Venda ou troque seu veículo</h2>
              <p className="s-lead">Conte o que você tem. A gente avalia e responde com uma proposta, sem compromisso.</p>
              <ol className="h-venda__passos">
                <li>Preencha marca, modelo e ano</li>
                <li>Um vendedor liga ou chama no WhatsApp</li>
                <li>Use o valor na troca ou receba à vista</li>
              </ol>
            </div>
            <VendaSeuVeiculo whatsapp={s.whatsapp} anoAtual={ano} />
          </div>
        </div>
      </section>
    </>
  );
}
