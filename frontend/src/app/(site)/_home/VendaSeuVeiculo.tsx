"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Send } from "lucide-react";
import WhatsAppIcon from "@/components/site/WhatsAppIcon";
import { enviarLead } from "@/lib/publicApi";
import { waLink } from "@/lib/site/whatsapp";

/**
 * Pedido de avaliação do usado do cliente. Vira LEAD no painel (o vendedor vê e liga)
 * e, depois de enviado, oferece seguir a conversa no WhatsApp com os dados prontos.
 */
export default function VendaSeuVeiculo({ whatsapp, anoAtual }: { whatsapp: string | null; anoAtual: number }) {
  const [f, setF] = useState({ veiculo: "", ano: "", km: "", nome: "", telefone: "", website: "" });
  const [estado, setEstado] = useState<"livre" | "enviando" | "ok" | "erro">("livre");
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const resumo = `Quero avaliar meu veículo: ${f.veiculo}${f.ano ? `, ${f.ano}` : ""}${f.km ? `, ${f.km} km` : ""}.`;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const r = await enviarLead({
      nome: f.nome.trim(),
      telefone: f.telefone.trim(),
      mensagem: resumo,
      veiculo_descricao: f.veiculo.trim(),
      origem: "avaliacao",
      website: f.website,
    });
    setMsg(r.mensagem);
    setEstado(r.ok ? "ok" : "erro");
  }

  const wa = waLink(whatsapp, `Olá! Meu nome é ${f.nome}. ${resumo}`);

  if (estado === "ok") {
    return (
      <div className="h-venda__form" aria-live="polite">
        <div className="s-alert s-alert--ok"><CheckCircle2 size={20} aria-hidden="true" /><span>Pedido recebido. Um vendedor vai retornar no telefone informado.</span></div>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="s-btn s-btn--wa s-btn--lg s-btn--block">
            <WhatsAppIcon size={20} /> Adiantar pelo WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <form className="h-venda__form" onSubmit={enviar} noValidate={false}>
      <div className="s-field">
        <label className="s-label" htmlFor="venda-veiculo">Marca e modelo</label>
        <input id="venda-veiculo" className="s-input" required minLength={3} maxLength={120} placeholder="Ex.: Chevrolet Onix LT" value={f.veiculo} onChange={set("veiculo")} />
      </div>
      <div className="h-venda__linha">
        <div className="s-field">
          <label className="s-label" htmlFor="venda-ano">Ano</label>
          <select id="venda-ano" className="s-select" required value={f.ano} onChange={set("ano")}>
            <option value="">Selecione</option>
            {Array.from({ length: 30 }, (_, n) => anoAtual + 1 - n).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="s-field">
          <label className="s-label" htmlFor="venda-km">Quilometragem</label>
          <input id="venda-km" className="s-input" inputMode="numeric" placeholder="Ex.: 45.000" maxLength={9} value={f.km} onChange={set("km")} />
        </div>
      </div>
      <div className="h-venda__linha">
        <div className="s-field">
          <label className="s-label" htmlFor="venda-nome">Seu nome</label>
          <input id="venda-nome" className="s-input" required minLength={2} maxLength={120} autoComplete="name" value={f.nome} onChange={set("nome")} />
        </div>
        <div className="s-field">
          <label className="s-label" htmlFor="venda-tel">Telefone</label>
          <input id="venda-tel" className="s-input" required type="tel" inputMode="tel" autoComplete="tel" minLength={10} maxLength={20} placeholder="(11) 99999-0000" value={f.telefone} onChange={set("telefone")} />
        </div>
      </div>
      {/* Campo isca: invisível para pessoas, robôs preenchem e o envio é descartado */}
      <div className="s-honeypot" aria-hidden="true">
        <label htmlFor="venda-site">Site</label>
        <input id="venda-site" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
      </div>
      {estado === "erro" && (
        <div className="s-alert s-alert--erro" role="alert"><AlertCircle size={20} aria-hidden="true" /><span>{msg}</span></div>
      )}
      <button type="submit" className="s-btn s-btn--primary s-btn--lg s-btn--block" disabled={estado === "enviando"}>
        <Send size={18} aria-hidden="true" /> {estado === "enviando" ? "Enviando..." : "Pedir avaliação"}
      </button>
      <p className="s-help">Sem compromisso. Usamos seus dados só para responder este pedido.</p>
    </form>
  );
}
