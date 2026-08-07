"use client";

import { useState, useRef, useEffect } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useBodyScrollLock } from "@/hooks/useModalScroll";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCog, Plus, Shield, User as UserIcon, X, Trash2,
  ToggleLeft, ToggleRight, Mail, Phone, Search,
  CheckCircle2, XCircle, Crown, Lock, Camera, ChevronLeft,
  ChevronRight, Edit3, Key, AlertTriangle, Eye, EyeOff,
  Clock, Calendar, AtSign, Check, Upload,
} from "lucide-react";
import { usersApi, authApi } from "@/lib/api";
import { toast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// --- Types --------------------------------------------------------------------
interface UserItem {
  id: string;
  nome: string;
  email: string;
  usuario: string | null;
  telefone: string | null;
  foto: string | null;
  role: "admin" | "funcionario";
  ativo: boolean;
  ultimo_login: string | null;
  created_at: string;
}

interface PaginatedUsers {
  items: UserItem[];
  total: number;
  skip: number;
  limit: number;
}

// --- Config -------------------------------------------------------------------
const ROLE_CONFIG = {
  admin:       { label: "Administrador", color: "#F5A623", bg: "rgba(245,166,35,0.10)",  icon: Crown    },
  funcionario: { label: "Funcionário",   color: "#38bdf8", bg: "rgba(56,189,248,0.10)",  icon: UserIcon },
};
const PER_PAGE = 10;
const BACKEND = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:8000";

function avatarUrl(foto: string | null, nome: string): string | null {
  if (!foto) return null;
  if (foto.startsWith("http")) return foto;
  return `${BACKEND}/uploads/${foto.replace(/^\/?(uploads\/)?/, "")}`;
}

function Avatar({ foto, nome, size = 40 }: { foto: string | null; nome: string; size?: number }) {
  const url = foto ? avatarUrl(foto, nome) : null;
  return (
    <div style={{
      width: size, height: size, borderRadius: "10px", flexShrink: 0, overflow: "hidden",
      background: "linear-gradient(135deg, #F5A623, #e8920e)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: "800", color: "#fff",
    }}>
      {url ? (
        <img src={url} alt={nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        nome?.[0]?.toUpperCase() ?? "?"
      )}
    </div>
  );
}

// --- Modal base ---------------------------------------------------------------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useBodyScrollLock(true);
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(6px)", zIndex: 60,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: "#131313", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px", width: "100%", maxWidth: "480px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#fff", margin: 0 }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                width: "28px", height: "28px", borderRadius: "8px",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <X size={13} />
            </button>
          </div>
          <div style={{ padding: "24px" }}>{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// --- Field --------------------------------------------------------------------
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{
        display: "block", fontSize: "11px", fontWeight: "600",
        color: "rgba(255,255,255,0.5)", marginBottom: "6px", letterSpacing: "0.04em",
      }}>
        {label} {required && <span style={{ color: "#F5A623" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px", padding: "9px 12px", fontSize: "13px", color: "#fff",
  outline: "none", boxSizing: "border-box",
};

// --- Password input -----------------------------------------------------------
function PasswordInput({ value, onChange, placeholder, id }: {
  value: string; onChange: (v: string) => void; placeholder?: string; id?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        id={id} type={show ? "text" : "password"} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...inp, paddingRight: "38px" }}
      />
      <button
        type="button" onClick={() => setShow(s => !s)}
        style={{
          position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.35)", padding: 0, margin: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "22px", height: "22px", lineHeight: 0,
        }}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

// --- Create/Edit Modal ------------------------------------------------------------------
function UserFormModal({ user, onClose }: { user?: UserItem; onClose: () => void }) {
  const isEdit = !!user;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { isMobile, isMobileOrTablet } = useBreakpoint();
  const [form, setForm] = useState({
    nome: user?.nome ?? "",
    email: user?.email ?? "",
    usuario: user?.usuario ?? "",
    senha: "",
    telefone: user?.telefone ?? "",
    role: (user?.role ?? "funcionario") as "admin" | "funcionario",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.foto ? avatarUrl(user.foto, user.nome) : null);
  const [loading, setLoading] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Nome obrigatório";
    if (!isEdit && !form.email.trim()) e.email = "Email obrigatório";
    if (!isEdit && !form.senha) e.senha = "Senha obrigatória";
    if (!isEdit && form.senha.length < 8) e.senha = "Mínimo 8 caracteres";
    return e;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto muito grande (máx 5 MB)"); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setErrs(errors); return; }
    setLoading(true);
    try {
      let savedUser: UserItem;
      if (isEdit) {
        const payload: Record<string, unknown> = { nome: form.nome, telefone: form.telefone || null };
        if (form.usuario) payload.usuario = form.usuario;
        savedUser = await usersApi.update(user!.id, payload);
        if (form.role !== user!.role) await usersApi.changeRole(user!.id, form.role);
      } else {
        const payload: Record<string, unknown> = {
          nome: form.nome, email: form.email, senha: form.senha,
          role: form.role, telefone: form.telefone || null,
        };
        if (form.usuario) payload.usuario = form.usuario;
        savedUser = await usersApi.create(payload) as UserItem;
      }
      // Upload avatar if selected
      if (avatarFile) {
        await usersApi.uploadAvatar(savedUser.id, avatarFile);
      }
      toast.success(isEdit ? "Funcionário atualizado" : "Funcionário criado com sucesso");
      qc.invalidateQueries({ queryKey: ["users"] });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.6)", marginBottom: "6px" };

  const iconField = (icon: React.ReactNode, field: React.ReactNode, err?: string) => (
    <div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.28)", display: "flex", alignItems: "center", pointerEvents: "none", zIndex: 1 }}>{icon}</div>
        {field}
      </div>
      {err && <p style={{ color: "#ef4444", fontSize: "11px", marginTop: 4 }}>{err}</p>}
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)", zIndex: 60, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? "0" : "16px" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.22 }} onClick={e => e.stopPropagation()}
          style={{ background: "#131313", border: "1px solid rgba(255,255,255,0.08)", borderRadius: isMobile ? "20px 20px 0 0" : "20px", width: "100%", maxWidth: isMobile ? "100%" : "660px", boxShadow: "0 28px 90px rgba(0,0,0,0.75)", maxHeight: isMobile ? "92dvh" : "90dvh", overflowY: "auto", overflowX: "hidden" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #F5A623, #e8920e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <UserCog size={20} color="#000" strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.3px" }}>{isEdit ? "Editar Funcionário" : "Novo Funcionário"}</h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: "2px 0 0" }}>{isEdit ? "Atualize as informações do funcionário" : "Preencha os dados do novo funcionário"}</p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)" }}>
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div style={{ padding: isMobileOrTablet ? "16px" : "24px" }}>

              {/* Foto + Campos - stack on mobile */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "156px 1fr", gap: 20, marginBottom: 20 }}>

                {/* Coluna esquerda: foto */}
                <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: 8, alignItems: isMobile ? "center" : "flex-start" }}>
                  <div style={{ position: "relative", width: isMobile ? 96 : 156, height: isMobile ? 96 : 156, borderRadius: 14, overflow: "hidden", background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                    {avatarPreview
                      ? <img src={avatarPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #F5A623, #e8920e)" }}>
                          <span style={{ fontSize: 52, fontWeight: 900, color: "#000" }}>{(form.nome || user?.nome || "?")[0]?.toUpperCase()}</span>
                        </div>
                    }
                    <button type="button" onClick={() => fileRef.current?.click()}
                      style={{ position: "absolute", bottom: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "#F5A623", border: "2px solid #131313", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Camera size={13} color="#000" />
                    </button>
                  </div>
                  <button type="button" onClick={() => fileRef.current?.click()}
                    style={{ width: isMobile ? "auto" : 156, flex: isMobile ? 1 : undefined, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600 }}>
                    <Upload size={12} /> Alterar foto
                  </button>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textAlign: "center", margin: 0, lineHeight: 1.6 }}>JPG, PNG ou WebP<br/>máx. 5 MB</p>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} style={{ display: "none" }} />
                </div>

                {/* Coluna direita: campos */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nome completo <span style={{ color: "#F5A623" }}>*</span></label>
                    {iconField(<UserIcon size={14} />,
                      <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: João Silva"
                        style={{ ...inp, paddingLeft: 36, borderColor: errs.nome ? "#ef4444" : "rgba(255,255,255,0.08)" }} />, errs.nome)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 190px), 1fr))", gap: 10 }}>
                    <div>
                      <label style={labelStyle}>E-mail {!isEdit && <span style={{ color: "#F5A623" }}>*</span>}</label>
                      {iconField(<Mail size={13} />,
                        <input type="email" value={form.email} disabled={isEdit} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com"
                          style={{ ...inp, paddingLeft: 34, opacity: isEdit ? 0.5 : 1, borderColor: errs.email ? "#ef4444" : "rgba(255,255,255,0.08)" }} />, errs.email)}
                    </div>
                    <div>
                      <label style={labelStyle}>Nome de usuário</label>
                      {iconField(<AtSign size={13} />,
                        <input value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value.toLowerCase() }))} placeholder="Ex: joao.silva"
                          style={{ ...inp, paddingLeft: 34 }} />)}
                    </div>
                  </div>
                  {!isEdit && (
                    <div>
                      <label style={labelStyle}>Senha <span style={{ color: "#F5A623" }}>*</span></label>
                      <PasswordInput value={form.senha} onChange={v => setForm(f => ({ ...f, senha: v }))} placeholder="Mínimo 8 caracteres" />
                      {errs.senha && <p style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{errs.senha}</p>}
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 190px), 1fr))", gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Telefone</label>
                      {iconField(<Phone size={13} />,
                        <input value={form.telefone} maxLength={15}
                          onChange={e => { const d = e.target.value.replace(/\D/g, "").slice(0,11); let m=d; if(d.length>0)m=`(${d.slice(0,2)}`; if(d.length>2)m+=`) ${d.slice(2,7)}`; if(d.length>7)m+=`-${d.slice(7,11)}`; setForm(f=>({...f,telefone:m})); }}
                          placeholder="(11) 99999-9999" style={{ ...inp, paddingLeft: 34 }} />)}
                    </div>
                    <div>
                      <label style={labelStyle}>Perfil de acesso</label>
                      <div style={{ position: "relative" }}>
                        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.28)", display: "flex", pointerEvents: "none", zIndex: 1 }}><Shield size={13} /></div>
                        <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as "admin" | "funcionario" }))}
                          style={{ ...inp, paddingLeft: 34, paddingRight: 34, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
                          <option value="funcionario">Funcionário</option>
                          <option value="admin">Administrador</option>
                        </select>
                        <ChevronRight size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissões card */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, background: "rgba(245,166,35,0.04)", border: "1px solid rgba(245,166,35,0.12)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Shield size={18} color="#F5A623" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Permissões de acesso</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", margin: "2px 0 0" }}>
                    {form.role === "admin" ? "Este perfil tem acesso total ao sistema." : "Este perfil possui acesso limitado às áreas do sistema."}
                  </p>
                </div>

              </div>

              {form.role === "admin" && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.15)", borderRadius: 10, marginTop: 10 }}>
                  <AlertTriangle size={14} color="#F5A623" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 11, color: "rgba(245,166,35,0.9)", lineHeight: 1.5, margin: 0 }}>Administradores têm acesso total ao sistema, incluindo dados financeiros e gerenciamento de usuários.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: isMobileOrTablet ? "14px 16px" : "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
              <button type="button" onClick={onClose}
                style={{ padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", color: "rgba(255,255,255,0.65)", flex: isMobile ? 1 : undefined }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 800, background: "linear-gradient(135deg, #F5A623, #e8920e)", color: "#000", border: "none", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar funcionário"}
                {!loading && <Check size={14} strokeWidth={2.5} />}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// --- Change Password Modal ----------------------------------------------------
function ChangePasswordModal({ user, onClose }: { user: UserItem; onClose: () => void }) {
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) { toast.error("Senha deve ter no mínimo 8 caracteres"); return; }
    setLoading(true);
    try {
      await usersApi.adminChangePassword(user.id, senha);
      toast.success(`Senha de ${user.nome} alterada com sucesso`);
      onClose();
    } catch {
      toast.error("Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Alterar senha "” ${user.nome}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{
          display: "flex", gap: "10px", padding: "12px", marginBottom: "16px",
          background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.12)",
          borderRadius: "10px",
        }}>
          <Lock size={14} color="#38bdf8" style={{ flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.5 }}>
            Como administrador, você pode definir uma nova senha sem precisar da senha atual.
          </p>
        </div>
        <Field label="Nova senha" required>
          <PasswordInput value={senha} onChange={setSenha} placeholder="Mínimo 8 caracteres" />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} style={{ padding: "9px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", background: "#38bdf8", border: "none", cursor: loading ? "wait" : "pointer", color: "#000", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Alterando…" : "Definir nova senha"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// --- Main page ----------------------------------------------------------------
export default function UsuariosPage() {
  const router = useRouter();
  const qc = useQueryClient();

  // Guard: redirect if not admin
  const me = authApi.getUser();
  if (me && me.role !== "admin") {
    router.replace("/dashboard");
    return null;
  }

  const [page, setPage]         = useState(0);
  const [search, setSearch]     = useState("");
  const [ativo, setAtivo]       = useState<boolean | undefined>(undefined);
  const [showCreate, setShowCreate]   = useState(false);
  const [editUser, setEditUser]       = useState<UserItem | null>(null);
  const [pwdUser, setPwdUser]         = useState<UserItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserItem | null>(null);

  const { data, isLoading } = useQuery<PaginatedUsers>({
    queryKey: ["users", page, search, ativo],
    queryFn: () => usersApi.list({ skip: page * PER_PAGE, limit: PER_PAGE, search, ativo }),
    placeholderData: (prev) => prev,
  });

  const users   = data?.items ?? [];
  const total   = data?.total ?? 0;
  const pages   = Math.ceil(total / PER_PAGE);

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => usersApi.update(id, { ativo }),
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["users"] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { toast.success("Funcionário excluído"); qc.invalidateQueries({ queryKey: ["users"] }); setConfirmDelete(null); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Erro ao excluir"),
  });

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  // Admin sempre primeiro
  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === "admin" && b.role !== "admin") return -1;
    if (b.role === "admin" && a.role !== "admin") return 1;
    return 0;
  });

  const { isMobile, isMobileOrTablet } = useBreakpoint();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobileOrTablet ? 14 : 20 }}>

      {/* -- Hero Banner ------------------------------------ */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        style={{ position: "relative", borderRadius: "20px", overflow: "hidden", height: "clamp(120px, 18vw, 200px)", background: "#060606", border: "1px solid rgba(245,166,35,0.15)" }}>
        <img src="/BANNERHERO.png" alt="Banner" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center right", opacity: 0.55 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(6,6,6,0.97) 30%, rgba(6,6,6,0.5) 70%, rgba(6,6,6,0.15) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(245,166,35,0.06) 0%, transparent 50%)" }} />
        <div style={{ position: "relative", zIndex: 1, padding: "clamp(16px,4vw,32px) clamp(16px,4vw,36px)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <UserCog size={13} color="#F5A623" strokeWidth={2} />
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#F5A623", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>Gestão de Equipe</p>
            </div>
            <h1 style={{ fontSize: "clamp(16px, 3.5vw, 26px)", fontWeight: "900", color: "#fff", letterSpacing: "-0.8px", lineHeight: 1.15, margin: 0 }}>
              Funcionários & <span style={{ color: "#F5A623" }}>Permissões</span>
            </h1>
          </div>
          <div className="hero-chips">
            {([
              { icon: UserCog,      text: `${total} cadastrado${total !== 1 ? "s" : ""}` },
              { icon: Crown,        text: `${users.filter(u => u.role === "admin").length} administrador${users.filter(u => u.role === "admin").length !== 1 ? "es" : ""}` },
              { icon: CheckCircle2, text: `${users.filter(u => u.ativo).length} ativo${users.filter(u => u.ativo).length !== 1 ? "s" : ""}` },
            ] as { icon: React.ElementType; text: string }[]).map(({ icon: Ic, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic size={13} color="#F5A623" strokeWidth={2} />
                </div>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", fontWeight: "600" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(true)}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 2, display: "flex", alignItems: "center", gap: isMobile ? 0 : 8, background: "linear-gradient(135deg, #F5A623, #e8920e)", color: "#000", border: "none", borderRadius: 12, padding: isMobile ? "10px" : "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 800, boxShadow: "0 4px 20px rgba(245,166,35,0.4)", letterSpacing: "-0.2px" }}>
          <Plus size={15} strokeWidth={2.5} />
          {!isMobile && <span style={{ marginLeft: 4 }}>Novo Funcionário</span>}
        </motion.button>
      </motion.div>

      {/* -- Busca ------------------------------------------ */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} style={{ position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Buscar por nome, e-mail ou usuário…" className="input" style={{ paddingLeft: 42, height: 42 }} />
        {search && (
          <button onClick={() => setSearch("")}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 0 }}>
            <X size={13} />
          </button>
        )}
      </motion.div>

      {/* -- Grid de cards ---------------------------------- */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: isMobileOrTablet ? 10 : 14 }}>
          {Array(4).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 230 }} />)}
        </div>
      ) : sortedUsers.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserCog size={26} color="#a78bfa" />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)" }}>
              {search ? "Nenhum funcionário encontrado" : "Nenhum funcionário cadastrado"}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 5 }}>
              {search ? `Sem resultados para "${search}"` : "Cadastre seu primeiro funcionário para começar"}
            </p>
          </div>
        </motion.div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: isMobileOrTablet ? 10 : 14 }}>
          {sortedUsers.map((u, i) => {
            const rc = ROLE_CONFIG[u.role];
            const RoleIcon = rc.icon;
            const isSelf = u.id === me?.id;
            const isAdm = u.role === "admin";
            return (
              <motion.div key={u.id}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${isAdm ? "rgba(245,166,35,0.22)" : "var(--border)"}`,
                  borderRadius: 18, overflow: "hidden",
                  opacity: u.ativo ? 1 : 0.6,
                  boxShadow: isAdm ? "0 0 0 1px rgba(245,166,35,0.07), 0 4px 24px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.2)",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${rc.color}45`; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 10px 36px rgba(0,0,0,0.4), 0 0 0 1px ${rc.color}22`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = isAdm ? "rgba(245,166,35,0.22)" : "var(--border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = isAdm ? "0 0 0 1px rgba(245,166,35,0.07), 0 4px 24px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.2)"; }}
              >
                {/* Faixa colorida topo */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${rc.color}, ${rc.color}50, transparent)` }} />

                <div style={{ padding: "18px 20px 0" }}>
                  {/* Linha superior: avatar + info + status */}
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ border: `2px solid ${rc.color}35`, borderRadius: 14 }}>
                        <Avatar foto={u.foto} nome={u.nome} size={58} />
                      </div>
                      {isAdm && (
                        <div style={{ position: "absolute", bottom: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg, #F5A623, #e8920e)", border: "2px solid var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Crown size={9} color="#000" />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nome}</p>
                        {isSelf && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", padding: "1px 6px", borderRadius: 99, flexShrink: 0 }}>você</span>
                        )}
                      </div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: rc.color, background: rc.bg, border: `1px solid ${rc.color}22`, padding: "3px 8px", borderRadius: 99 }}>
                        <RoleIcon size={9} /> {rc.label}
                      </span>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: u.ativo ? "#22c55e" : "#ef4444", background: u.ativo ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${u.ativo ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`, padding: "3px 8px", borderRadius: 99, flexShrink: 0 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: u.ativo ? "#22c55e" : "#ef4444" }} />
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  {/* Contato */}
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 5 }}>
                    {u.telefone && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                        <Phone size={11} strokeWidth={1.8} /><span>{u.telefone}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                      <Mail size={11} strokeWidth={1.8} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</span>
                    </div>
                  </div>

                  {/* Permissões + data */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 1fr))", gap: 12, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <div>
                      <p style={{ fontSize: 8.5, fontWeight: 800, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 5px" }}>Permissões</p>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: rc.color, background: rc.bg, border: `1px solid ${rc.color}22`, padding: "3px 9px", borderRadius: 99 }}>
                        <RoleIcon size={9} /> {rc.label}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: 8.5, fontWeight: 800, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 5px" }}>Membro desde</p>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{fmtDate(u.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Rodapé "” botões de ação */}
                <div style={{ padding: "12px 16px", marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => setEditUser(u)}
                    style={{ flex: 1, height: 34, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(167,139,250,0.08)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(167,139,250,0.25)"; (e.currentTarget as HTMLButtonElement).style.color = "#a78bfa"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)"; }}>
                    <UserIcon size={12} /> Ver detalhes
                  </button>
                  <button onClick={() => setEditUser(u)} title="Editar"
                    style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.18)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(56,189,248,0.16)"}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(56,189,248,0.07)"}>
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => setPwdUser(u)} title="Alterar senha"
                    style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.18)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(167,139,250,0.16)"}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(167,139,250,0.07)"}>
                    <Key size={13} />
                  </button>
                  {!isSelf && u.role !== "admin" && (
                    <button onClick={() => setConfirmDelete(u)} title="Excluir"
                      style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.16)"}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.07)"}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* -- Paginação --------------------------------------- */}
      {pages > 1 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Mostrando {page * PER_PAGE + 1} a {Math.min((page + 1) * PER_PAGE, total)} de {total} funcionários
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <PagBtn disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></PagBtn>
            {Array.from({ length: pages }, (_, i) => (
              <PagBtn key={i} active={i === page} onClick={() => setPage(i)}>{i + 1}</PagBtn>
            ))}
            <PagBtn disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></PagBtn>
          </div>
        </div>
      )}

      {/* Modais */}
      {showCreate && <UserFormModal onClose={() => setShowCreate(false)} />}
      {editUser   && <UserFormModal user={editUser} onClose={() => setEditUser(null)} />}
      {pwdUser    && <ChangePasswordModal user={pwdUser} onClose={() => setPwdUser(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          open={true}
          title="Excluir funcionário"
          description={`Tem certeza que deseja excluir ${confirmDelete.nome}? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir" variant="danger"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
// --- Action button ------------------------------------------------------------
function ActionBtn({ children, title, onClick, color, alwaysColored }: {
  children?: React.ReactNode; title: string; onClick: () => void; color: string; alwaysColored?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: "28px", height: "28px", borderRadius: "8px",
        background: alwaysColored ? `${color}12` : "rgba(255,255,255,0.04)",
        border: `1px solid ${alwaysColored ? `${color}30` : "rgba(255,255,255,0.07)"}`,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        color: alwaysColored ? color : "rgba(255,255,255,0.35)", transition: "all 0.15s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = `${color}22`;
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}50`;
        (e.currentTarget as HTMLButtonElement).style.color = color;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = alwaysColored ? `${color}12` : "rgba(255,255,255,0.04)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = alwaysColored ? `${color}30` : "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLButtonElement).style.color = alwaysColored ? color : "rgba(255,255,255,0.35)";
      }}
    >
      {children ?? <Trash2 size={12} />}
    </button>
  );
}

// --- Pagination button --------------------------------------------------------
function PagBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: "28px", height: "28px", padding: "0 6px", borderRadius: "7px",
        fontSize: "11px", fontWeight: "700",
        background: active ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? "rgba(245,166,35,0.3)" : "rgba(255,255,255,0.07)"}`,
        color: active ? "#F5A623" : disabled ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}



