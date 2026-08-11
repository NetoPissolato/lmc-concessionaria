"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Star, CheckCircle, XCircle, Trash2, RefreshCw } from "lucide-react";

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

function StarRow({ nota }: { nota: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={13} fill={i <= nota ? "#f59e0b" : "none"} color={i <= nota ? "#f59e0b" : "rgba(255,255,255,0.20)"} strokeWidth={1.5} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const token = getToken();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"" | "pendente" | "aprovado">("pendente");
  const [acting, setActing] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = filterStatus === "pendente"
        ? `${API}/reviews?aprovado=false&limit=100`
        : filterStatus === "aprovado"
        ? `${API}/reviews?aprovado=true&limit=100`
        : `${API}/reviews?limit=100`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.items ?? data);
      }
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus]);

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
    if (!confirm("Remover esta avaliacao?")) return;
    setActing(id);
    try {
      await fetch(`${API}/reviews/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setReviews(r => r.filter(x => x.id !== id));
    } finally { setActing(null); }
  }

  const pending  = reviews.filter(r => !r.aprovado).length;
  const approved = reviews.filter(r => r.aprovado).length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text-primary)", marginBottom: 4 }}>Avaliacoes</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {pending} pendente{pending !== 1 ? "s" : ""} &middot; {approved} publicada{approved !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={fetchReviews}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "none", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Status pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {([["", "Todas"], ["pendente", "Pendentes"], ["aprovado", "Aprovadas"]] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            style={{ padding: "6px 14px", borderRadius: 99, border: "1.5px solid", fontSize: 12, fontWeight: 700, cursor: "pointer",
              borderColor: filterStatus === val ? "var(--accent)" : "rgba(255,255,255,0.12)",
              background:  filterStatus === val ? "rgba(244,121,32,0.10)" : "none",
              color:       filterStatus === val ? "var(--accent)" : "rgba(255,255,255,0.50)" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>Carregando avaliacoes...</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>
          <Star size={40} style={{ opacity: 0.3, margin: "0 auto 12px", display: "block" }} />
          <p style={{ fontWeight: 600 }}>Nenhuma avaliacao {filterStatus ? "com este status" : "ainda"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reviews.map(review => {
            const date = new Date(review.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
            return (
              <div key={review.id} style={{
                background: "var(--card-bg, #1a1d24)",
                border: `1px solid ${review.aprovado ? "rgba(34,197,94,0.20)" : "rgba(245,158,11,0.15)"}`,
                borderRadius: 14,
                padding: "16px 18px",
                borderLeft: `3px solid ${review.aprovado ? "#22c55e" : "#f59e0b"}`,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{review.nome}</p>
                      {review.cidade && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{review.cidade}</p>}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                        background: review.aprovado ? "rgba(34,197,94,0.10)" : "rgba(245,158,11,0.10)",
                        color: review.aprovado ? "#22c55e" : "#f59e0b" }}>
                        {review.aprovado ? "Publicada" : "Pendente"}
                      </span>
                    </div>
                    <StarRow nota={review.nota} />
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginTop: 8 }}>
                      &ldquo;{review.texto}&rdquo;
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>{date}</p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {!review.aprovado && (
                      <button onClick={() => approve(review.id)} disabled={acting === review.id}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        <CheckCircle size={13} />
                        Aprovar
                      </button>
                    )}
                    {review.aprovado && (
                      <button onClick={() => reject(review.id)} disabled={acting === review.id}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)", color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        <XCircle size={13} />
                        Despublicar
                      </button>
                    )}
                    <button onClick={() => deleteReview(review.id)} disabled={acting === review.id}
                      style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center" }}>
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
