"use client";

import { useState, useRef } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useBodyScrollLock } from "@/hooks/useModalScroll";
import { Portal } from "@/components/Portal";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Plus, Search, Phone, Mail, MapPin, Edit, Trash2, X,
  AlertCircle, Loader2, Car, MessageCircle, Check, User,
  CreditCard, TrendingUp, Building2,
} from "lucide-react";
import { customersApi, vehiclesApi } from "@/lib/api";
import { Customer, VehiclePhoto } from "@/types";
import { toast } from "@/lib/toast";
import { WhatsAppIcon } from "@/components/vehicle/shared";
import { maskPhone, maskCPFOrCNPJ, validateCPF, validateCNPJ, unmask } from "@/lib/masks";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function maskCEP(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
}

import { fmtCurrencyFull as fmt } from "@/lib/formatters";

const paymentLabels: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "PIX", financiamento: "Financiamento",
  cartao: "Cartão", transferencia: "Transferência", consorcio: "Consórcio",
  permuta: "Permuta", misto: "Misto",
};
// When sale has payment_methods, build "PIX + Cartão" style label
function getPayLabelFromSale(forma: string, methods?: { forma: string }[]): string {
  if (forma === "misto" && methods?.length) {
    return methods.map(m => paymentLabels[m.forma] || m.forma).join(" + ");
  }
  return paymentLabels[forma] || forma;
}
const paymentColors: Record<string, string> = {
  dinheiro: "#10b981", pix: "#3b82f6", financiamento: "#8b5cf6",
  cartao: "#f59e0b", transferencia: "#06b6d4", consorcio: "#f97316",
  permuta: "#ec4899", misto: "#6366f1",
};

const AVATAR_COLORS = [
  ["#F5A623", "#e8920e"], ["#38bdf8", "#0ea5e9"], ["#a78bfa", "#8b5cf6"],
  ["#22c55e", "#16a34a"], ["#f97316", "#ea580c"], ["#ec4899", "#db2777"],
  ["#06b6d4", "#0891b2"], ["#f59e0b", "#d97706"],
];

function avatarGrad(name: string) {
  const [a, b] = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return { grad: `linear-gradient(135deg, ${a}, ${b})`, base: a };
}

function clientScore(purchases: number, totalSpent: number) {
  if (purchases >= 3 || totalSpent >= 150000) return { label: "VIP",   color: "#F5A623" };
  if (purchases >= 2 || totalSpent >= 80000)  return { label: "Fiel",  color: "#22c55e" };
  if (purchases >= 1 || totalSpent >= 30000)  return { label: "Ativo", color: "#38bdf8" };
  return { label: "Novo", color: "#a78bfa" };
}

type Purchase = {
  id: string; data_venda: string; valor_venda: number; valor_entrada: number;
  valor_financiado: number; forma_pagamento: string; parcelas: number | null;
  banco_financiamento: string | null; status: string;
  vehicle: { id: string; marca: string; modelo: string; versao: string | null; ano: number; cor: string; placa: string; quilometragem: number; tipo?: string } | null;
};

