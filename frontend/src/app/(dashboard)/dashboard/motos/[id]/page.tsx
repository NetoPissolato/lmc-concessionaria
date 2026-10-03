"use client";

import { useState, useCallback, useEffect } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Bike, Wrench, DollarSign, TrendingUp, TrendingDown,
  Plus, Trash2, Edit, Calendar, User, AlertCircle, AlertTriangle, X, Loader2, Check,
  Package, BarChart3, FileText, Images, Camera, Maximize2, Gauge, Fuel, Settings,
  Hash, Zap,
} from "lucide-react";
import { vehiclesApi, authApi } from "@/lib/api";
import {
  Vehicle, VehicleExpense, CostCenter,
  VEHICLE_STATUS_LABELS, FUEL_LABELS, TRANSMISSION_LABELS,
  EXPENSE_CATEGORY_LABELS, ExpenseCategory, PaymentMethod,
} from "@/types";
import { toast } from "@/lib/toast";
import { maskPhone, maskCurrency, parseCurrency, maskKM } from "@/lib/masks";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PhotoUploader } from "@/components/PhotoUploader";
import { Select } from "@/components/Select";
import { Portal } from "@/components/Portal";

const ACCENT = "#f97316"; // laranja para motos
import { fmtCurrencyFull as fmt, fmtDate, dataISO } from "@/lib/formatters";
import { CAT_COLORS, daysInStock, DaysChip, WhatsAppIcon, buildWhatsAppVehicleUrl } from "@/components/vehicle/shared";

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function LightboxOverlay({ photos, initial, onClose, vehicleName }: {
  photos: { id: string; url: string }[];
  initial: number; onClose: () => void; vehicleName: string;
}) {
  const [idx, setIdx] = useState(initial);
  const total = photos.length;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <X size={18} />
      </button>
      <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
        {vehicleName} - {idx + 1} / {total}
      </div>
      <img src={`${photos[idx].url}`} alt={vehicleName} onClick={e => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 8 }} />
      {total > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + total) % total); }}
            style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <ChevronLeft size={20} />
          </button>
          <button onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % total); }}
            style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <ChevronRight size={20} />
          </button>
        </>
      )}
      {total > 1 && (
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
          {photos.map((p, i) => (
            <button key={p.id} onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{ width: 52, height: 36, borderRadius: 6, overflow: "hidden", border: i === idx ? "2px solid #fff" : "2px solid rgba(255,255,255,0.2)", cursor: "pointer", padding: 0, background: "none", opacity: i === idx ? 1 : 0.5, transition: "all 0.2s" }}>
              <img src={`${p.url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Hero Gallery ─────────────────────────────────────────────────────────────
function HeroGallery({ photos, vehicleName, onManagePhotos }: {
  photos: { id: string; url: string; is_main: boolean; ordem: number }[];
  vehicleName: string; onManagePhotos: () => void;
}) {
  const [current, setCurrent] = useState(() => {
    const mainIdx = photos.findIndex(p => p.is_main);
    return mainIdx >= 0 ? mainIdx : 0;
  });
  const [lightbox, setLightbox] = useState<number | null>(null);
  const total = photos.length;
  const prev = useCallback(() => setCurrent(i => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setCurrent(i => (i + 1) % total), [total]);

  // 0 photos
  if (total === 0) {
    return (
      <div style={{ position: "relative", width: "100%", height: "420px", background: `linear-gradient(135deg, #0d0d14 0%, #1a0d08 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${ACCENT}10`, border: `1px solid ${ACCENT}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Camera size={32} color={`${ACCENT}60`} />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>Sem fotos cadastradas</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>{vehicleName}</p>
        </div>
        <button onClick={onManagePhotos} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: ACCENT, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: `0 4px 20px ${ACCENT}50` }}>
          <Plus size={15} /> Adicionar Fotos
        </button>
      </div>
    );
  }

  // 1 photo
  if (total === 1) {
    return (
      <div style={{ position: "relative", width: "100%", height: "420px", overflow: "hidden", cursor: "zoom-in" }} onClick={() => setLightbox(0)}>
        <img src={`${photos[0].url}`} alt={vehicleName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.65) 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
          <Camera size={12} /> 1 foto
        </div>
        <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 8px", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
          <Maximize2 size={11} /> Ampliar
        </div>
        {lightbox !== null && <LightboxOverlay photos={photos} initial={lightbox} onClose={() => setLightbox(null)} vehicleName={vehicleName} />}
      </div>
    );
  }

  // 2 photos
  if (total === 2) {
    return (
      <div style={{ position: "relative", width: "100%", height: "420px", display: "flex", gap: 3, overflow: "hidden" }}>
        {[0, 1].map(offset => {
          const idx = (current + offset) % total;
          const focused = offset === 0;
          return (
            <div key={photos[idx].id} onClick={() => focused ? setLightbox(idx) : setCurrent(idx)}
              style={{ flex: focused ? "0 0 70%" : "0 0 30%", position: "relative", overflow: "hidden", cursor: focused ? "zoom-in" : "pointer", transition: "flex 0.4s ease" }}>
              <img src={`${photos[idx].url}`} alt={vehicleName}
                style={{ width: "100%", height: "100%", objectFit: "cover", filter: focused ? "brightness(1)" : "brightness(0.45)", transform: focused ? "scale(1)" : "scale(1.05)", transition: "all 0.4s ease" }} />
              {!focused && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={28} color="rgba(255,255,255,0.6)" /></div>}
            </div>
          );
        })}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
          <Camera size={12} /> {current + 1} / {total}
        </div>
        {lightbox !== null && <LightboxOverlay photos={photos} initial={lightbox} onClose={() => setLightbox(null)} vehicleName={vehicleName} />}
      </div>
    );
  }

  // 3+ photos - cinematic
  const leftIdx = (current - 1 + total) % total;
  const rightIdx = (current + 1) % total;
  return (
    <div style={{ position: "relative", width: "100%", height: "420px", overflow: "hidden" }}>
      <div style={{ display: "flex", height: "100%", gap: 3 }}>
        <div onClick={prev} style={{ flex: "0 0 22%", position: "relative", overflow: "hidden", cursor: "pointer" }}>
          <img src={`${photos[leftIdx].url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.4) blur(1px)", transform: "scale(1.06)", transition: "all 0.45s ease" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={18} color="#fff" />
            </div>
          </div>
        </div>
        <div onClick={() => setLightbox(current)} style={{ flex: 1, position: "relative", overflow: "hidden", cursor: "zoom-in" }}>
          <AnimatePresence mode="popLayout">
            <motion.img key={current} src={`${photos[current].url}`} alt={vehicleName}
              initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </AnimatePresence>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.75) 100%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 8px", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.7)", zIndex: 2 }}>
            <Maximize2 size={11} /> Ampliar
          </div>
        </div>
        <div onClick={next} style={{ flex: "0 0 22%", position: "relative", overflow: "hidden", cursor: "pointer" }}>
          <img src={`${photos[rightIdx].url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.4) blur(1px)", transform: "scale(1.06)", transition: "all 0.45s ease" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronRight size={18} color="#fff" />
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
        <Camera size={12} /> {current + 1} / {total}
      </div>
      {total >= 4 && (
        <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 10 }}>
          {photos.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 4, background: i === current ? "#fff" : "rgba(255,255,255,0.35)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.3s ease" }} />
          ))}
        </div>
      )}
      {lightbox !== null && <LightboxOverlay photos={photos} initial={lightbox} onClose={() => setLightbox(null)} vehicleName={vehicleName} />}
    </div>
  );
}

