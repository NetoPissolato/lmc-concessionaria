import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar, Gauge, Cog, Fuel, Palette, DoorOpen, CarFront, Bike, BadgeCheck, CheckCircle2, RotateCcw,
} from "lucide-react";
import { getPublicVehicleResult, getAllPublicVehicles, getPublicSettings, type PublicVehicle } from "@/lib/publicApi";
import { vehicleIdFromSlug, vehicleSlug } from "@/lib/vehicleSlug";
import { preco, km } from "@/lib/site/format";
import { CAMBIO, COMBUSTIVEL, CARROCERIA, CATEGORIA_MOTO, CONDICAO, rotulo } from "@/lib/site/labels";
import { waLink, telLink, mensagemVeiculo } from "@/lib/site/whatsapp";
import { jsonLd } from "@/lib/site/jsonld";
import VehicleCard from "@/components/site/VehicleCard";
import Galeria from "./Galeria";
import { AgendarVisita, BotoesContato, ContarVisita, SimuladorFinanciamento, VideoYoutube } from "./Compra";
import "./veiculo.css";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://site.spacerstorepaineladmin.com";

const nomeCompleto = (v: PublicVehicle) => [v.marca, v.modelo, v.versao].filter(Boolean).join(" ");

function youtubeId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m?.[1] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { veiculo: v, erro } = await getPublicVehicleResult(vehicleIdFromSlug(id));
  if (!v) return { title: erro ? "Veículo" : "Veículo não encontrado", robots: { index: false } };

  const titulo = `${nomeCompleto(v)} ${v.ano}`;
  const valor = preco(v.valor_anunciado);
  const descricao = `${titulo}${valor ? ` por ${valor}` : ""}. ${km(v.quilometragem)}, ${rotulo(CAMBIO, v.cambio)}, ${rotulo(COMBUSTIVEL, v.combustivel)}. Veja as fotos e fale com a loja.`;
  const foto = v.photos[0]?.url;
  const imagem = foto ? (foto.startsWith("http") ? foto : `${SITE_URL}${foto}`) : undefined;
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/veiculo/${vehicleSlug(v)}` },
    openGraph: {
      title: titulo,
      description: descricao,
      url: `/veiculo/${vehicleSlug(v)}`,
      ...(imagem && { images: [{ url: imagem, width: 1600, height: 1200, alt: titulo }] }),
    },
    twitter: { card: "summary_large_image", title: titulo, description: descricao, ...(imagem && { images: [imagem] }) },
  };
}

export default async function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params;
  const id = vehicleIdFromSlug(slug);
  const [{ veiculo: v, erro }, { veiculos }, s] = await Promise.all([
    getPublicVehicleResult(id),
    getAllPublicVehicles(),
    getPublicSettings(),
  ]);

  // Backend fora do ar: aviso e "tente de novo" (não 404, que o Google trataria como página morta)
  if (!v && erro) {
    return (
      <section className="s-state v-erro" data-theme="light">
        <div className="s-state__box">
          <span className="s-state__icon"><RotateCcw size={26} aria-hidden="true" /></span>
          <h1 className="s-h2">Não conseguimos abrir este anúncio agora</h1>
          <p className="s-lead">Tente atualizar a página em alguns segundos.</p>
          <Link href={`/veiculo/${slug}`} className="s-btn s-btn--primary">Tentar de novo</Link>
        </div>
      </section>
    );
  }
  if (!v) notFound();

  const nome = nomeCompleto(v);
  const valor = preco(v.valor_anunciado);
  const url = `${SITE_URL}/veiculo/${vehicleSlug(v)}`;
  const wa = waLink(s.whatsapp, mensagemVeiculo(v, url));
  const tel = telLink(s.telefone);
  const video = youtubeId(v.video_url);
  const categoria = v.tipo === "moto"
    ? (v.tipo_moto ? rotulo(CATEGORIA_MOTO, v.tipo_moto) : null)
    : (v.carroceria ? rotulo(CARROCERIA, v.carroceria) : null);

  const ficha = [
    { icon: Calendar, rotulo: "Ano", valor: String(v.ano) },
    { icon: Gauge, rotulo: "Quilometragem", valor: km(v.quilometragem) },
    v.tipo === "moto"
      ? (v.cilindrada ? { icon: Cog, rotulo: "Cilindrada", valor: `${v.cilindrada} cc` } : null)
      : { icon: Cog, rotulo: "Câmbio", valor: rotulo(CAMBIO, v.cambio) },
    { icon: Fuel, rotulo: "Combustível", valor: rotulo(COMBUSTIVEL, v.combustivel) },
    v.cor ? { icon: Palette, rotulo: "Cor", valor: v.cor } : null,
    v.tipo === "carro" && v.portas ? { icon: DoorOpen, rotulo: "Portas", valor: String(v.portas) } : null,
    categoria ? { icon: v.tipo === "moto" ? Bike : CarFront, rotulo: v.tipo === "moto" ? "Estilo" : "Carroceria", valor: categoria } : null,
    v.condicao ? { icon: BadgeCheck, rotulo: "Condição", valor: rotulo(CONDICAO, v.condicao) } : null,
  ].filter(Boolean) as { icon: typeof Calendar; rotulo: string; valor: string }[];

  // Parecidos: mesmo tipo e mesma carroceria/estilo primeiro, depois faixa de preço próxima
  const parecidos = veiculos
    .filter((x) => x.id !== v.id && x.tipo === v.tipo)
    .map((x) => ({
      x,
      pontos: (x.carroceria && x.carroceria === v.carroceria ? 2 : 0) + (x.tipo_moto && x.tipo_moto === v.tipo_moto ? 2 : 0) +
        (x.marca === v.marca ? 1 : 0) +
        (v.valor_anunciado && x.valor_anunciado && Math.abs(x.valor_anunciado - v.valor_anunciado) / v.valor_anunciado < 0.25 ? 1 : 0),
    }))
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 4)
    .map(({ x }) => x);

  const dadosGoogle = {
    "@context": "https://schema.org",
    "@type": v.tipo === "moto" ? "Motorcycle" : "Car",
    name: `${nome} ${v.ano}`,
    brand: { "@type": "Brand", name: v.marca },
    model: v.modelo,
    vehicleModelDate: String(v.ano),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: v.quilometragem, unitCode: "KMT" },
    fuelType: rotulo(COMBUSTIVEL, v.combustivel),
    ...(v.tipo === "carro" && { vehicleTransmission: rotulo(CAMBIO, v.cambio) }),
    ...(v.cor && { color: v.cor }),
    itemCondition: v.condicao === "novo" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    image: v.photos.map((p) => (p.url.startsWith("http") ? p.url : `${SITE_URL}${p.url}`)),
    url,
    ...(v.valor_anunciado && {
      offers: {
        "@type": "Offer",
        price: v.valor_anunciado,
        priceCurrency: "BRL",
        availability: "https://schema.org/InStock",
        url,
        seller: { "@type": "AutoDealer", name: s.nome_loja },
      },
    }),
  };

  return (
    <section className="v-pagina" data-theme="light">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dadosGoogle) }} />
      <ContarVisita id={v.id} />
      <div className="s-container">
        <ol className="v-trilha" aria-label="Você está em">
          <li><Link href="/home">Início</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={`/estoque?tipo=${v.tipo}`}>{v.tipo === "moto" ? "Motos" : "Carros"}</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={`/estoque?marca=${encodeURIComponent(v.marca)}`}>{v.marca}</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{v.modelo} {v.ano}</li>
        </ol>

        <div className="v-grid">
          <div className="v-area-galeria">
            <Galeria fotos={v.photos} nome={`${nome} ${v.ano}`} tipo={v.tipo} />
          </div>

          <div className="v-area-conteudo">
            <div className="v-bloco">
              <h2 className="s-h3">Ficha técnica</h2>
              <ul className="v-ficha">
                {ficha.map(({ icon: Icone, rotulo: r, valor: val }) => (
                  <li key={r}><Icone size={20} aria-hidden="true" /><span>{r}</span><strong>{val}</strong></li>
                ))}
              </ul>
            </div>

            {v.opcionais.length > 0 && (
              <div className="v-bloco">
                <h2 className="s-h3">Itens e opcionais</h2>
                <ul className="v-opcionais">
                  {v.opcionais.map((o) => <li key={o}><CheckCircle2 size={17} aria-hidden="true" />{o}</li>)}
                </ul>
              </div>
            )}

            {video && (
              <div className="v-bloco">
                <h2 className="s-h3">Vídeo</h2>
                <VideoYoutube id={video} titulo={`${nome} ${v.ano}`} />
              </div>
            )}

            <div className="v-bloco">
              <AgendarVisita veiculoId={v.id} descricao={`${nome} ${v.ano}`} />
            </div>
          </div>

          <aside className="v-compra v-area-compra" aria-label="Preço e contato">
            <div className="v-cartao">
              <div className="v-titulo">
                <p className="s-eyebrow">{v.marca}{categoria ? ` · ${categoria}` : ""}</p>
                <h1 className="s-h2">{v.modelo}{v.versao ? <span className="s-muted" style={{ fontWeight: 500 }}> {v.versao}</span> : null}</h1>
                <p className="s-muted">{v.ano} · {km(v.quilometragem)}{v.tipo === "carro" ? ` · ${rotulo(CAMBIO, v.cambio)}` : v.cilindrada ? ` · ${v.cilindrada} cc` : ""}</p>
              </div>
              <div>
                {valor ? (
                  <>
                    <p className="v-preco">{valor}</p>
                    <p className="s-small s-subtle" style={{ marginTop: 6 }}>Preço à vista. Aceitamos seu usado na troca.</p>
                  </>
                ) : (
                  <p className="v-preco" style={{ fontSize: "1.5rem" }}>Preço sob consulta</p>
                )}
              </div>
              <BotoesContato wa={wa} tel={tel} />
              <ul className="v-garantias">
                <li><CheckCircle2 size={17} aria-hidden="true" />Fotos reais deste veículo</li>
                <li><CheckCircle2 size={17} aria-hidden="true" />Documentação conferida antes da entrega</li>
                <li><CheckCircle2 size={17} aria-hidden="true" />Financiamento e troca do seu usado</li>
              </ul>
            </div>
            {v.valor_anunciado ? <SimuladorFinanciamento preco={v.valor_anunciado} /> : null}
          </aside>
        </div>

        {parecidos.length > 0 && (
          <div className="v-bloco" style={{ marginTop: 48 }}>
            <div className="s-head" style={{ marginBottom: 8 }}>
              <h2 className="s-h2">Veja também</h2>
              <Link href={`/estoque?tipo=${v.tipo}`} className="s-link">{v.tipo === "moto" ? "Ver todas as motos" : "Ver todos os carros"}</Link>
            </div>
            <div className="s-rail s-rail--grid-desk">
              {parecidos.map((x) => <VehicleCard key={x.id} v={x} whatsapp={s.whatsapp} />)}
            </div>
          </div>
        )}
      </div>

      <div className="v-barra" data-theme="light">
        <div className="v-barra__preco">
          <strong>{valor ?? "Sob consulta"}</strong>
          <span>{v.modelo} {v.ano}</span>
        </div>
        <BotoesContato wa={wa} tel={tel} compacto />
      </div>
    </section>
  );
}
