"use client";

import React, { useState } from "react";
import { Bell, CheckCircle } from "lucide-react";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL ?? "/api/v1") + "/public";

interface Props {
  marca?: string;
  modelo?: string;
  tipo?: string;
}

export default function AlerteMe({ marca, modelo, tipo }: Props) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) { setError("Informe um e-mail valido."); return; }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/availability-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), nome: nome.trim() || undefined, marca, modelo, tipo }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError("Erro ao cadastrar. Tente novamente.");
      }
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "32px 20px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,0.10)", border: "1.5px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle size={24} color="#22c55e" strokeWidth={1.5} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 800, color: "var(--s-text-1)" }}>Alerta criado!</p>
        <p style={{ fontSize: 13, color: "var(--s-text-3)", lineHeight: 1.6 }}>
          Voce sera notificado por e-mail quando{" "}
          {marca ? `um ${marca}${modelo ? " " + modelo : ""}` : "o veiculo que voce quer"} entrar no estoque.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 24px", borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Bell size={18} color="var(--s-orange)" strokeWidth={2} />
        <p style={{ fontSize: 15, fontWeight: 800, color: "var(--s-text-1)" }}>Me avise quando chegar</p>
      </div>
      <p style={{ fontSize: 13, color: "var(--s-text-3)", marginBottom: 18, lineHeight: 1.6 }}>
        Nao encontrou o que procura? Cadastre seu e-mail e te avisamos assim que o veiculo entrar no estoque.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome (opcional)"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)", color: "var(--s-text-1)", fontSize: 13, fontFamily: "inherit" }}
        />
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com *"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)", color: "var(--s-text-1)", fontSize: 13, fontFamily: "inherit" }}
        />
        {error && <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>}
        <button
          type="submit" disabled={sending}
          style={{ height: 44, borderRadius: 10, background: "var(--s-orange)", color: "#fff", border: "none", fontWeight: 800, fontSize: 13, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1, fontFamily: "inherit" }}
        >
          {sending ? "Cadastrando..." : "Quero ser avisado"}
        </button>
      </form>
    </div>
  );
}
