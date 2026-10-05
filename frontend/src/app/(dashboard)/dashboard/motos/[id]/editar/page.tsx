"use client";

import { useEffect, useState } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Save, Loader2, AlertCircle, Lightbulb, Bike } from "lucide-react";
import { vehiclesApi } from "@/lib/api";
import { mensagemErro } from "@/lib/erros";
import { Vehicle, VehicleStatus, FuelType, TransmissionType } from "@/types";
import { toast } from "@/lib/toast";
import {
  maskPhone, maskPlaca, maskRENAVAM, maskChassi,
  maskCurrency, parseCurrency, maskKM,
} from "@/lib/masks";
import { Select } from "@/components/Select";


const ACCENT = "#f97316";

// ─── Field Component ──────────────────────────────────────────────────────────
function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", marginBottom: 5 }}>
        {label} {required && <span style={{ color: "var(--error)" }}>*</span>}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11px", color: "var(--error)", marginTop: 3 }}>
            <AlertCircle size={10} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

type FormState = {
  marca: string; modelo: string; ano: string; cor: string;
  combustivel: FuelType; cambio: TransmissionType;
  quilometragem: string; placa: string; chassi: string; renavam: string;
  data_compra: string; vendedor_nome: string; vendedor_telefone: string;
  cilindrada: string; tipo_moto: string;
  valor_compra_display: string; valor_compra: number;
  valor_multas_display: string; valor_multas: number;
  valor_anunciado_display: string; valor_anunciado: number;
  valor_minimo_display: string; valor_minimo: number;
  status: VehicleStatus; observacoes: string;
};