// ─── Expense Modal ─────────────────────────────────────────────────────────────
function ExpenseModal({ vehicleId, expense, onClose, onSuccess }: {
  vehicleId: string; expense?: VehicleExpense; onClose: () => void; onSuccess: () => void;
}) {
  const isEdit = !!expense;
  const fmtVal = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const [form, setForm] = useState({
    data: expense?.data ?? dataISO(),
    categoria: (expense?.categoria ?? "mecanica") as ExpenseCategory,
    descricao: expense?.descricao ?? "",
    valorDisplay: expense ? fmtVal(expense.valor) : "",
    valor: expense?.valor ?? 0,
    forma_pagamento: (expense?.forma_pagamento ?? "pix") as PaymentMethod,
    parcelas: expense?.parcelas ? String(expense.parcelas) : "",
    taxaJuros: "",
    fornecedor: expense?.fornecedor ?? "",
    responsavel: expense?.responsavel ?? "",
    observacoes: expense?.observacoes ?? "",
    km_atual: expense?.km_atual ? String(expense.km_atual) : "",
  });
  const [loading, setLoading] = useState(false);
  const { isMobile } = useBreakpoint();
  const showParcelas = form.forma_pagamento === "cartao_credito" || form.forma_pagamento === "boleto";
  const parcelasNum = parseInt(form.parcelas || "0");
  const taxaNum = parseFloat(form.taxaJuros.replace(",", ".") || "0");
  const calcPrice = (pv: number, t: number, n: number) => {
    if (t === 0) return { parcela: pv / n, total: pv, juros: 0 };
    const i = t / 100;
    const parcela = pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    return { parcela, total: parcela * n, juros: parcela * n - pv };
  };
  const priceCalc = showParcelas && parcelasNum >= 2 && form.valor > 0 ? calcPrice(form.valor, taxaNum, parcelasNum) : null;
  const handleCurrencyChange = (raw: string) => {
    const masked = maskCurrency(raw);
    setForm(f => ({ ...f, valorDisplay: masked, valor: parseCurrency(masked) }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.valor <= 0) { toast.error("Informe um valor"); return; }
    setLoading(true);
    const payload = {
      data: form.data, categoria: form.categoria, descricao: form.descricao,
      valor: (priceCalc && taxaNum > 0) ? priceCalc.total : form.valor,
      forma_pagamento: form.forma_pagamento,
      parcelas: showParcelas && form.parcelas ? parseInt(form.parcelas) : undefined,
      fornecedor: form.fornecedor || undefined, responsavel: form.responsavel || undefined,
      observacoes: form.observacoes || undefined,
      km_atual: form.km_atual ? parseInt(form.km_atual.replace(/\./g, "")) : undefined,
    };
    try {
      if (isEdit && expense) { await vehiclesApi.updateExpense(vehicleId, expense.id, payload); toast.success("Despesa atualizada!"); }
      else { await vehiclesApi.addExpense(vehicleId, payload); toast.success("Despesa registrada!"); }
      onSuccess();
    } catch { toast.error(isEdit ? "Erro ao atualizar" : "Erro ao registrar"); }
    finally { setLoading(false); }
  };
  const inp = { className: "input", style: { fontSize: "13px" } };
  const lbl = { style: { fontSize: "12px", color: "var(--text-muted)", display: "block" as const, marginBottom: 4 } };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 9000,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        overflowY: "auto", WebkitOverflowScrolling: "touch" as "touch",
        padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 60px))",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 16 }}
        className="glass" style={{ width: "100%", maxWidth: 540, borderRadius: "var(--radius-xl)", overflow: "hidden", marginTop: "auto", marginBottom: "auto" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{isEdit ? "Editar Despesa" : "Registrar Despesa"}</h2>
          <button type="button" className="btn btn-ghost" style={{ width: 36, height: 36, padding: 0, flexShrink: 0 }} onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="expense-form-grid">
          <div><label {...lbl}>Data *</label><input type="date" required value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} {...inp} /></div>
          <div><label {...lbl}>Categoria *</label>
            <Select
              value={form.categoria}
              onChange={(v) => setForm(f => ({ ...f, categoria: v as ExpenseCategory }))}
              options={Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            /></div>
          <div style={isMobile ? {} : { gridColumn: "span 2" }}><label {...lbl}>Descrição *</label>
            <input required value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Troca de corrente + pinhão" {...inp} /></div>
          <div><label {...lbl}>Valor (R$) *</label>
            <input inputMode="numeric" value={form.valorDisplay} onChange={e => handleCurrencyChange(e.target.value)} placeholder="0,00" {...inp} /></div>
          <div><label {...lbl}>Forma de Pagamento</label>
            <Select
              value={form.forma_pagamento}
              onChange={(v) => setForm(f => ({ ...f, forma_pagamento: v as PaymentMethod, parcelas: "" }))}
              options={[
                { value: "dinheiro", label: "Dinheiro" },
                { value: "pix", label: "PIX" },
                { value: "cartao_credito", label: "Cartão de Crédito" },
                { value: "cartao_debito", label: "Cartão de Débito" },
                { value: "transferencia", label: "Transferência" },
                { value: "boleto", label: "Boleto" },
              ]}
            /></div>
          {showParcelas && (
            <div style={isMobile ? {} : { gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div><label {...lbl} style={{ ...lbl.style, marginBottom: 3 }}>Nº parcelas</label>
                <Select
                  value={form.parcelas}
                  onChange={(v) => setForm(f => ({ ...f, parcelas: v }))}
                  placeholder="À vista"
                  options={[
                    { value: "", label: "À vista" },
                    ...[2,3,4,5,6,7,8,9,10,12,18,24,36,48].map(n => ({ value: String(n), label: `${n}x` }))
                  ]}
                /></div>
              <div><label {...lbl} style={{ ...lbl.style, marginBottom: 3 }}>Taxa (% a.m.)</label>
                <input value={form.taxaJuros} onChange={e => setForm(f => ({ ...f, taxaJuros: e.target.value.replace(/[^0-9,.]/g, "") }))} placeholder="0,00" inputMode="decimal" {...inp} /></div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                {priceCalc && parcelasNum >= 2 ? (
                  <div style={{ padding: "8px 10px", background: `${ACCENT}11`, borderRadius: "var(--radius-md)", border: `1px solid ${ACCENT}33`, fontSize: 12 }}>
                    <p style={{ fontWeight: 700, color: "var(--text-primary)" }}>{parcelasNum}x de {priceCalc.parcela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  </div>
                ) : <div style={{ padding: "8px 10px", background: "var(--surface-2)", borderRadius: "var(--radius-md)", fontSize: 11, color: "var(--text-muted)" }}>Selecione as parcelas</div>}
              </div>
            </div>
          )}
          <div><label {...lbl}>Fornecedor</label><input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} placeholder="Ex: Moto Peças X" {...inp} /></div>
          <div><label {...lbl}>KM atual</label><input value={form.km_atual} onChange={e => setForm(f => ({ ...f, km_atual: maskKM(e.target.value) }))} placeholder="Ex: 50.000" inputMode="numeric" {...inp} /></div>
          <div style={isMobile ? {} : { gridColumn: "span 2" }}><label {...lbl}>Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} {...inp} rows={2} style={{ ...inp.style, height: "auto", paddingTop: 8 }} placeholder="Detalhes adicionais..." /></div>
          <div style={{ gridColumn: "span 2", display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-secondary" style={{ flex: "0 1 auto" }} onClick={onClose}>Cancelar</button>
            <motion.button type="submit" whileTap={{ scale: 0.97 }} disabled={loading}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flex: "1 1 auto", padding: "9px 18px", borderRadius: "var(--radius-md)", background: `linear-gradient(135deg, ${ACCENT}, #ea580c)`, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              {loading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</> : isEdit ? <><Check size={14} /> Salvar</> : <><Plus size={14} /> Registrar</>}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Spec Pill ─────────────────────────────────────────────────────────────────
function SpecPill({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px", background: accent ? `${ACCENT}10` : "var(--surface-2)", borderRadius: 10, border: `1px solid ${accent ? ACCENT + "30" : "var(--border)"}`, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Icon size={11} color={accent ? ACCENT : ACCENT} />
        <span style={{ fontSize: 11.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: accent ? ACCENT : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon }: { label: string; value: string; sub?: string; color: string; icon: React.ElementType }) {
  return (
    <div style={{ padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: 8, background: `${color}1a`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={14} color={color} />
      </div>
      <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.4px" }}>{value}</p>
      {sub && <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3 }}>{sub}</p>}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}00, ${color}60, ${color}00)` }} />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MotoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "info" | "despesas" | "financeiro" | "galeria") || "info";
  const [activeTab, setActiveTab] = useState<"info" | "despesas" | "financeiro" | "galeria">(initialTab);
  const { isMobile, isTablet, isMobileOrTablet } = useBreakpoint();

  // Scroll to tabs when galeria tab becomes active
  useEffect(() => {
    if (activeTab === "galeria") {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const el = document.getElementById("tabs-section");
        const main = document.getElementById("dash-main");
        if (!el || !main) return;
        const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 8;
        main.scrollTo({ top, behavior: "smooth" });
      }));
    }
  }, [activeTab]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<VehicleExpense | null>(null);
  const [confirmDeleteExpense, setConfirmDeleteExpense] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [confirmDeleteMoto, setConfirmDeleteMoto] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);

  // Lock body scroll when any modal is open
  useBodyScrollLock(showAddExpense || !!editingExpense || !!confirmDeleteExpense);

  const { data: vehicle, isLoading: vLoading } = useQuery<Vehicle>({ queryKey: ["vehicle", id], queryFn: () => vehiclesApi.get(id) });

  // Sync videoUrl when vehicle data loads
  useEffect(() => {
    if (vehicle) setVideoUrl(vehicle.video_url || "");
  }, [vehicle?.video_url]);
  const { data: costCenter, isLoading: ccLoading } = useQuery<CostCenter>({ queryKey: ["vehicle-cost", id], queryFn: () => vehiclesApi.getCostCenter(id) });
  const { data: expenses = [], isLoading: expLoading } = useQuery<VehicleExpense[]>({ queryKey: ["vehicle-expenses", id], queryFn: () => vehiclesApi.getExpenses(id) });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => vehiclesApi.update(id, { status }),
    onSuccess: () => {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["vehicle", id] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-motos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      setPendingStatus(null);
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => vehiclesApi.deleteExpense(id, expenseId),
    onSuccess: () => { toast.success("Despesa removida!"); queryClient.invalidateQueries({ queryKey: ["vehicle-expenses", id] }); queryClient.invalidateQueries({ queryKey: ["vehicle-cost", id] }); },
    onError: () => toast.error("Erro ao remover despesa"),
  });

  const payFinesMutation = useMutation({
    mutationFn: () => vehiclesApi.payFines(id),
    onSuccess: () => { toast.success("Multas pagas!"); queryClient.invalidateQueries({ queryKey: ["vehicle", id] }); queryClient.invalidateQueries({ queryKey: ["vehicle-cost", id] }); },
    onError: () => toast.error("Erro ao registrar pagamento"),
  });

  const deleteMotoMutation = useMutation({
    mutationFn: () => vehiclesApi.delete(id),
    onSuccess: () => {
      toast.success("Moto excluída!");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-motos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["financial-entries"] });
      queryClient.invalidateQueries({ queryKey: ["financial-chart"] });
      queryClient.invalidateQueries({ queryKey: ["lucratividade-mes"] });
      queryClient.invalidateQueries({ queryKey: ["sales-motos-page"] });
      router.replace("/dashboard/motos");
    },
    onError: () => toast.error("Erro ao excluir moto"),
  });

  const refreshExpenses = () => { queryClient.invalidateQueries({ queryKey: ["vehicle-expenses", id] }); queryClient.invalidateQueries({ queryKey: ["vehicle-cost", id] }); };

  if (vLoading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card skeleton" style={{ height: 420, borderRadius: 20 }} />
      {Array(3).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 80 }} />)}
    </div>
  );

  if (!vehicle) return (
    <div style={{ textAlign: "center", padding: 60 }}>
      <AlertCircle size={40} color="var(--error)" style={{ marginBottom: 12 }} />
      <p style={{ color: "var(--text-secondary)" }}>Moto não encontrada</p>
    </div>
  );

  const photos = vehicle.photos || [];
  const cc = costCenter ? {
    valor_compra: Number(costCenter.valor_compra ?? vehicle.valor_compra ?? 0),
    valor_multas: Number(costCenter.valor_multas ?? vehicle.valor_multas ?? 0),
    total_despesas: Number(costCenter.total_despesas ?? 0),
    custo_total: Number(costCenter.custo_total ?? 0),
    lucro_bruto: costCenter.lucro_bruto != null ? Number(costCenter.lucro_bruto) : null,
    margem_percentual: costCenter.margem_percentual != null ? Number(costCenter.margem_percentual) : null,
  } : null;

  const lucro = cc?.lucro_bruto ?? null;
  const isProfit = lucro != null && lucro >= 0;

  const STATUS_OPTIONS = [
    { value: "disponivel",    label: "Disponível",    color: "#10b981" },
    { value: "reservado",     label: "Reservado",     color: "#f59e0b" },
    { value: "em_preparacao", label: "Em Preparação", color: "#3b82f6" },
    { value: "em_manutencao", label: "Em Manutenção", color: "#f97316" },
  ];

  const tabs = [
    { key: "info",       label: "Informações",                    icon: Bike },
    { key: "despesas",   label: `Despesas (${expenses.length})`,  icon: Wrench },
    { key: "financeiro", label: "Financeiro",                     icon: BarChart3 },
    { key: "galeria",    label: "Galeria",                        icon: Images },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <button onClick={() => router.back()} className="btn btn-ghost" style={{ gap: 6 }}>
          <ChevronLeft size={16} /> Motos
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{vehicle.marca} {vehicle.modelo} · {vehicle.ano}</span>
          {vehicle.cilindrada && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: ACCENT, background: `${ACCENT}12`, border: `1px solid ${ACCENT}25`, padding: "2px 8px", borderRadius: 20 }}>
              <Zap size={9} />{vehicle.cilindrada}cc
            </span>
          )}
          {(() => {
            const s = STATUS_OPTIONS.find(o => o.value === vehicle.status);
            return s ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: `${s.color}22`, color: s.color, border: `1px solid ${s.color}44` }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />{s.label}
              </span>
            ) : null;
          })()}
        </div>
      </motion.div>

      {/* Hero Gallery */}
      <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ borderRadius: 20, overflow: "hidden", marginBottom: 24 }}>
        <HeroGallery photos={photos} vehicleName={`${vehicle.marca} ${vehicle.modelo}`} onManagePhotos={() => setActiveTab("galeria")} />
      </motion.div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 300px", gap: 20, alignItems: "start" }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

          {/* Title */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${ACCENT}18`, border: `1px solid ${ACCENT}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Bike size={20} color={ACCENT} strokeWidth={1.8} />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.7px", lineHeight: 1.1 }}>
                {vehicle.marca} <span style={{ color: ACCENT }}>{vehicle.modelo}</span>
              </h1>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 48, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>{vehicle.ano}</span>
              <span style={{ color: "var(--border)" }}>·</span>
              <span style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>{vehicle.placa}</span>
              <span style={{ color: "var(--border)" }}>·</span>
              <span>{vehicle.quilometragem.toLocaleString("pt-BR")} km</span>
              {vehicle.tipo_moto && <><span style={{ color: "var(--border)" }}>·</span><span style={{ color: ACCENT, fontWeight: 600 }}>{vehicle.tipo_moto}</span></>}
              {daysInStock(vehicle.data_compra) !== null && (
                <>
                  <span style={{ color: "var(--border)" }}>·</span>
                  <DaysChip days={daysInStock(vehicle.data_compra)} />
                </>
              )}
            </p>
          </motion.div>

          {/* KPI cards */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 10 }}>
            <KpiCard label="Valor de Compra" value={fmt(vehicle.valor_compra)} icon={DollarSign} color="#3b82f6" />
            <KpiCard label="Total Despesas" value={fmt(cc?.total_despesas ?? 0)} sub={`${expenses.length} registro${expenses.length !== 1 ? "s" : ""}`} icon={Wrench} color="#f59e0b" />
            <KpiCard label="Custo Total" value={fmt(cc?.custo_total)} icon={Package} color="#8b5cf6" />
            <KpiCard label={isProfit ? "Lucro Esperado" : "Prejuízo"} value={fmt(lucro != null ? Math.abs(lucro) : undefined)} sub={cc?.margem_percentual != null ? `${cc.margem_percentual.toFixed(1)}% margem` : undefined} icon={isProfit ? TrendingUp : TrendingDown} color={isProfit ? "#10b981" : "#ef4444"} />
          </motion.div>

          {/* Multas */}
          {(vehicle.valor_multas ?? 0) > 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>Multas pendentes - {fmt(vehicle.valor_multas ?? 0)}</p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Se a concessionária pagar, clique no botão. Caso contrário, o cliente paga após a compra.</p>
                </div>
              </div>
              {vehicle.status !== "vendido" && (
                <button disabled={payFinesMutation.isPending} onClick={() => payFinesMutation.mutate()}
                  style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "9px 16px", borderRadius: 10, background: "#ef4444", color: "#fff", border: "none", cursor: payFinesMutation.isPending ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, opacity: payFinesMutation.isPending ? 0.7 : 1 }}>
                  {payFinesMutation.isPending ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Pagando...</> : <><Check size={13} /> Pagar (Concessionária)</>}
                </button>
              )}
            </motion.div>
          )}

          {/* Tabs */}
          <div id="tabs-section" style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border)" }}>
            {tabs.map(t => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "none", border: "none", borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? ACCENT : "var(--text-muted)", marginBottom: -1, transition: "all 0.2s" }}>
                  <Icon size={14} />{t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

              {activeTab === "info" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobileOrTablet ? "1fr" : "1fr 1fr", gap: 14 }}>
                    <div className="card" style={{ padding: 20 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><Bike size={14} color={ACCENT} /> Dados da Moto</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[
                          ["Marca", vehicle.marca], ["Modelo", vehicle.modelo],
                          ["Ano", vehicle.ano], ["Cor", vehicle.cor],
                          ["Combustível", FUEL_LABELS[vehicle.combustivel]],
                          ["Câmbio", TRANSMISSION_LABELS[vehicle.cambio]],
                          ["Quilometragem", `${vehicle.quilometragem.toLocaleString("pt-BR")} km`],
                          ...(vehicle.cilindrada ? [["Cilindrada", `${vehicle.cilindrada}cc`]] : []),
                          ...(vehicle.tipo_moto ? [["Tipo", vehicle.tipo_moto]] : []),
                        ].map(([k, v]) => (
                          <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{k}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: k === "Cilindrada" ? ACCENT : "var(--text-primary)" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="card" style={{ padding: 20 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><FileText size={14} color={ACCENT} /> Documentos & Compra</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[["Placa", vehicle.placa], ["Chassi", vehicle.chassi], ["RENAVAM", vehicle.renavam || "-"], ["Data de Compra", fmtDate(vehicle.data_compra)], ["Antigo Dono", vehicle.vendedor_nome || "-"], ["Telefone", vehicle.vendedor_telefone ? maskPhone(vehicle.vendedor_telefone) : "-"]].map(([k, v]) => (
                          <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{k}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: (k === "Chassi" || k === "Placa") ? "monospace" : undefined }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {(vehicle.valor_anunciado || vehicle.valor_minimo) && (
                    <div className="card" style={{ padding: 20 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><DollarSign size={14} color={ACCENT} /> Valores de Venda</h3>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
                        <div><p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Anunciado</p><p style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{fmt(vehicle.valor_anunciado)}</p></div>
                        <div><p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Mínimo</p><p style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{fmt(vehicle.valor_minimo)}</p></div>
                        {vehicle.valor_vendido && <div><p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Vendido por</p><p style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{fmt(vehicle.valor_vendido)}</p></div>}
                      </div>
                    </div>
                  )}
                  {vehicle.observacoes && (
                    <div className="card" style={{ padding: 20 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>Observações</h3>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{vehicle.observacoes}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "despesas" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setShowAddExpense(true)} disabled={vehicle.status === "vendido"}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: "var(--radius-md)", background: `linear-gradient(135deg, ${ACCENT}, #ea580c)`, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: vehicle.status === "vendido" ? 0.5 : 1 }}>
                      <Plus size={15} /> Nova Despesa
                    </motion.button>
                  </div>
                  {expLoading ? Array(3).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 80 }} />) :
                    expenses.length === 0 ? (
                      <div style={{ padding: 50, textAlign: "center" }}>
                        <Wrench size={36} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: 10 }} />
                        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Nenhuma despesa registrada</p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Registre manutenções, documentação e outros gastos</p>
                      </div>
                    ) : expenses.map((exp, i) => (
                      <motion.div key={exp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card" style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ width: 4, flexShrink: 0, alignSelf: "stretch", borderRadius: 4, background: CAT_COLORS[exp.categoria] || "#64748b" }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "nowrap" }}>
                              <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${CAT_COLORS[exp.categoria]}22`, color: CAT_COLORS[exp.categoria], whiteSpace: "nowrap", flexShrink: 0 }}>{EXPENSE_CATEGORY_LABELS[exp.categoria]}</span>
                              <span style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap", flexShrink: 0 }}><Calendar size={9} /> {fmtDate(exp.data)}</span>
                              {exp.km_atual && <span style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{exp.km_atual.toLocaleString("pt-BR")} km</span>}
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2, lineHeight: 1.4 }}>{exp.descricao}</p>
                            {exp.fornecedor && <p style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}><User size={10} /> {exp.fornecedor}</p>}
                            {exp.observacoes && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>{exp.observacoes}</p>}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, flexWrap: "wrap", gap: 6 }}>
                              <div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{fmt(exp.valor)}</p>
                                <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: 0 }}>{exp.forma_pagamento.replace(/_/g, " ")}{exp.parcelas && exp.parcelas > 1 ? ` · ${exp.parcelas}x` : ""}</p>
                              </div>
                              {vehicle.status !== "vendido" && authApi.getUser()?.role === "admin" && (
                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                  <button onClick={() => setEditingExpense(exp)} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}><Edit size={11} /> Editar</button>
                                  <button onClick={() => setConfirmDeleteExpense(exp.id)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: "#ef4444", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}><Trash2 size={11} /> Apagar</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}

              {activeTab === "financeiro" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {ccLoading ? <div className="card skeleton" style={{ height: 200 }} /> : (
                    <>
                      <div className="card" style={{ padding: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Centro de Custo</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {[
                            { label: "Valor de compra", value: cc?.valor_compra ?? vehicle.valor_compra, color: "#3b82f6" },
                            ...((cc?.valor_multas ?? vehicle.valor_multas ?? 0) > 0 ? [{ label: "Multas no documento", value: cc?.valor_multas ?? vehicle.valor_multas ?? 0, color: "#ef4444" }] : []),
                            { label: "Total de despesas", value: cc?.total_despesas ?? 0, color: "#f59e0b" },
                            { label: "Custo total (compra + multas + despesas)", value: cc?.custo_total ?? 0, color: "#8b5cf6", bold: true },
                            ...(vehicle.valor_anunciado ? [{ label: "Valor anunciado", value: vehicle.valor_anunciado, color: "#10b981" }] : []),
                            ...(vehicle.valor_minimo ? [{ label: "Valor mínimo", value: vehicle.valor_minimo, color: ACCENT }] : []),
                            ...(vehicle.valor_vendido ? [{ label: "Valor de venda", value: vehicle.valor_vendido, color: "#10b981", bold: true }] : []),
                          ].map(row => (
                            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 3, height: 16, borderRadius: 2, background: row.color }} />
                                <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: (row as { bold?: boolean }).bold ? 600 : 400 }}>{row.label}</span>
                              </div>
                              <span style={{ fontSize: 14, fontWeight: (row as { bold?: boolean }).bold ? 700 : 500, color: "var(--text-primary)" }}>{fmt(row.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {cc?.lucro_bruto != null && (
                        <div className="card" style={{ padding: 20, border: `1px solid ${isProfit ? "#10b98133" : "#ef444433"}`, background: `${isProfit ? "#10b981" : "#ef4444"}08` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{vehicle.valor_vendido ? "Lucro realizado" : "Lucro esperado"}</p>
                              <p style={{ fontSize: 28, fontWeight: 800, color: isProfit ? "#10b981" : "#ef4444" }}>{isProfit ? "+" : ""}{fmt(cc.lucro_bruto)}</p>
                            </div>
                            {cc.margem_percentual != null && (
                              <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${isProfit ? "#10b981" : "#ef4444"}22`, border: `3px solid ${isProfit ? "#10b981" : "#ef4444"}44`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: isProfit ? "#10b981" : "#ef4444" }}>{cc.margem_percentual.toFixed(0)}%</span>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>margem</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {expenses.length > 0 && (
                        <div className="card" style={{ padding: 20 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>Despesas por Categoria</h3>
                          {Object.entries(expenses.reduce<Record<string, number>>((acc, e) => { acc[e.categoria] = (acc[e.categoria] || 0) + e.valor; return acc; }, {})).sort((a, b) => b[1] - a[1]).map(([cat, total]) => {
                            const pct = (total / (cc?.total_despesas || 1)) * 100;
                            return (
                              <div key={cat} style={{ marginBottom: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory]}</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{fmt(total)}</span>
                                </div>
                                <div style={{ height: 4, borderRadius: 2, background: "var(--surface-3)" }}>
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
                                    style={{ height: "100%", borderRadius: 2, background: CAT_COLORS[cat] || "#64748b" }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "galeria" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {photos.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                      {photos.map(p => (
                        <div key={p.id} style={{ position: "relative", paddingBottom: "75%", borderRadius: 12, overflow: "hidden", background: "var(--surface-2)", border: p.is_main ? `2px solid ${ACCENT}` : "1px solid var(--border)" }}>
                          <img src={`${p.url}`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                          {p.is_main && <div style={{ position: "absolute", top: 6, left: 6, background: ACCENT, borderRadius: 6, padding: "2px 8px", fontSize: 11.5, fontWeight: 700, color: "#fff" }}>Capa</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                      <Camera size={15} color="#22c55e" /> Gerenciar Fotos
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Envie fotos da moto, defina a foto de capa e organize a galeria.</p>
                    <PhotoUploader vehicleId={vehicle.id} />
                  </div>

                  {/* Vídeo YouTube */}
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      Vídeo YouTube <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>(opcional)</span>
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Cole a URL do YouTube. O vídeo será exibido na galeria do site para os clientes.</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="input"
                        style={{ flex: 1, fontSize: 13 }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={videoUrl}
                        onChange={e => setVideoUrl(e.target.value)}
                      />
                      <button
                        disabled={savingVideo}
                        onClick={async () => {
                          setSavingVideo(true);
                          try {
                            await vehiclesApi.update(id, { video_url: videoUrl.trim() || null });
                            queryClient.invalidateQueries({ queryKey: ["vehicle", id] });
                            toast.success("Vídeo salvo!");
                          } catch { toast.error("Erro ao salvar vídeo"); }
                          finally { setSavingVideo(false); }
                        }}
                        style={{ padding: "0 18px", borderRadius: "var(--radius-md)", background: ACCENT, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                      >
                        {savingVideo ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
                        Salvar
                      </button>
                    </div>
                    {videoUrl && (
                      <p style={{ fontSize: 11, color: "#22c55e", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                        <Check size={11} /> Vídeo configurado
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* RIGHT - sticky sidebar */}
        <div style={{ position: isMobileOrTablet ? "static" : "sticky", top: isMobileOrTablet ? undefined : 80, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Price + edit */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
            <div style={{ padding: "20px 20px 16px" }}>
              {vehicle.valor_anunciado ? (
                <>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Valor Anunciado</p>
                  <p style={{ fontSize: 30, fontWeight: 900, color: "#22c55e", letterSpacing: "-1px", lineHeight: 1 }}>{fmt(vehicle.valor_anunciado)}</p>
                  {vehicle.valor_minimo && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Mínimo: <strong style={{ color: "var(--text-secondary)" }}>{fmt(vehicle.valor_minimo)}</strong></p>}
                  {lucro != null && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: isProfit ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>
                      {isProfit ? <TrendingUp size={13} color="#10b981" /> : <TrendingDown size={13} color="#ef4444" />}
                      <span style={{ fontSize: 11, color: isProfit ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                        {isProfit ? "+" : ""}{fmt(lucro)} {isProfit ? "lucro" : "prejuízo"}
                        {cc?.margem_percentual != null && ` · ${cc.margem_percentual.toFixed(1)}%`}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Preço não definido</p>
              )}
            </div>
            <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => router.push(`/dashboard/motos/${id}/editar`)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 0", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}>
                <Edit size={14} /> Editar Moto
              </motion.button>
              {vehicle.status !== "vendido" && (
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => window.open(buildWhatsAppVehicleUrl(
                    { ...vehicle, versao: vehicle.versao, placa: vehicle.placa },
                  ), "_blank")}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", borderRadius: 10, background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.4)", color: "#25d366", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}
                >
                  <WhatsAppIcon size={14} color="#25d366" /> Enviar por WhatsApp
                </motion.button>
              )}
              {vehicle.status !== "vendido" && (
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setConfirmDeleteMoto(true)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 0", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}
                >
                  <Trash2 size={14} /> Excluir Moto
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Status */}
          {vehicle.status !== "vendido" && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16 }}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px 20px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Alterar Status</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {STATUS_OPTIONS.map(s => {
                  const current = pendingStatus ?? vehicle.status;
                  const active = current === s.value;
                  return (
                    <motion.button key={s.value} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setPendingStatus(active ? null : s.value)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, cursor: "pointer", border: `1.5px solid ${active ? s.color : "var(--border)"}`, background: active ? `${s.color}18` : "var(--surface-2)", color: active ? s.color : "var(--text-secondary)", fontSize: 13, fontWeight: active ? 700 : 400, transition: "all 0.15s", textAlign: "left" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? s.color : "var(--border)", flexShrink: 0 }} />
                      {s.label}
                      {active && vehicle.status === s.value && <Check size={13} style={{ marginLeft: "auto" }} />}
                    </motion.button>
                  );
                })}
              </div>
              {pendingStatus && pendingStatus !== vehicle.status && (
                <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.97 }}
                  disabled={updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate(pendingStatus)}
                  style={{ marginTop: 10, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 0", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${ACCENT}, #ea580c)`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {updateStatusMutation.isPending ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</> : <><Check size={13} /> Confirmar Status</>}
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Quick specs */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Especificações</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <SpecPill icon={Calendar} label="Ano" value={String(vehicle.ano)} />
              <SpecPill icon={Gauge} label="KM" value={`${vehicle.quilometragem.toLocaleString("pt-BR")} km`} />
              <SpecPill icon={Fuel} label="Combustível" value={FUEL_LABELS[vehicle.combustivel] || vehicle.combustivel} />
              <SpecPill icon={Settings} label="Câmbio" value={TRANSMISSION_LABELS[vehicle.cambio] || vehicle.cambio} />
              {vehicle.cilindrada && <SpecPill icon={Zap} label="Cilindrada" value={`${vehicle.cilindrada}cc`} accent />}
              <SpecPill icon={Hash} label="Placa" value={vehicle.placa} />
            </div>
          </motion.div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteExpense}
        title="Remover despesa?"
        description="Esta despesa será removida permanentemente e o custo total da moto será recalculado."
        confirmLabel="Sim, remover" cancelLabel="Cancelar" variant="danger"
        loading={deleteExpenseMutation.isPending}
        onConfirm={() => { if (confirmDeleteExpense) deleteExpenseMutation.mutate(confirmDeleteExpense); setConfirmDeleteExpense(null); }}
        onCancel={() => setConfirmDeleteExpense(null)}
      />

      <Portal>
        {(showAddExpense || editingExpense) && (
          <ExpenseModal vehicleId={id} expense={editingExpense ?? undefined}
            onClose={() => { setShowAddExpense(false); setEditingExpense(null); }}
            onSuccess={() => { setShowAddExpense(false); setEditingExpense(null); refreshExpenses(); }} />
        )}
      </Portal>

      <ConfirmDialog
        open={confirmDeleteMoto}
        title="Excluir moto?"
        description={`A moto ${vehicle?.marca} ${vehicle?.modelo} (${vehicle?.placa}) será excluída permanentemente junto com todas as despesas e fotos. Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, excluir" cancelLabel="Cancelar" variant="danger"
        loading={deleteMotoMutation.isPending}
        onConfirm={() => deleteMotoMutation.mutate()}
        onCancel={() => setConfirmDeleteMoto(false)}
      />
    </div>
  );
}
