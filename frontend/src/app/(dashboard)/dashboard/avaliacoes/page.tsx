"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Star, CheckCircle, XCircle, Trash2, RefreshCw, MessageSquare, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("lmc_access_token") ?? "" : "");
const PAGE_SIZE = 20;

interface Review {
  id: string;
  nome: string;
  nota: number;
  texto: string;
  cidade: string | null;
  aprovado: boolean;
  created_at: string;
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm(): void; onCancel(): void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 28px 24px", maxWidth: 380, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={18} color="#ef4444" strokeWidth={2} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>Confirmar exclusao</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{message}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onCancel} style={{ padding: "8px 18px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Excluir</button>
        </div>
      </div>
    </div>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function StarRow({ nota, size = 13 }: { nota: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} fill={i <= nota ? "#f59e0b" : "none"} color={i <= nota ? "#f59e0b" : "rgba(255,255,255,0.15)"} strokeWidth={1.5} />
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, color, active, onClick }: { value: string | number; label: string; color: string; active: boolean; onClick(): void }) {
  return (
    <button onClick={onClick} className="av-stat-card" style={{ padding: "16px 18px", borderRadius: 12, textAlign: "left", cursor: "pointer", background: active ? `${color}10` : "var(--surface)", border: `1.5px solid ${active ? color : "var(--border)"}`, transition: "all 140ms" }}>
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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchReviews = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url =
        filter === "pendente" ? `${API}/reviews?aprovado=false&limit=200`
        : filter === "aprovado" ? `${API}/reviews?aprovado=true&limit=200`
        : `${API}/reviews?limit=200`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.items ?? data);
      }
    } finally { setLoading(false); }
  }, [token, filter]);

  useEffect(() => { fetchReviews(); setPage(1); }, [fetchReviews]);

  async function approve(id: string) {
    setActing(id);
    try {
      const res = await fetch(`${API}/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ aprovado: true }) });
      if (res.ok) setReviews(r => r.map(x => x.id === id ? { ...x, aprovado: true } : x));
    } finally { setActing(null); }
  }

  async function reject(id: string) {
    setActing(id);
    try {
      const res = await fetch(`${API}/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ aprovado: false }) });
      if (res.ok) setReviews(r => r.map(x => x.id === id ? { ...x, aprovado: false } : x));
    } finally { setActing(null); }
  }

  async function deleteReview(id: string) { setConfirmDelete(id); }
  async function doDelete(id: string) {
    setConfirmDelete(null); setActing(id);
    try {
      await fetch(`${API}/reviews/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setReviews(r => r.filter(x => x.id !== id));
    } finally { setActing(null); }
  }

  const pending  = reviews.filter(r => !r.aprovado).length;
  const approved = reviews.filter(r => r.aprovado).length;
  const avgNota  = reviews.length ? (reviews.reduce((s, r) => s + r.nota, 0) / reviews.length).toFixed(1) : "—";

  const totalPages = Math.ceil(reviews.length / PAGE_SIZE);
  const paginated = reviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {confirmDelete && (
        <ConfirmModal
          message="Esta avaliacao sera removida permanentemente."
          onConfirm={() => doDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      <style>{`
        .av-stat-card { flex: 1 1 120px; min-width: 120px; }
        .av-nota-card { flex: 1 1 120px; min-width: 120px; }
        .av-review-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; transition:border-color 160ms,box-shadow 160ms; }
        .av-review-card:hover { border-color:rgba(255,255,255,0.12); box-shadow:0 4px 20px rgba(0,0,0,0.25); }
        .av-card-body { padding:18px 20px; display:flex; align-items:flex-start; gap:16px; }
        .av-content { flex:1; min-width:0; }
        .av-actions { display:flex; gap:6px; flex-shrink:0; align-items:flex-start; padding-top:2px; }
        .av-action-btn { display:flex; align-items:center; gap:5px; padding:7px 14px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; transition:all 120ms; }
        .av-icon-btn { width:32px; height:32px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 120ms; }
        .av-page-btn { width:36px; height:36px; border-radius:9px; border:1px solid var(--border); background:var(--surface); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:var(--text-secondary); transition:all 120ms; }
        .av-page-btn:hover:not(:disabled) { border-color:rgba(255,255,255,0.15); color:var(--text-primary); }
        @media (max-width:640px) {
          .av-stat-card, .av-nota-card { flex:1 1 calc(50% - 5px); }
          .av-card-body { flex-direction:column; gap:12px; }
          .av-actions { width:100%; overflow-x:auto; }
        }
        @media (max-width:420px) {
          .av-stat-card, .av-nota-card { flex:1 1 100%; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Avaliacoes</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>Gerencie e publique as avaliacoes dos clientes</p>
        </div>
        <button onClick={fetchReviews} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard value={reviews.length} label="Total" color="var(--brand)" active={filter === ""} onClick={() => setFilter("")} />
        <StatCard value={pending}  label="Pendentes"  color="#f59e0b" active={filter === "pendente"} onClick={() => setFilter("pendente")} />
        <StatCard value={approved} label="Publicadas" color="#34d399" active={filter === "aprovado"} onClick={() => setFilter("aprovado")} />
        <div className="av-nota-card" style={{ padding: "16px 18px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <p style={{ fontSize: 26, fontWeight: 900, color: "#f59e0b", letterSpacing: "-1px" }}>{avgNota}</p>
            <Star size={16} fill="#f59e0b" color="#f59e0b" />
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Nota media</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map(i => <div key={i} className="card skeleton" style={{ height: 110, borderRadius: 14 }} />)}
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <MessageSquare size={22} color="var(--text-muted)" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            {filter ? "Nenhuma avaliacao com este status" : "Nenhuma avaliacao ainda"}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            As avaliacoes enviadas pelos clientes aparecerao aqui.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {paginated.map(review => {
              const date = new Date(review.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
              const isPending = !review.aprovado;
              const borderColor = isPending ? "#f59e0b" : "#34d399";
              const avatarBg = isPending ? "rgba(245,158,11,0.10)" : "rgba(52,211,153,0.10)";
              const avatarBorder = isPending ? "rgba(245,158,11,0.22)" : "rgba(52,211,153,0.22)";
              const avatarColor = isPending ? "#f59e0b" : "#34d399";

              return (
                <div key={review.id} className="av-review-card" style={{ borderLeft: `3px solid ${borderColor}` }}>
                  <div className="av-card-body">
                    {/* Avatar */}
                    <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: avatarBg, border: `1px solid ${avatarBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: avatarColor }}>
                      {review.nome.charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="av-content">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{review.nome}</span>
                        {review.cidade && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{review.cidade}</span>}
                        <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: isPending ? "rgba(245,158,11,0.10)" : "rgba(52,211,153,0.10)", color: isPending ? "#f59e0b" : "#34d399", border: `1px solid ${isPending ? "rgba(245,158,11,0.22)" : "rgba(52,211,153,0.22)"}` }}>
                          {isPending ? "Pendente" : "Publicada"}
                        </span>
                      </div>
                      <StarRow nota={review.nota} />
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, marginTop: 8, fontStyle: "italic" }}>
                        &ldquo;{review.texto}&rdquo;
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{date}</p>
                    </div>

                    {/* Actions */}
                    <div className="av-actions">
                      {isPending ? (
                        <button onClick={() => approve(review.id)} disabled={acting === review.id} className="av-action-btn" style={{ background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399", opacity: acting === review.id ? 0.6 : 1 }}>
                          <CheckCircle size={13} strokeWidth={2} /> Publicar
                        </button>
                      ) : (
                        <button onClick={() => reject(review.id)} disabled={acting === review.id} className="av-action-btn" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)", color: "#f59e0b", opacity: acting === review.id ? 0.6 : 1 }}>
                          <XCircle size={13} strokeWidth={2} /> Despublicar
                        </button>
                      )}
                      <button onClick={() => deleteReview(review.id)} disabled={acting === review.id} className="av-icon-btn" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", opacity: acting === review.id ? 0.5 : 1 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="av-page-btn" style={{ opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? "default" : "pointer" }}>
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className="av-page-btn" style={{ background: p === page ? "var(--brand)" : "var(--surface)", border: `1px solid ${p === page ? "var(--brand)" : "var(--border)"}`, color: p === page ? "#fff" : "var(--text-secondary)" }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="av-page-btn" style={{ opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? "default" : "pointer" }}>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
