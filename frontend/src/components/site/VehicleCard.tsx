import Link from "next/link";
import { Calendar, Gauge, Cog, Images, Car, Bike } from "lucide-react";
import type { PublicVehicle } from "@/lib/publicApi";
import { vehicleSlug } from "@/lib/vehicleSlug";
import { CAMBIO, rotulo, categoriaDoVeiculo } from "@/lib/site/labels";
import { preco, km } from "@/lib/site/format";
import { waLink, mensagemVeiculo } from "@/lib/site/whatsapp";
import WhatsAppIcon from "./WhatsAppIcon";

export function fotoCapa(v: PublicVehicle, grande = false): string | null {
  const f = v.photos?.[0];
  if (!f) return null;
  return grande ? f.url : f.thumb_url || f.url;
}

/** Entrou no estoque nos últimos 10 dias (selo "Novidade"). */
function recemChegado(v: PublicVehicle, agora: number): boolean {
  const criado = Date.parse(v.created_at);
  return Number.isFinite(criado) && agora - criado < 10 * 24 * 3600 * 1000;
}

export default function VehicleCard({
  v,
  whatsapp,
  prioridade = false,
  comparar,
  nivelTitulo = 3,
  agora,
}: {
  v: PublicVehicle;
  /** Número da loja; sem número, o atalho de WhatsApp não aparece. */
  whatsapp?: string | null;
  /** true nos primeiros cards visíveis: a foto carrega sem esperar a rolagem. */
  prioridade?: boolean;
  comparar?: { ativo: boolean; onToggle: () => void; desabilitado?: boolean };
  nivelTitulo?: 2 | 3;
  /** Data de referência para o selo "Novidade" (passada pelo servidor: evita divergência na hidratação). */
  agora?: number;
}) {
  const href = `/veiculo/${vehicleSlug(v)}`;
  const foto = fotoCapa(v);
  const valor = preco(v.valor_anunciado);
  const categoria = categoriaDoVeiculo(v);
  const wa = waLink(whatsapp, mensagemVeiculo(v));
  const Titulo = nivelTitulo === 2 ? "h2" : "h3";
  const nome = `${v.marca} ${v.modelo}`;

  return (
    <article className="s-vcard">
      <div className="s-vcard__media">
        {foto ? (
          <img
            src={foto}
            alt={`${nome} ${v.ano}`}
            width={640}
            height={480}
            loading={prioridade ? "eager" : "lazy"}
            fetchPriority={prioridade ? "high" : "auto"}
            decoding="async"
          />
        ) : (
          <div className="s-nophoto">
            {v.tipo === "moto" ? <Bike size={36} strokeWidth={1.5} /> : <Car size={36} strokeWidth={1.5} />}
            Foto em breve
          </div>
        )}
        <div className="s-vcard__badges">
          {v.destaque && <span className="s-badge s-badge--brand">Destaque</span>}
          {!v.destaque && agora !== undefined && recemChegado(v, agora) && <span className="s-badge">Novidade</span>}
        </div>
        {v.photos.length > 1 && (
          <span className="s-badge s-vcard__count" aria-label={`${v.photos.length} fotos`}>
            <Images size={13} aria-hidden="true" /> {v.photos.length}
          </span>
        )}
        {comparar && (
          <button
            type="button"
            className="s-vcard__compare"
            aria-pressed={comparar.ativo}
            disabled={comparar.desabilitado && !comparar.ativo}
            onClick={comparar.onToggle}
          >
            {comparar.ativo ? "Comparando" : "Comparar"}
          </button>
        )}
      </div>

      <div className="s-vcard__body">
        <div>
          <p className="s-vcard__brand">{categoria ? `${v.marca} · ${categoria}` : v.marca}</p>
          <Titulo className="s-vcard__title">
            <Link href={href}>{v.modelo}</Link>
          </Titulo>
          {v.versao && <p className="s-vcard__version">{v.versao}</p>}
        </div>
        <ul className="s-vcard__specs" aria-label="Ficha resumida">
          <li className="s-chip"><Calendar size={14} aria-hidden="true" /> {v.ano}</li>
          <li className="s-chip"><Gauge size={14} aria-hidden="true" /> {km(v.quilometragem)}</li>
          {v.tipo === "moto" && v.cilindrada ? (
            <li className="s-chip"><Cog size={14} aria-hidden="true" /> {v.cilindrada} cc</li>
          ) : (
            v.cambio && <li className="s-chip"><Cog size={14} aria-hidden="true" /> {rotulo(CAMBIO, v.cambio)}</li>
          )}
        </ul>
        <div className="s-vcard__foot">
          {valor ? (
            <p className="s-vcard__price">{valor}</p>
          ) : (
            <p className="s-vcard__price s-vcard__price--consulte">Preço sob consulta</p>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="s-btn s-btn--wa s-btn--icon s-vcard__wa"
              aria-label={`Falar no WhatsApp sobre ${nome} ${v.ano}`}
            >
              <WhatsAppIcon size={20} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
