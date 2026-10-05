"use client";

import { use, useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, Car, User, CreditCard, Calendar,
  DollarSign, FileText, CheckCircle2,
  AlertTriangle, Clock, XCircle, RefreshCw,
  ChevronRight, X, Fuel, Palette,
  Hash, MapPin, Wrench, ShieldCheck,
} from "lucide-react";
import { salesApi, vehiclesApi, authApi } from "@/lib/api";
import { mensagemErro } from "@/lib/erros";
import { Sale, PAYMENT_TYPE_LABELS } from "@/types";
import { PaymentBadge } from "@/components/PaymentBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { fmtCurrencyFull as fmt, fmtDateFull as fmtDate } from "@/lib/formatters";

const PAYMENT_COLORS: Record<string, string> = {
  dinheiro: "#22c55e", pix: "#38bdf8", financiamento: "#a78bfa",
  cartao: "#f59e0b", transferencia: "#06b6d4",
  consorcio: "#f97316", permuta: "#ec4899", misto: "#6366f1",
};

const STATUS_CFG: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ElementType }> = {
  concluida: { color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", label: "Concluída", icon: CheckCircle2 },
  pendente:  { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", label: "Pendente",  icon: Clock },
  cancelada: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", label: "Cancelada", icon: XCircle },
};

export default function VendaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusLoading, setStatusLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { isMobileOrTablet } = useBreakpoint();

  const { data: sale, isLoading, isError } = useQuery<Sale>({
    queryKey: ["sale", id],
    queryFn: () => salesApi.get(id),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: vehiclePhotos = [] } = useQuery<{ url: string; is_main: boolean }[]>({
    queryKey: ["vehicle-photos", sale?.vehicle_id],
    queryFn: () => vehiclesApi.getPhotos(sale!.vehicle_id),
    enabled: !!sale?.vehicle_id,
    staleTime: 60000,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => salesApi.updateStatus(id, newStatus),
    onMutate: () => setStatusLoading(true),
    onSettled: () => setStatusLoading(false),
    onSuccess: (_data, newStatus) => {
      // Venda e listas
      queryClient.invalidateQueries({ queryKey: ["sale", id] });
      queryClient.invalidateQueries({ queryKey: ["sales-carros"] });
      queryClient.invalidateQueries({ queryKey: ["sales-motos"] });
      queryClient.invalidateQueries({ queryKey: ["sales-carros-page"] });
      queryClient.invalidateQueries({ queryKey: ["sales-motos-page"] });
      // Financeiro (entradas/saídas mudam ao concluir/cancelar)
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["financial-entries"] });
      queryClient.invalidateQueries({ queryKey: ["financial-chart"] });
      queryClient.invalidateQueries({ queryKey: ["lucratividade-mes"] });  // era "financial-lucratividade" (errado!)
      // Veículos (status muda)
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      if (sale?.vehicle_id) queryClient.invalidateQueries({ queryKey: ["vehicle", sale.vehicle_id] });
      // Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (newStatus === "cancelada") {
        router.back();
      }
    },
    onError: (err: unknown) => {
      const msg = mensagemErro(err, "Erro ao alterar status");
      alert(msg);
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "960px", margin: "0 auto" }}>
        <div className="skeleton" style={{ height: "36px", width: "120px", borderRadius: "10px" }} />
        <div className="skeleton" style={{ height: "420px", borderRadius: "20px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))", gap: "16px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: "140px", borderRadius: "16px" }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !sale) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 24px", gap: "16px" }}>
        <AlertTriangle size={48} color="#f59e0b" strokeWidth={1.5} />
        <p style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>Venda não encontrada</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>Voltar</button>
      </div>
    );
  }

  const st = String(sale.status).replace("SaleStatus.", "");
  // Desfazer venda concluída/cancelada mexe no caixa e no estoque: só o administrador
  const podeAlterarStatus = authApi.getUser()?.role === "admin" || st === "pendente";
  const stCfg = STATUS_CFG[st] ?? STATUS_CFG.concluida;
  const StIcon = stCfg.icon;
  const payColor = PAYMENT_COLORS[sale.forma_pagamento] || "var(--text-muted)";

  const photos = vehiclePhotos;
  const mainPhoto = photos.find(p => p.is_main) ?? photos[0];
  // Detect moto: use vehicle_tipo field, fall back to checking brand name
  const MOTO_BRANDS = ["yamaha","honda cb","kawasaki","suzuki","bmw gs","triumph","ducati","harley","ktm","royal enfield","dafra","shineray","sundown","haojue","traxx","honda cg","honda biz","honda pop","fan","titan"];
  const infoLower = (sale.vehicle_info || "").toLowerCase();
  const isMotoByBrand = MOTO_BRANDS.some(b => infoLower.includes(b));
  const isMoto = sale.vehicle_tipo === "moto" || (!sale.vehicle_tipo && isMotoByBrand);
  const placeholderSrc = isMoto ? "/moto-placeholder.svg" : "/car-placeholder.svg";

  const prevPhoto = () => setActivePhoto(p => (p - 1 + photos.length) % photos.length);
  const nextPhoto = () => setActivePhoto(p => (p + 1) % photos.length);

  return (
    <>
    <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "40px" }}>

      {/* Back button */}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={() => router.back()} className="btn btn-ghost"
        style={{ alignSelf: "flex-start" }}>
        <ChevronLeft size={16} /> Voltar
      </motion.button>

      {/* ── HERO: Photo gallery + info sidebar ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: "grid", gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 340px", gap: "0", borderRadius: "20px", overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface)" }}>

        {/* Photo gallery */}
        <div style={{ position: "relative", background: "#080808", minHeight: isMobileOrTablet ? "240px" : "380px", display: "flex", flexDirection: "column" }}>
          {/* Main photo */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden", cursor: photos.length > 0 ? "zoom-in" : "default" }}
            onClick={() => photos.length > 0 && setLightboxOpen(true)}>
            {photos.length > 0 ? (
              <img
                src={photos[activePhoto]?.url ?? mainPhoto?.url}
                alt={sale.vehicle_info || "Veículo"}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", position: "absolute", inset: 0, transition: "opacity 0.3s" }}
              />
            ) : (
              <>
                <img src={placeholderSrc} alt="Sem foto"
                  style={{ width: "100%", height: "100%", objectFit: "contain", padding: "60px", opacity: 0.12, filter: "brightness(0) invert(1)", position: "absolute", inset: 0 }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 40%, rgba(0,0,0,0.8) 100%)" }} />
              </>
            )}
            {/* Gradient overlay */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 50%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />

            {/* Status badge */}
            <div style={{ position: "absolute", top: 14, left: 14 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                fontSize: "11.5px", fontWeight: "700", color: stCfg.color,
                background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
                border: `1px solid ${stCfg.color}50`, padding: "5px 12px", borderRadius: "20px",
                letterSpacing: "0.07em", textTransform: "uppercase",
              }}>
                <StIcon size={10} /> {stCfg.label}
              </span>
            </div>

            {/* Photo counter */}
            {photos.length > 1 && (
              <div style={{ position: "absolute", bottom: 14, left: 14 }}>
                <span style={{
                  fontSize: "11px", fontWeight: "600", color: "#fff",
                  background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
                  padding: "4px 10px", borderRadius: "12px",
                }}>
                  {activePhoto + 1} / {photos.length}
                </span>
              </div>
            )}

            {/* Nav arrows */}
            {photos.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                  <ChevronLeft size={18} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div style={{ display: "flex", gap: "6px", padding: "10px", background: "#050505", overflowX: "auto" }}>
              {photos.map((ph, i) => (
                <button key={i} onClick={() => setActivePhoto(i)}
                  style={{ flexShrink: 0, width: 64, height: 44, borderRadius: "8px", overflow: "hidden", border: i === activePhoto ? "2px solid #F5A623" : "2px solid transparent", cursor: "pointer", padding: 0 }}>
                  <img src={ph.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar - info */}
        <div style={{ display: "flex", flexDirection: "column", padding: isMobileOrTablet ? "20px 16px" : "28px 24px", borderLeft: isMobileOrTablet ? "none" : "1px solid var(--border)", borderTop: isMobileOrTablet ? "1px solid var(--border)" : "none", gap: "20px", background: "linear-gradient(160deg, rgba(245,166,35,0.03) 0%, transparent 60%)" }}>

          {/* Vehicle title */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
              Veículo vendido
            </p>
            <h1 style={{ fontSize: "20px", fontWeight: "900", color: "var(--text-primary)", lineHeight: 1.25, margin: "0 0 6px", letterSpacing: "-0.3px" }}>
              {sale.vehicle_info || "Veículo"}
            </h1>
            {sale.vehicle_placa && (
              <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#F5A623", background: "rgba(245,166,35,0.1)", padding: "3px 10px", borderRadius: "6px", border: "1px solid rgba(245,166,35,0.25)", fontWeight: "700", letterSpacing: "1px" }}>
                {sale.vehicle_placa}
              </span>
            )}
          </div>

          {/* Price */}
          <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "14px", padding: "16px 18px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Valor da venda</p>
            <p style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: "900", color: "#22c55e", letterSpacing: "-1px", lineHeight: 1, margin: 0 }}>
              {fmt(Number(sale.valor_venda))}
            </p>
            {Number(sale.valor_entrada) > 0 && (
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                Entrada: <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>{fmt(Number(sale.valor_entrada))}</span>
              </p>
            )}
          </div>

          {/* Payment */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>
              Forma de pagamento
            </p>
            {sale.forma_pagamento === "misto" && sale.payment_methods?.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {sale.payment_methods.map((pm, i) => (
                  <PaymentBadge key={i} forma={pm.forma} banco={pm.banco} parcelas={pm.parcelas} size="sm" />
                ))}
              </div>
            ) : (
              <PaymentBadge forma={sale.forma_pagamento} banco={sale.banco_financiamento} parcelas={sale.parcelas} size="sm" />
            )}
          </div>

          {/* People */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.12)" }}>
              <User size={14} color="#a78bfa" />
              <div>
                <p style={{ fontSize: "11.5px", color: "var(--text-muted)", margin: 0, lineHeight: 1.2 }}>Cliente</p>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>{sale.cliente_nome || "-"}</p>
              </div>
            </div>
            {sale.vendedor_nome && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                <ShieldCheck size={14} color="#f59e0b" />
                <div>
                  <p style={{ fontSize: "11.5px", color: "var(--text-muted)", margin: 0, lineHeight: 1.2 }}>Vendedor</p>
                  <p style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>{sale.vendedor_nome}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sale date */}
          <div style={{ marginTop: "auto", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={13} color="var(--text-muted)" />
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Vendido em <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>{fmtDate(sale.data_venda)}</span>
              </span>
            </div>
            {sale.data_entrega && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                <MapPin size={13} color="var(--text-muted)" />
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Entrega: <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>{fmtDate(sale.data_entrega)}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {podeAlterarStatus && (<>
      {/* ── Status Actions ── */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 18px",
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Alterar status</span>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", paddingBottom: 2 }}
          className="scroll-x-hide">
          {st !== "concluida" && (
            <button type="button" disabled={statusLoading} onClick={() => statusMutation.mutate("concluida")}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, fontSize: "12px", fontWeight: 700, cursor: "pointer", background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.35)", color: "#22c55e", opacity: statusLoading ? 0.6 : 1, whiteSpace: "nowrap", flexShrink: 0 }}>
              <CheckCircle2 size={13} /> Concluir
            </button>
          )}
          {st !== "pendente" && st !== "cancelada" && (
            <button type="button" disabled={statusLoading} onClick={() => statusMutation.mutate("pendente")}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, fontSize: "12px", fontWeight: 700, cursor: "pointer", background: "rgba(245,158,11,0.1)", border: "1.5px solid rgba(245,158,11,0.3)", color: "#f59e0b", opacity: statusLoading ? 0.6 : 1, whiteSpace: "nowrap", flexShrink: 0 }}>
              <Clock size={13} /> Marcar como Pendente
            </button>
          )}
          {st !== "cancelada" && (
            <button type="button" disabled={statusLoading} onClick={() => setShowCancelConfirm(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, fontSize: "12px", fontWeight: 700, cursor: "pointer", background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.25)", color: "#ef4444", opacity: statusLoading ? 0.6 : 1, whiteSpace: "nowrap", flexShrink: 0 }}>
              <XCircle size={13} /> Cancelar Venda
            </button>
          )}
          {statusLoading && <RefreshCw size={14} color="var(--text-muted)" style={{ animation: "spin 1s linear infinite", flexShrink: 0, alignSelf: "center" }} />}
        </div>
      </motion.div>
      </>)}

      {/* ── 3-column detail grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobileOrTablet ? "1fr" : "repeat(3, 1fr)", gap: "14px" }}>

        {/* Valores */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <DollarSign size={15} color="#22c55e" />
            <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Valores</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>Valor de Venda</span>
              <span style={{ fontSize: "clamp(13px, 3vw, 15px)", fontWeight: "800", color: "#22c55e" }}>{fmt(Number(sale.valor_venda))}</span>
            </div>
            {Number(sale.valor_entrada) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>Entrada / Sinal</span>
                <span style={{ fontSize: "clamp(11px, 2.5vw, 12px)", fontWeight: "600", color: "var(--text-secondary)" }}>{fmt(Number(sale.valor_entrada))}</span>
              </div>
            )}
            {Number(sale.valor_financiado) > 0 && ["financiamento", "consorcio", "misto"].includes(sale.forma_pagamento) && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>Financiado</span>
                <span style={{ fontSize: "clamp(11px, 2.5vw, 12px)", fontWeight: "600", color: "#a78bfa" }}>{fmt(Number(sale.valor_financiado))}</span>
              </div>
            )}
            {["pix", "dinheiro", "transferencia", "permuta"].includes(sale.forma_pagamento) && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Modalidade</span>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#22c55e" }}>À vista</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Pagamento */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <CreditCard size={15} color={payColor} />
            <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Pagamento</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sale.forma_pagamento === "misto" && sale.payment_methods && sale.payment_methods.length > 0 ? (
              <>
                {sale.payment_methods.map((pm, i) => {
                  const pmColor = PAYMENT_COLORS[pm.forma] || "#94a3b8";
                  const pmLabel = PAYMENT_TYPE_LABELS[pm.forma as keyof typeof PAYMENT_TYPE_LABELS] || pm.forma;
                  return (
                    <div key={i} style={{ borderRadius: "10px", background: `${pmColor}08`, border: `1px solid ${pmColor}20`, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
                        <div style={{ width: 3, height: 24, borderRadius: 2, background: pmColor, flexShrink: 0 }} />
                        <span style={{ fontSize: "11px", fontWeight: 700, color: pmColor, flex: 1 }}>{pmLabel}</span>
                        <span style={{ fontSize: "clamp(11px, 2.5vw, 13px)", fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{fmt(Number(pm.valor))}</span>
                      </div>
                      {(pm.parcelas || pm.banco) && (
                        <div style={{ padding: "4px 10px 8px 21px", display: "flex", gap: 12 }}>
                          {pm.banco && <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{pm.banco}</span>}
                          {pm.parcelas && <span style={{ fontSize: "11.5px", color: pmColor, fontWeight: 600 }}>{pm.parcelas}x ≈ {fmt(Number(pm.valor) / pm.parcelas)}/mês</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border)", marginTop: 4 }}>
                  <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Total pago</span>
                  <span style={{ fontSize: "clamp(11px, 2.5vw, 13px)", fontWeight: 800, color: "#22c55e", whiteSpace: "nowrap" }}>{fmt(Number(sale.valor_venda))}</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>Forma</span>
                  <span style={{ fontSize: "clamp(11px, 2.5vw, 12px)", fontWeight: "700", color: payColor }}>{PAYMENT_TYPE_LABELS[sale.forma_pagamento] || sale.forma_pagamento}</span>
                </div>
                {sale.parcelas && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>Parcelas</span>
                    <span style={{ fontSize: "clamp(11px, 2.5vw, 12px)", fontWeight: "600", color: "var(--text-secondary)" }}>
                      {sale.parcelas}x {Number(sale.valor_financiado) > 0 ? `≈ ${fmt(Number(sale.valor_financiado) / sale.parcelas)}/mês` : ""}
                    </span>
                  </div>
                )}
                {sale.banco_financiamento && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Banco</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>{sale.banco_financiamento}</span>
                  </div>
                )}
                {!sale.parcelas && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Modalidade</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#22c55e" }}>À vista</span>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Datas */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Calendar size={15} color="#38bdf8" />
            <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Datas</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "Data da Venda", value: fmtDate(sale.data_venda) },
              { label: "Previsão de Entrega", value: sale.data_entrega ? fmtDate(sale.data_entrega) : "Não informado" },
              { label: "Registrado em", value: new Date(sale.created_at).toLocaleDateString("pt-BR") },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-secondary)", textAlign: "right" }}>{value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Observações ── */}
      {sale.observacoes && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <FileText size={15} color="var(--text-muted)" />
            <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Observações</p>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>{sale.observacoes}</p>
        </motion.div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "11.5px", color: "var(--text-muted)", fontFamily: "monospace" }}>ID: {sale.id}</p>
      </div>
    </div>

    {/* ── Lightbox ── */}
    <AnimatePresence>
      {lightboxOpen && photos.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setLightboxOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <button onClick={() => setLightboxOpen(false)}
            style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", zIndex: 2 }}>
            <X size={20} />
          </button>
          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", zIndex: 2 }}>
                <ChevronLeft size={24} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", zIndex: 2 }}>
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <motion.img
            key={activePhoto}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            src={photos[activePhoto]?.url} alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "8px", cursor: "default" }}
          />
          {photos.length > 1 && (
            <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px" }}>
              {photos.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setActivePhoto(i); }}
                  style={{ width: i === activePhoto ? 24 : 8, height: 8, borderRadius: "4px", background: i === activePhoto ? "#F5A623" : "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", transition: "all 0.2s", padding: 0 }} />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>

    {/* ── Confirm Cancel ── */}
    <ConfirmDialog
      open={showCancelConfirm}
      variant="danger"
      title="Cancelar esta venda?"
      description="Essa ação irá cancelar a venda e o veículo voltará para o estoque como disponível. Esta operação não pode ser desfeita."
      confirmLabel="Sim, cancelar"
      cancelLabel="Voltar"
      loading={statusLoading}
      onConfirm={() => { setShowCancelConfirm(false); statusMutation.mutate("cancelada"); }}
      onCancel={() => setShowCancelConfirm(false)}
    />
    </>
  );
}