export default function EditarMotoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const { isMobile } = useBreakpoint();

  const { data: vehicle, isLoading } = useQuery<Vehicle>({
    queryKey: ["vehicle", id],
    queryFn: () => vehiclesApi.get(id),
  });

  const [form, setForm] = useState<FormState>({
    marca: "", modelo: "", ano: "", cor: "",
    combustivel: "gasolina", cambio: "manual", quilometragem: "",
    placa: "", chassi: "", renavam: "", data_compra: "",
    vendedor_nome: "", vendedor_telefone: "",
    cilindrada: "", tipo_moto: "",
    valor_compra_display: "", valor_compra: 0,
    valor_multas_display: "", valor_multas: 0,
    valor_anunciado_display: "", valor_anunciado: 0,
    valor_minimo_display: "", valor_minimo: 0,
    status: "disponivel", observacoes: "",
  });

  // Populate form when vehicle loads
  useEffect(() => {
    if (!vehicle) return;
    const fmtVal = (v?: number) => v ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
    setForm({
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      ano: String(vehicle.ano),
      cor: vehicle.cor,
      combustivel: vehicle.combustivel,
      cambio: vehicle.cambio,
      quilometragem: vehicle.quilometragem.toLocaleString("pt-BR"),

      placa: vehicle.placa,
      chassi: vehicle.chassi,
      renavam: vehicle.renavam || "",
      data_compra: vehicle.data_compra,
      vendedor_nome: vehicle.vendedor_nome || "",
      vendedor_telefone: vehicle.vendedor_telefone ? maskPhone(vehicle.vendedor_telefone) : "",
      cilindrada: vehicle.cilindrada ? String(vehicle.cilindrada) : "",
      tipo_moto: vehicle.tipo_moto || "",
      valor_compra_display: fmtVal(vehicle.valor_compra),
      valor_compra: vehicle.valor_compra,
      valor_multas_display: fmtVal(vehicle.valor_multas),
      valor_multas: vehicle.valor_multas || 0,
      valor_anunciado_display: fmtVal(vehicle.valor_anunciado),
      valor_anunciado: vehicle.valor_anunciado || 0,
      valor_minimo_display: fmtVal(vehicle.valor_minimo),
      valor_minimo: vehicle.valor_minimo || 0,
      status: vehicle.status,
      observacoes: vehicle.observacoes || "",
    });
  }, [vehicle]);

  const mutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => vehiclesApi.update(id, data),
    onSuccess: () => {
      toast.success("Moto atualizada!");
      queryClient.invalidateQueries({ queryKey: ["vehicle", id] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-motos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      router.push(`/dashboard/motos/${id}`);
    },
    onError: (err: unknown) => {
      const msg = mensagemErro(err, "Erro ao salvar as alterações");
      toast.error(msg);
    },
  });

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors(er => ({ ...er, [field]: undefined }));
  };

  const setCurrency = (field: "valor_compra" | "valor_multas" | "valor_anunciado" | "valor_minimo") => (raw: string) => {
    const masked = maskCurrency(raw);
    setForm(f => ({ ...f, [`${field}_display`]: masked, [field]: parseCurrency(masked) }));
  };

  const validate = () => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.marca.trim()) errs.marca = "Obrigatório";
    if (!form.modelo.trim()) errs.modelo = "Obrigatório";
    const yr = parseInt(form.ano);
    if (!yr || yr < 1900 || yr > new Date().getFullYear() + 1) errs.ano = "Ano inválido";
    if (!form.cor.trim()) errs.cor = "Obrigatório";
    const km = parseInt(form.quilometragem.replace(/\./g, ""));

    if (isNaN(km) || km < 0) errs.quilometragem = "Quilometragem inválida";
    if (!form.placa.trim() || form.placa.length < 7) errs.placa = "Placa inválida";
    const chassi = form.chassi.replace(/\s/g, "");
    if (chassi.length !== 17) errs.chassi = "Chassi deve ter 17 caracteres";
    if (!form.data_compra) errs.data_compra = "Obrigatório";
    if (form.valor_compra < 0) errs.valor_compra_display = "Valor inválido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error("Corrija os erros antes de salvar"); return; }
    mutation.mutate({
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      ano: parseInt(form.ano),
      cor: form.cor.trim(),
      combustivel: form.combustivel,
      cambio: form.cambio,
      quilometragem: parseInt(form.quilometragem.replace(/\./g, "")),

      placa: form.placa.toUpperCase().replace(/[^A-Z0-9]/g, ""),
      chassi: form.chassi.toUpperCase().replace(/\s/g, ""),
      renavam: form.renavam.trim() || undefined,
      data_compra: form.data_compra,
      vendedor_nome: form.vendedor_nome.trim() || undefined,
      vendedor_telefone: form.vendedor_telefone.replace(/\D/g, "") || undefined,
      cilindrada: form.cilindrada ? parseInt(form.cilindrada) : undefined,
      tipo_moto: form.tipo_moto || undefined,
      valor_compra: form.valor_compra,
      valor_multas: form.valor_multas || undefined,
      valor_anunciado: form.valor_anunciado || undefined,
      valor_minimo: form.valor_minimo || undefined,
      status: form.status,
      observacoes: form.observacoes.trim() || undefined,
    });
  };

  const inp = (field: keyof FormState, extra?: object) => ({
    value: form[field] as string,
    onChange: set(field),
    className: "input",
    style: { borderColor: errors[field] ? "var(--error)" : undefined, fontSize: "13px", ...extra },
  });

  if (isLoading) {
    return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Array(4).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 80 }} />)}
    </div>;
  }

  const section = (title: string) => (
    <h3 style={{ fontSize: "13px", fontWeight: "600", color: ACCENT, marginBottom: 4, paddingBottom: 8, borderBottom: `1px solid var(--border)` }}>
      {title}
    </h3>
  );

  return (
    <div style={{ maxWidth: 740, margin: "0 auto" }}>
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={() => router.back()} className="btn btn-ghost" style={{ marginBottom: 20 }}
      >
        <ChevronLeft size={16} /> Voltar
      </motion.button>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "10px", background: `${ACCENT}18`, border: `1px solid ${ACCENT}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bike size={18} color={ACCENT} strokeWidth={1.8} />
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)" }}>
              Editar Moto
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: 2 }}>
              {vehicle?.marca} {vehicle?.modelo} - {vehicle?.placa}
            </p>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit}>
        {/* Dados Básicos */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="card" style={{ padding: isMobile ? 14 : 24, marginBottom: 16 }}>
          {section("Dados da Moto")}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 14, marginTop: 16 }}>
            <Field label="Marca" required error={errors.marca}><input placeholder="Honda" {...inp("marca")} /></Field>
            <Field label="Modelo" required error={errors.modelo}><input placeholder="CB 300" {...inp("modelo")} /></Field>
            <Field label="Ano" required error={errors.ano}>
              <input {...inp("ano")} inputMode="numeric" placeholder="2022"
                onChange={e => setForm(f => ({ ...f, ano: e.target.value.replace(/\D/g, "").slice(0, 4) }))} />
            </Field>
            <Field label="Cor" required error={errors.cor}><input placeholder="Preto Fosco" {...inp("cor")} /></Field>
            <Field label="Combustível" required error={errors.combustivel}>
              <Select
                value={form.combustivel}
                onChange={(v) => setForm(f => ({ ...f, combustivel: v as FuelType }))}
                error={!!errors.combustivel}
                options={[["gasolina","Gasolina"],["flex","Flex"],["eletrico","Elétrico"]].map(([v,l]) => ({ value: v, label: l }))}
              />
            </Field>
            <Field label="Câmbio" required error={errors.cambio}>
              <Select
                value={form.cambio}
                onChange={(v) => setForm(f => ({ ...f, cambio: v as TransmissionType }))}
                error={!!errors.cambio}
                options={[["manual","Manual"],["automatico","Automático"],["cvt","CVT"]].map(([v,l]) => ({ value: v, label: l }))}
              />
            </Field>
            <Field label="Cilindrada (cc)" error={errors.cilindrada}>
              <input {...inp("cilindrada")} inputMode="numeric" placeholder="300"
                onChange={e => setForm(f => ({ ...f, cilindrada: e.target.value.replace(/\D/g, "") }))} />
            </Field>
            <Field label="Tipo de Moto" error={errors.tipo_moto}>
              <Select
                value={form.tipo_moto || ""}
                onChange={(v) => setForm(f => ({ ...f, tipo_moto: v }))}
                placeholder="Selecionar..."
                options={[
                  { value: "", label: "Não informado" },
                  ...["Sport","Trail","Naked","Scooter","Chopper","Elétrica","Custom","Touring"].map(t => ({ value: t, label: t }))
                ]}
              />
            </Field>
            <Field label="Quilometragem" required error={errors.quilometragem}>
              <div style={{ position: "relative" }}>
                <input
                  inputMode="numeric"
                  placeholder="0"
                  className="input"
                  style={{ borderColor: errors.quilometragem ? "var(--error)" : undefined, fontSize: "13px" }}
                  value={form.quilometragem}
                  onChange={e => setForm(f => ({ ...f, quilometragem: maskKM(e.target.value) }))}
                />
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: "11.5px", color: "var(--text-muted)", fontWeight: 600 }}>km</span>
              </div>
            </Field>
            <Field label="Status" required>
              <Select
                value={form.status}
                onChange={(v) => setForm(f => ({ ...f, status: v as VehicleStatus }))}
                options={[
                  { value: "disponivel", label: "Disponível" },
                  { value: "reservado", label: "Reservado" },
                  { value: "em_preparacao", label: "Em Preparação" },
                  { value: "em_manutencao", label: "Em Manutenção" },
                  ...(vehicle?.status === "vendido" ? [{ value: "vendido", label: "Vendido" }] : []),
                ]}
              />
            </Field>
          </div>
        </motion.div>

        {/* Documentos */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="card" style={{ padding: isMobile ? 14 : 24, marginBottom: 16 }}>
          {section("Documentos & Compra")}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 14, marginTop: 16 }}>
            <Field label="Placa" required error={errors.placa}>
              <input {...inp("placa", { textTransform: "uppercase", letterSpacing: "0.1em" })}
                placeholder="ABC1D23"
                onChange={e => setForm(f => ({ ...f, placa: maskPlaca(e.target.value) }))} />
            </Field>
            <Field label="Chassi (17 caracteres)" required error={errors.chassi}>
              <input {...inp("chassi", { fontFamily: "monospace", textTransform: "uppercase" })}
                placeholder="9BWZZZ377VT004251" maxLength={17}
                onChange={e => setForm(f => ({ ...f, chassi: maskChassi(e.target.value) }))} />
            </Field>
            <Field label="RENAVAM" error={errors.renavam}>
              <input {...inp("renavam")} placeholder="Opcional" inputMode="numeric"
                onChange={e => setForm(f => ({ ...f, renavam: maskRENAVAM(e.target.value) }))} />
            </Field>
            <Field label="Data de Compra" required error={errors.data_compra}>
              <input type="date" {...inp("data_compra")} />
            </Field>
            <Field label="Nome do Antigo Dono" error={errors.vendedor_nome}>
              <input placeholder="Opcional" {...inp("vendedor_nome")} />
            </Field>
            <Field label="Telefone do Antigo Dono" error={errors.vendedor_telefone}>
              <input {...inp("vendedor_telefone")} placeholder="(00) 00000-0000" inputMode="tel"
                onChange={e => setForm(f => ({ ...f, vendedor_telefone: maskPhone(e.target.value) }))} />
            </Field>
            <div style={isMobile ? {} : { gridColumn: "span 2" }}>
              <Field label="Observações" error={errors.observacoes}>
                <textarea {...inp("observacoes")} rows={3} style={{ height: "auto", paddingTop: 8, fontSize: "13px" }} placeholder="Anotações sobre a moto..." />
              </Field>
            </div>
          </div>
        </motion.div>

        {/* Valores */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card" style={{ padding: isMobile ? 14 : 24, marginBottom: 16 }}>
          {section("Valores")}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 14, marginTop: 16 }}>
            <Field label="Valor de Compra (R$)" required error={errors.valor_compra_display}>
              <input value={form.valor_compra_display} inputMode="numeric" placeholder="0,00" className="input"
                style={{ fontSize: "13px", borderColor: errors.valor_compra_display ? "var(--error)" : undefined }}
                onChange={e => setCurrency("valor_compra")(e.target.value)} />
            </Field>
            <Field label="Multas no Documento (R$)" error={errors.valor_multas_display}>
              <input value={form.valor_multas_display} inputMode="numeric" placeholder="0,00" className="input"
                style={{ fontSize: "13px" }}
                onChange={e => setCurrency("valor_multas")(e.target.value)} />
            </Field>
            <Field label="Valor Anunciado (R$)" error={errors.valor_anunciado_display}>
              <input value={form.valor_anunciado_display} inputMode="numeric" placeholder="0,00" className="input"
                style={{ fontSize: "13px" }}
                onChange={e => setCurrency("valor_anunciado")(e.target.value)} />
            </Field>
            <Field label="Valor Mínimo (R$)" error={errors.valor_minimo_display}>
              <input value={form.valor_minimo_display} inputMode="numeric" placeholder="0,00" className="input"
                style={{ fontSize: "13px" }}
                onChange={e => setCurrency("valor_minimo")(e.target.value)} />
            </Field>
          </div>
          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius-md)",
            background: `${ACCENT}0c`, border: `1px solid ${ACCENT}22`,
            fontSize: "12px", color: ACCENT,
            display: "flex", alignItems: "flex-start", gap: "8px",
          }}>
            <Lightbulb size={13} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>O investimento total (compra + despesas) e lucro são calculados automaticamente.</span>
          </div>
        </motion.div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancelar</button>
          <motion.button type="submit" className="btn btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={mutation.isPending}
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #ea580c)` }}>
            {mutation.isPending
              ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</>
              : <><Save size={15} /> Salvar Alterações</>
            }
          </motion.button>
        </div>
      </form>
    </div>
  );
}
