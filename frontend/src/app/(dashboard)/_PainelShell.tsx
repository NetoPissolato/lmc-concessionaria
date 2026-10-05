"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Users, ShoppingBag, DollarSign,
  UserCog, LogOut, Search, Bell, FileText, ChevronLeft,
  ChevronRight, Menu, X, Bike, Clock, CheckCircle2, XCircle,
  ChevronDown, Star, Sparkles, MessageSquare, Settings,
} from "lucide-react";
import { authApi, salesApi } from "@/lib/api";
import { toast } from "@/lib/toast";
import { CommandPalette } from "@/components/CommandPalette";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useSwipe } from "@/hooks/useSwipe";
import { useWebSocket, WSStatus } from "@/hooks/useWebSocket";
import { useMobileFormScroll } from "@/hooks/useMobileFormScroll";


// ─── Route Access Control ────────────────────────────────────────────────────
// Routes restricted to ADMIN only
export const ADMIN_ONLY_ROUTES = [
  "/dashboard/financeiro",
  "/dashboard/relatorios",
  "/dashboard/usuarios",
  "/dashboard/configuracoes",
  "/dashboard/modelos-destaque",
];

// ─── Custom Icons ────────────────────────────────────────────────────────────
const PCIcon = ({ size = 16, color = "currentColor", strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {/* Monitor screen */}
    <rect x="2" y="2" width="20" height="14" rx="2.5" />
    {/* Inner screen glare */}
    <path d="M5 5 Q7 4 9 5.5" strokeWidth={strokeWidth * 0.7} strokeOpacity="0.5" />
    {/* Stand neck */}
    <line x1="12" y1="16" x2="12" y2="20" />
    {/* Base */}
    <path d="M8 20 Q12 19 16 20" strokeWidth={strokeWidth * 1.1} />
  </svg>
);

const SettingsIcon = ({ size = 16, color = "currentColor", strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

// ─── Nav types ────────────────────────────────────────────────────────────────
type NavChild = { href: string; label: string; icon: React.ElementType; color: string; adminOnly: boolean };
type NavItemDef = NavChild & { children?: NavChild[] };

// ─── Nav structure ───────────────────────────────────────────────────────────
const NAV_GROUPS: { label: string; items: NavItemDef[] }[] = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard",          label: "Dashboard", icon: PCIcon,           color: "#F5A623", adminOnly: false },
      { href: "/dashboard/veiculos", label: "Carros",    icon: Car,             color: "#38bdf8", adminOnly: false },
      { href: "/dashboard/motos",    label: "Motos",     icon: Bike,            color: "#f97316", adminOnly: false },
      { href: "/dashboard/clientes", label: "Clientes",  icon: Users,           color: "#a78bfa", adminOnly: false },
      { href: "/dashboard/leads",      label: "Leads",  icon: ShoppingBag,     color: "#22c55e", adminOnly: false },
      { href: "/dashboard/avaliacoes",  label: "Avaliações", icon: Star,            color: "#f59e0b", adminOnly: false },
      { href: "/dashboard/modelos-destaque", label: "Destaques do site", icon: Sparkles, color: "#f97316", adminOnly: true },
    ],
  },
  {
    label: "Negócios",
    items: [
      {
        href: "/dashboard/vendas",
        label: "Vendas",
        icon: ShoppingBag,
        color: "#22c55e",
        adminOnly: false,
        children: [
          { href: "/dashboard/vendas/carros", label: "Carros", icon: Car,  color: "#3b82f6", adminOnly: false },
          { href: "/dashboard/vendas/motos",  label: "Motos",  icon: Bike, color: "#f97316", adminOnly: false },
        ],
      },
      { href: "/dashboard/financeiro", label: "Financeiro", icon: DollarSign, color: "#f59e0b", adminOnly: true },
      { href: "/dashboard/relatorios", label: "Relatórios", icon: FileText,   color: "#f97316", adminOnly: true },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/dashboard/usuarios",       label: "Usuários",      icon: UserCog,    color: "#ec4899", adminOnly: true },
      { href: "/dashboard/configuracoes",  label: "Configurações", icon: SettingsIcon, color: "#94a3b8", adminOnly: true },
    ],
  },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  wsStatus,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  wsStatus: WSStatus;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const user     = authApi.getUser();
  const isAdmin  = user?.role === "admin";
  const { isMobileOrTablet } = useBreakpoint();

  // Swipe to close sidebar on mobile/tablet
  useSwipe({
    onSwipeLeft: () => { if (mobileOpen) onMobileClose(); },
    threshold: 60,
  });

  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // Auto-expand Vendas submenu if on a vendas sub-route
  useEffect(() => {
    if (pathname.startsWith("/dashboard/vendas/")) {
      setExpandedMenus(prev =>
        prev.includes("/dashboard/vendas") ? prev : [...prev, "/dashboard/vendas"]
      );
    }
  }, [pathname]);

  const toggleMenu = (href: string) => {
    setExpandedMenus(prev =>
      prev.includes(href) ? prev.filter(m => m !== href) : [...prev, href]
    );
  };

  const handleLogout = async () => {
    await authApi.logout();
    toast.success("Até logo!");
    router.push("/login");
  };

  const w = isMobileOrTablet
    ? "var(--sidebar-width)"
    : collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)";

  return (
    <>
      {/* Mobile/Tablet overlay */}
      <AnimatePresence>
        {mobileOpen && isMobileOrTablet && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
              zIndex: 101, backdropFilter: "blur(4px)",
            }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{
          width: w,
          // On mobile/tablet: slide in/out from left
          x: isMobileOrTablet ? (mobileOpen ? 0 : "-100%") : 0,
        }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        style={{
          height: isMobileOrTablet ? "100dvh" : "100vh",
          background: "#0d0d0d",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflowX: "hidden",   // apenas horizontal; vertical fica livre p/ nav scrollar
          // Desktop: sticky. Mobile/Tablet: fixed drawer acima do bottom-nav (z:100)
          position: isMobileOrTablet ? "fixed" : "sticky",
          top: 0,
          left: 0,
          zIndex: isMobileOrTablet ? 102 : 50,
        }}
      >
        {/* ── Hero Banner Logo ── */}
        <div style={{
          position: "relative",
          height: collapsed ? "var(--header-height)" : "108px",
          flexShrink: 0,
          overflow: "hidden",
          borderBottom: "1px solid rgba(245,166,35,0.15)",
          transition: "height 0.22s cubic-bezier(0.4,0,0.2,1)",
          cursor: collapsed ? "pointer" : "default",
        }}
          onClick={collapsed ? onToggle : undefined}
        >


          {/* Dark premium background */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, #0f0d0a 0%, #0d0d0d 60%, #0a0d0a 100%)",
          }} />
          {/* Subtle amber glow */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 80% 120% at 30% 50%, rgba(245,166,35,0.08) 0%, transparent 70%)",
          }} />

          {/* Golden top accent line */}
          <motion.div
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 4, repeat: Infinity }}
            style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "2px",
              background: "linear-gradient(90deg, transparent, #F5A623, #ffce6e, #F5A623, transparent)",
              backgroundSize: "200%",
            }}
          />

          {/* Logo content */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center",
            padding: collapsed ? "0" : "0 12px",
            justifyContent: collapsed ? "center" : "space-between",
          }}>
            <AnimatePresence mode="wait">
              {!collapsed ? (
                <motion.div
                  key="logo-banner-full"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  {/* Logo vetorial (o PNG de 2 MB era invertido por filtro CSS a cada página) */}
                  <img
                    src="/brand/lmc-logo-on-dark.svg"
                    alt="LMC Veículos"
                    style={{ height: "44px", width: "auto", display: "block" }}
                  />
                </motion.div>
              ) : (
                /* Collapsed: mostra apenas botao de expandir, sem logo */
                <motion.div
                  key="logo-banner-mini"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}
                >
                  <motion.div
                    whileHover={{ scale: 1.1, color: "#F5A623" }}
                    style={{
                      width: 32, height: 32, borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "rgba(255,255,255,0.45)",
                      cursor: "pointer",
                    }}
                  >
                    <ChevronRight size={14} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* WebSocket connection status indicator */}
            {!collapsed && (
              <motion.div
                title={wsStatus === "connected" ? "Tempo real ativo" : wsStatus === "connecting" ? "Conectando..." : "Sem conexão em tempo real"}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: wsStatus === "connecting" ? 1.2 : 2.5, repeat: Infinity }}
                style={{
                  width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                  background: wsStatus === "connected" ? "#22c55e"
                    : wsStatus === "connecting" ? "#F5A623"
                    : "#ef4444",
                  boxShadow: wsStatus === "connected"
                    ? "0 0 8px rgba(34,197,94,0.7)"
                    : wsStatus === "connecting"
                    ? "0 0 8px rgba(245,166,35,0.7)"
                    : "0 0 8px rgba(239,68,68,0.7)",
                }}
              />
            )}

            {/* Collapse button */}
            {!collapsed && (
              <button
                onClick={onToggle}
                style={{
                  width: "26px", height: "26px", borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(4px)",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", color: "rgba(255,255,255,0.5)",
                  flexShrink: 0, transition: "all 0.15s",
                  zIndex: 1,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,166,35,0.5)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#F5A623";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,166,35,0.1)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.4)";
                }}
              >
                <ChevronLeft size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          padding: "16px 10px",
          display: "flex", flexDirection: "column", gap: "0",
        }}>
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;
            return (
            <div key={group.label} style={{ marginBottom: "6px" }}>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "10px 10px 6px",
                    }}
                  >
                    <div style={{ width: "14px", height: "1px", background: "rgba(255,255,255,0.1)", borderRadius: "1px", flexShrink: 0 }} />
                    <span style={{
                      fontSize: "10.5px", fontWeight: "800",
                      color: "rgba(255,255,255,0.22)",
                      letterSpacing: "0.2em", textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}>{group.label}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {collapsed && (
                <div style={{
                  height: "1px",
                  background: "rgba(255,255,255,0.06)",
                  margin: "8px 10px",
                  opacity: group.label === "Principal" ? 0 : 1,
                }} />
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {visibleItems.map((item) => {
                  const { href, label, icon: Icon, color, children } = item;
                  const hasChildren = !!children?.length;
                  const isExpanded  = expandedMenus.includes(href);
                  const isParentActive = hasChildren && pathname.startsWith(href + "/");
                  const isActive = !hasChildren && (
                    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"))
                  );

                  /* ── Parent with submenu ── */
                  if (hasChildren) {
                    const firstChildHref = children![0].href;
                    return (
                      <div key={href} style={{ display: "flex", flexDirection: "column" }}>
                        {/* Parent row: split into Link (navigate) + Chevron (toggle) */}
                        <div style={{
                          display: "flex", alignItems: "center",
                          borderRadius: "10px", position: "relative",
                          background: isParentActive ? `linear-gradient(135deg, ${color}16 0%, ${color}08 100%)` : "transparent",
                          border: `1px solid ${isParentActive ? color + "28" : "transparent"}`,
                          boxShadow: isParentActive ? `inset 0 1px 0 ${color}15` : "none",
                          transition: "all 0.18s",
                          overflow: "hidden",
                        }}>
                          {isParentActive && !collapsed && (
                            <div style={{
                              position: "absolute", left: 0, top: "5px", bottom: "5px",
                              width: "4px", borderRadius: "0 4px 4px 0",
                              background: `linear-gradient(180deg, ${color}, ${color}bb)`,
                              boxShadow: `0 0 12px ${color}99, 0 0 4px ${color}`,
                              zIndex: 1,
                            }} />
                          )}

                          {/* Main link: navigates to first child + auto-expands */}
                          <Link
                            href={collapsed ? "#" : firstChildHref}
                            onClick={(e) => {
                              if (collapsed) { e.preventDefault(); onToggle(); return; }
                              if (!expandedMenus.includes(href)) {
                                setExpandedMenus(prev => [...prev, href]);
                              }
                            }}
                            title={collapsed ? label : undefined}
                            style={{
                              flex: 1, display: "flex", alignItems: "center",
                              gap: collapsed ? "0" : "11px",
                              padding: collapsed ? "9px" : "9px 10px",
                              justifyContent: collapsed ? "center" : "flex-start",
                              textDecoration: "none",
                              color: isParentActive ? color : "rgba(255,255,255,0.5)",
                              fontSize: "13px", fontWeight: isParentActive ? "600" : "500",
                              letterSpacing: isParentActive ? "-0.1px" : "0",
                              cursor: "pointer",
                              transition: "color 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isParentActive) {
                                (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.85)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isParentActive) {
                                (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.5)";
                              }
                            }}
                          >
                            <div style={{
                              width: "30px", height: "30px", borderRadius: "9px", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: isParentActive ? `${color}20` : "rgba(255,255,255,0.06)",
                              border: `1px solid ${isParentActive ? color + "30" : "rgba(255,255,255,0.05)"}`,
                              transition: "all 0.18s",
                            }}>
                              <Icon size={15} strokeWidth={isParentActive ? 2.5 : 2} color={isParentActive ? color : "rgba(255,255,255,0.55)"} />
                            </div>
                            <AnimatePresence>
                              {!collapsed && (
                                <motion.span
                                  initial={{ opacity: 0, width: 0 }}
                                  animate={{ opacity: 1, width: "auto" }}
                                  exit={{ opacity: 0, width: 0 }}
                                  transition={{ duration: 0.16 }}
                                  style={{ overflow: "hidden", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}
                                >
                                  {label}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </Link>

                          {/* Chevron: only toggles submenu, does NOT navigate */}
                          {!collapsed && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleMenu(href); }}
                              style={{
                                padding: "9px 10px", background: "none", border: "none",
                                cursor: "pointer", color: "rgba(255,255,255,0.22)",
                                display: "flex", alignItems: "center", flexShrink: 0,
                                transition: "color 0.15s",
                              }}
                              onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)"}
                              onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.22)"}
                            >
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown size={11} />
                              </motion.div>
                            </button>
                          )}
                        </div>


                        {/* Submenu children */}
                        <AnimatePresence>
                          {isExpanded && !collapsed && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                              style={{ overflow: "hidden" }}
                            >
                              <div style={{
                                marginLeft: "14px", marginTop: "3px", paddingBottom: "4px",
                                paddingLeft: "14px",
                                borderLeft: "1px solid rgba(255,255,255,0.09)",
                                display: "flex", flexDirection: "column", gap: "2px",
                              }}>
                                {(children || []).filter(c => !c.adminOnly || isAdmin).map(child => {
                                  const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                                  return (
                                    <Link
                                      key={child.href}
                                      href={child.href}
                                      style={{
                                        display: "flex", alignItems: "center", gap: "8px",
                                        padding: "7px 10px", borderRadius: "8px",
                                        textDecoration: "none", position: "relative",
                                        background: childActive ? `${child.color}14` : "transparent",
                                        border: `1px solid ${childActive ? child.color + "25" : "transparent"}`,
                                        color: childActive ? child.color : "rgba(255,255,255,0.42)",
                                        fontSize: "12.5px", fontWeight: childActive ? 600 : 500,
                                        transition: "all 0.15s",
                                      }}
                                      onMouseEnter={e => {
                                        if (!childActive) {
                                          (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)";
                                          (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.75)";
                                        }
                                      }}
                                      onMouseLeave={e => {
                                        if (!childActive) {
                                          (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                                          (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.42)";
                                        }
                                      }}
                                    >
                                      {childActive && (
                                        <div style={{
                                          position: "absolute", left: 0, top: "4px", bottom: "4px",
                                          width: "3px", borderRadius: "0 3px 3px 0",
                                          background: `linear-gradient(180deg, ${child.color}, ${child.color}bb)`,
                                          boxShadow: `0 0 8px ${child.color}80`,
                                        }} />
                                      )}
                                      <div style={{
                                        width: "24px", height: "24px", borderRadius: "7px", flexShrink: 0,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: childActive ? `${child.color}18` : "rgba(255,255,255,0.05)",
                                        border: `1px solid ${childActive ? child.color + "25" : "rgba(255,255,255,0.05)"}`,
                                        transition: "all 0.15s",
                                      }}>
                                        <child.icon size={12} strokeWidth={childActive ? 2.5 : 2} color={childActive ? child.color : "rgba(255,255,255,0.5)"} />
                                      </div>
                                      {child.label}
                                    </Link>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  /* ── Regular item (no children) ── */
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      style={{
                        display: "flex", alignItems: "center",
                        gap: collapsed ? "0" : "11px",
                        padding: collapsed ? "9px" : "9px 10px",
                        borderRadius: "10px",
                        justifyContent: collapsed ? "center" : "flex-start",
                        textDecoration: "none", position: "relative",
                        background: isActive
                          ? `linear-gradient(135deg, ${color}16 0%, ${color}08 100%)`
                          : "transparent",
                        border: isActive ? `1px solid ${color}28` : "1px solid transparent",
                        boxShadow: isActive ? `inset 0 1px 0 ${color}15` : "none",
                        transition: "all 0.18s",
                        color: isActive ? color : "rgba(255,255,255,0.5)",
                        fontSize: "13px", fontWeight: isActive ? "600" : "500",
                        letterSpacing: isActive ? "-0.1px" : "0",
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)";
                          (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.85)";
                          (e.currentTarget as HTMLAnchorElement).style.border = "1px solid rgba(255,255,255,0.07)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                          (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.5)";
                          (e.currentTarget as HTMLAnchorElement).style.border = "1px solid transparent";
                        }
                      }}
                    >
                      {isActive && !collapsed && (
                        <div style={{
                          position: "absolute", left: 0, top: "5px", bottom: "5px",
                          width: "4px", borderRadius: "0 4px 4px 0",
                          background: `linear-gradient(180deg, ${color}, ${color}bb)`,
                          boxShadow: `0 0 12px ${color}99, 0 0 4px ${color}`,
                        }} />
                      )}
                      <div style={{
                        width: "30px", height: "30px", borderRadius: "9px", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isActive ? `${color}20` : "rgba(255,255,255,0.06)",
                        border: `1px solid ${isActive ? color + "30" : "rgba(255,255,255,0.05)"}`,
                        transition: "all 0.18s",
                      }}>
                        <Icon size={15} strokeWidth={isActive ? 2.5 : 2} color={isActive ? color : "rgba(255,255,255,0.55)"} />
                      </div>
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.16 }}
                            style={{ overflow: "hidden", whiteSpace: "nowrap" }}
                          >
                            {label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  );
                })}
              </div>
            </div>
            );
          })}
        </nav>

        {/* ── Footer / Profile ── */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 10px",
          display: "flex", flexDirection: "column", gap: "6px",
          flexShrink: 0,
        }}>
          {/* Expand button (when collapsed) */}
          {collapsed && (
            <button
              onClick={onToggle}
              title="Expandir menu"
              style={{
                width: "100%", height: "32px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.25)", borderRadius: "10px",
                transition: "all 0.15s", marginBottom: "4px",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "#F5A623";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,166,35,0.06)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)";
                (e.currentTarget as HTMLButtonElement).style.background = "none";
              }}
            >
              <ChevronRight size={15} />
            </button>
          )}




        </div>

      </motion.aside>
    </>
  );
}

