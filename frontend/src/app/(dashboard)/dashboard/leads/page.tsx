"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  User, Phone, Mail, MessageSquare, ChevronDown,
  Trash2, RefreshCw, Car,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("lmc_access_token") ?? "" : "");

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

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  novo:           { label: "Novo",           color: "#3b82f6", bg: "rgba(59,130,246,0.10)" },
  em_atendimento: { label: "Em atendimento", color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  proposta:       { label: "Proposta",       color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" },
  fechado:        { label: "Fechado",        color: "#22c55e", bg: "rgba(34,197,94,0.10)"  },
  perdido:        { label: "Perdido",        color: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
};

const ALL_STATUSES: LeadStatus[] = ["novo", "em_atendimento", "proposta", "fechado", "perdido"];

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.novo;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:99, background:cfg.bg, color:cfg.color, fontSize:11, fontWeight:700 }}>
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
      if (res.ok) {
        const updated: Lead = await res.json();
        onChange(updated);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"1px solid rgba(255,255,255,0.10)", borderRadius:8, padding:"5px 10px", cursor:"pointer", color:"var(--text-primary)", fontSize:12, fontWeight:600 }}
      >
        <StatusBadge status={lead.status} />
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, background:"#1e2028", border:"1px solid rgba(255,255,255,0.10)", borderRadius:10, boxShadow:"0 12px 32px rgba(0,0,0,0.5)", zIndex:100, minWidth:180, overflow:"hidden" }}>
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              style={{ display:"block", width:"100%", padding:"10px 14px", background:"none", border:"none", textAlign:"left", cursor:"pointer", fontSize:13, color: s === lead.status ? STATUS_CONFIG[s].color : "rgba(255,255,255,0.7)", fontWeight: s === lead.status ? 700 : 500, borderBottom:"1px solid rgba(255,255,255,0.05)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  const token = getToken();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "">("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});

  const fetchLeads = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = filterStatus
        ? `${API}/leads?status=${filterStatus}&limit=100`
        : `${API}/leads?limit=100`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.items ?? []);
        setCounts(data.counts ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function deleteLead(id: string) {
    if (!token || !confirm("Remover este lead?")) return;
    setDeletingId(id);
    try {
      await fetch(`${API}/leads/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setLeads(l => l.filter(x => x.id !== id));
    } finally {
      setDeletingId(null);
    }
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
    } finally {
      setSavingNotes(s => ({ ...s, [lead.id]: false }));
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ maxWidth:900, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, gap:12, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:"var(--text-primary)", marginBottom:4 }}>Leads / CRM</h1>
          <p style={{ fontSize:13, color:"var(--text-secondary)" }}>{total} lead{total !== 1 ? "s" : ""} no total</p>
        </div>
        <button
          onClick={fetchLeads}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:10, border:"1px solid rgba(255,255,255,0.12)", background:"none", color:"var(--text-secondary)", fontSize:13, fontWeight:600, cursor:"pointer" }}
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Status pills */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
        <button
          onClick={() => setFilterStatus("")}
          style={{ padding:"6px 14px", borderRadius:99, border:"1.5px solid", fontSize:12, fontWeight:700, cursor:"pointer",
            borderColor: filterStatus === "" ? "var(--accent)" : "rgba(255,255,255,0.12)",
            background:  filterStatus === "" ? "rgba(244,121,32,0.10)" : "none",
            color:       filterStatus === "" ? "var(--accent)" : "var(--text-secondary)" }}
        >
          Todos ({total})
        </button>
        {ALL_STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          const count = counts[s] ?? 0;
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ padding:"6px 14px", borderRadius:99, border:"1.5px solid", fontSize:12, fontWeight:700, cursor:"pointer",
                borderColor: filterStatus === s ? cfg.color : "rgba(255,255,255,0.12)",
                background:  filterStatus === s ? cfg.bg : "none",
                color:       filterStatus === s ? cfg.color : "rgba(255,255,255,0.50)" }}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Leads list */}
      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"var(--text-secondary)" }}>Carregando leads...</div>
      ) : leads.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:"var(--text-secondary)" }}>
          <MessageSquare size={40} style={{ opacity:0.3, margin:"0 auto 12px", display:"block" }} />
          <p style={{ fontWeight:600 }}>Nenhum lead {filterStatus ? "com este status" : "ainda"}</p>
          <p style={{ fontSize:12, marginTop:4 }}>Os leads aparecem aqui quando o formulario de contato e preenchido.</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {leads.map(lead => {
            const isExpanded = expanded === lead.id;
            const cfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.novo;
            const dateStr = new Date(lead.created_at).toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
            const wppLink = `https://wa.me/${lead.telefone.replace(/\D/g, "")}?text=${encodeURIComponent("Ola " + lead.nome + ", recebemos seu contato e gostaríamos de dar continuidade.")}`;

            return (
              <div key={lead.id} style={{ background:"var(--card-bg, #1a1d24)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, overflow:"hidden", borderLeft:`3px solid ${cfg.color}`, transition:"box-shadow 180ms" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.3)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                {/* Lead header row */}
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", flexWrap:"wrap" }}>
                  <div style={{ width:38, height:38, borderRadius:"50%", background:cfg.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <User size={17} color={cfg.color} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:800, color:"var(--text-primary)" }}>{lead.nome}</p>
                    <p style={{ fontSize:11, color:"rgba(255,255,255,0.40)" }}>{dateStr} &middot; {lead.origem}</p>
                  </div>
                  {lead.veiculo_descricao && (
                    <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:8, background:"rgba(244,121,32,0.07)", border:"1px solid rgba(244,121,32,0.15)" }}>
                      <Car size={11} color="#f47920" />
                      <span style={{ fontSize:11, color:"#f47920", fontWeight:600 }}>{lead.veiculo_descricao}</span>
                    </div>
                  )}
                  <StatusDropdown
                    lead={lead}
                    token={token}
                    onChange={updated => setLeads(l => l.map(x => x.id === updated.id ? updated : x))}
                  />
                  <div style={{ display:"flex", gap:6 }}>
                    <a href={wppLink} target="_blank" rel="noopener noreferrer"
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, background:"rgba(37,211,102,0.10)", border:"1px solid rgba(37,211,102,0.20)", color:"#25D366", fontSize:12, fontWeight:700, textDecoration:"none" }}>
                      <Phone size={12} />
                      WPP
                    </a>
                    <button onClick={() => setExpanded(isExpanded ? null : lead.id)}
                      style={{ padding:"6px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.10)", background:"none", cursor:"pointer", color:"rgba(255,255,255,0.50)", display:"flex", alignItems:"center" }}>
                      <ChevronDown size={14} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition:"transform 200ms" }} />
                    </button>
                    <button onClick={() => deleteLead(lead.id)} disabled={deletingId === lead.id}
                      style={{ padding:"6px 10px", borderRadius:8, border:"1px solid rgba(239,68,68,0.15)", background:"rgba(239,68,68,0.06)", cursor:"pointer", color:"#ef4444", display:"flex", alignItems:"center" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded row */}
                {isExpanded && (
                  <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"16px 18px", display:"flex", flexDirection:"column", gap:12 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:10 }}>
                      {lead.telefone && (
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <Phone size={13} color="rgba(255,255,255,0.40)" />
                          <a href={`tel:${lead.telefone}`} style={{ fontSize:13, color:"var(--text-primary)", fontWeight:600, textDecoration:"none" }}>{lead.telefone}</a>
                        </div>
                      )}
                      {lead.email && (
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <Mail size={13} color="rgba(255,255,255,0.40)" />
                          <a href={`mailto:${lead.email}`} style={{ fontSize:13, color:"var(--text-primary)", fontWeight:600, textDecoration:"none" }}>{lead.email}</a>
                        </div>
                      )}
                    </div>
                    {lead.mensagem && (
                      <div style={{ padding:"10px 14px", background:"rgba(255,255,255,0.03)", borderRadius:10, border:"1px solid rgba(255,255,255,0.06)" }}>
                        <p style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:0.8, marginBottom:5 }}>Mensagem</p>
                        <p style={{ fontSize:13, color:"rgba(255,255,255,0.70)", lineHeight:1.6 }}>{lead.mensagem}</p>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>Observacoes internas</p>
                      <textarea
                        value={notes[lead.id] ?? lead.observacoes ?? ""}
                        onChange={e => setNotes(n => ({ ...n, [lead.id]: e.target.value }))}
                        placeholder="Anotacoes da equipe..."
                        rows={3}
                        style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.10)", borderRadius:10, padding:"10px 12px", color:"var(--text-primary)", fontSize:13, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}
                      />
                      <button onClick={() => saveNotes(lead)} disabled={savingNotes[lead.id]}
                        style={{ marginTop:8, padding:"7px 16px", borderRadius:8, background:"var(--accent, #f47920)", border:"none", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", opacity: savingNotes[lead.id] ? 0.7 : 1 }}>
                        {savingNotes[lead.id] ? "Salvando..." : "Salvar observacoes"}
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
