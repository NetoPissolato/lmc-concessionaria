import Link from "next/link";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import Logo from "@/components/site/Logo";
import WhatsAppIcon from "@/components/site/WhatsAppIcon";
import type { PublicSettings } from "@/lib/publicApi";
import { waLink, telLink } from "@/lib/site/whatsapp";

function urlRede(valor: string, base: string): string {
  if (/^https?:\/\//i.test(valor)) return valor;
  return `${base}${valor.replace(/^@/, "")}`;
}

export default function Footer({ s, ano }: { s: PublicSettings; ano: number }) {
  const wa = waLink(s.whatsapp);
  const tel = telLink(s.telefone);
  const enderecoCompleto = [s.endereco, [s.cidade, s.estado].filter(Boolean).join("/"), s.cep].filter(Boolean).join(" · ");
  const temContato = Boolean(enderecoCompleto || s.telefone || wa || s.email_contato || s.horario);

  return (
    <footer className="s-footer" data-theme="dark">
      <div className="s-container">
        <div className="s-footer__grid">
          <div>
            <Link href="/home" aria-label={s.nome_loja} style={{ display: "inline-block" }}>
              <Logo tom="escuro" className="s-footer__logo" />
            </Link>
            <p className="s-muted s-small" style={{ marginTop: 16, maxWidth: "34ch" }}>
              {s.slogan ?? "Carros e motos seminovos com procedência, documentação em dia e atendimento direto com quem vende."}
            </p>
            {(s.instagram || s.facebook || s.youtube) && (
              <div className="s-footer__social">
                {s.instagram && (
                  <a className="s-btn s-btn--secondary s-btn--icon" href={urlRede(s.instagram, "https://instagram.com/")} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <img src="/logos/instagram.svg" alt="" width={18} height={18} />
                  </a>
                )}
                {s.facebook && (
                  <a className="s-btn s-btn--secondary s-btn--icon" href={urlRede(s.facebook, "https://facebook.com/")} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <img src="/logos/facebook.svg" alt="" width={18} height={18} />
                  </a>
                )}
                {s.youtube && (
                  <a className="s-btn s-btn--secondary s-btn--icon" href={urlRede(s.youtube, "https://youtube.com/")} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <img src="/logos/youtube.svg" alt="" width={18} height={18} />
                  </a>
                )}
              </div>
            )}
          </div>

          <div>
            <h3>Navegação</h3>
            <ul>
              <li><Link href="/estoque">Estoque completo</Link></li>
              <li><Link href="/estoque?tipo=carro">Carros</Link></li>
              <li><Link href="/estoque?tipo=moto">Motos</Link></li>
              <li><Link href="/comparador">Comparar veículos</Link></li>
              <li><Link href="/sobre">Sobre a loja</Link></li>
            </ul>
          </div>

          {temContato && (
            <div>
              <h3>Contato</h3>
              <ul className="s-footer__contact">
                {enderecoCompleto && <li><MapPin size={16} aria-hidden="true" /><span>{enderecoCompleto}</span></li>}
                {wa && <li><WhatsAppIcon size={16} /><a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
                {tel && s.telefone && <li><Phone size={16} aria-hidden="true" /><a href={tel}>{s.telefone}</a></li>}
                {s.email_contato && <li><Mail size={16} aria-hidden="true" /><a href={`mailto:${s.email_contato}`}>{s.email_contato}</a></li>}
                {s.horario && <li><Clock size={16} aria-hidden="true" /><span>{s.horario}</span></li>}
              </ul>
            </div>
          )}

          <div>
            <h3>Institucional</h3>
            <ul>
              <li><Link href="/contato">Fale com a loja</Link></li>
              <li><Link href="/politica-de-privacidade">Política de privacidade</Link></li>
              <li><Link href="/login" rel="nofollow">Área da equipe</Link></li>
            </ul>
          </div>
        </div>

        <div className="s-footer__bottom">
          <span>© {ano} {s.nome_loja}{s.cnpj ? ` · CNPJ ${s.cnpj}` : ""}</span>
          <span>Preços e disponibilidade sujeitos a alteração sem aviso.</span>
        </div>
      </div>
    </footer>
  );
}
