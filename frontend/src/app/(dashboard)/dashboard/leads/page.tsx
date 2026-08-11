"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  User, Phone, Mail, MessageSquare, ChevronDown, ChevronUp,
  Trash2, RefreshCw, Car, ArrowUpRight, Circle, AlertTriangle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("lmc_access_token") ?? "" : "");

type LeadStatus = "novo" | "em_atendimento" | "proposta" | "fechado" | "perdido";

// ─── Confirm Modal ───────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string; onConfirm(): void; onCancel(): void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: "28px 28px 24px", maxWidth: 380, width: "100%",
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AlertTriangle size={18} color="#ef4444" strokeWidth={2} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>Confirmar exclusao</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{message}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onCancel} style={{
            padding: "8px 18px", borderRadius: 9,
            border: "1px solid var(--border)", background: "var(--surface-2)",
            color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancelar</button>
          <button onClick={onConfirm} style={{
            padding: "8px 18px", borderRadius: 9,
            border: "none", background: "#ef4444",
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>Excluir</button>
        </div>
      </div>
    </div>
  );
}

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

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; border: string }> = {
  novo:           { label: "Novo",           color: "#60a5fa", bg: "rgba(96,165,250,0.08)",   border: "rgba(96,165,250,0.20)"  },
  em_atendimento: { label: "Em atendimento", color: "#fbbf24", bg: "rgba(251,191,36,0.08)",   border: "rgba(251,191,36,0.20)"  },
  proposta:       { label: "Proposta",       color: "#a78bfa", bg: "rgba(167,139,250,0.08)",  border: "rgba(167,139,250,0.20)" },
  fechado:        { label: "Fechado",        color: "#34d399", bg: "rgba(52,211,153,0.08)",   border: "rgba(52,211,153,0.20)"  },
  perdido:        { label: "Perdido",        color: "#f87171", bg: "rgba(248,113,113,0.08)",  border: "rgba(248,113,113,0.20)" },
};

const ALL_STATUSES: LeadStatus[] = ["novo", "em_atendimento", "proposta", "fechado", "perdido"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatusPill({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.novo;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 6,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.02em",
      border: `1px solid ${cfg.border}`,
    }}>
      <Circle size={5} fill={cfg.color} color={cfg.color} />
      {cfg.label}
    </span>
  );
}

