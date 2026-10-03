import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSettings } from "@/lib/publicApi";
import "../institucional.css";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como a LMC Veículos trata os dados enviados pelo site, em linha com a LGPD.",
  alternates: { canonical: "/politica-de-privacidade" },
};

export const dynamic = "force-dynamic";

export default async function PrivacidadePage() {
  const s = await getPublicSettings();
  const empresa = `${s.nome_loja}${s.cnpj ? `, CNPJ ${s.cnpj}` : ""}`;
  const contato = s.email_contato ?? null;

  return (
    <>
      <section className="i-topo" data-theme="dark">
        <div className="s-container">
          <h1 className="s-h1">Política de privacidade</h1>
          <p className="s-lead">Quais dados o site recebe, para quê e como você pode pedir para apagar.</p>
        </div>
      </section>
      <section className="s-section s-section--tight" data-theme="light">
        <div className="s-container">
          <div className="i-texto">
            <p>Este site é mantido por {empresa}. Tratamos dados pessoais de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>

            <h2>Dados que recebemos</h2>
            <ul>
              <li>Nome, telefone e e-mail que você envia nos formulários (contato, agendamento de visita, avaliação do seu veículo e aviso de chegada).</li>
              <li>Avaliações que você escreve sobre a loja, que só são publicadas depois de revisadas.</li>
              <li>Dados de navegação, como páginas visitadas, apenas se você aceitar os cookies de medição.</li>
            </ul>

            <h2>Para que usamos</h2>
            <ul>
              <li>Responder ao seu pedido e dar andamento à negociação.</li>
              <li>Avisar quando chegar um veículo que você pediu.</li>
              <li>Entender quais anúncios interessam mais, quando você autoriza a medição.</li>
            </ul>
            <p>Não vendemos nem compartilhamos seus dados com terceiros para publicidade. Os dados ficam no sistema interno da loja, com acesso restrito à equipe.</p>

            <h2>Cookies</h2>
            <p>O site só carrega ferramentas de medição (Google Analytics e Meta) se você clicar em &quot;Aceitar&quot; no aviso de cookies. Sem isso, nenhum cookie de terceiros é usado. Você pode mudar a escolha limpando os dados do site no navegador.</p>

            <h2>Seus direitos</h2>
            <p>Você pode pedir a qualquer momento para ver, corrigir ou apagar os seus dados{contato ? <> pelo e-mail <a href={`mailto:${contato}`}>{contato}</a></> : <> pela página de <Link href="/contato">contato</Link></>}.</p>
          </div>
        </div>
      </section>
    </>
  );
}
