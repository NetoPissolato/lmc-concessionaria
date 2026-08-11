"use client";

import React, { useState, useEffect, useCallback } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "") + "/settings";

async function loadSettings(token: string) {
  const res = await fetch(API, { headers: { Authorization: "Bearer " + token } });
  if (!res.ok) throw new Error("Falha ao carregar");
  return res.json();
}
async function saveSettings(token: string, data: object) {
  const res = await fetch(API, { method: "PUT", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Falha ao salvar");
  return res.json();
}

interface FormState {
  whatsapp: string; telefone: string; email_contato: string;
  instagram: string; facebook: string; youtube: string;
  nome_loja: string; slogan: string; cnpj: string;
  endereco: string; cidade: string; estado: string; cep: string; horario: string;
  stat_clientes: number; stat_anos: number; stat_satisfacao: number;
  modo_manutencao: boolean;
}
const EMPTY: FormState = {
  whatsapp:"",telefone:"",email_contato:"",instagram:"",facebook:"",youtube:"",
  nome_loja:"",slogan:"",cnpj:"",endereco:"",cidade:"",estado:"",cep:"",horario:"",
  stat_clientes:0,stat_anos:0,stat_satisfacao:98,modo_manutencao:false,
};

const inp: React.CSSProperties = {
  width:"100%", padding:"11px 14px",
  background:"rgba(255,255,255,0.04)",
  border:"1.5px solid rgba(255,255,255,0.09)",
  borderRadius:10, color:"var(--text-primary)",
  fontSize:13.5, outline:"none",
  transition:"border-color 150ms, background 150ms",
};
const lbl: React.CSSProperties = {
  display:"block", fontSize:11, fontWeight:700,
  textTransform:"uppercase" as const, letterSpacing:1,
  color:"var(--text-muted)", marginBottom:7,
};

function Inp({ val, set, ph, type="text" }: { val:string|number; set:(v:string)=>void; ph?:string; type?:string }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <input type={type} value={val} onChange={e=>set(e.target.value)}
      onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
      placeholder={ph}
      style={{ ...inp, borderColor: focus ? "var(--brand)" : "rgba(255,255,255,0.09)", background: focus ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)" }} />
  );
}
function NumInp({ val, set, ph }: { val:number; set:(v:number)=>void; ph?:string }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <input type="number" value={val} onChange={e=>set(Number(e.target.value))}
      onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
      placeholder={ph}
      style={{ ...inp, borderColor: focus ? "var(--brand)" : "rgba(255,255,255,0.09)", background: focus ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)" }} />
  );
}

function Section({ title, subtitle, icon, children }: { title:string; subtitle:string; icon:string; children:React.ReactNode }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:18, overflow:"hidden", marginBottom:16 }}>
      <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:42, height:42, borderRadius:13, background:"linear-gradient(135deg,#F5A623,#e8920e)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0, boxShadow:"0 4px 14px rgba(245,166,35,0.30)" }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize:15, fontWeight:700, color:"var(--text-primary)", marginBottom:2 }}>{title}</p>
          <p style={{ fontSize:12, color:"var(--text-muted)" }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ padding:"20px 24px" }}>{children}</div>
    </div>
  );
}

function Row({ children, cols="1fr 1fr" }: { children:React.ReactNode; cols?:string }) {
  return <div style={{ display:"grid", gridTemplateColumns:cols, gap:14, marginBottom:14 }}>{children}</div>;
}
function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return <div><label style={lbl}>{label}</label>{children}</div>;
}

const TABS = [
  { id:"contato", label:"Contato & Redes",  icon:"#" },
  { id:"loja",    label:"Dados da Loja",    icon:"@" },
  { id:"site",    label:"Site Publico",     icon:">" },
  { id:"sistema", label:"Sistema",          icon:"*" },
];