function StatusDropdown({ lead, token, onChange }: { lead: Lead; token: string; onChange(l: Lead): void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function setStatus(status: LeadStatus) {
    setOpen(false);
    if (status === lead.status) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) onChange(await res.json());
    } finally { setLoading(false); }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "var(--surface-2)", border: "1px solid var(--border)",
          borderRadius: 7, padding: "5px 10px", cursor: "pointer",
          color: "var(--text-secondary)", fontSize: 12,
        }}
      >
        <StatusPill status={lead.status} />
        <ChevronDown size={11} style={{ opacity: 0.5 }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          minWidth: 190, overflow: "hidden",
        }}>
          {ALL_STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s];
            const active = s === lead.status;
            return (
              <button key={s} onClick={() => setStatus(s)} style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "10px 14px",
                background: active ? cfg.bg : "none", border: "none",
                textAlign: "left", cursor: "pointer",
                fontSize: 13, color: active ? cfg.color : "var(--text-secondary)",
                fontWeight: active ? 700 : 400,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <Circle size={6} fill={cfg.color} color={cfg.color} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, count, color, active, onClick }: {
  label: string; count: number; color: string; active: boolean; onClick(): void;
}) {
  return (
    <button onClick={onClick} className="leads-kpi-card" style={{
      padding: "14px 16px",
      borderRadius: 12, cursor: "pointer", textAlign: "left",
      background: active ? `${color}12` : "var(--surface)",
      border: `1.5px solid ${active ? color : "var(--border)"}`,
      transition: "all 140ms",
    }}>
      <p style={{ fontSize: 22, fontWeight: 900, color: active ? color : "var(--text-primary)", marginBottom: 2 }}>{count}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: active ? color : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
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

  const fetchLeads = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = filterStatus ? `${API}/leads?status=${filterStatus}&limit=100` : `${API}/leads?limit=100`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.items ?? []);
        setCounts(data.counts ?? {});
      }
    } finally { setLoading(false); }
  }, [token, filterStatus]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function deleteLead(id: string) {
    if (!token) return;
    setConfirmDeleteId(id);
  }

  async function doDeleteLead(id: string) {
    setConfirmDeleteId(null);
    setDeletingId(id);
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
      const res = await fetch(`${API}/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ observacoes: obs }),
      });
      if (res.ok) {
        const updated: Lead = await res.json();
        setLeads(l => l.map(x => x.id === updated.id ? updated : x));
      }
    } finally { setSavingNotes(s => ({ ...s, [lead.id]: false })); }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

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
        .leads-main-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; flex-wrap:wrap; }
        .leads-left { display:flex; align-items:center; gap:12px; min-width:0; flex:1; }
        .leads-right { display:flex; align-items:center; gap:6px; flex-shrink:0; flex-wrap:nowrap; }
        .leads-name { font-size:14px; font-weight:800; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; }
        @media (max-width:640px) {
          .leads-kpi-card { flex: 1 1 calc(50% - 5px); min-width: calc(50% - 5px); }
          .leads-left { min-width:0; flex:1 1 100%; }
          .leads-right { flex:1 1 100%; padding:0 16px 12px; margin-top:-4px; overflow-x:auto; }
          .leads-name { max-width:140px; }
        }
        @media (max-width:420px) {
          .leads-kpi-card { flex:1 1 100%; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            Leads <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 18 }}>/ CRM</span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
            {total} {total === 1 ? "contato recebido" : "contatos recebidos"}
          </p>
        </div>
        <button
          onClick={fetchLeads}
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

      {/* ── KPI strip ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <KpiCard
          label="Todos" count={total} color="var(--brand)"
          active={filterStatus === ""}
          onClick={() => setFilterStatus("")}
        />
        {ALL_STATUSES.map(s => (
          <KpiCard key={s}
            label={STATUS_CONFIG[s].label}
            count={counts[s] ?? 0}
            color={STATUS_CONFIG[s].color}
            active={filterStatus === s}
            onClick={() => setFilterStatus(s)}
          />
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card skeleton" style={{ height: 72, borderRadius: 12 }} />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "80px 24px", borderRadius: 16,
          background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <MessageSquare size={22} color="var(--text-muted)" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            {filterStatus ? `Nenhum lead com status "${STATUS_CONFIG[filterStatus as LeadStatus]?.label}"` : "Nenhum lead ainda"}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", maxWidth: 340 }}>
            Os contatos preenchidos no site aparecem aqui automaticamente.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {leads.map(lead => {
            const isOpen = expanded === lead.id;
            const cfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.novo;
            const wppLink = `https://wa.me/${lead.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(`Ola ${lead.nome}, recebemos seu contato e gostaríamos de dar continuidade.`)}`;

            return (
              <div key={lead.id} style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 13,
                overflow: "hidden",
                borderLeft: `3px solid ${cfg.color}`,
              }}>
                {/* Main row */}
                <div className="leads-main-row">
                  {/* Left: identity */}
                  <div className="leads-left">
                    <div style={{
                      width: 36, height: 36, borderRadius: 9,
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <User size={16} color={cfg.color} strokeWidth={2} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <p className="leads-name">{lead.nome}</p>
                        <StatusPill status={lead.status} />
                        {lead.veiculo_descricao && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "2px 8px", borderRadius: 6,
                            background: "rgba(244,121,32,0.08)", border: "1px solid rgba(244,121,32,0.18)",
                            fontSize: 11, color: "#f47920", fontWeight: 600,
                          }}>
                            <Car size={10} />
                            {lead.veiculo_descricao}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {fmtDate(lead.created_at)} &middot; via {lead.origem}
                      </p>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="leads-right">
                    <StatusDropdown
                      lead={lead} token={token}
                      onChange={updated => setLeads(l => l.map(x => x.id === updated.id ? updated : x))}
                    />
                    <a href={wppLink} target="_blank" rel="noopener noreferrer" style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "6px 12px", borderRadius: 8,
                      background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.20)",
                      color: "#25D366", fontSize: 12, fontWeight: 700, textDecoration: "none",
                    }}>
                      <ArrowUpRight size={12} />
                      WhatsApp
                    </a>
                    <button
                      onClick={() => setExpanded(isOpen ? null : lead.id)}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "var(--surface-2)", border: "1px solid var(--border)",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button
                      onClick={() => deleteLead(lead.id)} disabled={deletingId === lead.id}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#ef4444",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Contact info */}
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      {lead.telefone && (
                        <a href={`tel:${lead.telefone}`} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-primary)", fontWeight: 600, textDecoration: "none" }}>
                          <Phone size={13} color="var(--text-muted)" />
                          {lead.telefone}
                        </a>
                      )}
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-primary)", fontWeight: 600, textDecoration: "none" }}>
                          <Mail size={13} color="var(--text-muted)" />
                          {lead.email}
                        </a>
                      )}
                    </div>

                    {/* Message */}
                    {lead.mensagem && (
                      <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Mensagem</p>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{lead.mensagem}</p>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Anotacoes internas</p>
                      <textarea
                        value={notes[lead.id] ?? lead.observacoes ?? ""}
                        onChange={e => setNotes(n => ({ ...n, [lead.id]: e.target.value }))}
                        placeholder="Adicione observacoes sobre este contato..."
                        rows={3}
                        style={{
                          width: "100%", background: "var(--surface-2)",
                          border: "1px solid var(--border)", borderRadius: 9,
                          padding: "10px 12px", color: "var(--text-primary)",
                          fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box",
                        }}
                      />
                      <button onClick={() => saveNotes(lead)} disabled={savingNotes[lead.id]} style={{
                        marginTop: 8, padding: "7px 18px", borderRadius: 8,
                        background: "var(--brand)", border: "none",
                        color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        opacity: savingNotes[lead.id] ? 0.7 : 1,
                      }}>
                        {savingNotes[lead.id] ? "Salvando..." : "Salvar anotacoes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
