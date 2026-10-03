"use client";

import { useState } from "react";
import { BellRing, CheckCircle2, AlertCircle } from "lucide-react";
import { enviarAlerta } from "@/lib/publicApi";

/** "Me avise quando chegar": vira um pedido no painel, que mostra os carros compatíveis ao vendedor. */
export default function AviseMe({
  filtros,
}: {
  filtros: { tipo?: string; marca?: string; modelo?: string; ano_min?: number; preco_max?: number };
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [isca, setIsca] = useState("");
  const [estado, setEstado] = useState<"livre" | "enviando" | "ok" | "erro">("livre");
  const [msg, setMsg] = useState("");

  const procura = [filtros.marca, filtros.modelo].filter(Boolean).join(" ") || (filtros.tipo === "moto" ? "uma moto" : "um carro");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const r = await enviarAlerta({ email, nome: nome || undefined, ...filtros, website: isca });
    setMsg(r.mensagem);
    setEstado(r.ok ? "ok" : "erro");
  }

  return (
    <div className="e-aviso" data-theme="dark">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <BellRing size={24} className="s-accent" aria-hidden="true" style={{ flexShrink: 0, marginTop: 4 }} />
        <div style={{ display: "grid", gap: 4 }}>
          <h2 className="s-h3">Avisamos quando chegar {procura}</h2>
          <p className="s-muted s-small">O estoque muda toda semana. Deixe seu e-mail e um vendedor entra em contato.</p>
        </div>
      </div>
      {estado === "ok" ? (
        <div className="s-alert s-alert--ok" role="status"><CheckCircle2 size={20} aria-hidden="true" /><span>{msg}</span></div>
      ) : (
        <form onSubmit={enviar}>
          <div className="s-field">
            <label className="s-label" htmlFor="aviso-nome">Nome <small>(opcional)</small></label>
            <input id="aviso-nome" className="s-input" autoComplete="name" maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="s-field">
            <label className="s-label" htmlFor="aviso-email">E-mail</label>
            <input id="aviso-email" className="s-input" type="email" required autoComplete="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="s-honeypot" aria-hidden="true">
            <label htmlFor="aviso-site">Site</label>
            <input id="aviso-site" tabIndex={-1} autoComplete="off" value={isca} onChange={(e) => setIsca(e.target.value)} />
          </div>
          <button type="submit" className="s-btn s-btn--primary s-btn--lg" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Enviando..." : "Me avise"}
          </button>
          {estado === "erro" && (
            <div className="s-alert s-alert--erro" role="alert" style={{ gridColumn: "1 / -1" }}><AlertCircle size={20} aria-hidden="true" /><span>{msg}</span></div>
          )}
        </form>
      )}
    </div>
  );
}