// ─── Page Meta ────────────────────────────────────────────────────────────────
const PAGE_META: Record<string, { title: string; subtitle: string; icon: React.ElementType; color: string }> = {
  "/dashboard":                   { title: "Dashboard",      subtitle: "Visão geral em tempo real",                icon: PCIcon,          color: "#F5A623" },
  "/dashboard/veiculos":          { title: "Carros",         subtitle: "Estoque e gestão de carros",               icon: Car,             color: "#38bdf8" },
  "/dashboard/motos":             { title: "Motos",          subtitle: "Estoque e gestão de motos",                icon: Bike,            color: "#f97316" },
  "/dashboard/clientes":          { title: "Clientes",       subtitle: "Cadastro e histórico de clientes",         icon: Users,           color: "#a78bfa" },
  "/dashboard/vendas":            { title: "Vendas",         subtitle: "Registro e histórico de vendas",           icon: ShoppingBag,     color: "#22c55e" },
  "/dashboard/vendas/carros":     { title: "Vendas · Carros", subtitle: "Histórico e registro de vendas de carros", icon: Car,             color: "#3b82f6" },
  "/dashboard/vendas/motos":      { title: "Vendas · Motos",  subtitle: "Histórico e registro de vendas de motos",  icon: Bike,            color: "#f97316" },
  "/dashboard/financeiro":        { title: "Financeiro",     subtitle: "Fluxo de caixa e lançamentos",             icon: DollarSign,      color: "#f59e0b" },
  "/dashboard/relatorios":        { title: "Relatórios",     subtitle: "Análises, exportações e métricas",         icon: FileText,        color: "#f97316" },
  "/dashboard/usuarios":          { title: "Usuários",       subtitle: "Controle de acesso e permissões",          icon: UserCog,         color: "#ec4899" },
  "/dashboard/leads":             { title: "Leads",          subtitle: "Contatos do site e pedidos de aviso",      icon: MessageSquare,   color: "#22c55e" },
  "/dashboard/avaliacoes":        { title: "Avaliações",     subtitle: "Moderação das avaliações do site",         icon: Star,            color: "#f59e0b" },
  "/dashboard/modelos-destaque":  { title: "Destaques do site", subtitle: "Modelos em destaque na página inicial", icon: Sparkles,        color: "#f97316" },
  "/dashboard/configuracoes":     { title: "Configurações",  subtitle: "Dados da loja e do site",                  icon: Settings,        color: "#94a3b8" },
};

