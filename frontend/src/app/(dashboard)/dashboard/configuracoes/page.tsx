"use client";

import React, { useState, useEffect, useCallback } from "react";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.71 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.29 6.29l.87-.87a2 2 0 0 1 2.11-.45c.91.35 1.85.58 2.81.71a2 2 0 0 1 1.72 2.02z"/>
  </svg>
);
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconWhatsApp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);
const IconInstagram = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const IconFacebook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const IconYouTube = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
  </svg>
);
const IconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
  </svg>
);
const IconGlobe = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconMapPin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconBarChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>
  </svg>
);
const IconImage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);
const IconPower = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" x2="12" y1="2" y2="12"/>
  </svg>
);

// ─── API ──────────────────────────────────────────────────────────────────────
const API = (process.env.NEXT_PUBLIC_API_URL ?? "") + "/settings";

async function fetchSettings(token: string) {
  const res = await fetch(API, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Falha ao carregar configurações");
  return res.json();
}

async function saveSettings(token: string, data: Record<string, unknown>) {
  const res = await fetch(API, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Falha ao salvar configurações");
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Settings {
  whatsapp: string; telefone: string; email_contato: string;
  instagram: string; facebook: string; youtube: string;
  nome_loja: string; slogan: string;
  endereco: string; cidade: string; estado: string; cep: string; cnpj: string; horario: string;
  hero_titulo: string; hero_subtitulo: string;
  stat_clientes: number; stat_anos: number; stat_satisfacao: number;
  max_fotos_veiculo: number; modo_manutencao: boolean;
  updated_at: string | null;
}

// ─── Componentes ──────────────────────────────────────────────────────────────
function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span style={{ color: "var(--primary)", opacity: 0.7 }}>{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", prefix }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; prefix?: string;
}) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {prefix && (
        <span style={{
          position: "absolute", left: 12, fontSize: 13, color: "var(--text-3)",
          fontFamily: "monospace", userSelect: "none", pointerEvents: "none"
        }}>{prefix}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 42,
          paddingLeft: prefix ? 48 : 12,
          paddingRight: 12,
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          borderRadius: 10,
          fontSize: 14,
          color: "var(--text-1)",
          fontFamily: "inherit",
          outline: "none",
          transition: "border-color 150ms",
        }}
        onFocus={e => { e.target.style.borderColor = "var(--primary)"; }}
        onBlur={e => { e.target.style.borderColor = "var(--border)"; }}
      />
    </div>
  );
}

function NumberInput({ value, onChange, min = 0, max = 9999, suffix }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: 100,
          height: 42,
          padding: "0 12px",
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 700,
          color: "var(--text-1)",
          fontFamily: "inherit",
          outline: "none",
          textAlign: "center",
        }}
        onFocus={e => { e.target.style.borderColor = "var(--primary)"; }}
        onBlur={e => { e.target.style.borderColor = "var(--border)"; }}
      />
      {suffix && <span style={{ fontSize: 13, color: "var(--text-3)" }}>{suffix}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 20px", borderRadius: 12,
      background: checked ? "rgba(var(--primary-rgb), 0.06)" : "var(--surface)",
      border: `1.5px solid ${checked ? "var(--primary)" : "var(--border)"}`,
      cursor: "pointer", transition: "all 200ms",
    }} onClick={() => onChange(!checked)}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{label}</p>
        {description && <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{description}</p>}
      </div>
      <div style={{
        width: 44, height: 24, borderRadius: 999,
        background: checked ? "var(--primary)" : "var(--border)",
        position: "relative", transition: "background 200ms", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 3, left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          transition: "left 200ms", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </div>
    </div>
  );
}

