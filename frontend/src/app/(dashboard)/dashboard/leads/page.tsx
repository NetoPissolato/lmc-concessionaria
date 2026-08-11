"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Phone, Mail, MessageSquare, ChevronDown, ChevronUp,
  Trash2, RefreshCw, Car, ExternalLink, AlertTriangle,
  ChevronLeft, ChevronRight,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("lmc_access_token") ?? "" : "");
const PAGE_SIZE = 20;

type LeadStatus = "novo" | "em_atendimento" | "proposta" | "fechado" | "perdido";

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  mensagem: string | null;
  veiculo_id: string | null;
  veiculo_descricao: string | null;
  status: LeadStatus;
  origem: string;
  observacoes: string | null;
  created_at: string;
}

const STATUS_CFG: Record<LeadStatus, { label: string; color: string; bg: string; border: string }> = {
  novo:           { label: "Novo",           color: "#60a5fa", bg: "rgba(96,165,250,0.10)",  border: "rgba(96,165,250,0.22)"  },
  em_atendimento: { label: "Em atendimento", color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.22)"  },
  proposta:       { label: "Proposta",       color: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.22)" },
  fechado:        { label: "Fechado",        color: "#34d399", bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.22)"  },
  perdido:        { label: "Perdido",        color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.22)" },
};
const ALL_STATUSES: LeadStatus[] = ["novo", "em_atendimento", "proposta", "fechado", "perdido"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function initials(nome: string) {
  const parts = nome.trim().split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
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

// ─── Status Dropdown ──────────────────────────────────────────────────────────
function StatusDropdown({ lead, token, onChange }: { lead: Lead; token: string; onChange(l: Lead): void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const cfg = STATUS_CFG[lead.status] ?? STATUS_CFG.novo;

  async function setStatus(status: LeadStatus) {
    setOpen(false);
    if (status === lead.status) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
      if (res.ok) onChange(await res.json());
    } finally { setLoading(false); }
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px 5px 8px", borderRadius: 7, background: cfg.bg, border: `1px solid ${cfg.border}`, cursor: "pointer", color: cfg.color, fontSize: 12, fontWeight: 700 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
        {cfg.label}
        <ChevronDown size={11} style={{ opacity: 0.6, marginLeft: 2 }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 16px 40px rgba(0,0,0,0.5)", minWidth: 190, overflow: "hidden" }}>
          {ALL_STATUSES.map(s => {
            const c = STATUS_CFG[s];
            const active = s === lead.status;
            return (
              <button key={s} onClick={() => setStatus(s)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: active ? c.bg : "none", border: "none", textAlign: "left", cursor: "pointer", fontSize: 13, color: active ? c.color : "var(--text-secondary)", fontWeight: active ? 700 : 400, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, count, color, active, onClick }: { label: string; count: number; color: string; active: boolean; onClick(): void }) {
  return (
    <button onClick={onClick} className="leads-kpi-card" style={{ padding: "14px 16px", borderRadius: 12, cursor: "pointer", textAlign: "left", background: active ? `${color}12` : "var(--surface)", border: `1.5px solid ${active ? color : "var(--border)"}`, transition: "all 140ms" }}>
      <p style={{ fontSize: 22, fontWeight: 900, color: active ? color : "var(--text-primary)", marginBottom: 2 }}>{count}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: active ? color : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
    </button>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const token = getToken();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "">("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);

  const fetchLeads = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = filterStatus ? `${API}/leads?status=${filterStatus}&limit=200` : `${API}/leads?limit=200`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.items ?? []);
        setCounts(data.counts ?? {});
      }
    } finally { setLoading(false); }
  }, [token, filterStatus]);

  useEffect(() => { fetchLeads(); setPage(1); }, [fetchLeads]);

  async function deleteLead(id: string) { if (!token) return; setConfirmDeleteId(id); }

  async function doDeleteLead(id: string) {
    setConfirmDeleteId(null); setDeletingId(id);
    try {
      await fetch(`${API}/leads/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setLeads(l => l.filter(x => x.id !== id));
    } finally { setDeletingId(null); }
  }

  async function saveNotes(lead: Lead) {
    if (!token) return;
    const obs = notes[lead.id] ?? lead.observacoes ?? "";
    setSavingNotes(s => ({ ...s, [lead.id]: true }));
    try {
      const res = await fetch(`${API}/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ observacoes: obs }) });
      if (res.ok) { const updated: Lead = await res.json(); setLeads(l => l.map(x => x.id === updated.id ? updated : x)); }
    } finally { setSavingNotes(s => ({ ...s, [lead.id]: false })); }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const totalPages = Math.ceil(leads.length / PAGE_SIZE);
  const paginated = leads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {confirmDeleteId && (
        <ConfirmModal
          message="Este lead sera removido permanentemente."
          onConfirm={() => doDeleteLead(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
      <style>{`
        .leads-kpi-card { flex: 1 1 130px; min-width: 130px; }
        .leads-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; transition:border-color 160ms,box-shadow 160ms; }
        .leads-card:hover { border-color:rgba(255,255,255,0.12); box-shadow:0 4px 20px rgba(0,0,0,0.25); }
        .leads-main-row { display:flex; align-items:center; gap:14px; padding:14px 16px; }
        .leads-left { flex:1; min-width:0; }
        .leads-right { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .leads-name { font-size:14px; font-weight:800; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .leads-meta { font-size:11px; color:var(--text-muted); margin-top:2px; }
        .leads-icon-btn { width:32px; height:32px; border-radius:8px; border:1px solid var(--border); background:var(--surface-2); cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text-muted); transition:all 120ms; }
        .leads-icon-btn:hover { border-color:rgba(255,255,255,0.15); color:var(--text-primary); }
        .leads-wpp { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:8px; background:rgba(37,211,102,0.08); border:1px solid rgba(37,211,102,0.18); color:#25D366; font-size:12px; font-weight:700; text-decoration:none; transition:all 120ms; white-space:nowrap; }
        .leads-wpp:hover { background:rgba(37,211,102,0.15); }
        .leads-page-btn { width:36px; height:36px; border-radius:9px; border:1px solid var(--border); background:var(--surface); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:var(--text-secondary); transition:all 120ms; }
        .leads-page-btn:hover:not(:disabled) { border-color:rgba(255,255,255,0.15); color:var(--text-primary); }
        @media (max-width:640px) {
          .leads-kpi-card { flex: 1 1 calc(50% - 5px); }
          .leads-main-row { flex-wrap:wrap; }
          .leads-right { width:100%; padding-bottom:4px; overflow-x:auto; }
        }
        @media (max-width:420px) { .leads-kpi-card { flex:1 1 100%; } }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            Leads <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 18 }}>/ CRM</span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
            {total} {total === 1 ? "contato recebido" : "contatos recebidos"}
          </p>
        </div>
        <button onClick={fetchLeads} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <KpiCard label="Todos" count={total} color="var(--brand)" active={filterStatus === ""} onClick={() => setFilterStatus("")} />
        {ALL_STATUSES.map(s => (
          <KpiCard key={s} label={STATUS_CFG[s].label} count={counts[s] ?? 0} color={STATUS_CFG[s].color} active={filterStatus === s} onClick={() => setFilterStatus(s)} />
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map(i => <div key={i} className="card skeleton" style={{ height: 72, borderRadius: 14 }} />)}
        </div>
      ) : leads.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <MessageSquare size={22} color="var(--text-muted)" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            {filterStatus ? `Nenhum lead com status "${STATUS_CFG[filterStatus as LeadStatus]?.label}"` : "Nenhum lead ainda"}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", maxWidth: 340 }}>
            Os contatos preenchidos no site aparecem aqui automaticamente.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {paginated.map(lead => {
              const isOpen = expanded === lead.id;
              const cfg = STATUS_CFG[lead.status] ?? STATUS_CFG.novo;
              const ini = initials(lead.nome);
              const wppLink = `https://wa.me/${lead.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(`Ola ${lead.nome}, recebemos seu contato e gostaríamos de dar continuidade.`)}`;

              return (
                <div key={lead.id} className="leads-card" style={{ borderLeft: `3px solid ${cfg.color}` }}>
                  <div className="leads-main-row">
                    {/* Avatar with initials */}
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 900, color: cfg.color, letterSpacing: "-0.5px" }}>
                      {ini || "?"}
                    </div>

                    {/* Info */}
                    <div className="leads-left">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span className="leads-name">{lead.nome}</span>
                        {lead.veiculo_descricao && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: "rgba(244,121,32,0.08)", border: "1px solid rgba(244,121,32,0.18)", fontSize: 11, color: "#f47920", fontWeight: 600 }}>
                            <Car size={10} /> {lead.veiculo_descricao}
                          </span>
                        )}
                      </div>
                      <p className="leads-meta">{fmtDate(lead.created_at)} · via {lead.origem}</p>
                    </div>

                    {/* Actions */}
                    <div className="leads-right">
                      <StatusDropdown lead={lead} token={token} onChange={updated => setLeads(l => l.map(x => x.id === updated.id ? updated : x))} />
                      <a href={wppLink} target="_blank" rel="noopener noreferrer" className="leads-wpp">
                        <ExternalLink size={12} /> WhatsApp
                      </a>
                      <button onClick={() => setExpanded(isOpen ? null : lead.id)} className="leads-icon-btn">
                        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <button onClick={() => deleteLead(lead.id)} disabled={deletingId === lead.id} className="leads-icon-btn" style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.20)", background: "rgba(239,68,68,0.05)" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        {lead.telefone && (
                          <a href={`tel:${lead.telefone}`} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-primary)", fontWeight: 600, textDecoration: "none" }}>
                            <Phone size={13} color="var(--text-muted)" /> {lead.telefone}
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-primary)", fontWeight: 600, textDecoration: "none" }}>
                            <Mail size={13} color="var(--text-muted)" /> {lead.email}
                          </a>
                        )}
                      </div>
                      {lead.mensagem && (
                        <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Mensagem</p>
                          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{lead.mensagem}</p>
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Anotacoes internas</p>
                        <textarea
                          value={notes[lead.id] ?? lead.observacoes ?? ""}
                          onChange={e => setNotes(n => ({ ...n, [lead.id]: e.target.value }))}
                          placeholder="Adicione observacoes sobre este contato..."
                          rows={3}
                          style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                        />
                        <button onClick={() => saveNotes(lead)} disabled={savingNotes[lead.id]} style={{ marginTop: 8, padding: "7px 18px", borderRadius: 8, background: "var(--brand)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: savingNotes[lead.id] ? 0.7 : 1 }}>
                          {savingNotes[lead.id] ? "Salvando..." : "Salvar anotacoes"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="leads-page-btn" style={{ opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? "default" : "pointer" }}>
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className="leads-page-btn" style={{ background: p === page ? "var(--brand)" : "var(--surface)", border: `1px solid ${p === page ? "var(--brand)" : "var(--border)"}`, color: p === page ? "#fff" : "var(--text-secondary)" }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="leads-page-btn" style={{ opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? "default" : "pointer" }}>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
