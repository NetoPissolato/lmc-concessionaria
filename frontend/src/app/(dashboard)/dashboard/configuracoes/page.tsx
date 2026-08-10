"use client";

import React, { useState, useEffect, useCallback } from "react";

function IconPhone() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.44 2 2 0 0 1 3.56 1.25h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6 6l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16.92z"/></svg>); }
function IconBuilding() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>); }
function IconGlobe() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>); }
function IconCog() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>); }
function IconSave() { return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>); }
function IconMail() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>); }
function IconPin() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>); }
function IconClock() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>); }
function IconIG() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>); }
function IconFB() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>); }
function IconYT() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/></svg>); }
function IconWA() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>); }

const API = (process.env.NEXT_PUBLIC_API_URL ?? "") + "/settings";

async function loadSettings(token: string) {
  const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Falha ao carregar");
  return res.json();
}
async function saveSettings(token: string, data: object) {
  const res = await fetch(API, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Falha ao salvar");
  return res.json();
}

interface FormState {
  whatsapp: string; telefone: string; email_contato: string;
  instagram: string; facebook: string; youtube: string;
  nome_loja: string; slogan: string; cnpj: string;
  endereco: string; cidade: string; estado: string; cep: string; horario: string;
  hero_titulo: string; hero_subtitulo: string; descricao_site: string;
  stat_clientes: number; stat_anos: number; stat_satisfacao: number;
  modo_manutencao: boolean;
}
const EMPTY: FormState = {
  whatsapp:"",telefone:"",email_contato:"",instagram:"",facebook:"",youtube:"",
  nome_loja:"",slogan:"",cnpj:"",endereco:"",cidade:"",estado:"",cep:"",horario:"",
  hero_titulo:"",hero_subtitulo:"",descricao_site:"",stat_clientes:0,stat_anos:0,stat_satisfacao:98,modo_manutencao:false,
};

const inp: React.CSSProperties = { width:"100%",padding:"10px 14px",background:"var(--surface-3)",border:"1px solid var(--border)",borderRadius:10,color:"var(--text-primary)",fontSize:13,outline:"none" };
const lbl: React.CSSProperties = { display:"block",fontSize:11,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:1,color:"var(--text-muted)",marginBottom:7 };

function Inp({ val, set, ph, type="text" }: { val:string|number; set:(v:string)=>void; ph?:string; type?:string }) {
  return <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={inp} />;
}
function NumInp({ val, set, ph }: { val:number; set:(v:number)=>void; ph?:string }) {
  return <input type="number" value={val} onChange={e=>set(Number(e.target.value))} placeholder={ph} style={inp} />;
}

function Card({ title, icon, desc, children }: { title:string; icon:React.ReactNode; desc?:string; children:React.ReactNode }) {
  return (
    <div style={{ background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:16,overflow:"hidden",marginBottom:20 }}>
      <div style={{ padding:"18px 22px 14px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:14 }}>
        <div style={{ width:40,height:40,borderRadius:12,flexShrink:0,background:"linear-gradient(135deg,#F5A623,#e8920e)",display:"flex",alignItems:"center",justifyContent:"center",color:"#000",boxShadow:"0 4px 14px rgba(245,166,35,0.30)" }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize:15,fontWeight:700,color:"var(--text-primary)",marginBottom:2 }}>{title}</p>
          {desc && <p style={{ fontSize:12,color:"var(--text-secondary)" }}>{desc}</p>}
        </div>
      </div>
      <div style={{ padding:22 }}>{children}</div>
    </div>
  );
}

const TABS = [
  { id:"contato", label:"Contato & Redes", icon:<IconPhone /> },
  { id:"loja",    label:"Dados da Loja",   icon:<IconBuilding /> },
  { id:"site",    label:"Site Publico",    icon:<IconGlobe /> },
  { id:"sistema", label:"Sistema",         icon:<IconCog /> },
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
    try { setSaving(true); setError(null); await saveSettings(token,form); setSaved(true); setTimeout(()=>setSaved(false),3000); }
    catch { setError("Erro ao salvar. Verifique e tente novamente."); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:14 }}>
      <div style={{ width:32,height:32,borderRadius:"50%",border:"3px solid var(--brand-light)",borderTop:"3px solid var(--brand)",animation:"spin 0.8s linear infinite" }} />
      <span style={{ fontSize:13,color:"var(--text-secondary)" }}>Carregando...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth:840,margin:"0 auto",paddingBottom:40 }}>

      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,gap:16,flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px",marginBottom:4 }}>Configuracoes</h1>
          <p style={{ fontSize:13,color:"var(--text-secondary)" }}>Configure as informacoes da sua loja</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:10,border:"none",background:saved?"linear-gradient(135deg,#22c55e,#16a34a)":"linear-gradient(135deg,#F5A623,#e8920e)",color:saved?"#fff":"#000",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,transition:"all 200ms",boxShadow:saved?"0 4px 16px rgba(34,197,94,0.35)":"0 4px 16px rgba(245,166,35,0.30)" }}>
          <IconSave />
          {saving?"Salvando...":saved?"Salvo!":"Salvar alteracoes"}
        </button>
      </div>

      {error && <div style={{ padding:"12px 16px",background:"var(--error-light)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:10,marginBottom:20,fontSize:13,color:"#ef4444" }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display:"flex",gap:6,marginBottom:28,background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:14,padding:6,flexWrap:"wrap" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",background:tab===t.id?"var(--surface-4)":"transparent",color:tab===t.id?"var(--text-primary)":"var(--text-secondary)",fontSize:13,fontWeight:tab===t.id?600:400,transition:"all 150ms",boxShadow:tab===t.id?"var(--shadow-sm)":"none" }}>
            <span style={{ color:tab===t.id?"var(--brand)":"var(--text-muted)" }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* CONTATO */}
      {tab==="contato" && <>
        <Card title="Contato" icon={<IconPhone />} desc="WhatsApp, telefone e e-mail exibidos no site">
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
            <div><label style={lbl}><IconWA /> WhatsApp</label><Inp val={form.whatsapp} set={v=>set("whatsapp",v)} ph="5511999999999" /></div>
            <div><label style={lbl}><IconPhone /> Telefone fixo</label><Inp val={form.telefone} set={v=>set("telefone",v)} ph="(11) 3456-7890" /></div>
          </div>
          <div><label style={lbl}><IconMail /> E-mail de contato</label><Inp val={form.email_contato} set={v=>set("email_contato",v)} ph="contato@lmcveiculos.com.br" type="email" /></div>
        </Card>
        <Card title="Redes Sociais" icon={<IconIG />} desc="Links exibidos no rodape e pagina de contato">
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16 }}>
            <div><label style={lbl}><IconIG /> Instagram</label><Inp val={form.instagram} set={v=>set("instagram",v)} ph="https://instagram.com/sua" /></div>
            <div><label style={lbl}><IconFB /> Facebook</label><Inp val={form.facebook} set={v=>set("facebook",v)} ph="https://facebook.com/sua" /></div>
            <div><label style={lbl}><IconYT /> YouTube</label><Inp val={form.youtube} set={v=>set("youtube",v)} ph="https://youtube.com/@sua" /></div>
          </div>
        </Card>
      </>}

      {/* LOJA */}
      {tab==="loja" && <>
        <Card title="Identidade da Loja" icon={<IconBuilding />} desc="Nome, slogan e CNPJ">
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
            <div><label style={lbl}>Nome da loja</label><Inp val={form.nome_loja} set={v=>set("nome_loja",v)} ph="LMC Veiculos" /></div>
            <div><label style={lbl}>CNPJ</label><Inp val={form.cnpj} set={v=>set("cnpj",v)} ph="00.000.000/0001-00" /></div>
          </div>
          <div><label style={lbl}>Slogan</label><Inp val={form.slogan} set={v=>set("slogan",v)} ph="Seu proximo veiculo esta aqui" /></div>
        </Card>
        <Card title="Endereco" icon={<IconPin />} desc="Endereco fisico exibido no site">
          <div style={{ marginBottom:16 }}><label style={lbl}><IconPin /> Endereco completo</label><Inp val={form.endereco} set={v=>set("endereco",v)} ph="Rua das Flores, 123 - Bairro" /></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 80px 120px 120px",gap:16 }}>
            <div><label style={lbl}>Cidade</label><Inp val={form.cidade} set={v=>set("cidade",v)} ph="Sao Paulo" /></div>
            <div><label style={lbl}>UF</label><Inp val={form.estado} set={v=>set("estado",v)} ph="SP" /></div>
            <div><label style={lbl}>CEP</label><Inp val={form.cep} set={v=>set("cep",v)} ph="00000-000" /></div>
            <div><label style={lbl}><IconClock /> Horario</label><Inp val={form.horario} set={v=>set("horario",v)} ph="Seg-Sex: 8h-18h" /></div>
          </div>
        </Card>
      </>}

      {/* SITE */}
      {tab==="site" && <>
        <Card title="Hero do Site" icon={<IconGlobe />} desc="Titulo e subtitulo da secao principal do site publico">
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
            <div><label style={lbl}>Titulo principal</label><Inp val={form.hero_titulo} set={v=>set("hero_titulo",v)} ph="Encontre o veiculo perfeito" /></div>
            <div><label style={lbl}>Subtitulo</label><Inp val={form.hero_subtitulo} set={v=>set("hero_subtitulo",v)} ph="Carros e motos selecionados com qualidade" /></div>
            <div><label style={lbl}>Descricao SEO</label><Inp val={form.descricao_site} set={v=>set("descricao_site",v)} ph="Concessionaria com os melhores veiculos..." /></div>
          </div>
        </Card>
        <Card title="Estatisticas" icon={<IconCog />} desc="Numeros exibidos na pagina inicial">
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16 }}>
            <div><label style={lbl}>Clientes atendidos</label><NumInp val={form.stat_clientes} set={v=>set("stat_clientes",v)} ph="500" /></div>
            <div><label style={lbl}>Anos de mercado</label><NumInp val={form.stat_anos} set={v=>set("stat_anos",v)} ph="10" /></div>
            <div><label style={lbl}>Satisfacao (%)</label><NumInp val={form.stat_satisfacao} set={v=>set("stat_satisfacao",v)} ph="98" /></div>
          </div>
        </Card>
      </>}

      {/* SISTEMA */}
      {tab==="sistema" && (
        <Card title="Modo Manutencao" icon={<IconCog />} desc="Quando ativo, o site publico exibe uma pagina de aviso">
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16 }}>
            <div>
              <p style={{ fontSize:14,fontWeight:600,color:"var(--text-primary)",marginBottom:3 }}>Modo manutencao</p>
              <p style={{ fontSize:12,color:"var(--text-secondary)" }}>Ativa a pagina de manutencao no site. O dashboard continua funcionando.</p>
            </div>
            <button type="button" onClick={()=>set("modo_manutencao",!form.modo_manutencao)} style={{ flexShrink:0,width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:form.modo_manutencao?"var(--brand)":"var(--surface-4)",position:"relative",transition:"background 200ms" }}>
              <span style={{ position:"absolute",top:3,left:form.modo_manutencao?23:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 200ms",boxShadow:"0 1px 4px rgba(0,0,0,0.4)" }} />
            </button>
          </div>
          {form.modo_manutencao && (
            <div style={{ marginTop:16,padding:"12px 16px",background:"var(--warning-light)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:10,fontSize:13,color:"#f59e0b" }}>
              O site publico esta em modo manutencao. Visitantes veem uma pagina de aviso.
            </div>
          )}
        </Card>
      )}

    </div>
  );
}
