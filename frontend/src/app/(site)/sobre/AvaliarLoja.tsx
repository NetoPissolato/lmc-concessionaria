"use client";

import { useState } from "react";
import { Star, CheckCircle2, AlertCircle } from "lucide-react";
import { enviarAvaliacao } from "@/lib/publicApi";

/** Avaliação de cliente: fica pendente até o admin aprovar no painel. */
export default function AvaliarLoja() {
  const [nota, setNota] = useState(0);
  const [f, setF] = useState({ nome: "", cidade: "", texto: "", website: "" });
  const [estado, setEstado] = useState<"livre" | "enviando" | "ok" | "erro">("livre");
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nota) { setEstado("erro"); setMsg("Escolha de 1 a 5 estrelas."); return; }
    setEstado("enviando");
    const r = await enviarAvaliacao({ nome: f.nome.trim(), nota, texto: f.texto.trim(), cidade: f.cidade.trim() || undefined, website: f.website });
    setMsg(r.mensagem);
    setEstado(r.ok ? "ok" : "erro");
  }

  if (estado === "ok") {
    return <div className="s-alert s-alert--ok" role="status"><CheckCircle2 size={20} aria-hidden="true" /><span>Obrigado! Sua avaliação aparece aqui depois de aprovada pela loja.</span></div>;
  }

  return (
    <form onSubmit={enviar}>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8 }}>
        <legend className="s-label" style={{ marginBottom: 8 }}>Sua nota</legend>
        <div className="so-estrelas">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={n <= nota} aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`} onClick={() => setNota(n)}>
              <Star size={22} fill={n <= nota ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="ct-form__par">
        <div className="s-field">
          <label className="s-label" htmlFor="av-nome">Nome</label>
          <input id="av-nome" className="s-input" required minLength={2} maxLength={120} autoComplete="name" value={f.nome} onChange={set("nome")} />
        </div>
        <div className="s-field">
          <label className="s-label" htmlFor="av-cidade">Cidade <small>(opcional)</small></label>
          <input id="av-cidade" className="s-input" maxLength={80} autoComplete="address-level2" value={f.cidade} onChange={set("cidade")} />
        </div>
      </div>
      <div className="s-field">
        <label className="s-label" htmlFor="av-texto">Como foi sua experiência?</label>
        <textarea id="av-texto" className="s-textarea" required minLength={10} maxLength={1500} value={f.texto} onChange={set("texto")} />
        <span className="s-help">Mínimo de 10 caracteres.</span>
      </div>
      <div className="s-honeypot" aria-hidden="true">
        <label htmlFor="av-site">Site</label>
        <input id="av-site" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
      </div>
      {estado === "erro" && <div className="s-alert s-alert--erro" role="alert"><AlertCircle size={20} aria-hidden="true" /><span>{msg}</span></div>}
      <button type="submit" className="s-btn s-btn--primary s-btn--lg" disabled={estado === "enviando"}>
        {estado === "enviando" ? "Enviando..." : "Enviar avaliação"}
      </button>
    </form>
  );
}
