"use client";

import { useEffect, useState } from "react";
import { Phone, CalendarCheck, Calculator, CheckCircle2, AlertCircle, Play } from "lucide-react";
import WhatsAppIcon from "@/components/site/WhatsAppIcon";
import { enviarLead, trackVehicleView } from "@/lib/publicApi";
import { parcelaPrice } from "@/lib/site/format";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Conta a visita ao anúncio (o backend ignora repetição do mesmo IP por 6h). */
export function ContarVisita({ id }: { id: string }) {
  useEffect(() => { trackVehicleView(id); }, [id]);
  return null;
}

/** Agendar visita / test-drive: vira lead no painel ligado a este veículo. */
export function AgendarVisita({ veiculoId, descricao }: { veiculoId: string; descricao: string }) {
  const [f, setF] = useState({ nome: "", telefone: "", quando: "", website: "" });
  const [estado, setEstado] = useState<"livre" | "enviando" | "ok" | "erro">("livre");
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const r = await enviarLead({
      nome: f.nome.trim(),
      telefone: f.telefone.trim(),
      mensagem: `Quero agendar uma visita para ver o ${descricao}.${f.quando ? ` Melhor horário: ${f.quando}.` : ""}`,
      veiculo_id: veiculoId,
      veiculo_descricao: descricao,
      origem: "veiculo",
      website: f.website,
    });
    // Mensagem honesta: só diz "recebido" quando o servidor confirmou
    setMsg(r.mensagem);
    setEstado(r.ok ? "ok" : "erro");
  }

  return (
    <section className="v-painel" aria-labelledby="agendar-titulo" id="agendar">
      <h2 id="agendar-titulo" className="s-h3" style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <CalendarCheck size={20} className="s-accent" aria-hidden="true" /> Agendar visita ou test-drive
      </h2>
      {estado === "ok" ? (
        <div className="s-alert s-alert--ok" role="status"><CheckCircle2 size={20} aria-hidden="true" /><span>Pedido recebido. Vamos confirmar o horário pelo telefone informado.</span></div>
      ) : (
        <form onSubmit={enviar} className="v-form">
          <div className="s-field">
            <label className="s-label" htmlFor="ag-nome">Nome</label>
            <input id="ag-nome" className="s-input" required minLength={2} maxLength={120} autoComplete="name" value={f.nome} onChange={set("nome")} />
          </div>
          <div className="s-field">
            <label className="s-label" htmlFor="ag-tel">Telefone ou WhatsApp</label>
            <input id="ag-tel" className="s-input" required type="tel" inputMode="tel" autoComplete="tel" minLength={10} maxLength={20} placeholder="(11) 99999-0000" value={f.telefone} onChange={set("telefone")} />
          </div>
          <div className="s-field">
            <label className="s-label" htmlFor="ag-quando">Melhor período <small>(opcional)</small></label>
            <select id="ag-quando" className="s-select" value={f.quando} onChange={set("quando")}>
              <option value="">Tanto faz</option>
              <option>Manhã, dia de semana</option>
              <option>Tarde, dia de semana</option>
              <option>Sábado</option>
            </select>
          </div>
          <div className="s-honeypot" aria-hidden="true">
            <label htmlFor="ag-site">Site</label>
            <input id="ag-site" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
          </div>
          {estado === "erro" && <div className="s-alert s-alert--erro" role="alert"><AlertCircle size={20} aria-hidden="true" /><span>{msg}</span></div>}
          <button type="submit" className="s-btn s-btn--secondary s-btn--lg s-btn--block" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Enviando..." : "Pedir horário"}
          </button>
        </form>
      )}
    </section>
  );
}

/**
 * Simulação pela tabela Price. É uma conta, não uma oferta: taxa editável e aviso
 * explícito de que depende da aprovação do banco (antes o site prometia "60x" fixo).
 */
export function SimuladorFinanciamento({ preco }: { preco: number }) {
  const [entradaPct, setEntradaPct] = useState(30);
  const [meses, setMeses] = useState(48);
  const [taxa, setTaxa] = useState("1,99");
  const taxaNum = Math.max(0, Math.min(10, Number(taxa.replace(",", ".")) || 0));
  const entrada = Math.round((preco * entradaPct) / 100);
  const financiado = preco - entrada;
  const parcela = parcelaPrice(financiado, taxaNum, meses);

  return (
    <section className="v-painel" aria-labelledby="sim-titulo">
      <h2 id="sim-titulo" className="s-h3" style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Calculator size={20} className="s-accent" aria-hidden="true" /> Simular financiamento
      </h2>
      <div className="s-field">
        <label className="s-label" htmlFor="sim-entrada">Entrada: {entradaPct}% ({brl(entrada)})</label>
        <input id="sim-entrada" type="range" min={0} max={90} step={5} value={entradaPct} onChange={(e) => setEntradaPct(Number(e.target.value))} style={{ accentColor: "var(--brand)" }} />
      </div>
      <div className="v-sim__linha">
        <div className="s-field">
          <label className="s-label" htmlFor="sim-meses">Prazo</label>
          <select id="sim-meses" className="s-select" value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
            {[12, 24, 36, 48, 60].map((m) => <option key={m} value={m}>{m} meses</option>)}
          </select>
        </div>
        <div className="s-field">
          <label className="s-label" htmlFor="sim-taxa">Juros ao mês (%)</label>
          <input id="sim-taxa" className="s-input" inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
        </div>
      </div>
      <div className="v-sim__resultado" aria-live="polite">
        <span className="s-small s-muted">{meses}x de</span>
        <strong>{financiado > 0 ? brl(parcela) : "Sem financiamento"}</strong>
        <span className="s-small s-subtle">Simulação de exemplo. Taxa e aprovação dependem do banco e da análise de crédito.</span>
      </div>
    </section>
  );
}

/** Botões principais (WhatsApp e ligar), usados no cartão e na barra do celular. */
export function BotoesContato({ wa, tel, compacto = false }: { wa: string | null; tel: string | null; compacto?: boolean }) {
  if (!wa && !tel) {
    return <a href="#agendar" className="s-btn s-btn--primary s-btn--lg s-btn--block">Tenho interesse</a>;
  }
  if (compacto) {
    return (
      <>
        {tel && <a href={tel} className="s-btn s-btn--secondary s-btn--icon" aria-label="Ligar para a loja"><Phone size={20} /></a>}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="s-btn s-btn--wa"><WhatsAppIcon size={20} /> WhatsApp</a>}
      </>
    );
  }
  return (
    <div className="v-acoes">
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="s-btn s-btn--wa s-btn--lg s-btn--block">
          <WhatsAppIcon size={20} /> Tenho interesse
        </a>
      )}
      <div className="v-acoes__par">
        {tel && <a href={tel} className="s-btn s-btn--secondary"><Phone size={17} aria-hidden="true" /> Ligar</a>}
        <a href="#agendar" className="s-btn s-btn--secondary" style={tel ? undefined : { gridColumn: "1 / -1" }}><CalendarCheck size={17} aria-hidden="true" /> Agendar visita</a>
      </div>
    </div>
  );
}

/** Vídeo do YouTube: carrega o player só no clique (o iframe pesa ~1 MB). */
export function VideoYoutube({ id, titulo }: { id: string; titulo: string }) {
  const [tocar, setTocar] = useState(false);
  return (
    <div className="v-video">
      {tocar ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`}
          title={titulo}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setTocar(true)} aria-label={`Assistir: ${titulo}`}>
          <img src={`https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`} alt="" loading="lazy" />
          <span><Play size={28} fill="currentColor" aria-hidden="true" /></span>
        </button>
      )}
    </div>
  );
}