// ─── Header ──────────────────────────────────────────────────────────────────
function Header({
  onMobileMenuToggle,
  onSearchOpen,
}: {
  onMobileMenuToggle: () => void;
  onSearchOpen: () => void;
}) {
  const pathname = usePathname();
  const [time, setTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [recentSales, setRecentSales] = useState<{id: string; vehicle_info: string | null; cliente_nome: string | null; data_venda: string; status: string}[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const { isMobileOrTablet, isMobile, isDesktop } = useBreakpoint();

  // Fetch recent sales for notifications — polls every 30s
  const fetchPending = useCallback(() => {
    if (!authApi.isAuthenticated()) return; // sem login: o shell já está mandando para /login
    salesApi.list({ limit: 8 }).then((data: unknown[]) => {
      setRecentSales(
        (data as {id: string; vehicle_info: string | null; cliente_nome: string | null; data_venda: string; status: string}[])
          .slice(0, 8)
      );
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30_000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  // Re-fetch when WebSocket fires a sale event
  useEffect(() => {
    const handler = () => fetchPending();
    window.addEventListener("lmc:sale_event", handler);
    return () => window.removeEventListener("lmc:sale_event", handler);
  }, [fetchPending]);

  // Close notif panel on outside click
  useEffect(() => {
    if (!showNotif) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotif]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const meta = Object.entries(PAGE_META)
    .filter(([k]) => pathname === k || pathname.startsWith(k + "/"))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1]
    ?? { title: "Dashboard", subtitle: "", icon: PCIcon, color: "#F5A623" };

  const PageIcon = meta.icon;
  const user = authApi.getUser();

  const dateStr = time.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  const timeStr = time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <header style={{
      height: "var(--header-height)",
      minHeight: "var(--header-height)",
      background: "rgba(13,13,13,0.95)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: isMobileOrTablet ? "0 10px" : "0 20px",
      position: "sticky", top: 0, zIndex: 30, flexShrink: 0,
      gap: isMobileOrTablet ? 6 : 12,
      // overflow: "hidden" REMOVIDO — causava os dropdowns ficarem escondidos abaixo do header
    }}>
      <style>{`@keyframes hping{75%,100%{transform:scale(2.2);opacity:0}}`}</style>

      {/* Left: Page identity */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobileOrTablet ? "6px" : "12px", minWidth: 0, flex: 1, overflow: "hidden" }}>
        {/* Hamburger - visible on tablet/mobile */}
        {isMobileOrTablet && (
          <button onClick={onMobileMenuToggle} style={{
            width: "32px", height: "32px", borderRadius: "8px", background: "none",
            border: "1px solid var(--border)", display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", flexShrink: 0,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,166,35,0.4)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--brand)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
          }}>
            <Menu size={14} />
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.15 }}
            style={{ display: "flex", alignItems: "center", gap: isMobileOrTablet ? "7px" : "10px", minWidth: 0, overflow: "hidden" }}
          >
            {/* Colored accent bar + icon - hide accent bar on mobile to save space */}
            <div style={{
              display: "flex", alignItems: "center",
              borderRadius: "10px", overflow: "hidden",
              border: `1px solid ${meta.color}22`, flexShrink: 0,
            }}>
              {!isMobile && (
                <div style={{
                  width: "3px", height: "30px",
                  background: `linear-gradient(180deg, ${meta.color}00, ${meta.color}cc, ${meta.color}00)`,
                }} />
              )}
              <div style={{
                width: isMobile ? "28px" : "30px",
                height: isMobile ? "28px" : "30px",
                background: `${meta.color}0d`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <PageIcon size={13} color={meta.color} strokeWidth={2} />
              </div>
            </div>

            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <h1 style={{
                fontSize: isMobileOrTablet ? "13px" : "14px",
                fontWeight: "700", color: "var(--text-primary)",
                lineHeight: 1, letterSpacing: "-0.3px",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{meta.title}</h1>
              {meta.subtitle && !isMobileOrTablet && (
                <p style={{
                  fontSize: "11.5px", color: "var(--text-muted)",
                  marginTop: "2px", lineHeight: 1, whiteSpace: "nowrap",
                }}>
                  {meta.subtitle}
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right: actions */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobileOrTablet ? "4px" : "6px", flexShrink: 0 }}>

        {/* Date + time pill - desktop only */}
        {isDesktop && (
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)", padding: "0 12px", height: "32px", userSelect: "none",
          }}>
            <div style={{
              width: "5px", height: "5px", borderRadius: "50%",
              background: "#22c55e", boxShadow: "0 0 6px #22c55e66",
            }} />
            <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
              {dateStr}
            </span>
            <span style={{
              fontSize: "11.5px", color: "var(--text-muted)",
              borderLeft: "1px solid var(--border)", paddingLeft: "6px",
            }}>
              {timeStr}
            </span>
          </div>
        )}

        {/* Search - icon-only on mobile & tablet, full bar on desktop */}
        {isDesktop ? (
          <motion.button
            onClick={onSearchOpen}
            whileHover={{ scale: 1.01 }}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", padding: "0 10px",
              height: "32px", cursor: "pointer", minWidth: "140px",
              transition: "border-color var(--transition-fast)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,166,35,0.3)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
          >
            <Search size={12} color="var(--text-muted)" />
            <span style={{ fontSize: "12px", color: "var(--text-muted)", flex: 1, textAlign: "left" }}>Buscar...</span>
            <kbd style={{
              fontSize: "11px", fontWeight: "700", color: "var(--text-muted)",
              background: "var(--surface-3)", padding: "2px 5px",
              borderRadius: "4px", border: "1px solid var(--border)",
            }}>Ctrl+K</kbd>
          </motion.button>
        ) : (
          /* Mobile & Tablet: search icon button */
          <motion.button
            onClick={onSearchOpen}
            whileTap={{ scale: 0.92 }}
            style={{
              width: isMobile ? "32px" : "34px",
              height: isMobile ? "32px" : "34px",
              borderRadius: "8px",
              background: "var(--surface-2)", border: "1px solid var(--border)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-secondary)",
            }}
          >
            <Search size={14} />
          </motion.button>
        )}

        {/* Notifications */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotif(v => !v)}
            style={{
              width: isMobile ? "32px" : "34px",
              height: isMobile ? "32px" : "34px",
              borderRadius: "var(--radius-sm)",
              background: showNotif ? "rgba(245,166,35,0.12)" : "var(--surface-2)",
              border: `1px solid ${showNotif ? "rgba(245,166,35,0.35)" : "var(--border)"}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: showNotif ? "var(--brand)" : "var(--text-secondary)", position: "relative",
              transition: "all var(--transition-fast)",
            }}
          >
            <Bell size={13} />
            {recentSales.length > 0 && (
              <span style={{ position: "absolute", top: "6px", right: "6px", width: "7px", height: "7px" }}>
                <span style={{
                  display: "block", width: "7px", height: "7px", borderRadius: "50%",
                  background: "var(--brand)",
                  animation: "hping 1.6s cubic-bezier(0,0,0.2,1) infinite",
                  opacity: 0.7,
                }} />
                <span style={{ position: "absolute", inset: "1.5px", borderRadius: "50%", background: "var(--brand)" }} />
              </span>
            )}
          </motion.button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotif && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute", top: "calc(100% + 10px)", right: 0,
                  width: "min(320px, calc(100vw - 24px))", zIndex: 100,
                  background: "#111111",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div style={{
                  padding: "14px 16px 10px",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Bell size={13} color="var(--brand)" />
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>Notificações</span>
                    {recentSales.length > 0 && (
                      <span style={{
                        fontSize: "11.5px", fontWeight: "700", color: "#fff",
                        background: "var(--brand)", borderRadius: "20px",
                        padding: "1px 7px", lineHeight: "16px",
                      }}>{recentSales.length}</span>
                    )}
                  </div>
                  <button onClick={() => setShowNotif(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6 }}>
                    <X size={13} />
                  </button>
                </div>

                {/* Content */}
                <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                  {recentSales.length === 0 ? (
                    <div style={{ padding: "32px 16px", textAlign: "center" }}>
                      <CheckCircle2 size={28} color="#22c55e" style={{ margin: "0 auto 10px", display: "block" }} />
                      <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Sem vendas ainda.</p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 4 }}>Nenhuma venda registrada.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: "10px 16px 6px" }}>
                        <p style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Vendas Recentes
                        </p>
                      </div>
                      {recentSales.map((sale, i) => (
                        <motion.a
                          key={sale.id}
                          href={`/dashboard/vendas/${sale.id}`}
                          onClick={() => setShowNotif(false)}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 16px", textDecoration: "none",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            transition: "background 0.12s",
                            cursor: "pointer",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                            background: sale.status === "concluida" ? "rgba(34,197,94,0.12)" : sale.status === "cancelada" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                            border: `1px solid ${sale.status === "concluida" ? "rgba(34,197,94,0.25)" : sale.status === "cancelada" ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {sale.status === "concluida"
                              ? <CheckCircle2 size={14} color="#22c55e" />
                              : sale.status === "cancelada"
                              ? <XCircle size={14} color="#ef4444" />
                              : <Clock size={14} color="#f59e0b" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {sale.vehicle_info || "Veículo"}
                            </p>
                            <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: 1 }}>
                              {sale.cliente_nome || "Cliente"} · {new Date(sale.data_venda + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            </p>
                          </div>
                          <span style={{
                            fontSize: "11px", fontWeight: "700",
                            color: sale.status === "concluida" ? "#22c55e" : sale.status === "cancelada" ? "#ef4444" : "#f59e0b",
                            background: sale.status === "concluida" ? "rgba(34,197,94,0.1)" : sale.status === "cancelada" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                            border: `1px solid ${sale.status === "concluida" ? "rgba(34,197,94,0.2)" : sale.status === "cancelada" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                            padding: "2px 7px", borderRadius: "20px", whiteSpace: "nowrap", textTransform: "uppercase",
                          }}>{sale.status === "concluida" ? "Concluída" : sale.status === "cancelada" ? "Cancelada" : "Pendente"}</span>
                        </motion.a>
                      ))}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div style={{
                  padding: "10px 16px",
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                }}>
                  <a href="/dashboard/vendas" onClick={() => setShowNotif(false)}
                    style={{
                      display: "block", textAlign: "center", fontSize: "11px",
                      fontWeight: "600", color: "var(--brand)", textDecoration: "none",
                      padding: "6px", borderRadius: 8,
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,166,35,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    Ver todas as vendas →
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider - desktop only */}
        {isDesktop && (
          <div style={{ width: "1px", height: "18px", background: "var(--border)", flexShrink: 0 }} />
        )}

        {/* Avatar + dropdown */}
        <div style={{ position: "relative" }}>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setShowUserMenu(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: isMobile ? 0 : "7px",
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: isMobile ? "50%" : "var(--radius-md)",
              padding: isMobile ? "0" : "3px 10px 3px 3px",
              width: isMobile ? "34px" : "auto",
              height: isMobile ? "34px" : "auto",
              cursor: "pointer", transition: "border-color var(--transition-fast)",
              justifyContent: "center", flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,166,35,0.3)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
          >
            <div style={{
              width: isMobile ? "34px" : "26px",
              height: isMobile ? "34px" : "26px",
              borderRadius: isMobile ? "50%" : "7px",
              background: "linear-gradient(135deg, #F5A623, #e8920e)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", fontWeight: "800", color: "#fff", flexShrink: 0,
            }}>
              {user?.nome?.[0]?.toUpperCase() || "U"}
            </div>
            {!isMobile && (
              <div style={{ textAlign: "left" }}>
                <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-primary)", lineHeight: 1, whiteSpace: "nowrap" }}>
                  {user?.nome?.split(" ")[0] || "Usuário"}
                </p>
                <p style={{ fontSize: "11px", color: "var(--brand)", marginTop: "2px", fontWeight: "600", textTransform: "capitalize" }}>
                  {user?.role || "admin"}
                </p>
              </div>
            )}
          </motion.button>

          <AnimatePresence>
            {showUserMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setShowUserMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)", minWidth: "170px",
                    boxShadow: "var(--shadow-lg)", zIndex: 50, overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {user?.nome || "Usuário"}
                    </p>
                    <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {user?.email || "-"}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setShowUserMenu(false);
                      await authApi.logout();
                      toast.success("Até logo!");
                      window.location.href = "/login";
                    }}
                    style={{
                      width: "100%", padding: "9px 12px",
                      display: "flex", alignItems: "center", gap: "8px",
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "12px", fontWeight: "600", color: "var(--error)",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <LogOut size={13} /> Sair da conta
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function PainelShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen]     = useState(false);
  const [mounted, setMounted]                   = useState(false);
  const [searchOpen, setSearchOpen]             = useState(false);
  const [vendaPickerOpen, setVendaPickerOpen]   = useState(false);

  // Real-time WebSocket connection
  const { status: wsStatus } = useWebSocket();

  // Mobile: auto-scroll focused inputs above virtual keyboard
  useMobileFormScroll();

  // ─── ALL hooks must be called before any early return ─────────────────────
  const { isMobile, isMobileOrTablet, isDesktop, isXs } = useBreakpoint();

  // Ctrl+K shortcut
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  // Auth + route guard
  useEffect(() => {
    setMounted(true);
    if (!authApi.isAuthenticated()) {
      router.push("/login");
      return;
    }
    const user = authApi.getUser();
    if (user?.role !== "admin") {
      const blocked = ADMIN_ONLY_ROUTES.some(
        (r) => pathname === r || pathname.startsWith(r + "/")
      );
      if (blocked) router.replace("/dashboard");
    }
  }, [router, pathname]);

  useEffect(() => {
    if (isMobileOrTablet) { setMobileMenuOpen(false); setVendaPickerOpen(false); }
  }, [pathname, isMobileOrTablet]);

  // Swipe from left edge to open sidebar on mobile/tablet
  useSwipe({
    onSwipeRight: () => { if (isMobileOrTablet && !mobileMenuOpen) setMobileMenuOpen(true); },
    edgeThreshold: 24,
    threshold: 50,
  });

  // ─── Bottom nav items ──────────────────────────────────────────────────────
  const bottomNavItems = [
    { href: "/dashboard",          icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="14" rx="2.5" /><line x1="12" y1="16" x2="12" y2="20" />
        <path d="M8 20 Q12 19 16 20" strokeWidth={2.2} />
      </svg>
    ), label: "Início",   active: pathname === "/dashboard" },
    { href: "/dashboard/veiculos", icon: <Car size={20} />,         label: "Carros",   active: pathname.startsWith("/dashboard/veiculos") },
    { href: "/dashboard/motos",    icon: <Bike size={20} />,        label: "Motos",    active: pathname.startsWith("/dashboard/motos") },
    { href: "/dashboard/clientes", icon: <Users size={20} />,       label: "Clientes", active: pathname.startsWith("/dashboard/clientes") },
  ];

  if (!mounted) return null;

  // Tela só de admin aberta por funcionário (link antigo, URL digitada): não monta a página
  // enquanto o redirecionamento acontece — antes ela disparava chamadas que voltavam 403.
  const rotaBloqueada = authApi.getUser()?.role !== "admin" &&
    ADMIN_ONLY_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const semLogin = !authApi.isAuthenticated();

  return (
    <div style={{ display: "flex", height: "100dvh", background: "var(--background)", overflow: "hidden" }}>
      {/* Sidebar - sticky on desktop, fixed drawer on mobile/tablet */}
      {!isMobileOrTablet && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(v => !v)}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
          wsStatus={wsStatus}
        />
      )}
      {isMobileOrTablet && (
        <Sidebar
          collapsed={false}
          onToggle={() => setMobileMenuOpen(false)}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
          wsStatus={wsStatus}
        />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "var(--background)", overflow: "hidden" }}>
        <Header
          onMobileMenuToggle={() => setMobileMenuOpen(v => !v)}
          onSearchOpen={() => setSearchOpen(true)}
        />
        <main
          id="dash-main"
          className="page-enter dash-main"
          style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
        >
          {/* Max-width wrapper for ultrawide screens - keeps content readable */}
          <div className="dashboard-main-content" style={{ margin: "0 auto" }}>
            {rotaBloqueada || semLogin ? null : children}
          </div>
        </main>
      </div>


      {/* ─── Bottom Navigation (mobile only) ─────────────────────────────── */}
      <nav className="bottom-nav" aria-label="Navegação principal">
        {bottomNavItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item${item.active ? " active" : ""}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            {!isXs && <span>{item.label}</span>}
          </Link>
        ))}

        {/* Vendas - button with floating picker */}
        <div style={{ position: "relative", flex: 1, display: "flex", justifyContent: "center" }}>
          {/* Floating picker - appears above the bottom nav, centered on Vendas button */}
          <AnimatePresence>
            {vendaPickerOpen && (
              <>
                {/* backdrop - above nav (100), below picker (120) */}
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 119 }}
                  onClick={() => setVendaPickerOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.92, x: "-50%" }}
                  animate={{ opacity: 1, y: 0, scale: 1,    x: "-50%" }}
                  exit={{    opacity: 0, y: 10, scale: 0.92, x: "-50%" }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: "fixed",
                    bottom: "calc(var(--bottom-nav-height, 60px) + env(safe-area-inset-bottom, 0px) + 12px)",
                    left: "50%",
                    /* x: "-50%" is managed by Framer Motion above - don't use transform here */
                    background: "#111",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "16px",
                    padding: "8px",
                    zIndex: 120,
                    display: "flex",
                    gap: "8px",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
                    width: "min(240px, calc(100vw - 32px))",
                  }}
                >
                  {[
                    { href: "/dashboard/vendas/carros", label: "Carros", icon: <Car size={18} />, color: "#3b82f6" },
                    { href: "/dashboard/vendas/motos",  label: "Motos",  icon: <Bike size={18} />, color: "#f97316" },
                  ].map(opt => {
                    const isActive = pathname.startsWith(opt.href);
                    return (
                      <Link
                        key={opt.href}
                        href={opt.href}
                        onClick={() => setVendaPickerOpen(false)}
                        style={{
                          flex: 1,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", gap: "6px",
                          padding: "12px 8px",
                          borderRadius: "12px",
                          textDecoration: "none",
                          background: isActive ? `${opt.color}18` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isActive ? opt.color + "40" : "rgba(255,255,255,0.06)"}`,
                          color: isActive ? opt.color : "rgba(255,255,255,0.7)",
                          fontSize: "12px", fontWeight: isActive ? 700 : 500,
                          transition: "all 0.15s",
                          minWidth: 0,
                        }}
                      >
                        {opt.icon}
                        {opt.label}
                      </Link>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <button
            onClick={() => setVendaPickerOpen(v => !v)}
            className={`bottom-nav-item${pathname.startsWith("/dashboard/vendas") ? " active" : ""}`}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 4px 4px", width: "100%" }}
          >
            <span className="bottom-nav-icon"><ShoppingBag size={20} /></span>
            {!isXs && <span>Vendas</span>}
          </button>
        </div>
      </nav>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
