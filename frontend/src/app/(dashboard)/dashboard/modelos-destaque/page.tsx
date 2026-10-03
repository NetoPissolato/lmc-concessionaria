"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Edit2, Check, X, Upload, Image as ImageIcon,
  ToggleLeft, ToggleRight, ChevronUp, ChevronDown, Star, AlertCircle,
  LayoutGrid,
} from "lucide-react";
import { modelosDestaqueApi, vehiclesApi } from "@/lib/api";
import { ModeloDestaque, CarroceriaType } from "@/types";
import { toast } from "@/lib/toast";

type BrandModel = { marca: string; modelo: string; tipo: string; carroceria: string | null };

// ─── Constantes ───────────────────────────────────────────────────────────────

const CARROCERIA_OPTIONS: { value: string; label: string }[] = [
  { value: "suv",         label: "SUV"           },
  { value: "hatch",       label: "Hatch"         },
  { value: "sedan",       label: "Sedã"          },
  { value: "picape",      label: "Picape"        },
  { value: "coupe",       label: "Cupê"          },
  { value: "minivan",     label: "Minivan"       },
  { value: "conversivel", label: "Conversível"   },
  { value: "perua",       label: "Perua / SW"    },
  { value: "van",         label: "Van / Utilitário" },
];

const CARROCERIA_LABELS: Record<string, string> = Object.fromEntries(
  CARROCERIA_OPTIONS.map(o => [o.value, o.label])
);

// ─── Empty Form State ─────────────────────────────────────────────────────────

interface ModeloForm {
  marca: string;
  modelo: string;
  carroceria: string;
  ativo: boolean;
}

const EMPTY_FORM: ModeloForm = { marca: "", modelo: "", carroceria: "suv", ativo: true };

// ─── Card de Modelo ───────────────────────────────────────────────────────────

