"use client";

import { useState, useEffect } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, User, DollarSign, Check, CheckCircle, Loader2, AlertCircle, Car,
  Calculator, Plus, Trash2, Bike, Search, X, ShoppingBag,
  Banknote, Zap, CreditCard, ArrowRightLeft, Landmark, Users, Repeat,
  UserCheck, Sparkles, Tag,
} from "lucide-react";
import { vehiclesApi, customersApi, salesApi } from "@/lib/api";
import { Vehicle, Customer } from "@/types";
import { toast } from "@/lib/toast";
import { maskCurrency, parseCurrency, maskPhone, maskCPFOrCNPJ, validateCPF, validateCNPJ, unmask } from "@/lib/masks";
import { PaymentBadge, PAY_META } from "@/components/PaymentBadge";


function maskCEP(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentLine = {
  id: number;
  forma: string;
  valor_display: string;
  valor: number;
  parcelas?: string;
  banco?: string;
  taxa?: string;
};

const PAYMENT_OPTIONS = [
  { value: "pix",           label: "PIX",               color: "#38bdf8", icon: Zap            },
  { value: "dinheiro",      label: "Dinheiro",           color: "#22c55e", icon: Banknote       },
  { value: "transferencia", label: "Transferência",      color: "#06b6d4", icon: ArrowRightLeft  },
  { value: "cartao",        label: "Cartão de Crédito",  color: "#f59e0b", icon: CreditCard      },
  { value: "financiamento", label: "Financiamento",      color: "#a78bfa", icon: Landmark        },
  { value: "consorcio",     label: "Consórcio",          color: "#f97316", icon: Users           },
  { value: "permuta",       label: "Permuta",            color: "#ec4899", icon: Repeat          },
];

const PAY_COLOR: Record<string, string> = {
  pix: "#38bdf8", dinheiro: "#22c55e", transferencia: "#06b6d4",
  cartao: "#f59e0b", financiamento: "#a78bfa", consorcio: "#f97316", permuta: "#ec4899",
};

import { fmtCurrencyFull as fmt } from "@/lib/formatters";

let _id = 100;
const newId = () => _id++;

// ─── Tabela Price ──────────────────────────────────────────────────────────────
function calcPrice(pv: number, rateMonth: number, n: number) {
  if (!pv || pv <= 0 || !n || n < 1) return null;
  if (!Number.isFinite(pv) || !Number.isFinite(rateMonth) || rateMonth < 0) return null;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  if (rateMonth === 0) {
    const parcela = r2(pv / n);
    return { parcela, total: r2(parcela * n), juros: 0 };
  }
  const i = rateMonth / 100;
  const fator = Math.pow(1 + i, n);
  if (!Number.isFinite(fator) || fator <= 1) return null;
  const parcela = r2(pv * (i * fator) / (fator - 1));
  const total = r2(parcela * n);
  if (!Number.isFinite(parcela) || parcela <= 0) return null;
  return { parcela, total, juros: r2(total - pv) };
}

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: "Veículo",   icon: Car        },
  { id: 1, label: "Cliente",   icon: User       },
  { id: 2, label: "Pagamento", icon: DollarSign },
  { id: 3, label: "Revisão",   icon: Check      },
];

// ─── Color map ────────────────────────────────────────────────────────────────
import { ColorDot } from "@/components/vehicle/shared";

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "var(--error)" }}> *</span>}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ fontSize: "11px", color: "var(--error)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
            <AlertCircle size={10} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, color = "var(--brand)" }: { title: string; icon?: React.ElementType; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
      {Icon && <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={13} color={color} /></div>}
      <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>{title}</span>
    </div>
  );
}