// ─── Section Wrapper ─────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(var(--primary-rgb), 0.10)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
          {icon}
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>{title}</h3>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "contato",  label: "Contato & Redes",   icon: <IconPhone /> },
  { id: "loja",     label: "Dados da Loja",      icon: <IconBuilding /> },
  { id: "site",     label: "Site Público",       icon: <IconGlobe /> },
  { id: "sistema",  label: "Sistema",            icon: <IconSettings /> },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  const [tab, setTab] = useState("contato");
  const [form, setForm] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("lmc_token") ?? "" : "";

  useEffect(() => {
    fetchSettings(token)
      .then(setForm)
      .catch(() => setError("Não foi possível carregar as configurações."))
      .finally(() => setLoading(false));
  }, [token]);

  const set = useCallback((key: keyof Settings, value: unknown) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }, []);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await saveSettings(token, form);
      setForm(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--text-3)", gap: 12 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Carregando configurações...
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );

  if (!form) return (
    <div style={{ padding: 32, color: "var(--danger, #ef4444)" }}>{error ?? "Erro ao carregar."}</div>
  );

  return (
    <div style={{ padding: "24px 32px", maxWidth: 980, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.4px" }}>Configurações</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            {form.updated_at
              ? `Última alteração: ${new Date(form.updated_at).toLocaleString("pt-BR")}`
              : "Preencha as informações da loja"}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            height: 40, padding: "0 20px", borderRadius: 10,
            background: saved ? "#22c55e" : "var(--primary)",
            color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer",
            fontSize: 14, fontWeight: 700, fontFamily: "inherit",
            transition: "background 200ms", opacity: saving ? 0.7 : 1,
          }}
        >
          {saved ? <IconCheck /> : saving ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
          )}
          {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Tab Nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 16px", borderRadius: "10px 10px 0 0",
              background: tab === t.id ? "var(--card)" : "transparent",
              border: "none",
              borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
              color: tab === t.id ? "var(--primary)" : "var(--text-3)",
              cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              transition: "all 150ms",
            }}
          >
            {t.icon}
            <span style={{ whiteSpace: "nowrap" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: "var(--card)", borderRadius: 16, padding: "28px 24px", border: "1px solid var(--border)" }}>

        {/* ── TAB: Contato & Redes ── */}
        {tab === "contato" && (
          <>
            <Section title="Contato" icon={<IconPhone />}>
              <Field label="WhatsApp" icon={<IconWhatsApp />}>
                <Input value={form.whatsapp} onChange={v => set("whatsapp", v)} placeholder="5511999999999" prefix="+" />
              </Field>
              <Field label="Telefone fixo" icon={<IconPhone />}>
                <Input value={form.telefone} onChange={v => set("telefone", v)} placeholder="(11) 3456-7890" />
              </Field>
              <Field label="E-mail de contato" icon={<IconMail />}>
                <Input value={form.email_contato} onChange={v => set("email_contato", v)} placeholder="contato@lmcveiculos.com.br" type="email" />
              </Field>
            </Section>

            <Section title="Redes Sociais" icon={<IconInstagram />}>
              <Field label="Instagram" icon={<IconInstagram />}>
                <Input value={form.instagram} onChange={v => set("instagram", v)} placeholder="https://instagram.com/suaempresa" />
              </Field>
              <Field label="Facebook" icon={<IconFacebook />}>
                <Input value={form.facebook} onChange={v => set("facebook", v)} placeholder="https://facebook.com/suaempresa" />
              </Field>
              <Field label="YouTube" icon={<IconYouTube />}>
                <Input value={form.youtube} onChange={v => set("youtube", v)} placeholder="https://youtube.com/@suaempresa" />
              </Field>
            </Section>

            {form.whatsapp && (
              <div style={{ marginTop: 8, padding: "14px 16px", borderRadius: 12, background: "rgba(37,211,102,0.06)", border: "1px solid rgba(37,211,102,0.20)", display: "flex", alignItems: "center", gap: 10 }}>
                <IconWhatsApp />
                <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                  Preview do link:{" "}
                  <a href={`https://wa.me/${form.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    style={{ color: "#25d366", fontWeight: 600, textDecoration: "none" }}>
                    wa.me/{form.whatsapp.replace(/\D/g, "")}
                  </a>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB: Dados da Loja ── */}
        {tab === "loja" && (
          <>
            <Section title="Identidade" icon={<IconBuilding />}>
              <Field label="Nome da loja">
                <Input value={form.nome_loja} onChange={v => set("nome_loja", v)} placeholder="LMC Veículos" />
              </Field>
              <Field label="Slogan">
                <Input value={form.slogan} onChange={v => set("slogan", v)} placeholder="Seu próximo veículo está aqui" />
              </Field>
              <Field label="CNPJ">
                <Input value={form.cnpj} onChange={v => set("cnpj", v)} placeholder="00.000.000/0001-00" />
              </Field>
              <Field label="Horário de funcionamento">
                <Input value={form.horario} onChange={v => set("horario", v)} placeholder="Seg–Sex: 8h–18h | Sáb: 8h–13h" />
              </Field>
            </Section>

            <Section title="Endereço" icon={<IconMapPin />}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Endereço completo">
                  <Input value={form.endereco} onChange={v => set("endereco", v)} placeholder="Rua Exemplo, 123" />
                </Field>
              </div>
              <Field label="Cidade">
                <Input value={form.cidade} onChange={v => set("cidade", v)} placeholder="São Paulo" />
              </Field>
              <Field label="Estado">
                <Input value={form.estado} onChange={v => set("estado", v)} placeholder="SP" />
              </Field>
              <Field label="CEP">
                <Input value={form.cep} onChange={v => set("cep", v)} placeholder="00000-000" />
              </Field>
            </Section>
          </>
        )}

        {/* ── TAB: Site Público ── */}
        {tab === "site" && (
          <>
            <Section title="Texto do Hero" icon={<IconImage />}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Título principal">
                  <Input value={form.hero_titulo} onChange={v => set("hero_titulo", v)} placeholder="Encontre seu próximo veículo" />
                </Field>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Subtítulo">
                  <Input value={form.hero_subtitulo} onChange={v => set("hero_subtitulo", v)} placeholder="Carros e motos selecionados com qualidade" />
                </Field>
              </div>
            </Section>

            <Section title="Estatísticas da Homepage" icon={<IconBarChart />}>
              <Field label="Clientes satisfeitos">
                <NumberInput value={form.stat_clientes} onChange={v => set("stat_clientes", v)} suffix="clientes" />
              </Field>
              <Field label="Anos de experiência">
                <NumberInput value={form.stat_anos} onChange={v => set("stat_anos", v)} suffix="anos" />
              </Field>
              <Field label="Satisfação (%)">
                <NumberInput value={form.stat_satisfacao} onChange={v => set("stat_satisfacao", v)} min={0} max={100} suffix="%" />
              </Field>
            </Section>

            <div style={{ marginTop: 4, padding: "12px 16px", borderRadius: 10, background: "rgba(var(--primary-rgb), 0.06)", border: "1px solid rgba(var(--primary-rgb), 0.15)", fontSize: 13, color: "var(--text-3)" }}>
              As estatísticas aparecem no site público. Se a loja ainda não abriu, deixe os valores em <strong>0</strong> — a seção não aparecerá para os visitantes.
            </div>
          </>
        )}

        {/* ── TAB: Sistema ── */}
        {tab === "sistema" && (
          <>
            <Section title="Fotos de Veículos" icon={<IconImage />}>
              <Field label="Máximo de fotos por veículo">
                <NumberInput value={form.max_fotos_veiculo} onChange={v => set("max_fotos_veiculo", v)} min={1} max={50} suffix="fotos" />
              </Field>
            </Section>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, marginTop: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--primary)" }}><IconPower /></span>
                Modo Manutenção
              </h3>
              <Toggle
                checked={form.modo_manutencao}
                onChange={v => set("modo_manutencao", v)}
                label="Ativar modo manutenção"
                description="Quando ativado, o site público exibe uma página 'Em breve' para os visitantes. O painel continua funcionando normalmente."
              />
              {form.modo_manutencao && (
                <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.20)", fontSize: 13, color: "#ef4444", fontWeight: 600 }}>
                  Site público em modo manutenção — visitantes verão uma página de aviso.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        :root { --primary-rgb: 244, 121, 32; }
      `}</style>
    </div>
  );
}