// --- Main Page -------------------------------------------------------
export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string } | null>(null);
  const [page, setPage] = useState(0);
  const PER_PAGE = 10;
  const { isMobile, isMobileOrTablet } = useBreakpoint();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["customers", search],
    queryFn: () => customersApi.list({ q: search || undefined, limit: 200 }),
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: (_data, deletedId) => {
      toast.success("Cliente excluído!");
      setProfileCustomer(null);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customer-purchases", deletedId] });
    },
    onError: () => toast.error("Erro ao excluir cliente"),
  });

  const total = customers.length;
  const pages = Math.ceil(total / PER_PAGE);
  const paged = customers.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="page-header"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title" style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)" }}>Clientes</h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
            {isLoading ? "Carregando..." : `${total} cadastrado${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="btn btn-primary"
          onClick={() => { setEditingCustomer(null); setShowForm(true); }}>
          <Plus size={15} /> Novo Cliente
        </motion.button>
      </motion.div>


      {/* -- Search -- */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        style={{ position: "relative" }}>
        <Search size={14} color="var(--text-muted)"
          style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          type="text" placeholder="Buscar por nome, CPF, telefone, email..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="input"
          style={{ paddingLeft: "38px", paddingRight: search ? "38px" : "13px" }}
        />
        <AnimatePresence>
          {search && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setSearch("")}
              style={{
                position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer",
                color: "var(--text-muted)", borderRadius: "5px",
                width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <X size={11} />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* -- Customer list -- */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: i === 0 ? "12px 12px 0 0" : i === 3 ? "0 0 12px 12px" : 0 }} />)}
        </div>
      ) : customers.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "80px 20px", gap: "16px",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
          }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={26} color="var(--text-muted)" />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-secondary)" }}>
              {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "5px" }}>
              {search ? `Sem resultados para "${search}"` : "Cadastre seu primeiro cliente para começar"}
            </p>
          </div>
          {!search && (
            <motion.button whileHover={{ scale: 1.02 }} className="btn btn-primary"
              onClick={() => { setEditingCustomer(null); setShowForm(true); }}>
              <Plus size={14} /> Cadastrar cliente
            </motion.button>
          )}
        </motion.div>
      ) : (
        <>
          <div className="table-scroll-wrapper">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              {paged.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="cliente-row"
                  onClick={isMobile ? () => setProfileCustomer(c) : undefined}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "minmax(0, 1fr) 28px"
                      : isMobileOrTablet
                      ? "minmax(0, 1.2fr) minmax(0, 1fr) 150px"
                      : "minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) 170px",
                    alignItems: "center",
                    padding: isMobile ? "14px 14px" : "18px 20px",
                    columnGap: isMobile ? 10 : 24,
                    borderBottom: i < paged.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.15s",
                    cursor: isMobile ? "pointer" : "default",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Col 1 "” Identity */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                      background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <User size={22} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.nome}
                      </p>
                      {c.telefone && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                          <Phone size={10} color="var(--text-muted)" />
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.telefone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                          <Mail size={10} color="var(--text-muted)" />
                          <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</span>
                        </div>
                      )}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#22c55e" }} />
                        Cliente Ativo
                      </span>
                    </div>
                  </div>

                  {/* Col 2 "” CPF + WhatsApp + Cidade (hidden on mobile) */}
                  {!isMobile && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <CreditCard size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, margin: 0 }}>CPF / CNPJ</p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, fontWeight: 500 }}>{c.cpf_cnpj || ""}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <MessageCircle size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, margin: 0 }}>WhatsApp</p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, fontWeight: 500 }}>{(c as {whatsapp?: string}).whatsapp || c.telefone || ""}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <MapPin size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, margin: 0 }}>Cidade</p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, fontWeight: 500 }}>
                          {c.cidade ? `${c.cidade}${c.estado ? ` - ${c.estado}` : ""}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Col 3 "” Veículos + Endereço + Cliente desde (hidden on mobile+tablet) */}
                  {!isMobileOrTablet && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <Car size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, margin: 0 }}>Veículos</p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, fontWeight: 500 }}>{c.total_compras ?? 0}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <Building2 size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, margin: 0 }}>Endereço</p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.endereco || "-"}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <User size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, margin: 0 }}>Cliente desde</p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, fontWeight: 500 }}>{fmtDate(c.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Col 4 "” Actions */}
                  {isMobile ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setProfileCustomer(c)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", cursor: "pointer", width: "100%" }}>
                      <Users size={13} /> Ver Detalhes
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setConfirmDelete({ id: c.id, nome: c.nome })}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", cursor: "pointer", width: "100%" }}>
                      <Trash2 size={13} /> Excluir
                    </motion.button>
                  </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Mostrando {page * PER_PAGE + 1} a {Math.min((page + 1) * PER_PAGE, total)} de {total} cliente{total !== 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => setPage(p => p - 1)} disabled={page === 0}
                style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", cursor: page === 0 ? "not-allowed" : "pointer", color: page === 0 ? "var(--text-muted)" : "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === 0 ? 0.4 : 1 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {Array.from({ length: pages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  style={{ minWidth: 30, height: 30, padding: "0 8px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: i === page ? "rgba(245,166,35,0.15)" : "var(--surface)", border: `1px solid ${i === page ? "rgba(245,166,35,0.3)" : "var(--border)"}`, color: i === page ? "#F5A623" : "var(--text-muted)", cursor: "pointer" }}>
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => p + 1)} disabled={page >= pages - 1}
                style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", cursor: page >= pages - 1 ? "not-allowed" : "pointer", color: page >= pages - 1 ? "var(--text-muted)" : "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", opacity: page >= pages - 1 ? 0.4 : 1 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </>
      )}
      {/* -- Profile Modal -- */}
      <AnimatePresence>
        {profileCustomer && (
          <CustomerProfileModal
            customer={profileCustomer}
            onEdit={() => { setEditingCustomer(profileCustomer); setShowForm(true); }}
            onDelete={() => setConfirmDelete({ id: profileCustomer.id, nome: profileCustomer.nome })}
            onClose={() => setProfileCustomer(null)}
          />
        )}
      </AnimatePresence>

      {/* -- Form Modal -- */}
      <AnimatePresence>
        {showForm && (
          <CustomerModal
            customer={editingCustomer}
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              queryClient.invalidateQueries({ queryKey: ["customers"] });
              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            }}
          />
        )}
      </AnimatePresence>

      {/* -- Confirm Delete Dialog -- */}
      <ConfirmDialog
        open={!!confirmDelete}
        title={`Excluir ${confirmDelete?.nome ?? "cliente"}?`}
        description="Essa ação é permanente e não pode ser desfeita. Todo o histórico do cliente será removido."
        confirmLabel="Sim, excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (confirmDelete) deleteMutation.mutate(confirmDelete.id);
          setConfirmDelete(null);
          setProfileCustomer(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// --- Customer Profile Modal -------------------------------------------
function CustomerProfileModal({ customer, onEdit, onDelete, onClose }: {
  customer: Customer; onEdit: () => void; onDelete: () => void; onClose: () => void;
}) {
  const histRef  = useRef<HTMLDivElement>(null);
  const [histPage, setHistPage] = useState(0);
  const HIST_PER = 5;
  const { isMobile, isMobileOrTablet } = useBreakpoint();

  const { data: purchases = [], isLoading } = useQuery<Purchase[]>({
    queryKey: ["customer-purchases", customer.id],
    queryFn: () => customersApi.getPurchases(customer.id),
  });

  const totalSpent    = purchases.reduce((s, p) => s + (p.valor_venda || 0), 0);
  const lastPurchase  = purchases[0];
  const histPages     = Math.max(1, Math.ceil(purchases.length / HIST_PER));
  const pagedPurchases = purchases.slice(histPage * HIST_PER, (histPage + 1) * HIST_PER);
  const monthsSince   = lastPurchase
    ? Math.floor((Date.now() - new Date(lastPurchase.data_venda + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;

  const fmtDateFull = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
  const fmtDateSale = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");

  return (
    <motion.div
      key="profile-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9200,
        background: "rgba(0,0,0,0.96)",
        backdropFilter: "blur(12px)",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch" as "touch",
        padding: "16px",
        paddingBottom: "calc(var(--bottom-nav-height, 60px) + env(safe-area-inset-bottom, 0px) + 24px)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Botoes de acao no topo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: 10, color: "#F5A623", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 44 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Voltar para clientes
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onEdit}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 44 }}>
            <Edit size={13} /> Editar Cliente
          </motion.button>
        </div>

        {/* -- Hero card -- */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: isMobile ? "16px" : "22px 24px" }}>
          {/* Row 1: Avatar + Name + Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 14 : 20, marginBottom: 20 }}>
            {/* Avatar */}
            <div style={{ width: isMobile ? 72 : 88, height: isMobile ? 72 : 88, borderRadius: 14, flexShrink: 0, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={isMobile ? 34 : 42} color="rgba(255,255,255,0.18)" strokeWidth={1.5} />
            </div>
            {/* ID + Name + Badge */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(245,166,35,0.12)", color: "#F5A623", letterSpacing: "0.06em", display: "inline-block", marginBottom: 6 }}>
                ID #{customer.id.slice(-5).toUpperCase()}
              </span>
              <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{customer.nome}</h2>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                Cliente Ativo
              </span>
            </div>
          </div>
          {/* Row 2: Contact info - always full width below */}
          <div style={{ display: "flex", gap: isMobile ? 10 : 16, flexWrap: "wrap", alignItems: "flex-start", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {customer.telefone && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <Phone size={13} color="#F5A623" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{customer.telefone}</span>
                </div>
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Telefone</p>
                <a
                  href={`tel:${customer.telefone.replace(/\D/g, "")}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.25)", color: "#F5A623", fontSize: 12, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}
                >
                  <Phone size={12} /> Ligar
                </a>
              </div>
            )}
            {(customer.whatsapp || customer.telefone) && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <MessageCircle size={13} color="#25d366" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{customer.whatsapp || customer.telefone}</span>
                </div>
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>WhatsApp</p>
                <a
                  href={`https://wa.me/55${(customer.whatsapp || customer.telefone || "").replace(/\D/g, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.25)", color: "#25d366", fontSize: 12, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}
                >
                  <WhatsAppIcon size={12} color="#25d366" /> Abrir WhatsApp
                </a>
              </div>
            )}
            {customer.email && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <Mail size={13} color="#F5A623" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "clamp(140px, 20vw, 240px)", display: "block", whiteSpace: "nowrap" }}>{customer.email}</span>
                </div>
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>E-mail</p>
                <a
                  href={`mailto:${customer.email}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.25)", color: "#F5A623", fontSize: 12, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}
                >
                  <Mail size={12} /> Enviar E-mail
                </a>
              </div>
            )}
          </div>
        </motion.div>

        {/* -- 3-column info grid -- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 14 }}>

          {/* Informações Pessoais */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,166,35,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={13} color="#F5A623" /></div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Informações Pessoais</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>CPF / CNPJ</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{customer.cpf_cnpj || "-"}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>WhatsApp</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{customer.whatsapp || customer.telefone || "-"}</p>
              </div>
              {customer.observacoes && (
                <div style={{ gridColumn: "1/-1" }}>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Observações</p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.5 }}>{customer.observacoes}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Localização */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,166,35,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><MapPin size={13} color="#F5A623" /></div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Localização</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Cidade</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{customer.cidade || "-"}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Estado</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{customer.estado || "-"}</p>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Endereço</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{customer.endereco || "-"}</p>
              </div>
            </div>
          </motion.div>

          {/* Informações Comerciais */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,166,35,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={13} color="#F5A623" /></div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Informações Comerciais</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Cliente desde</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{fmtDateFull(customer.created_at)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Vendas realizadas</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{isLoading ? "…" : purchases.length}</p>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Valor total comprado</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: "#22c55e" }}>{isLoading ? "…" : fmt(totalSpent)}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* -- Resumo + Ações -- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", gap: 14, alignItems: "start" }}>

          {/* Resumo */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,166,35,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={13} color="#F5A623" /></div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Resumo do Cliente</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 130px), 1fr))", gap: 12 }}>
              {[
                { icon: <Car size={18} color="#F5A623" />, value: String(purchases.length), sub: ["Veículos", "Comprados"], bg: "rgba(245,166,35,0.06)", money: false },
                { icon: <CreditCard size={18} color="#F5A623" />, value: fmt(totalSpent), sub: ["Valor Total", "Comprado"], bg: "rgba(245,166,35,0.06)", money: true },

              ].map(({ icon, value, sub, bg, money }, i) => (
                <div key={i} style={{ background: bg, borderRadius: 12, padding: "14px 12px", border: "1px solid rgba(255,255,255,0.05)", minWidth: 0, overflow: "hidden" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>{icon}</div>
                  <p style={{
                    fontSize: money ? "clamp(12px, 3.2vw, 17px)" : 20,
                    fontWeight: 800,
                    color: money ? "#22c55e" : "var(--text-primary)",
                    marginBottom: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>{value}</p>
                  {sub.map((s, j) => <p key={j} style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4, margin: 0 }}>{s}</p>)}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Ações */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,166,35,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={13} color="#F5A623" /></div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Ações</p>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => histRef.current?.scrollIntoView({ behavior: "smooth" })}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.25)", color: "#F5A623", cursor: "pointer", width: "100%" }}>
              <Car size={14} /> Ver Histórico
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onDelete}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", cursor: "pointer", width: "100%" }}>
              <Trash2 size={14} /> Excluir Conta
            </motion.button>
          </motion.div>
        </div>

        {/* -- Histórico de Compras -- */}
        <motion.div ref={histRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,166,35,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Car size={13} color="#F5A623" /></div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Histórico de Compras</p>
          </div>
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Array(2).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
            </div>
          ) : purchases.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
              <Car size={36} color="rgba(255,255,255,0.1)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Nenhuma compra registrada ainda</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pagedPurchases.map((p, i) => <VehiclePurchaseCard key={p.id} purchase={p} index={i} fmtSale={fmtDateSale} />)}
            </div>
          )}

          {/* -- History pagination -- */}
          {!isLoading && purchases.length > HIST_PER && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Mostrando {histPage * HIST_PER + 1}–{Math.min((histPage + 1) * HIST_PER, purchases.length)} de {purchases.length} compras
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setHistPage(p => p - 1)} disabled={histPage === 0}
                  style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", cursor: histPage === 0 ? "not-allowed" : "pointer", color: histPage === 0 ? "var(--text-muted)" : "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", opacity: histPage === 0 ? 0.4 : 1 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                {Array.from({ length: histPages }, (_, i) => (
                  <button key={i} onClick={() => setHistPage(i)}
                    style={{ minWidth: 30, height: 30, padding: "0 8px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: i === histPage ? "rgba(245,166,35,0.15)" : "var(--surface)", border: `1px solid ${i === histPage ? "rgba(245,166,35,0.4)" : "var(--border)"}`, color: i === histPage ? "#F5A623" : "var(--text-muted)", cursor: "pointer", transition: "all 0.15s" }}>
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setHistPage(p => p + 1)} disabled={histPage >= histPages - 1}
                  style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", cursor: histPage >= histPages - 1 ? "not-allowed" : "pointer", color: histPage >= histPages - 1 ? "var(--text-muted)" : "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", opacity: histPage >= histPages - 1 ? 0.4 : 1 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          )}
        </motion.div>

      </div>{/* end maxWidth */}
    </motion.div>
  );
}

// --- Vehicle Purchase Card -------------------------------------------
function VehiclePurchaseCard({ purchase: p, index: i, fmtSale }: {
  purchase: Purchase; index: number; fmtSale: (s: string) => string;
}) {
  const { data: photos = [] } = useQuery<VehiclePhoto[]>({
    queryKey: ["vehicle-photos", p.vehicle?.id],
    queryFn: () => vehiclesApi.getPhotos(p.vehicle!.id),
    enabled: !!p.vehicle?.id,
    staleTime: 120000,
  });

  const mainPhoto = photos.find(ph => ph.is_main) || photos[0];

  const statusColors: Record<string, string> = { concluida: "#22c55e", pendente: "#f59e0b", cancelada: "#ef4444" };
  const statusLabels: Record<string, string> = { concluida: "Concluída", pendente: "Pendente", cancelada: "Cancelada" };
  const { isMobile, isMobileOrTablet } = useBreakpoint();


  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + i * 0.06 }}
      style={{ display: "grid", gridTemplateColumns: isMobileOrTablet ? "1fr" : "150px 1fr", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}
    >
      {/* Vehicle photo */}
      <div style={{ background: "#0a0a0a", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120 }}>
        {mainPhoto ? (
          <img src={mainPhoto.url} alt={p.vehicle?.modelo || "Veículo"}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <>
            <img src={p.vehicle?.tipo === "moto" ? "/moto-placeholder.svg" : "/car-placeholder.svg"} alt="Sem foto"
              style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", opacity: 0.15, padding: "28px", filter: "brightness(0) invert(1)", position: "absolute", inset: 0 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 40%, rgba(0,0,0,0.75) 100%)" }} />
          </>
        )}
        {/* Amber accent stripe */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "linear-gradient(180deg, #F5A623, #e8920e)", zIndex: 1 }} />
      </div>

      {/* Details */}
      <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.015)" }}>
        {p.vehicle ? (
          <>
            {/* Vehicle header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                    {p.vehicle.marca} {p.vehicle.modelo}
                  </p>
                  {p.vehicle.versao && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
                      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                      padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap", flexShrink: 0,
                    }}>
                      {p.vehicle.versao}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[
                    { label: p.vehicle.ano.toString() },
                    { label: p.vehicle.cor },
                    { label: p.vehicle.placa, amber: true },
                    { label: `${p.vehicle.quilometragem.toLocaleString("pt-BR")} km` },
                  ].map(({ label, amber }, idx) => (
                    <span key={idx} style={{ fontSize: 11, color: amber ? "#F5A623" : "var(--text-muted)", fontWeight: amber ? 700 : 400 }}>
                      {idx > 0 && <span style={{ marginRight: 6, marginLeft: 6, opacity: 0.3 }}>{"\u00B7"}</span>}
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <span style={{
                fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 99, flexShrink: 0,
                background: `${statusColors[p.status] || "#6b7280"}12`,
                color: statusColors[p.status] || "#6b7280",
                border: `1px solid ${statusColors[p.status] || "#6b7280"}25`,
              }}>
                {statusLabels[p.status] || p.status}
              </span>
            </div>

            {/* Financial row */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Valor</p>
                <p style={{ fontSize: 17, fontWeight: 800, color: "#22c55e" }}>{fmt(p.valor_venda)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Pagamento</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: paymentColors[p.forma_pagamento] || "var(--text-secondary)" }}>
                  {paymentLabels[p.forma_pagamento] || p.forma_pagamento}{p.parcelas ? ` ${p.parcelas}x` : ""}
                </p>
              </div>
              {/* ENTRADA: apenas em financiamento com entrada parcial real */}
              {p.forma_pagamento === "financiamento" && p.valor_entrada > 0 && p.valor_entrada < p.valor_venda && (
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Entrada</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#22c55e" }}>{fmt(p.valor_entrada)}</p>
                </div>
              )}
              {/* FINANCIADO: apenas em financiamento */}
              {p.forma_pagamento === "financiamento" && p.valor_financiado > 0 && (
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Financiado</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#8b5cf6" }}>{fmt(p.valor_financiado)}{p.parcelas ? ` · ${p.parcelas}x` : ""}</p>
                </div>
              )}
              {/* BANCO: quando for financiamento com banco informado */}
              {p.forma_pagamento === "financiamento" && p.banco_financiamento && (
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Banco</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{p.banco_financiamento}</p>
                </div>
              )}
              <div style={{ marginLeft: "auto" }}>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Data da Venda</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{fmtSale(p.data_venda)}</p>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>Veículo removido do sistema</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// â"â‚¬â"â‚¬â"â‚¬ Customer Form Modal â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬â"â‚¬
function CustomerModal({ customer, onClose, onSuccess }: {
  customer: Customer | null; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    nome: customer?.nome || "", cpf_cnpj: customer?.cpf_cnpj || "",
    telefone: customer?.telefone || "", whatsapp: customer?.whatsapp || "",
    email: customer?.email || "", cep: "", rua: customer?.endereco || "",
    numero: "", complemento: "", cidade: customer?.cidade || "",
    estado: customer?.estado || "", observacoes: customer?.observacoes || "",
  });
  const [loading, setLoading]       = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepOk, setCepOk]           = useState(false);
  const [cepError, setCepError]     = useState("");
  const { isMobile } = useBreakpoint();
  useBodyScrollLock(true);

  // ── Dirty state: só mostra Salvar se algo mudou ─────────────────────
  const initialRef = useRef({
    nome: customer?.nome || "", cpf_cnpj: customer?.cpf_cnpj || "",
    telefone: customer?.telefone || "", whatsapp: customer?.whatsapp || "",
    email: customer?.email || "", rua: customer?.endereco || "",
    cidade: customer?.cidade || "", estado: customer?.estado || "",
    observacoes: customer?.observacoes || "",
  });
  const isDirty = !customer ||
    form.nome !== initialRef.current.nome ||
    form.cpf_cnpj !== initialRef.current.cpf_cnpj ||
    form.telefone !== initialRef.current.telefone ||
    form.whatsapp !== initialRef.current.whatsapp ||
    form.email !== initialRef.current.email ||
    form.cidade !== initialRef.current.cidade ||
    form.estado !== initialRef.current.estado ||
    form.observacoes !== initialRef.current.observacoes ||
    !!form.cep || !!form.numero || !!form.complemento;

  // ── Refs para navegação Enter / auto-avanço ─────────────────────
  // Ordem dos campos: 0=nome, 1=cpf, 2=email, 3=fone, 4=whats, 5=cep, 6=uf, 7=rua, 8=num, 9=comp, 10=cidade, 11=obs
  const fieldRefs = useRef<(HTMLInputElement | HTMLTextAreaElement | null)[]>(Array(12).fill(null));
  const focusField = (idx: number) => {
    const el = fieldRefs.current[idx];
    if (!el) return;
    el.focus();
    // scrollIntoView garante que o campo fica visivel dentro do modal
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };
  const onEnter = (e: React.KeyboardEvent, nextIdx: number) => {
    if (e.key === "Enter") { e.preventDefault(); focusField(nextIdx); }
  };

  const handleCEP = async (raw: string) => {
    const masked = maskCEP(raw);
    setForm(f => ({ ...f, cep: masked }));
    setCepError(""); setCepOk(false);
    const digits = masked.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { setCepError("CEP não encontrado"); }
      else {
        setForm(f => ({
          ...f,
          rua: `${data.logradouro}${data.bairro ? ", " + data.bairro : ""}`,
          cidade: data.localidade, estado: data.uf,
        }));
        setCepOk(true);
      }
    } catch { setCepError("Erro ao buscar CEP"); }
    finally { setCepLoading(false); }
  };

  const buildEndereco = () => [form.rua, form.numero, form.complemento].filter(Boolean).join(", ");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = {
        nome: form.nome, cpf_cnpj: form.cpf_cnpj || undefined,
        telefone: form.telefone || undefined, whatsapp: form.whatsapp || undefined,
        email: form.email || undefined, endereco: buildEndereco() || undefined,
        cidade: form.cidade || undefined, estado: form.estado || undefined,
        observacoes: form.observacoes || undefined,
      };
      if (customer) { await customersApi.update(customer.id, payload); toast.success("Cliente atualizado!"); }
      else { await customersApi.create(payload); toast.success("Cliente cadastrado!"); }
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao salvar";
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const lbl: React.CSSProperties = {
    fontSize: "11px", fontWeight: "600", color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.07em",
    display: "block", marginBottom: "5px",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9200,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        /* padding fixo para garantir espaco em todos os dispositivos */
        padding: "16px",
        paddingTop: "max(16px, env(safe-area-inset-top, 16px))",
        paddingBottom: "calc(var(--bottom-nav-height, 60px) + env(safe-area-inset-bottom, 0px) + 16px)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: "100%", maxWidth: "600px",
          background: "var(--surface)", border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "18px", overflow: "hidden",
          /* 100svh = viewport sem chrome do browser (iOS Safari seguro) */
          maxHeight: "calc(100svh - var(--bottom-nav-height, 60px) - env(safe-area-inset-bottom, 0px) - 48px)",
          display: "flex", flexDirection: "column",
          boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
        }}
      >
        <div style={{
          padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
          background: "var(--surface)",
        }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              {customer ? "Editar Cliente" : "Novo Cliente"}
              {/* ponto laranja quando ha mudancas nao salvas */}
              {isDirty && customer && (
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--brand)", display: "inline-block", flexShrink: 0 }} title="Alterações não salvas" />
              )}
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
              {customer ? "Atualize as informações do cliente" : "Preencha os dados do novo cliente"}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", flexShrink: 0,
          }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div style={{
          flex: 1, overflowY: "auto",
          WebkitOverflowScrolling: "touch" as "touch",
        }}>
          <div style={{
            padding: isMobile ? "16px" : "22px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "16px",
          }}>
          <div style={isMobile ? {} : { gridColumn: "span 2" }}>
            <label style={lbl}>Nome completo *</label>
            <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
              ref={el => { fieldRefs.current[0] = el; }}
              onKeyDown={e => onEnter(e, 1)}
              className="input" placeholder="Ex: João da Silva" style={{ minHeight: 44 }} />
          </div>
          <div>
            <label style={lbl}>CPF / CNPJ</label>
            <input value={form.cpf_cnpj}
              ref={el => { fieldRefs.current[1] = el; }}
              onChange={e => {
                const masked = maskCPFOrCNPJ(e.target.value);
                setForm({ ...form, cpf_cnpj: masked });
                // auto-avanca quando CPF(11) ou CNPJ(14) completo
                const digits = unmask(masked);
                if (digits.length === 11 || digits.length === 14) focusField(2);
              }}
              onKeyDown={e => onEnter(e, 2)}
              className="input" placeholder="000.000.000-00" inputMode="numeric" style={{ minHeight: 44 }} />
            {form.cpf_cnpj && unmask(form.cpf_cnpj).length === 11 && !validateCPF(form.cpf_cnpj) && (
              <p style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "11px", color: "var(--error)", marginTop: 4 }}>
                <AlertCircle size={10} /> CPF inválido
              </p>
            )}
            {form.cpf_cnpj && unmask(form.cpf_cnpj).length === 14 && !validateCNPJ(form.cpf_cnpj) && (
              <p style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "11px", color: "var(--error)", marginTop: 4 }}>
                <AlertCircle size={10} /> CNPJ inválido
              </p>
            )}
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              ref={el => { fieldRefs.current[2] = el; }}
              onKeyDown={e => onEnter(e, 3)}
              className="input" placeholder="email@exemplo.com" style={{ minHeight: 44 }} />
          </div>
          <div>
            <label style={lbl}>Telefone</label>
            <input value={form.telefone} onChange={e => {
                const masked = maskPhone(e.target.value);
                setForm({ ...form, telefone: masked });
                if (masked.length >= 14) focusField(4); // auto-avanca quando completo
              }}
              ref={el => { fieldRefs.current[3] = el; }}
              onKeyDown={e => onEnter(e, 4)}
              className="input" placeholder="(00) 00000-0000" inputMode="tel" maxLength={15} style={{ minHeight: 44 }} />
          </div>
          <div>
            <label style={lbl}>WhatsApp</label>
            <input value={form.whatsapp} onChange={e => {
                const masked = maskPhone(e.target.value);
                setForm({ ...form, whatsapp: masked });
                if (masked.length >= 14) focusField(5); // auto-avanca para CEP
              }}
              ref={el => { fieldRefs.current[4] = el; }}
              onKeyDown={e => onEnter(e, 5)}
              className="input" placeholder="(00) 00000-0000" inputMode="tel" maxLength={15} style={{ minHeight: 44 }} />
          </div>

          <div style={isMobile ? {} : { gridColumn: "span 2", height: "1px", background: "rgba(255,255,255,0.06)" }} />

          <div>
            <label style={lbl}>CEP</label>
            <div style={{ position: "relative" }}>
              <input value={form.cep} onChange={e => handleCEP(e.target.value)}
                ref={el => { fieldRefs.current[5] = el; }}
                onKeyDown={e => onEnter(e, 6)}
                className="input" placeholder="00000-000" inputMode="numeric" maxLength={9} style={{ minHeight: 44 }} />
              {cepLoading && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                <Loader2 size={13} color="var(--text-muted)" style={{ animation: "spin 1s linear infinite" }} />
              </span>}
              {cepOk && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                <Check size={13} color="#22c55e" />
              </span>}
            </div>
            {cepError && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: 4, display: "flex", gap: 3, alignItems: "center" }}><AlertCircle size={10} />{cepError}</p>}
          </div>
          <div>
            <label style={lbl}>Estado (UF)</label>
            <input value={form.estado}
              onChange={e => { setForm({ ...form, estado: e.target.value.toUpperCase().slice(0, 2) }); }}
              ref={el => { fieldRefs.current[6] = el; }}
              onKeyDown={e => onEnter(e, 7)}
              className="input" placeholder="SP" maxLength={2} style={{ minHeight: 44 }} />
          </div>
          <div style={isMobile ? {} : { gridColumn: "span 2" }}>
            <label style={lbl}>Logradouro e Bairro</label>
            <input value={form.rua} onChange={e => setForm({ ...form, rua: e.target.value })}
              ref={el => { fieldRefs.current[7] = el; }}
              onKeyDown={e => onEnter(e, 8)}
              className="input" placeholder="Rua, Bairro (preenchido pelo CEP)" style={{ minHeight: 44 }} />
          </div>
          <div>
            <label style={lbl}>Número</label>
            <input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })}
              ref={el => { fieldRefs.current[8] = el; }}
              onKeyDown={e => onEnter(e, 9)}
              className="input" placeholder="123" inputMode="numeric" style={{ minHeight: 44 }} />
          </div>
          <div>
            <label style={lbl}>Complemento</label>
            <input value={form.complemento} onChange={e => setForm({ ...form, complemento: e.target.value })}
              ref={el => { fieldRefs.current[9] = el; }}
              onKeyDown={e => onEnter(e, 10)}
              className="input" placeholder="Apto, Casa..." style={{ minHeight: 44 }} />
          </div>
          <div style={isMobile ? {} : { gridColumn: "span 2" }}>
            <label style={lbl}>Cidade</label>
            <input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })}
              ref={el => { fieldRefs.current[10] = el; }}
              onKeyDown={e => onEnter(e, 11)}
              className="input" placeholder="Cidade" style={{ minHeight: 44 }} />
          </div>
          <div style={isMobile ? {} : { gridColumn: "span 2" }}>
            <label style={lbl}>Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
              ref={el => { fieldRefs.current[11] = el as HTMLTextAreaElement; }}
              className="input" rows={2} style={{ height: "auto", paddingTop: "8px", minHeight: 88 }}
              placeholder="Anotações sobre o cliente..." />
          </div>
          </div>{/* end grid */}
        </div>{/* end scroll */}
        <div style={{
          display: "flex", gap: "10px", justifyContent: "flex-end",
          padding: "14px 22px",
          paddingBottom: "max(14px, env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          background: "var(--surface)",
          flexShrink: 0,
        }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ minHeight: 44 }}>Cancelar</button>
          <motion.button
            type="submit"
            className="btn btn-primary"
            whileTap={{ scale: 0.97 }}
            disabled={loading || !isDirty}
            style={{
              minHeight: 44,
              opacity: isDirty ? 1 : 0.4,
              transition: "opacity 0.2s",
            }}
          >
            {loading
              ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</>
              : <><Check size={13} /> {customer ? "Salvar alterações" : "Cadastrar"}</>
            }
          </motion.button>
        </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