function ModeloCard({
  item,
  index,
  total,
  onEdit,
  onDelete,
  onToggleAtivo,
  onUploadImagem,
  onRemoveImagem,
  onMoveUp,
  onMoveDown,
  uploading,
}: {
  item: ModeloDestaque;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAtivo: () => void;
  onUploadImagem: (file: File) => void;
  onRemoveImagem: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  uploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "var(--surface)",
        border: `1px solid ${item.ativo ? "var(--border)" : "rgba(255,255,255,0.04)"}`,
        borderRadius: 16,
        padding: "14px 16px",
        opacity: item.ativo ? 1 : 0.55,
        transition: "opacity 0.2s, border-color 0.2s",
      }}
    >
      {/* Imagem */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        style={{
          width: 88,
          height: 64,
          flexShrink: 0,
          borderRadius: 10,
          overflow: "hidden",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
        }}
      >
        {item.imagem_url ? (
          <>
            <img
              src={item.imagem_url}
              alt={`${item.marca} ${item.modelo}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.45)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0)")}
            >
              <Upload size={16} color="#fff" style={{ opacity: 0 }} />
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "var(--text-muted)" }}>
            {uploading ? (
              <div style={{ width: 18, height: 18, border: "2px solid var(--brand)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <>
                <ImageIcon size={18} />
                <span style={{ fontSize: 11.5, fontWeight: 600 }}>Adicionar</span>
              </>
            )}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onUploadImagem(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.marca} {item.modelo}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
            background: "var(--surface-2)", border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}>
            {CARROCERIA_LABELS[item.carroceria] ?? item.carroceria}
          </span>
          {item.imagem_url && (
            <button
              onClick={onRemoveImagem}
              title="Remover imagem"
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3,
              }}
            >
              <X size={10} /> Remover imagem
            </button>
          )}
        </div>
      </div>

      {/* Controles */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* Ordenação */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="md-icon-btn"
            style={{ opacity: index === 0 ? 0.3 : 1 }}
            title="Mover para cima"
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="md-icon-btn"
            style={{ opacity: index === total - 1 ? 0.3 : 1 }}
            title="Mover para baixo"
          >
            <ChevronDown size={13} />
          </button>
        </div>

        {/* Toggle ativo */}
        <button
          onClick={onToggleAtivo}
          title={item.ativo ? "Desativar" : "Ativar"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: item.ativo ? "var(--brand)" : "var(--text-muted)",
            display: "flex", alignItems: "center", padding: 4,
            transition: "color 0.15s",
          }}
        >
          {item.ativo ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
        </button>

        {/* Editar */}
        <button
          onClick={onEdit}
          className="md-icon-btn"
          title="Editar"
        >
          <Edit2 size={14} />
        </button>

        {/* Excluir */}
        <button
          onClick={onDelete}
          className="md-icon-btn"
          title="Excluir"
          style={{ color: "#ef4444" }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Modal Criar / Editar ─────────────────────────────────────────────────────

// Autocomplete input component
function AutocompleteField({
  label,
  required,
  value,
  onChange,
  suggestions,
  placeholder,
  autoFocus,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(value.toLowerCase()) && s !== value
  );
  const showList = open && value.length >= 1 && filtered.length > 0;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "var(--error)" }}>*</span>}
      </label>
      <input
        className="input"
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {showList && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, zIndex: 200, maxHeight: 200, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        }}>
          {filtered.slice(0, 12).map(s => (
            <button
              key={s}
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "9px 14px", background: "none", border: "none",
                cursor: "pointer", fontSize: 13, color: "var(--text-primary)",
                fontFamily: "inherit", borderBottom: "1px solid var(--border)",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeloModal({
  item,
  onClose,
  onSave,
  saving,
  stockData,
}: {
  item: ModeloDestaque | null;
  onClose: () => void;
  onSave: (data: ModeloForm) => void;
  saving: boolean;
  stockData: { marca: string; modelo: string; tipo: string; carroceria: string | null }[];
}) {
  const [form, setForm] = useState<ModeloForm>(
    item
      ? { marca: item.marca, modelo: item.modelo, carroceria: item.carroceria, ativo: item.ativo }
      : EMPTY_FORM
  );

  const isEditing = !!item;
  const valid = form.marca.trim() && form.modelo.trim() && form.carroceria;

  // Unique marcas from stock
  const marcas = [...new Set(stockData.map(d => d.marca))].sort();

  // Models filtered by current marca (or all if marca not set)
  const modelos = [...new Set(
    stockData
      .filter(d => !form.marca || d.marca.toLowerCase() === form.marca.toLowerCase())
      .map(d => d.modelo)
  )].sort();

  // When user selects marca from suggestions → clear modelo
  function handleMarcaChange(val: string) {
    const exactMatch = stockData.find(d => d.marca.toLowerCase() === val.toLowerCase());
    setForm(f => ({ ...f, marca: exactMatch ? exactMatch.marca : val, modelo: "" }));
  }

  // When user selects modelo → auto-fill carroceria if available
  function handleModeloChange(val: string) {
    const exactMatch = stockData.find(
      d => d.modelo.toLowerCase() === val.toLowerCase() &&
           (!form.marca || d.marca.toLowerCase() === form.marca.toLowerCase())
    );
    setForm(f => ({
      ...f,
      modelo: exactMatch ? exactMatch.modelo : val,
      ...(exactMatch?.carroceria ? { carroceria: exactMatch.carroceria } : {}),
    }));
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: 28,
          width: "100%",
          maxWidth: 460,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
            {isEditing ? "Editar modelo" : "Adicionar modelo"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        {stockData.length > 0 && (
          <div style={{ marginBottom: 16, padding: "8px 12px", borderRadius: 8, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={13} color="#22c55e" />
            {stockData.length} combinações do estoque disponíveis para autocompletar
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Marca com autocomplete */}
          <AutocompleteField
            label="Marca"
            required
            value={form.marca}
            onChange={handleMarcaChange}
            suggestions={marcas}
            placeholder="Ex: Honda, Toyota, Jeep..."
            autoFocus
          />

          {/* Modelo com autocomplete */}
          <AutocompleteField
            label="Modelo"
            required
            value={form.modelo}
            onChange={handleModeloChange}
            suggestions={modelos}
            placeholder="Ex: HR-V, Compass, Creta..."
          />

          {/* Carroceria */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>
              Categoria <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CARROCERIA_OPTIONS.map(opt => {
                const active = form.carroceria === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setForm(f => ({ ...f, carroceria: opt.value }))}
                    style={{
                      height: 32, padding: "0 12px", borderRadius: 8, cursor: "pointer",
                      fontSize: 12, fontWeight: active ? 700 : 500,
                      border: `1px solid ${active ? "var(--brand)" : "var(--border)"}`,
                      background: active ? "rgba(245,166,35,0.12)" : "var(--surface-2)",
                      color: active ? "var(--brand)" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {form.carroceria && (
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                Selecionado: <strong>{CARROCERIA_LABELS[form.carroceria]}</strong>
                {stockData.some(d => d.modelo.toLowerCase() === form.modelo.toLowerCase() && d.carroceria) &&
                  " (preenchido automaticamente do estoque)"}
              </p>
            )}
          </div>

          {/* Ativo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
              style={{ background: "none", border: "none", cursor: "pointer", color: form.ativo ? "var(--brand)" : "var(--text-muted)", display: "flex", padding: 0 }}
            >
              {form.ativo ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {form.ativo ? "Visível no site" : "Oculto no site"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
          <button
            onClick={() => valid && onSave(form)}
            disabled={!valid || saving}
            className="btn btn-primary"
            style={{ flex: 2, opacity: !valid || saving ? 0.5 : 1 }}
          >
            {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Adicionar modelo"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}


// ─── Página Principal ─────────────────────────────────────────────────────────

export default function ModelosDestaquePage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState<ModeloDestaque | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModeloDestaque | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { data: modelos = [], isLoading } = useQuery<ModeloDestaque[]>({
    queryKey: ["modelos-destaque-admin"],
    queryFn: () => modelosDestaqueApi.list(),
  });

  const { data: stockData = [] } = useQuery<BrandModel[]>({
    queryKey: ["vehicles-brands-models"],
    queryFn: () => vehiclesApi.brandsModels(),
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["modelos-destaque-admin"] });

  const createMut = useMutation({
    mutationFn: (data: ModeloForm) => modelosDestaqueApi.create({ ...data, ordem: modelos.length }),
    onSuccess: () => { toast.success("Modelo adicionado!"); invalidate(); setShowModal(false); },
    onError: () => toast.error("Erro ao adicionar modelo"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ModeloDestaque> }) =>
      modelosDestaqueApi.update(id, data as any),
    onSuccess: () => { toast.success("Modelo atualizado!"); invalidate(); setEditItem(null); },
    onError: () => toast.error("Erro ao atualizar modelo"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => modelosDestaqueApi.delete(id),
    onSuccess: () => { toast.success("Modelo removido"); invalidate(); setDeleteTarget(null); },
    onError: () => toast.error("Erro ao remover modelo"),
  });

  const handleUpload = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      await modelosDestaqueApi.uploadImagem(id, file);
      toast.success("Imagem atualizada!");
      invalidate();
    } catch {
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemoveImagem = async (id: string) => {
    try {
      await modelosDestaqueApi.removeImagem(id);
      toast.success("Imagem removida");
      invalidate();
    } catch {
      toast.error("Erro ao remover imagem");
    }
  };

  const handleMove = (index: number, dir: -1 | 1) => {
    const ordered = [...modelos].sort((a, b) => a.ordem - b.ordem);
    const target = ordered[index];
    const swap = ordered[index + dir];
    if (!target || !swap) return;
    Promise.all([
      modelosDestaqueApi.update(target.id, { ordem: swap.ordem }),
      modelosDestaqueApi.update(swap.id, { ordem: target.ordem }),
    ]).then(() => invalidate());
  };

  const sorted = [...modelos].sort((a, b) => a.ordem - b.ordem);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LayoutGrid size={18} color="var(--brand)" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Modelos em Destaque</h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 46 }}>
            Gerencie os modelos exibidos na seção "Modelos mais buscados" do site.
          </p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowModal(true); }}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: 7, height: 38, padding: "0 18px", fontSize: 13 }}
        >
          <Plus size={15} />
          Adicionar modelo
        </button>
      </motion.div>

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        style={{
          display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px",
          background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)",
          borderRadius: 12, marginBottom: 24,
        }}
      >
        <Star size={16} color="var(--brand)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 2 }}>Como funciona</p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Cada card aparece na home do site com as abas de categoria (SUV, Hatch, Sedã...). Ao clicar, o cliente vai direto para o estoque filtrado por aquele modelo.
            A imagem usa: foto que você enviou → foto do estoque → logo da marca.
          </p>
        </div>
      </motion.div>

      {/* Lista */}
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--text-muted)", flexDirection: "column", gap: 12 }}>
          <div style={{ width: 28, height: 28, border: "3px solid var(--brand)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <span style={{ fontSize: 13 }}>Carregando...</span>
        </div>
      ) : sorted.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: 280, gap: 16, textAlign: "center",
            background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 16,
          }}
        >
          <LayoutGrid size={40} color="var(--text-muted)" strokeWidth={1.2} />
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Nenhum modelo configurado</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Adicione os primeiros modelos que aparecerão na home do site.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 7, height: 38, padding: "0 20px", fontSize: 13 }}>
            <Plus size={15} /> Adicionar primeiro modelo
          </button>
        </motion.div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AnimatePresence mode="popLayout">
            {sorted.map((item, index) => (
              <ModeloCard
                key={item.id}
                item={item}
                index={index}
                total={sorted.length}
                uploading={uploadingId === item.id}
                onEdit={() => { setEditItem(item); setShowModal(true); }}
                onDelete={() => setDeleteTarget(item)}
                onToggleAtivo={() => updateMut.mutate({ id: item.id, data: { ativo: !item.ativo } })}
                onUploadImagem={file => handleUpload(item.id, file)}
                onRemoveImagem={() => handleRemoveImagem(item.id)}
                onMoveUp={() => handleMove(index, -1)}
                onMoveDown={() => handleMove(index, 1)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal criar/editar */}
      <AnimatePresence>
        {showModal && (
          <ModeloModal
            item={editItem}
            onClose={() => { setShowModal(false); setEditItem(null); }}
            saving={createMut.isPending || updateMut.isPending}
            stockData={stockData}
            onSave={data => {
              if (editItem) {
                updateMut.mutate({ id: editItem.id, data });
              } else {
                createMut.mutate(data);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal excluir */}
      <AnimatePresence>
        {deleteTarget && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            }}
            onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 20, padding: 28, maxWidth: 380, width: "100%", textAlign: "center",
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <AlertCircle size={24} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Remover modelo</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
                Remover <strong>{deleteTarget.marca} {deleteTarget.modelo}</strong> da seção de destaque? Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
                <button
                  onClick={() => deleteMut.mutate(deleteTarget.id)}
                  disabled={deleteMut.isPending}
                  className="btn"
                  style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", opacity: deleteMut.isPending ? 0.6 : 1 }}
                >
                  {deleteMut.isPending ? "Removendo..." : "Remover"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
