"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Car, Users, X, ArrowRight, Loader2, ShoppingBag, LayoutDashboard } from "lucide-react";
import { vehiclesApi, customersApi } from "@/lib/api";
import { Vehicle, Customer } from "@/types";

type Result =
  | { kind: "vehicle"; item: Vehicle }
  | { kind: "customer"; item: Customer };

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "var(--brand)", color: "#000", borderRadius: 3, padding: "0 2px", fontWeight: 700 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery(""); setResults([]); setSelected(0);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const [vehicles, customers] = await Promise.all([
        vehiclesApi.list({ q, limit: 5 }).catch(() => [] as Vehicle[]),
        customersApi.list({ q, limit: 5 }).catch(() => [] as Customer[]),
      ]);
      setResults([
        ...(vehicles as Vehicle[]).map(v => ({ kind: "vehicle" as const, item: v })),
        ...(customers as Customer[]).map(c => ({ kind: "customer" as const, item: c })),
      ]);
      setSelected(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && results[selected]) { navigate(results[selected]); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, results, selected]);

  const navigate = (r: Result) => {
    onClose();
    if (r.kind === "vehicle") router.push(`/dashboard/veiculos/${r.item.id}`);
    if (r.kind === "customer") router.push(`/dashboard/clientes`);
  };

  const QUICK = [
    { label: "Dashboard",        href: "/dashboard",           icon: LayoutDashboard, color: "#F5A623" },
    { label: "Cadastrar Veículo",href: "/dashboard/veiculos/novo", icon: Car,         color: "#38bdf8" },
    { label: "Nova Venda",       href: "/dashboard/vendas/nova",   icon: ShoppingBag, color: "#22c55e" },
    { label: "Clientes",         href: "/dashboard/clientes",   icon: Users,          color: "#a78bfa" },
  ];

  const allItems = query.trim() ? results : [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            paddingTop: "12vh", paddingLeft: 16, paddingRight: 16,
          }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -12 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: "100%", maxWidth: 580,
              background: "#12121c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
              overflow: "hidden",
            }}
          >
            {/* ── Search bar ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}>
              {loading
                ? <Loader2 size={17} color="var(--brand)" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                : <Search size={17} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
              }
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar veículos, clientes, placas..."
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  fontSize: "15px", color: "#eef0f8",
                  caretColor: "var(--brand)",
                }}
              />
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: "rgba(255,255,255,0.07)", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "rgba(255,255,255,0.4)", flexShrink: 0,
                  }}
                >
                  <X size={12} />
                </button>
              ) : (
                <kbd style={{
                  fontSize: "10px", fontWeight: "700",
                  color: "rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 5, padding: "3px 7px", flexShrink: 0,
                  letterSpacing: "0.04em",
                }}>ESC</kbd>
              )}
            </div>

            {/* ── Results / Quick actions ── */}
            <div style={{ maxHeight: 380, overflowY: "auto" }}>

              {/* Quick actions (when no query) */}
              {!query.trim() && (
                <div style={{ padding: "6px 0 8px" }}>
                  <p style={{
                    padding: "8px 16px 5px",
                    fontSize: "10px", fontWeight: "700",
                    color: "rgba(255,255,255,0.25)",
                    textTransform: "uppercase", letterSpacing: "0.12em",
                  }}>Ações rápidas</p>
                  {QUICK.map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => { onClose(); router.push(a.href); }}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 12,
                          padding: "9px 16px", background: "none", border: "none",
                          cursor: "pointer", transition: "background 0.1s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                          background: `${a.color}16`,
                          border: `1px solid ${a.color}22`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Icon size={14} color={a.color} />
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: "500", color: "#d0d4e0" }}>
                          {a.label}
                        </span>
                        <ArrowRight size={12} color="rgba(255,255,255,0.2)" style={{ marginLeft: "auto" }} />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* No results */}
              {query.trim() && results.length === 0 && !loading && (
                <div style={{ padding: "40px 16px", textAlign: "center" }}>
                  <Search size={30} color="rgba(255,255,255,0.1)" style={{ marginBottom: 10 }} />
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>
                    Nenhum resultado para &ldquo;{query}&rdquo;
                  </p>
                </div>
              )}

              {/* Search results */}
              {query.trim() && results.length > 0 && (
                <div style={{ padding: "6px 0 8px" }}>
                  {/* Vehicles */}
                  {results.filter(r => r.kind === "vehicle").length > 0 && (
                    <>
                      <p style={{
                        padding: "8px 16px 5px", fontSize: "10px", fontWeight: "700",
                        color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.12em",
                      }}>Veículos</p>
                      {results.filter(r => r.kind === "vehicle").map(r => {
                        const v = (r as { kind: "vehicle"; item: Vehicle }).item;
                        const idx = results.indexOf(r);
                        return (
                          <button
                            key={v.id} onClick={() => navigate(r)}
                            onMouseEnter={() => setSelected(idx)}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 12,
                              padding: "9px 16px", border: "none", cursor: "pointer", textAlign: "left",
                              background: idx === selected ? "rgba(245,166,35,0.06)" : "none",
                              borderLeft: idx === selected ? "2px solid var(--brand)" : "2px solid transparent",
                              transition: "all 0.1s",
                            }}
                          >
                            <div style={{
                              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                              background: "#38bdf616", border: "1px solid #38bdf622",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <Car size={13} color="#38bdf8" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: "13px", fontWeight: 500, color: "#eef0f8" }}>
                                <Highlight text={`${v.marca} ${v.modelo}`} query={query} />
                              </p>
                              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                                <Highlight text={v.placa} query={query} /> · {v.ano}
                                {v.cor && ` · ${v.cor}`}
                              </p>
                            </div>
                            <span style={{
                              fontSize: "10px", padding: "2px 8px", borderRadius: 99, fontWeight: 600, flexShrink: 0,
                              background: v.status === "disponivel" ? "#22c55e14" : "#f59e0b14",
                              color: v.status === "disponivel" ? "#22c55e" : "#f59e0b",
                              border: `1px solid ${v.status === "disponivel" ? "#22c55e" : "#f59e0b"}22`,
                            }}>
                              {v.status === "disponivel" ? "Disponível" : v.status === "vendido" ? "Vendido" : v.status.replace("_", " ")}
                            </span>
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Customers */}
                  {results.filter(r => r.kind === "customer").length > 0 && (
                    <>
                      <p style={{
                        padding: "10px 16px 5px", fontSize: "10px", fontWeight: "700",
                        color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.12em",
                      }}>Clientes</p>
                      {results.filter(r => r.kind === "customer").map(r => {
                        const c = (r as { kind: "customer"; item: Customer }).item;
                        const idx = results.indexOf(r);
                        return (
                          <button
                            key={c.id} onClick={() => navigate(r)}
                            onMouseEnter={() => setSelected(idx)}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 12,
                              padding: "9px 16px", border: "none", cursor: "pointer", textAlign: "left",
                              background: idx === selected ? "rgba(167,139,250,0.06)" : "none",
                              borderLeft: idx === selected ? "2px solid #a78bfa" : "2px solid transparent",
                              transition: "all 0.1s",
                            }}
                          >
                            <div style={{
                              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                              background: "#a78bfa16", border: "1px solid #a78bfa22",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <Users size={13} color="#a78bfa" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: "13px", fontWeight: 500, color: "#eef0f8" }}>
                                <Highlight text={c.nome} query={query} />
                              </p>
                              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                                {c.telefone && <Highlight text={c.telefone} query={query} />}
                                {c.cpf_cnpj && <> · <Highlight text={c.cpf_cnpj} query={query} /></>}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              padding: "8px 16px",
              display: "flex", gap: 16, alignItems: "center",
              background: "rgba(0,0,0,0.2)",
            }}>
              {[["↑↓", "navegar"], ["↵", "abrir"], ["esc", "fechar"]].map(([k, l]) => (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
                  <kbd style={{
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 4, padding: "2px 6px", fontSize: "10px", fontWeight: "600",
                    color: "rgba(255,255,255,0.4)",
                  }}>{k}</kbd>
                  {l}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
