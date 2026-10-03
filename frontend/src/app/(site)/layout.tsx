import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sora, Geist } from "next/font/google";
import { Wrench } from "lucide-react";
import { getPublicSettings, type PublicSettings } from "@/lib/publicApi";
import { waLink } from "@/lib/site/whatsapp";
import { jsonLd } from "@/lib/site/jsonld";
import WhatsAppIcon from "@/components/site/WhatsAppIcon";
import Header from "./_shell/Header";
import Footer from "./_shell/Footer";
import Analytics from "./_shell/Analytics";
import "./site.css";

const sora = Sora({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-sora", display: "swap" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://site.spacerstorepaineladmin.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  robots: "index, follow",
  openGraph: { siteName: "LMC Veículos", locale: "pt_BR", type: "website" },
};

/** Dados da loja para o Google (AutoDealer). Só entra o que está preenchido no painel. */
function dadosDaLoja(s: PublicSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: s.nome_loja,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    ...(s.telefone && { telephone: s.telefone }),
    ...(s.email_contato && { email: s.email_contato }),
    ...((s.endereco || s.cidade) && {
      address: {
        "@type": "PostalAddress",
        ...(s.endereco && { streetAddress: s.endereco }),
        ...(s.cidade && { addressLocality: s.cidade }),
        ...(s.estado && { addressRegion: s.estado }),
        ...(s.cep && { postalCode: s.cep }),
        addressCountry: "BR",
      },
    }),
  };
}

function Manutencao({ s }: { s: PublicSettings }) {
  const wa = waLink(s.whatsapp, "Olá! Vi que o site está em manutenção.");
  return (
    <section className="s-state" data-theme="dark">
      <div className="s-state__box">
        <span className="s-state__icon"><Wrench size={26} aria-hidden="true" /></span>
        <h1 className="s-h2">Estamos ajustando o site</h1>
        <p className="s-lead">Voltamos em instantes. Enquanto isso, o atendimento continua normalmente.</p>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="s-btn s-btn--wa s-btn--lg">
            <WhatsAppIcon size={20} /> Falar no WhatsApp
          </a>
        )}
      </div>
    </section>
  );
}

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const s = await getPublicSettings();
  const wa = waLink(s.whatsapp, `Olá! Vim pelo site da ${s.nome_loja}.`);

  return (
    <div className={`site-root ${sora.variable} ${geist.variable}`} data-theme="dark">
      <a href="#conteudo" className="s-skip-link">Pular para o conteúdo</a>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dadosDaLoja(s)) }} />
      <Header whatsapp={s.whatsapp} telefone={s.telefone} nomeLoja={s.nome_loja} />
      <main id="conteudo">{s.modo_manutencao ? <Manutencao s={s} /> : children}</main>
      <Footer s={s} ano={new Date().getFullYear()} />
      {wa && !s.modo_manutencao && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="s-wa-float" aria-label="Falar no WhatsApp">
          <WhatsAppIcon size={28} />
        </a>
      )}
      <Analytics gaId={s.ga_id} pixelId={s.pixel_id} />
    </div>
  );
}
