import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock, ArrowUpRight } from "lucide-react";
import { getPublicSettings } from "@/lib/publicApi";
import { waLink, telLink } from "@/lib/site/whatsapp";
import WhatsAppIcon from "@/components/site/WhatsAppIcon";
import FormContato from "./FormContato";
import "../institucional.css";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a LMC Veículos pelo WhatsApp, telefone, e-mail ou formulário. Endereço e horário de atendimento.",
  alternates: { canonical: "/contato" },
};

export const dynamic = "force-dynamic";

export default async function ContatoPage() {
  const s = await getPublicSettings();
  const wa = waLink(s.whatsapp, `Olá! Vim pelo site da ${s.nome_loja}.`);
  const tel = telLink(s.telefone);
  const endereco = [s.endereco, [s.cidade, s.estado].filter(Boolean).join("/"), s.cep].filter(Boolean).join(", ");
  const mapa = endereco ? `https://maps.google.com/maps?q=${encodeURIComponent(`${s.nome_loja}, ${endereco}`)}&output=embed` : null;
  const rota = endereco ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}` : null;

  return (
    <>
      <section className="i-topo" data-theme="dark">
        <div className="s-container">
          <h1 className="s-h1">Fale com a loja</h1>
          <p className="s-lead">O jeito mais rápido é o WhatsApp. Se preferir, ligue, mande um e-mail ou passe aqui.</p>
        </div>
      </section>

      <section className="s-section s-section--tight" data-theme="light">
        <div className="s-container ct-grid">
          <div style={{ display: "grid", gap: 16 }}>
            <ul className="ct-canais">
              {wa && (
                <li>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="ct-canal ct-canal--wa">
                    <span className="ct-canal__icone"><WhatsAppIcon size={22} /></span>
                    <span><strong>WhatsApp</strong><span>Resposta mais rápida</span></span>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </a>
                </li>
              )}
              {tel && s.telefone && (
                <li>
                  <a href={tel} className="ct-canal">
                    <span className="ct-canal__icone"><Phone size={20} aria-hidden="true" /></span>
                    <span><strong>Telefone</strong><span>{s.telefone}</span></span>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </a>
                </li>
              )}
              {s.email_contato && (
                <li>
                  <a href={`mailto:${s.email_contato}`} className="ct-canal">
                    <span className="ct-canal__icone"><Mail size={20} aria-hidden="true" /></span>
                    <span><strong>E-mail</strong><span>{s.email_contato}</span></span>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </a>
                </li>
              )}
              {endereco && (
                <li>
                  <a href={rota!} target="_blank" rel="noopener noreferrer" className="ct-canal">
                    <span className="ct-canal__icone"><MapPin size={20} aria-hidden="true" /></span>
                    <span><strong>Endereço</strong><span>{endereco}</span></span>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </a>
                </li>
              )}
              {s.horario && (
                <li>
                  <div className="ct-canal">
                    <span className="ct-canal__icone"><Clock size={20} aria-hidden="true" /></span>
                    <span><strong>Horário</strong><span>{s.horario}</span></span>
                    <span />
                  </div>
                </li>
              )}
            </ul>
            {mapa && (
              <div className="ct-mapa">
                <iframe src={mapa} title={`Mapa: ${s.nome_loja}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            )}
          </div>
          <FormContato />
        </div>
      </section>
    </>
  );
}
