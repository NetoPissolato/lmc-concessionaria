"use client";

import React, { useState } from "react";
import { Bell, CheckCircle, Mail, User, ArrowRight, Loader } from "lucide-react";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL ?? "/api/v1") + "/public";

interface Props {
  marca?: string;
  modelo?: string;
  tipo?: string;
}

export default function AlerteMe({ marca, modelo, tipo }: Props) {
  const [email, setEmail]     = useState("");
  const [nome, setNome]       = useState("");
  const [sent, setSent]       = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) { setError("Informe um e-mail válido."); return; }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/availability-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), nome: nome.trim() || undefined, marca, modelo, tipo }),
      });
      if (res.ok) setSent(true);
      else setError("Erro ao cadastrar. Tente novamente.");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 12, padding: "36px 24px", textAlign: "center",
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "rgba(34,197,94,0.08)",
          border: "1.5px solid rgba(34,197,94,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <CheckCircle size={26} color="#22c55e" strokeWidth={1.5} />
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 800, color: "var(--s-text-1)", marginBottom: 6 }}>Alerta criado com sucesso!</p>
          <p style={{ fontSize: 13, color: "var(--s-text-3)", lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>
            Você será notificado por e-mail quando{" "}
            {marca ? `um ${marca}${modelo ? " " + modelo : ""}` : "o veículo que você procura"} entrar no estoque.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 16,
      border: "1.5px solid rgba(244,121,32,0.18)",
      background: "rgba(244,121,32,0.03)",
      padding: "24px 28px",
      marginTop: 8,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "rgba(244,121,32,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Bell size={17} color="var(--s-orange)" strokeWidth={2} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "var(--s-text-1)", lineHeight: 1.2 }}>Me avise quando chegar</p>
          <p style={{ fontSize: 12, color: "var(--s-text-3)", marginTop: 2 }}>
            Cadastre seu e-mail e avisamos quando o veículo entrar no estoque.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Inputs side-by-side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* Nome */}
          <div style={{ position: "relative" }}>
            <User size={14} color="var(--s-text-3)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome (opcional)"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "10px 12px 10px 32px",
                borderRadius: 10,
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                color: "var(--s-text-1)",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--s-orange)"}
              onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
            />
          </div>
          {/* Email */}
          <div style={{ position: "relative" }}>
            <Mail size={14} color="var(--s-text-3)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com *"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "10px 12px 10px 32px",
                borderRadius: 10,
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                color: "var(--s-text-1)",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--s-orange)"}
              onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
            />
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 12, color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
            <span>⚠</span> {error}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={sending}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              height: 42, padding: "0 22px",
              borderRadius: 10,
              background: sending ? "#f59e0b" : "var(--s-orange)",
              color: "#fff",
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              cursor: sending ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s, transform 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { if (!sending) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {sending
              ? <><Loader size={13} style={{ animation: "spin 1s linear infinite" }} /> Cadastrando...</>
              : <><ArrowRight size={14} /> Quero ser avisado</>}
          </button>
        </div>
      </form>
    </div>
  );
}
