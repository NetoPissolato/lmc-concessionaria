"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Star, CheckCircle, XCircle, Trash2, RefreshCw, MessageSquare } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("lmc_access_token") ?? "" : "");

interface Review {
  id: string;
  nome: string;
  nota: number;
  texto: string;
  cidade: string | null;
  aprovado: boolean;
  created_at: string;
}

// ─── Star Row ─────────────────────────────────────────────────────────────────
function StarRow({ nota, size = 13 }: { nota: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i} size={size}
          fill={i <= nota ? "#f59e0b" : "none"}
          color={i <= nota ? "#f59e0b" : "rgba(255,255,255,0.15)"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, color, active, onClick }: {
  value: string | number; label: string; color: string; active: boolean; onClick(): void;
}) {
  return (
    <button onClick={onClick} className="av-stat-card" style={{
      padding: "16px 18px",
      borderRadius: 12, textAlign: "left", cursor: "pointer",
      background: active ? `${color}10` : "var(--surface)",
      border: `1.5px solid ${active ? color : "var(--border)"}`,
      transition: "all 140ms",
    }}>
      <p style={{ fontSize: 26, fontWeight: 900, color: active ? color : "var(--text-primary)", letterSpacing: "-1px", marginBottom: 2 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: active ? color : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ReviewsPage() {
  const token = getToken();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"" | "pendente" | "aprovado">("");
  const [acting, setActing] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url =
        filter === "pendente" ? `${API}/reviews?aprovado=false&limit=100`
        : filter === "aprovado" ? `${API}/reviews?aprovado=true&limit=100`
        : `${API}/reviews?limit=100`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.items ?? data);
      }
    } finally { setLoading(false); }
  }, [token, filter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  async function approve(id: string) {
    setActing(id);
    try {
      const res = await fetch(`${API}/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aprovado: true }),
      });
      if (res.ok) setReviews(r => r.map(x => x.id === id ? { ...x, aprovado: true } : x));
    } finally { setActing(null); }
  }

  async function reject(id: string) {
    setActing(id);
    try {
      const res = await fetch(`${API}/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aprovado: false }),
      });
      if (res.ok) setReviews(r => r.map(x => x.id === id ? { ...x, aprovado: false } : x));
    } finally { setActing(null); }
  }

  async function deleteReview(id: string) {
    if (!confirm("Remover esta avaliacao permanentemente?")) return;
    setActing(id);
    try {
      await fetch(`${API}/reviews/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setReviews(r => r.filter(x => x.id !== id));
    } finally { setActing(null); }
  }

  const allReviews = reviews; // stored per-filter
  const pending  = filter === "" ? reviews.filter(r => !r.aprovado).length : (filter === "pendente" ? reviews.length : 0);
  const approved = filter === "" ? reviews.filter(r => r.aprovado).length  : (filter === "aprovado"  ? reviews.length : 0);
  const avgNota  = reviews.length ? (reviews.reduce((s, r) => s + r.nota, 0) / reviews.length).toFixed(1) : "—";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <style>{`
        .av-stat-card { flex: 1 1 120px; min-width: 120px; }
        .av-stat-nota { flex: 1 1 120px; min-width: 120px; }
        .av-card-body { padding:16px 18px; display:flex; align-items:flex-start; gap:16px; flex-wrap:wrap; }
        .av-content { flex:1; min-width:0; }
        .av-actions { display:flex; gap:6px; flex-shrink:0; align-items:center; }
        @media (max-width:640px) {
          .av-stat-card { flex:1 1 calc(50% - 5px); min-width:calc(50% - 5px); }
          .av-stat-nota { flex:1 1 calc(50% - 5px); min-width:calc(50% - 5px); }
          .av-card-body { flex-direction:column; gap:10px; }
          .av-actions { width:100%; flex-wrap:nowrap; overflow-x:auto; }
        }
        @media (max-width:420px) {
          .av-stat-card, .av-stat-nota { flex:1 1 100%; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Avaliacoes</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
            Gerencie e publique as avaliacoes dos clientes
          </p>
        </div>
        <button
          onClick={fetchReviews}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 9,
            border: "1px solid var(--border)", background: "var(--surface)",
            color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          <RefreshCw size={13} />
          Atualizar
        </button>
      </div>

      {/* ── Stat strip ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard
          value={reviews.length} label="Total" color="var(--brand)"
          active={filter === ""} onClick={() => setFilter("")}
        />
        <StatCard
          value={pending} label="Pendentes" color="#f59e0b"
          active={filter === "pendente"} onClick={() => setFilter("pendente")}
        />
        <StatCard
          value={approved} label="Publicadas" color="#34d399"
          active={filter === "aprovado"} onClick={() => setFilter("aprovado")}
        />
        <div className="av-stat-nota" style={{
          padding: "16px 18px",
          borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <p style={{ fontSize: 26, fontWeight: 900, color: "#f59e0b", letterSpacing: "-1px" }}>{avgNota}</p>
            <Star size={16} fill="#f59e0b" color="#f59e0b" style={{ marginBottom: 2 }} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Nota media</p>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="card skeleton" style={{ height: 96, borderRadius: 13 }} />)}
        </div>
      ) : allReviews.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "80px 24px", borderRadius: 16,
          background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <MessageSquare size={22} color="var(--text-muted)" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            {filter ? "Nenhuma avaliacao com este status" : "Nenhuma avaliacao ainda"}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            As avaliacoes enviadas pelos clientes apareceram aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allReviews.map(review => {
            const date = new Date(review.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
            const isPending = !review.aprovado;
            return (
              <div key={review.id} style={{
                background: "var(--surface)",
                border: `1px solid ${isPending ? "rgba(245,158,11,0.20)" : "rgba(52,211,153,0.15)"}`,
                borderRadius: 13,
                borderLeft: `3px solid ${isPending ? "#f59e0b" : "#34d399"}`,
                overflow: "hidden",
              }}>
                <div className="av-card-body">

                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: isPending ? "rgba(245,158,11,0.10)" : "rgba(52,211,153,0.10)",
                    border: `1px solid ${isPending ? "rgba(245,158,11,0.20)" : "rgba(52,211,153,0.20)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800, color: isPending ? "#f59e0b" : "#34d399",
                  }}>
                    {review.nome.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="av-content">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{review.nome}</span>
                      {review.cidade && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{review.cidade}</span>
                      )}
                      <span style={{
                        padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                        background: isPending ? "rgba(245,158,11,0.10)" : "rgba(52,211,153,0.10)",
                        color: isPending ? "#f59e0b" : "#34d399",
                        border: `1px solid ${isPending ? "rgba(245,158,11,0.20)" : "rgba(52,211,153,0.20)"}`,
                      }}>
                        {isPending ? "Pendente" : "Publicada"}
                      </span>
                    </div>
                    <StarRow nota={review.nota} />
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, marginTop: 8 }}>
                      &ldquo;{review.texto}&rdquo;
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{date}</p>
                  </div>

                  {/* Actions */}
                  <div className="av-actions">
                    {isPending ? (
                      <button
                        onClick={() => approve(review.id)}
                        disabled={acting === review.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "7px 14px", borderRadius: 8,
                          background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)",
                          color: "#34d399", fontSize: 12, fontWeight: 700, cursor: "pointer",
                          opacity: acting === review.id ? 0.6 : 1,
                        }}
                      >
                        <CheckCircle size={13} strokeWidth={2} />
                        Publicar
                      </button>
                    ) : (
                      <button
                        onClick={() => reject(review.id)}
                        disabled={acting === review.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "7px 14px", borderRadius: 8,
                          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)",
                          color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer",
                          opacity: acting === review.id ? 0.6 : 1,
                        }}
                      >
                        <XCircle size={13} strokeWidth={2} />
                        Despublicar
                      </button>
                    )}
                    <button
                      onClick={() => deleteReview(review.id)}
                      disabled={acting === review.id}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                        color: "#ef4444", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: acting === review.id ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