export default function ConfiguracoesPage() {
  const [form,setForm] = useState<FormState>(EMPTY);
  const [tab,setTab]   = useState("contato");
  const [loading,setLoading] = useState(true);
  const [saving,setSaving]   = useState(false);
  const [saved,setSaved]     = useState(false);
  const [error,setError]     = useState<string|null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("lmc_access_token") ?? "" : "";

  const load = useCallback(async () => {
    try { setLoading(true); setError(null); const d = await loadSettings(token); setForm({...EMPTY,...d}); }
    catch { setError("Nao foi possivel carregar as configuracoes."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(()=>{ load(); },[load]);

  const set = (k: keyof FormState, v: string|number|boolean) => setForm(p=>({...p,[k]:v}));

  const handleSave = async () => {
    try {
      setSaving(true); setError(null);
      await saveSettings(token, form);
      setSaved(true);
      setTimeout(()=>setSaved(false), 3000);
    }
    catch { setError("Erro ao salvar. Verifique sua conexao e tente novamente."); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:320, gap:16 }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid rgba(245,166,35,0.20)", borderTop:"3px solid var(--brand)", animation:"spin 0.8s linear infinite" }} />
      <span style={{ fontSize:13, color:"var(--text-muted)" }}>Carregando configuracoes...</span>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );

  return (
    <div style={{ maxWidth:860, margin:"0 auto", paddingBottom:60 }}>

      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:32, gap:16, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:900, color:"var(--text-primary)", letterSpacing:"-0.5px", marginBottom:4 }}>Configuracoes</h1>
          <p style={{ fontSize:13, color:"var(--text-muted)" }}>Gerencie as informacoes da sua loja - mudancas aparecem no site imediatamente apos salvar.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{
            display:"flex", alignItems:"center", gap:9, padding:"11px 22px",
            borderRadius:12, border:"none",
            background: saved ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#F5A623,#e8920e)",
            color: saved ? "#fff" : "#000",
            fontSize:13.5, fontWeight:700, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1, transition:"all 220ms",
            boxShadow: saved ? "0 4px 20px rgba(34,197,94,0.35)" : "0 4px 20px rgba(245,166,35,0.30)",
            whiteSpace:"nowrap",
          }}>
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar alteracoes"}
        </button>
      </div>

      {error && (
        <div style={{ padding:"12px 16px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:12, marginBottom:20, fontSize:13, color:"#ef4444" }}>
          {error}
        </div>
      )}

      <div style={{ display:"flex", gap:4, marginBottom:28, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:5, flexWrap:"wrap" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{
              display:"flex", alignItems:"center", gap:7, padding:"9px 18px",
              borderRadius:10, border:"none", cursor:"pointer", flex:1, justifyContent:"center",
              background: tab===t.id ? "var(--surface-4)" : "transparent",
              color: tab===t.id ? "var(--text-primary)" : "var(--text-muted)",
              fontSize:13, fontWeight: tab===t.id ? 700 : 400,
              transition:"all 150ms",
              boxShadow: tab===t.id ? "0 2px 12px rgba(0,0,0,0.20)" : "none",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="contato" && <>
        <Section title="Contato" subtitle="Telefone, WhatsApp e e-mail exibidos no site e no topbar" icon="T">
          <Row>
            <Field label="WhatsApp (somente numeros)">
              <Inp val={form.whatsapp} set={v=>set("whatsapp",v)} ph="5511999999999" />
            </Field>
            <Field label="Telefone fixo">
              <Inp val={form.telefone} set={v=>set("telefone",v)} ph="(11) 3456-7890" />
            </Field>
          </Row>
          <Field label="E-mail de contato">
            <Inp val={form.email_contato} set={v=>set("email_contato",v)} ph="contato@lmcveiculos.com.br" type="email" />
          </Field>
        </Section>

        <Section title="Redes Sociais" subtitle="Links exibidos no topbar, rodape e pagina de contato" icon="R">
          <Row cols="1fr 1fr 1fr">
            <Field label="Instagram">
              <Inp val={form.instagram} set={v=>set("instagram",v)} ph="https://instagram.com/sua" />
            </Field>
            <Field label="Facebook">
              <Inp val={form.facebook} set={v=>set("facebook",v)} ph="https://facebook.com/sua" />
            </Field>
            <Field label="YouTube">
              <Inp val={form.youtube} set={v=>set("youtube",v)} ph="https://youtube.com/@sua" />
            </Field>
          </Row>
          <div style={{ padding:"12px 16px", background:"rgba(245,166,35,0.07)", border:"1px solid rgba(245,166,35,0.15)", borderRadius:10, fontSize:12, color:"rgba(255,255,255,0.55)" }}>
            Deixe em branco os campos que voce nao usa - os icones nao aparecerao no site.
          </div>
        </Section>
      </>}

      {tab==="loja" && <>
        <Section title="Identidade da Loja" subtitle="Nome, slogan e CNPJ da concessionaria" icon="L">
          <Row>
            <Field label="Nome da loja">
              <Inp val={form.nome_loja} set={v=>set("nome_loja",v)} ph="LMC Veiculos" />
            </Field>
            <Field label="CNPJ">
              <Inp val={form.cnpj} set={v=>set("cnpj",v)} ph="00.000.000/0001-00" />
            </Field>
          </Row>
          <Field label="Slogan">
            <Inp val={form.slogan} set={v=>set("slogan",v)} ph="Seu proximo veiculo esta aqui" />
          </Field>
        </Section>

        <Section title="Endereco e Horario" subtitle="Endereco fisico e horario de atendimento exibidos no site" icon="E">
          <div style={{ marginBottom:14 }}>
            <Field label="Endereco completo">
              <Inp val={form.endereco} set={v=>set("endereco",v)} ph="Rua das Flores, 123 - Bairro" />
            </Field>
          </div>
          <Row cols="1fr 80px 130px">
            <Field label="Cidade">
              <Inp val={form.cidade} set={v=>set("cidade",v)} ph="Sao Paulo" />
            </Field>
            <Field label="UF">
              <Inp val={form.estado} set={v=>set("estado",v)} ph="SP" />
            </Field>
            <Field label="CEP">
              <Inp val={form.cep} set={v=>set("cep",v)} ph="00000-000" />
            </Field>
          </Row>
          <Field label="Horario de atendimento (texto exibido no topbar)">
            <Inp val={form.horario} set={v=>set("horario",v)} ph="Seg-Sex: 8h-18h | Sab: 8h-13h" />
          </Field>
        </Section>
      </>}

      {tab==="site" && <>
        <Section title="Estatisticas da Home" subtitle="Numeros exibidos na secao de destaques da pagina inicial" icon="S">
          <Row cols="1fr 1fr 1fr">
            <Field label="Clientes atendidos">
              <NumInp val={form.stat_clientes} set={v=>set("stat_clientes",v)} ph="500" />
            </Field>
            <Field label="Anos de mercado">
              <NumInp val={form.stat_anos} set={v=>set("stat_anos",v)} ph="10" />
            </Field>
            <Field label="Satisfacao (%)">
              <NumInp val={form.stat_satisfacao} set={v=>set("stat_satisfacao",v)} ph="98" />
            </Field>
          </Row>
          <div style={{ padding:"12px 16px", background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.15)", borderRadius:10, fontSize:12, color:"rgba(255,255,255,0.50)" }}>
            Titulo e subtitulo do hero sao editados diretamente no codigo-fonte do site.
          </div>
        </Section>
      </>}

      {tab==="sistema" && (
        <Section title="Modo Manutencao" subtitle="Quando ativo, o site publico exibe uma pagina de aviso" icon="M">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
            <div>
              <p style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)", marginBottom:4 }}>Modo manutencao</p>
              <p style={{ fontSize:12, color:"var(--text-muted)" }}>Ativa a pagina de manutencao no site publico. O dashboard continua funcionando normalmente.</p>
            </div>
            <button type="button" onClick={()=>set("modo_manutencao",!form.modo_manutencao)}
              style={{ flexShrink:0, width:50, height:28, borderRadius:14, border:"none", cursor:"pointer",
                background: form.modo_manutencao ? "#ef4444" : "var(--surface-4)", position:"relative", transition:"background 200ms" }}>
              <span style={{ position:"absolute", top:4, left: form.modo_manutencao ? 26 : 4, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 200ms", boxShadow:"0 1px 4px rgba(0,0,0,0.4)" }} />
            </button>
          </div>
          {form.modo_manutencao && (
            <div style={{ marginTop:16, padding:"12px 16px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.20)", borderRadius:10, fontSize:13, color:"#ef4444" }}>
              O site publico esta em modo manutencao. Visitantes veem uma pagina de aviso.
            </div>
          )}
        </Section>
      )}

    </div>
  );
}