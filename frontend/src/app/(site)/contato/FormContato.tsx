"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { enviarLead } from "@/lib/publicApi";

const ASSUNTOS = ["Quero comprar um veículo", "Financiamento", "Vender ou trocar meu veículo", "Outro assunto"];

export default function FormContato() {
  const [f, setF] = useState({ nome: "", telefone: "", email: "", assunto: ASSUNTOS[0], mensagem: "", website: "" });
  const [estado, setEstado] = useState<"livre" | "enviando" | "ok" | "erro">("livre");
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const r = await enviarLead({
      nome: f.nome.trim(),
      telefone: f.telefone.trim(),
      email: f.email.trim() || undefined,
      mensagem: `[${f.assunto}] ${f.mensagem.trim()}`,
      origem: "contato",
      website: f.website,
    });
    setMsg(r.mensagem);
    setEstado(r.ok ? "ok" : "erro");
  }

  if (estado === "ok") {
    return (
      <div className="ct-form" aria-live="polite">
        <div className="s-alert s-alert--ok" role="status"><CheckCircle2 size={20} aria-hidden="true" /><span>Mensagem recebida. Respondemos no telefone ou e-mail informado.</span></div>
      </div>
    );
  }

  return (
    <form className="ct-form" onSubmit={enviar}>
      <h2 className="s-h3">Mande uma mensagem</h2>
      <div className="ct-form__par">
        <div className="s-field">
          <label className="s-label" htmlFor="ct-nome">Nome</label>
          <input id="ct-nome" className="s-input" required minLength={2} maxLength={120} autoComplete="name" value={f.nome} onChange={set("nome")} />
        </div>
        <div className="s-field">
          <label className="s-label" htmlFor="ct-tel">Telefone ou WhatsApp</label>
          <input id="ct-tel" className="s-input" required type="tel" inputMode="tel" autoComplete="tel" minLength={10} maxLength={20} value={f.telefone} onChange={set("telefone")} />
        </div>
      </div>
      <div className="ct-form__par">
        <div className="s-field">
          <label className="s-label" htmlFor="ct-email">E-mail <small>(opcional)</small></label>
          <input id="ct-email" className="s-input" type="email" autoComplete="email" maxLength={120} value={f.email} onChange={set("email")} />
        </div>
        <div className="s-field">
          <label className="s-label" htmlFor="ct-assunto">Assunto</label>
          <select id="ct-assunto" className="s-select" value={f.assunto} onChange={set("assunto")}>
            {ASSUNTOS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div className="s-field">
        <label className="s-label" htmlFor="ct-msg">Mensagem</label>
        <textarea id="ct-msg" className="s-textarea" required minLength={5} maxLength={1900} value={f.mensagem} onChange={set("mensagem")} />
      </div>
      <div className="s-honeypot" aria-hidden="true">
        <label htmlFor="ct-site">Site</label>
        <input id="ct-site" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
      </div>
      {estado === "erro" && <div className="s-alert s-alert--erro" role="alert"><AlertCircle size={20} aria-hidden="true" /><span>{msg}</span></div>}
      <button type="submit" className="s-btn s-btn--primary s-btn--lg" disabled={estado === "enviando"}>
        <Send size={18} aria-hidden="true" /> {estado === "enviando" ? "Enviando..." : "Enviar mensagem"}
      </button>
      <p className="s-help">Seus dados são usados só para responder esta mensagem. <a href="/politica-de-privacidade" className="s-link">Privacidade</a></p>
    </form>
  );
}