// ─── Payment Row ──────────────────────────────────────────────────────────────
function PayRow({ line, onChange, onRemove, canRemove, totalVenda, onFillRemainder, remainder }:
  { line: PaymentLine; onChange: (id: number, p: Partial<PaymentLine>) => void; onRemove: (id: number) => void;
    canRemove: boolean; totalVenda: number; onFillRemainder: (id: number) => void; remainder: number }
) {
  const color = PAY_COLOR[line.forma] || "#94a3b8";
  const isFinanc = line.forma === "financiamento";
  const isCartao = line.forma === "cartao";
  const isConsorcio = line.forma === "consorcio";
  const isPermuta = line.forma === "permuta";
  const isTransf = line.forma === "transferencia";
  const hasExtras = isFinanc || isCartao || isConsorcio || isPermuta || isTransf;
  const parcelasN = parseInt(line.parcelas || "0");
  const taxa = parseFloat((line.taxa || "0").replace(",", "."));
  const sim = isFinanc && line.valor > 0 && parcelasN >= 2 ? calcPrice(line.valor, taxa, parcelasN) : null;
  const { isMobile } = useBreakpoint();

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
      style={{ borderRadius: 12, background: "var(--surface-2)", border: `1.5px solid ${color}25`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div style={{ width: 4, background: `linear-gradient(180deg, ${color}, ${color}60)`, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px" }}>
          {/* Linha 1: badge + select (ocupa toda a largura no mobile) */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flexShrink: 0 }}>
              <PaymentBadge forma={line.forma} banco={line.banco} size="sm" iconOnly />
            </div>
            <select value={line.forma} className="input"
              style={{ fontSize: "13px", flex: 1, borderColor: `${color}40` }}
              onChange={e => onChange(line.id, { forma: e.target.value })}>
              {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {/* Linha 2: valor + botão restante + lixeira */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input value={line.valor_display} inputMode="numeric" placeholder="0,00" className="input"
                style={{ fontSize: "14px", fontWeight: 600, borderColor: `${color}40`, paddingRight: totalVenda > 0 && line.valor > 0 ? 46 : 12 }}
                onChange={e => { const m = maskCurrency(e.target.value); onChange(line.id, { valor_display: m, valor: parseCurrency(m) }); }} />
              {totalVenda > 0 && line.valor > 0 && (
                <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: "10px", fontWeight: 700, color, background: `${color}15`, padding: "1px 6px", borderRadius: 4 }}>
                  {Math.round((line.valor / totalVenda) * 100)}%
                </span>
              )}
            </div>
            {remainder > 0.01 && (
              <button type="button" onClick={() => onFillRemainder(line.id)}
                style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, fontSize: "11px", fontWeight: 600, color, background: `${color}12`, border: `1px solid ${color}28`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>
                <Calculator size={10} /> Restante
              </button>
            )}
            <button type="button" onClick={() => onRemove(line.id)} disabled={!canRemove}
              style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: canRemove ? "pointer" : "not-allowed", background: canRemove ? "rgba(239,68,68,0.08)" : "transparent", border: canRemove ? "1px solid rgba(239,68,68,0.18)" : "1px solid transparent", color: canRemove ? "#ef4444" : "var(--text-muted)" }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
      {hasExtras && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: "12px 18px 14px", borderTop: `1px solid ${color}18`, background: `${color}04`, display: "flex", flexDirection: "column", gap: 10 }}>
          {isFinanc && (
            <>
              {/* Seletor visual de banco */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Banco Financiador
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { value: "Bradesco",  logo: "/icons/bradesco.svg"   },
                    { value: "Itaú",      logo: "/icons/itau.svg"       },
                    { value: "Santander", logo: "/icons/santander.svg"  },
                    { value: "BB",        logo: "/icons/bb.svg"         },
                    { value: "Nubank",    logo: "/icons/nubank.svg"     },
                    { value: "Outro banco", logo: "/icons/outro-banco.svg" },
                  ].map(b => {
                    const BANCOS = ["Bradesco","Itaú","Santander","BB","Nubank"];
                    const sel = line.banco === b.value || (b.value === "Outro banco" && !!line.banco && !BANCOS.includes(line.banco));
                    const isOutro = b.value === "Outro banco";
                    return (
                      <button key={b.value} type="button"
                        onClick={() => {
                          if (isOutro) onChange(line.id, { banco: sel ? "" : "__outro__" });
                          else onChange(line.id, { banco: sel ? "" : b.value });
                        }}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                          padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                          border: `2px solid ${sel ? "#a78bfa" : "var(--border)"}`,
                          background: sel ? "rgba(167,139,250,0.08)" : "var(--surface)",
                          transition: "all 0.15s", minWidth: 64,
                          boxShadow: sel ? "0 0 0 3px rgba(167,139,250,0.15)" : "none",
                        }}>
                        <img src={b.logo} alt={b.value}
                          style={{ width: 36, height: 22, objectFit: "contain", filter: sel ? "none" : "opacity(0.6)" }} />
                        <span style={{ fontSize: "9px", fontWeight: sel ? 700 : 500, color: sel ? "#a78bfa" : "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {b.value}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {line.banco && !["Bradesco","Itaú","Santander","BB","Nubank"].includes(line.banco) && (
                  <input
                    autoFocus
                    value={line.banco === "__outro__" ? "" : line.banco}
                    placeholder="Nome do banco (ex: Caixa, BRB, Sicredi...)"
                    className="input"
                    style={{ marginTop: 8, fontSize: "13px" }}
                    onChange={e => onChange(line.id, { banco: e.target.value || "__outro__" })}
                  />
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Nº de Parcelas">
                  <select value={line.parcelas || ""} className="input" style={{ fontSize: "13px" }} onChange={e => onChange(line.id, { parcelas: e.target.value })}>
                    <option value="">Selecionar...</option>
                    {[12,18,24,30,36,42,48,60,72,84,96,120].map(n => <option key={n} value={String(n)}>{n}x - {Math.round(n/12)}a{n/12 > 1 ? "" : ""}</option>)}
                  </select>
                </Field>
                <Field label="Taxa (% a.m.)"><input value={line.taxa || ""} placeholder="1,49" inputMode="decimal" className="input" style={{ fontSize: "13px" }} onChange={e => onChange(line.id, { taxa: e.target.value.replace(/[^0-9,.]/g, "") })} /></Field>
              </div>
              {sim && (
                <div style={{ padding: "11px 14px", borderRadius: 10, background: "linear-gradient(135deg,rgba(167,139,250,0.06),rgba(99,102,241,0.06))", border: "1px solid rgba(167,139,250,0.2)", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 12 }}>
                  {[{ label: `${parcelasN}x de`, value: fmt(sim.parcela), color: "#a78bfa" }, { label: "Juros totais", value: fmt(sim.juros), color: sim.juros > 0 ? "#f59e0b" : "#22c55e" }, { label: "Total c/ juros", value: fmt(sim.total), color: sim.juros > 0 ? "#ef4444" : "var(--text-primary)" }].map(r => (
                    <div key={r.label} style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>{r.label}</p>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: r.color }}>{r.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {isCartao && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Seletor visual de bandeira */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Bandeira do Cartão
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { value: "Visa",           logo: "/icons/visa.svg"         },
                    { value: "Mastercard",      logo: "/icons/mastercard.svg"   },
                    { value: "Elo",             logo: "/icons/elo.svg"          },
                    { value: "Amex",            logo: "/icons/amex.svg"         },
                    { value: "Hipercard",       logo: "/icons/hipercard.svg"    },
                    { value: "Nubank",          logo: "/icons/nubank.svg"       },
                    { value: "Débito",          logo: "/icons/debito.svg"       },
                    { value: "Outra bandeira",  logo: "/icons/outro-cartao.svg" },
                  ].map(b => {
                    const sel = line.banco === b.value || (b.value === "Outra bandeira" && !!line.banco && !["Visa","Mastercard","Elo","Amex","Hipercard","Nubank","Débito"].includes(line.banco));
                    const isOutra = b.value === "Outra bandeira";
                    return (
                      <button key={b.value} type="button"
                        onClick={() => {
                          if (isOutra) onChange(line.id, { banco: sel ? "" : "__outra__" });
                          else onChange(line.id, { banco: sel ? "" : b.value });
                        }}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                          padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                          border: `2px solid ${sel ? "#F5A623" : "var(--border)"}`,
                          background: sel ? "rgba(245,166,35,0.08)" : "var(--surface)",
                          transition: "all 0.15s", minWidth: 64,
                          boxShadow: sel ? "0 0 0 3px rgba(245,166,35,0.15)" : "none",
                        }}>
                        <img src={b.logo} alt={b.value}
                          style={{ width: 36, height: 22, objectFit: "contain",
                            filter: sel ? "none" : "opacity(0.6)"
                          }} />
                        <span style={{ fontSize: "9px", fontWeight: sel ? 700 : 500, color: sel ? "#F5A623" : "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {b.value}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Campo texto quando "Outra bandeira" selecionada */}
                {line.banco && !["Visa","Mastercard","Elo","Amex","Hipercard","Nubank","Débito"].includes(line.banco) && (
                  <input
                    autoFocus
                    value={line.banco === "__outra__" ? "" : line.banco}
                    placeholder="Digite a bandeira (ex: Cabal, Banescard...)"
                    className="input"
                    style={{ marginTop: 8, fontSize: "13px" }}
                    onChange={e => onChange(line.id, { banco: e.target.value || "__outra__" })}
                  />
                )}
              </div>
              {/* Parcelas */}
              <Field label="Parcelas">
                <select value={line.parcelas || ""} className="input" style={{ fontSize: "13px" }} onChange={e => onChange(line.id, { parcelas: e.target.value })}>
                  <option value="">À vista</option>
                  {[2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={String(n)}>{n}x</option>)}
                </select>
              </Field>
            </div>
          )}
          {(isConsorcio || isPermuta) && (
            <Field label={isConsorcio ? "Administradora / Grupo" : "Descrição da permuta"}>
              <input value={line.banco || ""} placeholder={isConsorcio ? "Ex: Embracon..." : "Ex: Carro HB20 + R$5.000"} className="input" style={{ fontSize: "13px" }} onChange={e => onChange(line.id, { banco: e.target.value })} />
            </Field>
          )}
          {isTransf && <Field label="Banco de origem"><input value={line.banco || ""} placeholder="Itaú, Banco do Brasil..." className="input" style={{ fontSize: "13px" }} onChange={e => onChange(line.id, { banco: e.target.value })} /></Field>}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NovaVendaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const { isMobile, isMobileOrTablet } = useBreakpoint();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Scroll to top of main content whenever step changes (critical on mobile)
  useEffect(() => {
    const main = document.getElementById("dash-main");
    if (main) main.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Step 0 - vehicle
  const searchParams   = useSearchParams();
  const tipoParam      = searchParams.get("tipo") as "carro" | "moto" | null;
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleTab, setVehicleTab]       = useState<"carro" | "moto">(tipoParam ?? "carro");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Step 1 - customer
  const [clientSearch, setClientSearch]       = useState("");
  const [selectedClient, setSelectedClient]   = useState<Customer | null>(null);
  const [showNewClient, setShowNewClient]     = useState(false);
  const [newClientErrors, setNewClientErrors] = useState<Record<string, string>>({});
  const [newClient, setNewClient] = useState({
    nome: "", cpf_cnpj: "", telefone: "", whatsapp: "",
    email: "", cep: "", rua: "", numero: "", complemento: "",
    cidade: "", estado: "", observacoes: "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepOk, setCepOk]           = useState(false);
  const [cepError, setCepError]     = useState("");

  // Step 2 - payment
  const [valorVendaDisplay, setValorVendaDisplay] = useState("");
  const [valorVenda, setValorVenda]               = useState(0);
  const [dataVenda, setDataVenda]                 = useState(new Date().toISOString().split("T")[0]);
  const [dataEntrega, setDataEntrega]             = useState("");
  const [paymentLines, setPaymentLines]           = useState<PaymentLine[]>([{ id: newId(), forma: "pix", valor_display: "", valor: 0 }]);
  const [observacoes, setObservacoes]             = useState("");
  const [saleStatus, setSaleStatus]               = useState<"concluida" | "pendente">("concluida");

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: carrosData = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles-carros", vehicleSearch],
    queryFn: () => vehiclesApi.list({ status: "disponivel", tipo: "carro", q: vehicleSearch || undefined, limit: 40 }),
    enabled: step === 0,
  });
  const { data: motosData = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles-motos", vehicleSearch],
    queryFn: () => vehiclesApi.list({ status: "disponivel", tipo: "moto", q: vehicleSearch || undefined, limit: 40 }),
    enabled: step === 0,
  });
  const vehicles = vehicleTab === "moto" ? motosData : carrosData;

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers-search", clientSearch],
    queryFn: () => customersApi.list({ q: clientSearch || undefined, limit: 30 }),
    enabled: step === 1,
  });

  // ─── Computed ─────────────────────────────────────────────────────────────
  const totalPago  = paymentLines.reduce((s, l) => s + l.valor, 0);
  const remainder  = Math.max(0, valorVenda - totalPago);
  const isMixed    = paymentLines.length > 1;
  const formaFinal = isMixed ? "misto" : paymentLines[0]?.forma || "pix";

  // ─── Mutations ────────────────────────────────────────────────────────────
  const saleMutation = useMutation({
    mutationFn: (payload: unknown) => salesApi.create(payload),
    onSuccess: () => {
      toast.success("Venda registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-carros"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-motos"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-search"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["sales-carros-page"] });
      queryClient.invalidateQueries({ queryKey: ["sales-motos-page"] });
      // Financeiro — atualiza KPIs, lançamentos e gráfico ao criar venda
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["financial-entries"] });
      queryClient.invalidateQueries({ queryKey: ["financial-chart"] });
      queryClient.invalidateQueries({ queryKey: ["lucratividade-mes"] });
      // Redirect to the correct sales list based on vehicle type sold
      const destino = vehicleTab === "moto"
        ? "/dashboard/vendas/motos"
        : "/dashboard/vendas/carros";
      router.push(destino);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao registrar venda";
      toast.error(msg);
    },
  });

  const newClientMutation = useMutation({
    mutationFn: (data: unknown) => customersApi.create(data),
    onSuccess: (created: Customer) => {
      toast.success("Cliente cadastrado!");
      // Invalida AMBAS as chaves: wizard + página de Clientes
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-search"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSelectedClient(created);
      setShowNewClient(false);
      setNewClient({ nome: "", cpf_cnpj: "", telefone: "", whatsapp: "", email: "", cep: "", rua: "", numero: "", complemento: "", cidade: "", estado: "", observacoes: "" });
      setCepOk(false); setCepError("");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao cadastrar cliente";
      toast.error(msg);
    },
  });


  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCEP = async (raw: string) => {
    const masked = maskCEP(raw);
    setNewClient(f => ({ ...f, cep: masked }));
    setCepError(""); setCepOk(false);
    const digits = masked.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { setCepError("CEP não encontrado"); }
      else {
        setNewClient(f => ({ ...f, rua: `${data.logradouro}${data.bairro ? ", " + data.bairro : ""}`, cidade: data.localidade, estado: data.uf }));
        setCepOk(true);
      }
    } catch { setCepError("Erro ao buscar CEP"); }
    finally { setCepLoading(false); }
  };

  const submitNewClient = () => {
    const errs: Record<string, string> = {};
    if (!newClient.nome.trim()) errs.nome = "Nome obrigatório";
    setNewClientErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const endereco = [newClient.rua, newClient.numero, newClient.complemento].filter(Boolean).join(", ");
    newClientMutation.mutate({
      nome: newClient.nome,
      cpf_cnpj: newClient.cpf_cnpj || undefined,
      telefone: newClient.telefone || undefined,
      whatsapp: newClient.whatsapp || undefined,
      email: newClient.email || undefined,
      endereco: endereco || undefined,
      cidade: newClient.cidade || undefined,
      estado: newClient.estado || undefined,
      observacoes: newClient.observacoes || undefined,
    });
  };

  const validateStep = () => {
    const errs: Record<string, string> = {};
    if (step === 0 && !selectedVehicle) errs.vehicle = "Selecione um veículo";
    if (step === 1 && !selectedClient) errs.client = "Selecione um cliente";
    if (step === 2) {
      if (!valorVenda || valorVenda <= 0) errs.valorVenda = "Informe o valor de venda";
      if (!dataVenda) errs.dataVenda = "Informe a data de venda";
      if (Math.abs(remainder) > 0.5) errs.payment = `Faltam ${fmt(remainder)} para totalizar o valor de venda`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => { if (validateStep()) setStep(s => Math.min(s + 1, 3)); };

  const handleSubmit = () => {
    if (!selectedVehicle || !selectedClient) return;
    saleMutation.mutate({
      vehicle_id: selectedVehicle.id,
      cliente_id: selectedClient.id,
      valor_venda: valorVenda,
      valor_entrada: paymentLines[0]?.valor || valorVenda,
      valor_financiado: paymentLines.find(l => l.forma === "financiamento")?.valor || 0,
      parcelas: paymentLines.length === 1 ? parseInt(paymentLines[0].parcelas || "0") || null : null,
      forma_pagamento: formaFinal,
      banco_financiamento: paymentLines.find(l => l.forma === "financiamento")?.banco || null,
      comissao_percentual: 0,
      comissao_valor: 0,
      data_venda: dataVenda,
      data_entrega: dataEntrega || null,
      status: saleStatus,
      observacoes: observacoes || null,
      payment_methods: isMixed ? paymentLines.map(l => ({ forma: l.forma, valor: String(l.valor), parcelas: l.parcelas ? parseInt(l.parcelas) : undefined, banco: l.banco || undefined, taxa: l.taxa || undefined })) : null,
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobileOrTablet ? "0 4px" : "0" }}>
      {/* Back */}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={() => router.back()} className="btn btn-ghost" style={{ marginBottom: 20 }}>
        <ChevronLeft size={16} /> Voltar
      </motion.button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShoppingBag size={20} color="#22c55e" strokeWidth={1.8} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobileOrTablet ? "18px" : "22px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Registrar Venda</h1>
            {!isMobile && <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: 2 }}>Siga os passos para registrar uma nova venda</p>}
          </div>
        </div>
      </motion.div>

      {/* Step indicator */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ display: "flex", gap: 0, marginBottom: 20, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: isMobileOrTablet ? 4 : 6, overflow: "hidden" }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > i;
          const active = step === i;
          return (
            <div key={s.id} onClick={() => done && setStep(i)}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: isMobileOrTablet ? "center" : "flex-start", gap: isMobileOrTablet ? 6 : 10, padding: isMobileOrTablet ? "8px 4px" : "10px 14px", borderRadius: 12, transition: "all 0.2s", cursor: done ? "pointer" : "default",
                background: active ? "rgba(34,197,94,0.12)" : done ? "rgba(34,197,94,0.05)" : "transparent",
                border: active ? "1px solid rgba(34,197,94,0.25)" : "1px solid transparent", minWidth: 0 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#22c55e" : active ? "rgba(34,197,94,0.15)" : "var(--surface-2)",
                border: done ? "none" : active ? "1.5px solid #22c55e" : "1px solid var(--border)" }}>
                {done ? <Check size={12} color="#fff" strokeWidth={2.5} /> : <Icon size={12} color={active ? "#22c55e" : "var(--text-muted)"} />}
              </div>
              {!isMobileOrTablet && (
                <span style={{ fontSize: "12px", fontWeight: 600, color: active ? "var(--text-primary)" : done ? "var(--text-secondary)" : "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* ── Steps Content ── */}
      <AnimatePresence mode="wait">

        {/* STEP 0: Veículo */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="card" style={{ padding: 24, marginBottom: 16 }}>
              {/* Vehicle type tabs - only shown when no tipo URL param */}
              {!tipoParam && (
              <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 4, width: "fit-content" }}>
                {(["carro", "moto"] as const).map(tab => {
                  const isActive = vehicleTab === tab;
                  const color = tab === "moto" ? "#f97316" : "#3b82f6";
                  const TabIcon = tab === "moto" ? Bike : Car;
                  const count = tab === "moto" ? motosData.length : carrosData.length;
                  return (
                    <button key={tab} onClick={() => { setVehicleTab(tab); setSelectedVehicle(null); }}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", borderRadius: 9, border: "none", cursor: "pointer", transition: "all 0.2s",
                        background: isActive ? (tab === "moto" ? "rgba(249,115,22,0.1)" : "rgba(59,130,246,0.1)") : "transparent",
                        boxShadow: isActive ? `0 0 0 1.5px ${color}` : "none",
                        color: isActive ? color : "var(--text-muted)" }}>
                      <TabIcon size={14} />
                      <span style={{ fontSize: "13px", fontWeight: isActive ? 700 : 500 }}>{tab === "moto" ? "Motos" : "Carros"}</span>
                      {count > 0 && <span style={{ fontSize: "10px", fontWeight: 700, color: isActive ? color : "var(--text-muted)", background: isActive ? `${color}18` : "var(--border)", padding: "1px 7px", borderRadius: 20 }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
              )}

              <Section title={vehicleTab === "moto" ? "Motos Disponíveis" : "Carros Disponíveis"} icon={vehicleTab === "moto" ? Bike : Car} color={vehicleTab === "moto" ? "#f97316" : "#3b82f6"} />

              {/* Search */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 14px", height: 42, marginBottom: 16 }}>
                <Search size={14} color="var(--text-muted)" />
                <input value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)}
                  placeholder={`Buscar ${vehicleTab === "moto" ? "moto" : "carro"} por marca, modelo ou placa...`}
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "13px", color: "var(--text-primary)" }} />
                {vehicleSearch && <button onClick={() => setVehicleSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}><X size={12} /></button>}
              </div>

                {/* Vehicle grid */}
                <AnimatePresence mode="wait">
                  <motion.div key={vehicleTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${isMobile ? "150px" : "220px"}), 1fr))`, gap: 10, maxHeight: isMobileOrTablet ? 380 : 460, overflowY: "auto", paddingRight: 4 }}>
                    {vehicles.map(v => {
                      const selected = selectedVehicle?.id === v.id;
                      const VIcon = vehicleTab === "moto" ? Bike : Car;
                      const accent = vehicleTab === "moto" ? "#f97316" : "#3b82f6";
                      const mainPhoto = v.photos?.find(p => p.is_main) ?? v.photos?.[0];
                      const photoUrl = mainPhoto ? mainPhoto.url : null;
                      return (
                        <motion.div key={v.id} onClick={() => setSelectedVehicle(v)}
                          whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
                          style={{ borderRadius: 14, cursor: "pointer", overflow: "hidden", transition: "all 0.15s",
                            background: selected ? `${accent}10` : "var(--surface-2)",
                            border: selected ? `2px solid ${accent}` : "1.5px solid var(--border)",
                            boxShadow: selected ? `0 0 0 3px ${accent}18, 0 4px 16px rgba(0,0,0,0.3)` : "none" }}>

                          {/* Photo area */}
                          <div style={{ position: "relative", width: "100%", height: isMobile ? 100 : 130, background: "#080808", overflow: "hidden" }}>
                            {photoUrl ? (
                              <img src={photoUrl} alt={`${v.marca} ${v.modelo}`}
                                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transition: "transform 0.35s" }}
                                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"}
                                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                              />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <img
                                  src={vehicleTab === "moto" ? "/moto-placeholder.svg" : "/car-placeholder.svg"}
                                  alt="Sem foto"
                                  style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", opacity: 0.15, padding: "24px", filter: "brightness(0) invert(1)" }}
                                />
                              </div>
                            )}


                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7) 100%)" }} />
                            {/* Price overlay */}
                            {v.valor_anunciado && (
                              <p style={{ position: "absolute", bottom: 8, left: 10, fontSize: "14px", fontWeight: 800, color: accent, letterSpacing: "-0.3px", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
                                {fmt(Number(v.valor_anunciado))}
                              </p>
                            )}
                            {/* Selected check */}
                            {selected && (
                              <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 10px ${accent}80` }}>
                                <Check size={12} color="#fff" strokeWidth={3} />
                              </div>
                            )}
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: selected ? `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)` : "transparent" }} />
                          </div>

                          {/* Info area */}
                          <div style={{ padding: "10px 12px 12px" }}>
                            <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: 2, lineHeight: 1.2 }}>{v.marca} {v.modelo}</p>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: 8 }}>{v.ano} · {v.quilometragem.toLocaleString("pt-BR")} km</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                              <span style={{ fontSize: "10px", fontFamily: "monospace", background: "var(--surface)", border: "1px solid var(--border)", padding: "1px 6px", borderRadius: 4, color: "var(--text-muted)" }}>{v.placa}</span>
                              {v.cor && <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "10px", color: "var(--text-muted)", background: "var(--surface)", border: "1px solid var(--border)", padding: "1px 6px", borderRadius: 4 }}><ColorDot cor={v.cor} /> {v.cor}</div>}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {vehicles.length === 0 && (
                      <div style={{ gridColumn: "1/-1", padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                        {vehicleSearch ? `Nenhum resultado para "${vehicleSearch}"` : vehicleTab === "moto" ? "Nenhuma moto disponível" : "Nenhum carro disponível"}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

              {errors.vehicle && <p style={{ marginTop: 12, fontSize: "12px", color: "var(--error)", display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={11} /> {errors.vehicle}</p>}

              {selectedVehicle && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10,
                    background: vehicleTab === "moto" ? "rgba(249,115,22,0.08)" : "rgba(59,130,246,0.08)",
                    border: vehicleTab === "moto" ? "1px solid rgba(249,115,22,0.25)" : "1px solid rgba(59,130,246,0.25)",
                    display: "flex", alignItems: "center", gap: 12 }}>
                  <Check size={16} color={vehicleTab === "moto" ? "#f97316" : "#3b82f6"} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{selectedVehicle.marca} {selectedVehicle.modelo} {selectedVehicle.ano}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: 8 }}>{selectedVehicle.placa}</span>
                  </div>
                  <button onClick={() => setSelectedVehicle(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={14} /></button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 1: Cliente */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="card" style={{ padding: 24, marginBottom: 16 }}>

              {/* Header with New Client button */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(167,139,250,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <User size={13} color="#a78bfa" />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>Selecione o Cliente Comprador</span>
                </div>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} type="button"
                  onClick={() => { setShowNewClient(v => !v); setNewClientErrors({}); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", fontWeight: 600,
                    color: showNewClient ? "var(--text-muted)" : "#a78bfa",
                    background: showNewClient ? "var(--surface-2)" : "rgba(167,139,250,0.1)",
                    border: `1.5px solid ${showNewClient ? "var(--border)" : "rgba(167,139,250,0.35)"}`,
                    borderRadius: 10, padding: "7px 14px", cursor: "pointer" }}>
                  {showNewClient ? <><X size={12} /> Cancelar</> : <><Plus size={12} /> Novo Cliente</>}
                </motion.button>
              </div>

              {/* Inline new client form - campos idênticos ao módulo Clientes */}
              <AnimatePresence>
                {showNewClient && (
                  <motion.div initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -8 }}
                    style={{ overflow: "hidden", marginBottom: 16 }}>
                    <div style={{ padding: 20, borderRadius: 14, background: "rgba(167,139,250,0.06)", border: "1.5px solid rgba(167,139,250,0.25)" }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#a78bfa", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                        <Plus size={12} /> Cadastrar Novo Cliente
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
                        {/* Nome */}
                        <div style={isMobile ? {} : { gridColumn: "span 2" }}>
                          <Field label="Nome completo" required error={newClientErrors.nome}>
                            <input value={newClient.nome} onChange={e => setNewClient(f => ({ ...f, nome: e.target.value }))}
                              className="input" placeholder="Ex: João da Silva"
                              style={{ borderColor: newClientErrors.nome ? "var(--error)" : "rgba(167,139,250,0.35)" }} />
                          </Field>
                        </div>
                        {/* CPF/CNPJ */}
                        <div>
                          <Field label="CPF / CNPJ">
                            <input value={newClient.cpf_cnpj}
                              onChange={e => setNewClient(f => ({ ...f, cpf_cnpj: maskCPFOrCNPJ(e.target.value) }))}
                              className="input" placeholder="000.000.000-00" inputMode="numeric"
                              style={{ borderColor: "rgba(167,139,250,0.35)" }} />
                            {newClient.cpf_cnpj && unmask(newClient.cpf_cnpj).length === 11 && !validateCPF(newClient.cpf_cnpj) && (
                              <p style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "11px", color: "var(--error)", marginTop: 4 }}><AlertCircle size={10} /> CPF inválido</p>
                            )}
                            {newClient.cpf_cnpj && unmask(newClient.cpf_cnpj).length === 14 && !validateCNPJ(newClient.cpf_cnpj) && (
                              <p style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "11px", color: "var(--error)", marginTop: 4 }}><AlertCircle size={10} /> CNPJ inválido</p>
                            )}
                          </Field>
                        </div>
                        {/* Email */}
                        <div>
                          <Field label="E-mail">
                            <input type="email" value={newClient.email} onChange={e => setNewClient(f => ({ ...f, email: e.target.value }))}
                              className="input" placeholder="email@exemplo.com" style={{ borderColor: "rgba(167,139,250,0.35)" }} />
                          </Field>
                        </div>
                        {/* Telefone */}
                        <div>
                          <Field label="Telefone">
                            <input value={newClient.telefone} onChange={e => setNewClient(f => ({ ...f, telefone: maskPhone(e.target.value) }))}
                              className="input" placeholder="(00) 00000-0000" inputMode="tel" maxLength={15}
                              style={{ borderColor: "rgba(167,139,250,0.35)" }} />
                          </Field>
                        </div>
                        {/* WhatsApp */}
                        <div>
                          <Field label="WhatsApp">
                            <input value={newClient.whatsapp} onChange={e => setNewClient(f => ({ ...f, whatsapp: maskPhone(e.target.value) }))}
                              className="input" placeholder="(00) 00000-0000" inputMode="tel" maxLength={15}
                              style={{ borderColor: "rgba(167,139,250,0.35)" }} />
                          </Field>
                        </div>
                        {/* Divider */}
                        <div style={isMobile ? {} : { gridColumn: "span 2", height: 1, background: "rgba(167,139,250,0.15)", margin: "4px 0" }} />
                        {/* CEP */}
                        <div>
                          <Field label="CEP">
                            <div style={{ position: "relative" }}>
                              <input value={newClient.cep} onChange={e => handleCEP(e.target.value)}
                                className="input" placeholder="00000-000" inputMode="numeric" maxLength={9}
                                style={{ borderColor: "rgba(167,139,250,0.35)", paddingRight: 36 }} />
                              {cepLoading && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                                <Loader2 size={13} color="var(--text-muted)" style={{ animation: "spin 1s linear infinite" }} />
                              </span>}
                              {cepOk && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                                <Check size={13} color="#22c55e" />
                              </span>}
                            </div>
                            {cepError && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: 4, display: "flex", gap: 3, alignItems: "center" }}><AlertCircle size={10} />{cepError}</p>}
                          </Field>
                        </div>
                        {/* Estado */}
                        <div>
                          <Field label="Estado (UF)">
                            <input value={newClient.estado}
                              onChange={e => setNewClient(f => ({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                              className="input" placeholder="SP" maxLength={2} style={{ borderColor: "rgba(167,139,250,0.35)" }} />
                          </Field>
                        </div>
                        {/* Logradouro */}
                        <div style={isMobile ? {} : { gridColumn: "span 2" }}>
                          <Field label="Logradouro e Bairro">
                            <input value={newClient.rua} onChange={e => setNewClient(f => ({ ...f, rua: e.target.value }))}
                              className="input" placeholder="Rua, Bairro (preenchido pelo CEP)" style={{ borderColor: "rgba(167,139,250,0.35)" }} />
                          </Field>
                        </div>
                        {/* Número */}
                        <div>
                          <Field label="Número">
                            <input value={newClient.numero} onChange={e => setNewClient(f => ({ ...f, numero: e.target.value }))}
                              className="input" placeholder="123" inputMode="numeric" style={{ borderColor: "rgba(167,139,250,0.35)" }} />
                          </Field>
                        </div>
                        {/* Complemento */}
                        <div>
                          <Field label="Complemento">
                            <input value={newClient.complemento} onChange={e => setNewClient(f => ({ ...f, complemento: e.target.value }))}
                              className="input" placeholder="Apto, Casa..." style={{ borderColor: "rgba(167,139,250,0.35)" }} />
                          </Field>
                        </div>
                        {/* Cidade */}
                        <div style={isMobile ? {} : { gridColumn: "span 2" }}>
                          <Field label="Cidade">
                            <input value={newClient.cidade} onChange={e => setNewClient(f => ({ ...f, cidade: e.target.value }))}
                              className="input" placeholder="Cidade" style={{ borderColor: "rgba(167,139,250,0.35)" }} />
                          </Field>
                        </div>
                        {/* Observações */}
                        <div style={isMobile ? {} : { gridColumn: "span 2" }}>
                          <Field label="Observações">
                            <textarea value={newClient.observacoes} onChange={e => setNewClient(f => ({ ...f, observacoes: e.target.value }))}
                              className="input" rows={2} style={{ height: "auto", paddingTop: 8, borderColor: "rgba(167,139,250,0.35)" }}
                              placeholder="Anotações sobre o cliente..." />
                          </Field>
                        </div>
                      </div>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button"
                        onClick={submitNewClient} disabled={newClientMutation.isPending}
                        style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, fontSize: "13px", fontWeight: 700,
                          color: "#fff", background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                          border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer",
                          opacity: newClientMutation.isPending ? 0.7 : 1 }}>
                        {newClientMutation.isPending
                          ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Cadastrando...</>
                          : <><Check size={13} /> Cadastrar e Selecionar</>}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>


              {/* Client list (hidden when new client form is open) */}
              {!showNewClient && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "0 14px", height: 42, marginBottom: 16 }}>
                    <Search size={14} color="var(--text-muted)" />
                    <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                      placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
                      style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "13px", color: "var(--text-primary)" }} />
                    {clientSearch && <button onClick={() => setClientSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}><X size={12} /></button>}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
                    {customers.map(c => {
                      const selected = selectedClient?.id === c.id;
                      const initials = c.nome.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
                      return (
                        <motion.div key={c.id} onClick={() => setSelectedClient(c)}
                          whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                            background: selected ? "rgba(167,139,250,0.1)" : "var(--surface-2)",
                            border: selected ? "1.5px solid #a78bfa" : "1.5px solid var(--border)" }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: selected ? "#a78bfa" : "var(--surface)", border: `1px solid ${selected ? "transparent" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "12px", fontWeight: 700, color: selected ? "#fff" : "var(--text-secondary)" }}>
                            {initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</p>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 1 }}>{c.cpf_cnpj || c.telefone || c.email || "Sem contato cadastrado"}</p>
                          </div>
                          {c.total_compras !== undefined && c.total_compras > 0 && (
                            <span style={{ fontSize: "10px", fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>
                              {c.total_compras}ª compra
                            </span>
                          )}
                          {selected && <Check size={16} color="#a78bfa" style={{ flexShrink: 0 }} />}
                        </motion.div>
                      );
                    })}
                    {customers.length === 0 && (
                      <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                        {clientSearch ? `Nenhum resultado para "${clientSearch}"` : "Busque um cliente acima ou clique em \"Novo Cliente\""}
                      </div>
                    )}
                  </div>
                </>
              )}

              {errors.client && <p style={{ marginTop: 12, fontSize: "12px", color: "var(--error)", display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={11} /> {errors.client}</p>}

              {selectedClient && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", alignItems: "center", gap: 12 }}>
                  <UserCheck size={16} color="#a78bfa" />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{selectedClient.nome}</span>
                  <button onClick={() => setSelectedClient(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={14} /></button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 2: Pagamento */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {/* Valor + Datas */}
            <div className="card" style={{ padding: 24, marginBottom: 14 }}>
              <Section title="Valor e Datas" icon={DollarSign} color="#22c55e" />

              {/* Valor anunciado como referência */}
              {selectedVehicle?.valor_anunciado && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "11px", color: "var(--text-muted)" }}>
                    <Tag size={11} color="#22c55e" /> Valor anunciado do veículo:
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#22c55e" }}>
                    {fmt(Number(selectedVehicle.valor_anunciado))}
                  </span>
                  <button type="button"
                    onClick={() => {
                      const v = Number(selectedVehicle.valor_anunciado);
                      setValorVenda(v);
                      setValorVendaDisplay(v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
                    }}
                    style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 600, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 7, padding: "4px 10px", cursor: "pointer" }}>
                    Usar este valor
                  </button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
                <Field label="Valor de Venda (R$)" required error={errors.valorVenda}>
                  <input value={valorVendaDisplay} inputMode="numeric" placeholder="0,00" className="input"
                    style={{ fontSize: "15px", fontWeight: 700, borderColor: errors.valorVenda ? "var(--error)" : undefined }}
                    onChange={e => { const m = maskCurrency(e.target.value); setValorVendaDisplay(m); setValorVenda(parseCurrency(m)); }} />
                </Field>
                <Field label="Data da Venda" required error={errors.dataVenda}>
                  <input type="date" value={dataVenda} onChange={e => setDataVenda(e.target.value)} className="input" style={{ fontSize: "13px" }} />
                </Field>
                <Field label="Data de Entrega (opcional)">
                  <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} className="input" style={{ fontSize: "13px" }} />
                </Field>
              </div>
            </div>

            {/* Payment lines */}
            <div className="card" style={{ padding: 24, marginBottom: 14 }}>
              <Section title="Forma de Pagamento" icon={CreditCard} color="#a78bfa" />
              {valorVenda > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Total pago: <strong style={{ color: totalPago >= valorVenda ? "#22c55e" : "var(--text-primary)" }}>{fmt(totalPago)}</strong> de {fmt(valorVenda)}
                    </span>
                    {remainder > 0 ? <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>Faltam {fmt(remainder)}</span>
                      : <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Check size={11} /> Completo</span>}
                  </div>
                  <div style={{ height: 4, borderRadius: 4, background: "var(--border)" }}>
                    <motion.div animate={{ width: `${Math.min(100, (totalPago / valorVenda) * 100)}%` }}
                      style={{ height: "100%", borderRadius: 4, background: totalPago >= valorVenda ? "#22c55e" : "linear-gradient(90deg, #a78bfa, #6366f1)" }} />
                  </div>
                </div>
              )}
              {errors.payment && <p style={{ marginBottom: 12, fontSize: "12px", color: "var(--error)", display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={11} /> {errors.payment}</p>}
              <AnimatePresence>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {paymentLines.map(line => (
                    <PayRow key={line.id} line={line}
                      onChange={(id, patch) => setPaymentLines(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l))}
                      onRemove={id => setPaymentLines(ls => ls.filter(l => l.id !== id))}
                      canRemove={paymentLines.length > 1}
                      totalVenda={valorVenda} remainder={remainder}
                      onFillRemainder={id => setPaymentLines(ls => ls.map(l => {
                        if (l.id !== id) return l;
                        const val = remainder + l.valor;
                        return { ...l, valor: val, valor_display: val.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) };
                      }))} />
                  ))}
                </div>
              </AnimatePresence>
              <button type="button" onClick={() => setPaymentLines(ls => [...ls, { id: newId(), forma: "pix", valor_display: "", valor: 0 }])}
                style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: "12px", fontWeight: 600, color: "#a78bfa", background: "rgba(167,139,250,0.08)", border: "1.5px dashed rgba(167,139,250,0.4)", borderRadius: 10, padding: "9px 16px", cursor: "pointer", width: "100%", justifyContent: "center" }}>
                <Plus size={13} /> Adicionar outra forma de pagamento
              </button>
            </div>

            {/* Status da Venda */}
            <div className="card" style={{ padding: 24, marginBottom: 14 }}>
              <Section title="Status da Venda" icon={CheckCircle} color="#22c55e" />
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: 14 }}>
                Selecione <strong>Concluída</strong> para registrar a venda imediatamente, ou <strong>Pendente</strong> para reservar o veículo e confirmar depois.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                {([
                  { value: "concluida", label: "Concluída", desc: "Venda finalizada", color: "#22c55e" },
                  { value: "pendente",  label: "Pendente",  desc: "Aguardando confirmação", color: "#f59e0b" },
                ] as const).map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setSaleStatus(opt.value)}
                    style={{
                      display: "flex", flexDirection: "column", gap: 4,
                      padding: "14px 18px", borderRadius: 12, cursor: "pointer",
                      border: `2px solid ${saleStatus === opt.value ? opt.color : "var(--border)"}`,
                      background: saleStatus === opt.value ? `${opt.color}12` : "var(--surface)",
                      transition: "all 0.15s", textAlign: "left",
                    }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: saleStatus === opt.value ? opt.color : "var(--text-primary)" }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Observations */}
            <div className="card" style={{ padding: 24, marginBottom: 14 }}>
              <Section title="Observações" />
              <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
                rows={3} placeholder="Informações adicionais, acordos especiais..." className="input"
                style={{ height: "auto", paddingTop: 10, fontSize: "13px", resize: "vertical" }} />
            </div>
          </motion.div>
        )}

        {/* STEP 3: Revisão */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="card" style={{ padding: 24, marginBottom: 14 }}>
              <Section title="Revisão da Venda" icon={Sparkles} color="#22c55e" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 14 }}>
                {selectedVehicle && (
                  <div style={{ padding: 16, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Veículo</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: selectedVehicle.tipo === "moto" ? "rgba(249,115,22,0.1)" : "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {selectedVehicle.tipo === "moto" ? <Bike size={17} color="#f97316" /> : <Car size={17} color="#3b82f6" />}
                      </div>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{selectedVehicle.marca} {selectedVehicle.modelo}</p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{selectedVehicle.ano} · {selectedVehicle.placa}</p>
                      </div>
                    </div>
                  </div>
                )}
                {selectedClient && (
                  <div style={{ padding: 16, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Cliente</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(167,139,250,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "#a78bfa" }}>
                        {selectedClient.nome.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{selectedClient.nome}</p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{selectedClient.cpf_cnpj || selectedClient.telefone || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 14, padding: 20, borderRadius: 14, background: "linear-gradient(135deg,rgba(34,197,94,0.08),rgba(16,185,129,0.04))", border: "1px solid rgba(34,197,94,0.2)" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>Resumo Financeiro</p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 14 }}>
                  {[
                    { label: "Valor de Venda", value: fmt(valorVenda), color: "#22c55e" },
                    { label: "Anunciado por", value: selectedVehicle?.valor_anunciado ? fmt(Number(selectedVehicle.valor_anunciado)) : "-", color: "#38bdf8" },
                    { label: "Data da Venda", value: new Date(dataVenda + "T12:00:00").toLocaleDateString("pt-BR"), color: "#a78bfa" },
                  ].map(r => (
                    <div key={r.label} style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: 4 }}>{r.label}</p>
                      <p style={{ fontSize: "18px", fontWeight: 800, color: r.color, letterSpacing: "-0.5px" }}>{r.value}</p>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(34,197,94,0.2)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Pagamento</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {paymentLines.map((l, i) => {
                      const meta = PAY_META[l.forma];
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: meta?.bg || "rgba(100,116,139,0.1)", border: `1px solid ${meta?.border || "rgba(100,116,139,0.2)"}` }}>
                          <PaymentBadge forma={l.forma} banco={l.banco} size="sm" iconOnly />
                          <span style={{ fontSize: "12px", fontWeight: 700, color: meta?.color || "#94a3b8" }}>
                            {meta?.label || l.forma}: {fmt(l.valor)}
                            {l.parcelas && <span style={{ fontWeight: 400, opacity: 0.75 }}> {l.parcelas}x</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {observacoes && (
                <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  <strong>Obs:</strong> {observacoes}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, paddingBottom: isMobileOrTablet ? 80 : 0 }}>
        <button className="btn btn-secondary" onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
          style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ChevronLeft size={15} /> {step === 0 ? "Cancelar" : "Voltar"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i <= step ? "#22c55e" : "var(--border)", transition: "all 0.2s" }} />
          ))}
        </div>
        {step < 3 ? (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn btn-primary" onClick={goNext}
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", gap: 6 }}>
            Próximo <ChevronRight size={15} />
          </motion.button>
        ) : (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="btn btn-primary"
            onClick={handleSubmit} disabled={saleMutation.isPending}
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", gap: 6, minWidth: 160, justifyContent: "center" }}>
            {saleMutation.isPending
              ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Registrando...</>
              : <><Check size={15} /> Confirmar Venda</>}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
