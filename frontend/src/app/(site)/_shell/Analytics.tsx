"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";

const CHAVE = "lmc_cookies";
type Escolha = "aceito" | "recusado" | null;

function lerEscolha(): Escolha {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === "aceito" || v === "recusado" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Google Analytics e Meta Pixel só carregam DEPOIS que o visitante aceita (LGPD).
 * Sem nenhum dos dois configurado no painel, não aparece aviso nenhum.
 * Os IDs chegam validados pelo backend (formato G-XXXX e só dígitos).
 */
export default function Analytics({ gaId, pixelId }: { gaId: string | null; pixelId: string | null }) {
  const [escolha, setEscolha] = useState<Escolha>(null);
  const [lido, setLido] = useState(false);

  useEffect(() => {
    setEscolha(lerEscolha());
    setLido(true);
  }, []);

  if (!gaId && !pixelId) return null;

  const decidir = (e: Exclude<Escolha, null>) => {
    try { localStorage.setItem(CHAVE, e); } catch { /* navegação privada: vale só nesta visita */ }
    setEscolha(e);
  };

  return (
    <>
      {escolha === "aceito" && gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(gaId)});`}
          </Script>
        </>
      )}
      {escolha === "aceito" && pixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(pixelId)});fbq('track','PageView');`}
        </Script>
      )}

      {lido && escolha === null && (
        <div className="s-consent" role="region" aria-label="Aviso de cookies" data-theme="light">
          <p>
            Usamos cookies de medição (Google e Meta) para entender quais veículos interessam mais.
            Você pode recusar sem perder nada do site. <Link href="/politica-de-privacidade" className="s-link">Saiba mais</Link>
          </p>
          <div className="s-consent__actions">
            <button type="button" className="s-btn s-btn--primary s-btn--sm" onClick={() => decidir("aceito")}>Aceitar</button>
            <button type="button" className="s-btn s-btn--secondary s-btn--sm" onClick={() => decidir("recusado")}>Recusar</button>
          </div>
        </div>
      )}
    </>
  );
}
