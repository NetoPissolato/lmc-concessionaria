"use client";

import React, { useState, useEffect } from "react";
import { Star, Send, CheckCircle } from "lucide-react";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL ?? "/api/v1") + "/public";

interface Review {
  id: string;
  nome: string;
  nota: number;
  texto: string;
  cidade: string | null;
  created_at: string;
}

function StarRating({ nota, size = 16 }: { nota: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          fill={i <= nota ? "#f59e0b" : "none"}
          color={i <= nota ? "#f59e0b" : "rgba(255,255,255,0.20)"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function ReviewCard({ r }: { r: Review }) {
  const date = new Date(r.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: "22px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      transition: "transform 200ms, box-shadow 200ms",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      <StarRating nota={r.nota} />
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, flex: 1 }}>
        &ldquo;{r.texto}&rdquo;
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{r.nome}</p>
          {r.cidade && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{r.cidade}</p>}
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{date}</p>
      </div>
    </div>
  );
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [nota, setNota] = useState(5);
  const [texto, setTexto] = useState("");
  const [hoverStar, setHoverStar] = useState(0);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/reviews?limit=12`)
      .then(r => r.json())
      .then(d => setReviews(Array.isArray(d) ? d : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (texto.trim().length < 10) { setError("Escreva pelo menos 10 caracteres."); return; }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), nota, texto: texto.trim(), cidade: cidade.trim() || undefined }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const d = await res.json();
        setError(d.detail ?? "Erro ao enviar. Tente novamente.");
      }
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  const avgNota = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.nota, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <section style={{ padding: "80px 0", background: "linear-gradient(180deg, #0d0f14 0%, #13151a 100%)" }}>
      <div className="s-container">
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "var(--s-orange)", marginBottom: 10 }}>
            Quem comprou, aprovou
          </p>
          <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 900, color: "#fff", letterSpacing: "-1px", marginBottom: 12 }}>
            O que nossos clientes dizem
          </h2>
          {avgNota && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 99, padding: "8px 18px" }}>
              <StarRating nota={Math.round(Number(avgNota))} size={15} />
              <span style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b" }}>{avgNota}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>de {reviews.length} avaliacao{reviews.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Reviews grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 56 }} className="s-reviews-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="s-skeleton" style={{ height: 160, borderRadius: 16 }} />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.30)", marginBottom: 56, fontSize: 14 }}>
            Nenhuma avaliacao publicada ainda. Seja o primeiro!
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 56 }} className="s-reviews-grid">
            {reviews.map(r => <ReviewCard key={r.id} r={r} />)}
          </div>
        )}

        {/* Submit form */}
        <div style={{ maxWidth: 560, margin: "0 auto", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "clamp(24px,4vw,40px)" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle size={28} color="#22c55e" strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 6 }}>Obrigado pelo feedback!</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                Sua avaliacao sera publicada apos revisao da equipe.
              </p>
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Deixe sua avaliacao</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", marginBottom: 24 }}>
                Sua opiniao nos ajuda a melhorar e ajuda outros clientes.
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Star picker */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "rgba(255,255,255,0.40)", marginBottom: 8 }}>Nota</p>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNota(i)}
                        onMouseEnter={() => setHoverStar(i)}
                        onMouseLeave={() => setHoverStar(0)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                      >
                        <Star
                          size={28}
                          fill={i <= (hoverStar || nota) ? "#f59e0b" : "none"}
                          color={i <= (hoverStar || nota) ? "#f59e0b" : "rgba(255,255,255,0.25)"}
                          strokeWidth={1.5}
                          style={{ transition: "fill 120ms, color 120ms", transform: hoverStar === i ? "scale(1.15)" : "none" }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "rgba(255,255,255,0.40)", display: "block", marginBottom: 6 }}>
                      Seu nome <span style={{ color: "var(--s-orange)" }}>*</span>
                    </label>
                    <input
                      type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="João Silva"
                      style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "rgba(255,255,255,0.40)", display: "block", marginBottom: 6 }}>
                      Cidade
                    </label>
                    <input
                      type="text" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="São Paulo, SP"
                      style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "rgba(255,255,255,0.40)", display: "block", marginBottom: 6 }}>
                    Sua experiencia <span style={{ color: "var(--s-orange)" }}>*</span>
                  </label>
                  <textarea
                    value={texto} onChange={e => setTexto(e.target.value)} required rows={4}
                    placeholder="Conte como foi sua experiencia na LMC Veiculos..."
                    style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 100, boxSizing: "border-box" }}
                  />
                </div>

                {error && (
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#ef4444", fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={sending}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, background: sending ? "rgba(244,121,32,0.6)" : "var(--s-orange)", color: "#fff", border: "none", fontWeight: 800, fontSize: 14, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 160ms" }}
                >
                  <Send size={15} strokeWidth={2} />
                  {sending ? "Enviando..." : "Enviar avaliacao"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .s-reviews-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 560px) { .s-reviews-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
