"use client";

import { useState, useEffect } from "react";

import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Bike, FileText, DollarSign, Check, Loader2, AlertCircle, Lightbulb, ImagePlus, Trash2, Star, Upload } from "lucide-react";
import { vehiclesApi } from "@/lib/api";
import { toast } from "@/lib/toast";
import { maskPhone, maskPlaca, maskChassi, maskRENAVAM, validatePlaca, maskCurrency, parseCurrency, maskKM } from "@/lib/masks";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import { Select } from "@/components/Select";
import { useFIPE } from "@/hooks/useFIPE";

// ?"--? Schema ?"------------------------------------------------------------------?
const motoSchema = z.object({
  marca:             z.string().min(1, "Marca obrigatória"),
  modelo:            z.string().min(1, "Modelo obrigatório"),
  ano:               z.number({ coerce: true, invalid_type_error: "Ano inválido" }).min(1900, "Ano mínimo: 1900").max(new Date().getFullYear() + 1, `Ano máximo: ${new Date().getFullYear() + 1}`),
  cor:               z.string().min(1, "Cor obrigatória"),
  combustivel:       z.enum(["flex", "gasolina", "eletrico"], { errorMap: () => ({ message: "Selecione o combustível" }) }),
  cambio:            z.enum(["manual", "automatico", "cvt"], { errorMap: () => ({ message: "Selecione o câmbio" }) }),
  quilometragem:     z.number({ coerce: true, invalid_type_error: "Quilometragem inválida" }).min(0, "Quilometragem não pode ser negativa"),
  cilindrada:        z.number({ coerce: true, invalid_type_error: "Cilindrada inválida" }).min(50, "Mín. 50cc").max(2500, "Máx. 2500cc").optional(),
  tipo_moto:         z.string().optional(),
  placa:             z.string().min(7, "Placa inválida - mín. 7 caracteres").max(8).refine(v => validatePlaca(v), "Formato inválido (ex: ABC1D23)"),
  chassi:            z.string().length(17, "Chassi deve ter exatamente 17 caracteres"),
  renavam:           z.string().max(11).optional(),
  valor_compra:      z.number({ coerce: true, invalid_type_error: "Valor inválido" }).min(0, "Valor não pode ser negativo"),
  valor_multas:      z.preprocess(v => (v === "" || v === undefined || v === null || (typeof v === 'number' && isNaN(v as number))) ? 0 : Number(v), z.number().min(0)).optional(),
  data_compra:       z.string().min(1, "Data de compra obrigatória"),
  vendedor_nome:     z.string().optional(),
  vendedor_telefone: z.string().optional(),
  valor_anunciado:   z.number({ coerce: true, invalid_type_error: "Valor inválido" }).optional(),
  valor_minimo:      z.number({ coerce: true, invalid_type_error: "Valor inválido" }).optional(),
  observacoes:       z.string().optional(),
});

type MotoFormData = z.infer<typeof motoSchema>;

// ?"--? Steps ?"-------------------------------------------------------------------?
const STEPS = [
  { title: "Dados da Moto", icon: Bike,       description: "Identificação e características" },
  { title: "Documentação",  icon: FileText,   description: "Origem e documentos" },
  { title: "Valores",       icon: DollarSign, description: "Preços e margem" },
  { title: "Fotos",         icon: ImagePlus,  description: "Imagens da moto" },
];

const TIPOS_MOTO = ["Sport", "Trail", "Naked", "Scooter", "Chopper", "Elétra", "Custom", "Touring"];

// ?"--? Field Component ?"---------------------------------------------------------?
function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "6px" }}>
        {label} {required && <span style={{ color: "var(--error)" }}>*</span>}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--error)", marginTop: "4px" }}>
            <AlertCircle size={11} />{error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ?"--? Nova Moto Form ?"----------------------------------------------------------?
export default function NovaMotoPage() {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep]                 = useState(0);
  const { isMobile } = useBreakpoint();

  // Auto-scroll to top on every step change (mobile/tablet UX)
  useEffect(() => {
    const main = document.getElementById("dash-main");
    if (main) main.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const [createdMotoId, setCreatedMotoId] = useState<string | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ id: string; url: string; is_main: boolean }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [dragOver, setDragOver]           = useState(false);

  const { register, trigger, setValue, watch, getValues, formState: { errors } } = useForm<MotoFormData>({
    resolver: zodResolver(motoSchema) as any,
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      quilometragem: 0,
      combustivel:   "gasolina",
      cambio:        "manual",
      data_compra:   new Date().toISOString().split("T")[0],
    },
  });

  const { marcas, modelos, marcaLoad, modeloLoad, loadModelos } = useFIPE("motos");

  const watchMarca      = watch("marca", "");
  const watchModelo     = watch("modelo", "");
  const watchPlaca      = watch("placa", "");
  const watchChassi     = watch("chassi", "");
  const watchCilindrada = watch("cilindrada");

  // Displays formatados
  const [kmDisplay,             setKmDisplay]             = useState("");
  const [valorCompraDisplay,    setValorCompraDisplay]    = useState("");
  const [valorMultasDisplay,    setValorMultasDisplay]    = useState("");
  const [valorAnunciadoDisplay, setValorAnunciadoDisplay] = useState("");
  const [valorMinimoDisplay,    setValorMinimoDisplay]    = useState("");

  const handleKM = (raw: string) => {
    const m = maskKM(raw);
    setKmDisplay(m);
    setValue("quilometragem", parseInt(m.replace(/\./g, "") || "0"), { shouldValidate: true });
  };

  const handleMoney = (raw: string, setDisplay: (v: string) => void, field: keyof MotoFormData) => {
    const m = maskCurrency(raw);
    setDisplay(m);
    setValue(field as "valor_compra", parseCurrency(m), { shouldValidate: true });
  };

  // Mutation
  const mutation = useMutation({
    mutationFn: (data: MotoFormData) => vehiclesApi.create({ ...data, tipo: "moto" }),
    onSuccess: (created: { id: string }) => {
      toast.success("Moto cadastrada! Agora adicione as fotos.");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setCreatedMotoId(created.id);
      setStep(3);
    },
    onError: (err: unknown) => {
      console.error("[Cadastro moto erro]", err);
      const resp = (err as { response?: { data?: { detail?: unknown } } })?.response?.data;
      let msg = "Erro ao cadastrar moto";
      if (resp?.detail) {
        if (typeof resp.detail === "string") msg = resp.detail;
        else if (Array.isArray(resp.detail)) msg = resp.detail.map((e: { msg?: string }) => e.msg).join(", ");
        else msg = JSON.stringify(resp.detail);
      }
      toast.error(msg);
    },
  });

  // ?"--? Step submit (Valores) ?"--------------------------------------------------?
  const onSubmitStep2 = async () => {
    const valid = await trigger(["valor_compra"]);
    if (!valid) return;
    const raw = getValues();
    const data: MotoFormData = {
      ...raw,
      quilometragem:   Number(raw.quilometragem)  || 0,
      valor_compra:    Number(raw.valor_compra)   || 0,
      valor_multas:    Number(raw.valor_multas)   || 0,
      valor_anunciado: raw.valor_anunciado ? Number(raw.valor_anunciado) : undefined,
      valor_minimo:    raw.valor_minimo    ? Number(raw.valor_minimo)    : undefined,
    };
    mutation.mutate(data);
  };

  // ?"--? Photo handlers ?"---------------------------------------------------------?
  const handleUploadPhoto = async (file: File) => {
    if (!createdMotoId) return;
    if (!file.type.startsWith("image/")) { toast.error("Apenas imagens são permitidas"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 8MB)"); return; }
    setUploadingPhoto(true);
    try {
      const photo = await vehiclesApi.uploadPhoto(createdMotoId, file);
      setUploadedPhotos(prev => [...prev, photo]);
    } catch { toast.error("Erro ao enviar foto"); }
    finally { setUploadingPhoto(false); }
  };

  const handleSetMain = async (photoId: string) => {
    if (!createdMotoId) return;
    await vehiclesApi.setMainPhoto(createdMotoId, photoId);
    setUploadedPhotos(prev => prev.map(p => ({ ...p, is_main: p.id === photoId })));
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!createdMotoId) return;
    await vehiclesApi.deletePhoto(createdMotoId, photoId);
    setUploadedPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(handleUploadPhoto);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    Array.from(e.dataTransfer.files).forEach(handleUploadPhoto);
  };

  // ?"--? Next step ?"--------------------------------------------------------------?
  const nextStep = async () => {
    const fieldsPerStep: (keyof MotoFormData)[][] = [
      ["marca", "modelo", "ano", "cor", "combustivel", "cambio", "quilometragem"],
      ["placa", "chassi", "data_compra"],
      ["valor_compra"],
    ];
    if (step < 3) {
      const valid = await trigger(fieldsPerStep[step]);
      if (valid) setStep(s => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const inputStyle = (field: string) => ({
    borderColor: errors[field as keyof MotoFormData] ? "var(--error)" : undefined,
  });

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      {/* Back */}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={() => router.back()} className="btn btn-ghost" style={{ marginBottom: "20px" }}>
        <ChevronLeft size={16} /> Voltar
      </motion.button>

      {/* Title */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bike size={18} color="#f97316" />
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)" }}>Cadastrar Moto</h1>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "46px" }}>Preencha os dados da nova moto</p>
      </motion.div>

      {/* Step Indicator */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ display: "flex", gap: "0", marginBottom: "28px" }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone   = i < step;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {i > 0 && <div style={{ position: "absolute", left: 0, top: "15px", right: "50%", height: "2px", background: isDone ? "#f97316" : "var(--border)", transition: "background 0.3s ease" }} />}
              {i < STEPS.length - 1 && <div style={{ position: "absolute", left: "50%", top: "15px", right: 0, height: "2px", background: i < step ? "#f97316" : "var(--border)", transition: "background 0.3s ease" }} />}
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: isDone ? "#f97316" : isActive ? "rgba(249,115,22,0.12)" : "var(--surface-3)", border: `2px solid ${isDone || isActive ? "#f97316" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, transition: "all 0.3s ease" }}>
                {isDone ? <Check size={14} color="#fff" /> : <Icon size={14} color={isActive ? "#f97316" : "var(--text-muted)"} />}
              </div>
              <p style={{ fontSize: "11px", fontWeight: isActive ? "600" : "400", color: isActive ? "#f97316" : "var(--text-muted)", marginTop: "6px", textAlign: "center" }}>{s.title}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Form */}
      <form onSubmit={e => e.preventDefault()} className="veiculo-form">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
            className="card form-card-scrollable"
            style={{ padding: isMobile ? "16px" : "28px" }}>

            {step === 0 && (
              <div className="form-grid-auto">
                <Field label="Marca" required error={errors.marca?.message}>
                  <AutocompleteInput
                    value={watchMarca} options={marcas} loading={marcaLoad}
                    placeholder="Ex: Honda, Yamaha..." error={!!errors.marca}
                    onChange={v => setValue("marca", v, { shouldValidate: true })}
                    onSelect={v => { setValue("marca", v, { shouldValidate: true }); setValue("modelo", "", { shouldValidate: false }); loadModelos(v); }}
                  />
                </Field>
                <Field label="Modelo" required error={errors.modelo?.message}>
                  <AutocompleteInput
                    value={watchModelo} options={modelos} loading={modeloLoad}
                    placeholder={watchMarca ? "Ex: CB 500, MT-07..." : "Selecione a marca primeiro"} error={!!errors.modelo}
                    onChange={v => setValue("modelo", v, { shouldValidate: true })}
                    onSelect={v => setValue("modelo", v, { shouldValidate: true })}
                  />
                </Field>
                <Field label="Ano" required error={errors.ano?.message}>
                  <input type="number" placeholder="2020" className="input" {...register("ano", { valueAsNumber: true })} />
                </Field>
                <Field label="Cor" required error={errors.cor?.message}>
                  <input placeholder="Ex: Vermelha Metálica" className="input" {...register("cor")} />
                </Field>
                <Field label="Combustível" required error={errors.combustivel?.message}>
                  <Select
                    value={watch("combustivel") || ""}
                    onChange={(v) => setValue("combustivel", v as "flex" | "gasolina" | "eletrico", { shouldValidate: true })}
                    placeholder="Selecionar..."
                    error={!!errors.combustivel}
                    options={[
                      { value: "gasolina", label: "Gasolina" },
                      { value: "flex", label: "Flex" },
                      { value: "eletrico", label: "Elétrico" },
                    ]}
                  />
                </Field>
                <Field label="Câmbio" required error={errors.cambio?.message}>
                  <Select
                    value={watch("cambio") || ""}
                    onChange={(v) => setValue("cambio", v as "manual" | "automatico" | "cvt", { shouldValidate: true })}
                    placeholder="Selecionar..."
                    error={!!errors.cambio}
                    options={[
                      { value: "manual", label: "Manual" },
                      { value: "automatico", label: "Automático" },
                      { value: "cvt", label: "CVT" },
                    ]}
                  />
                </Field>
                <Field label="Quilometragem" required error={errors.quilometragem?.message}>
                  <div style={{ position: "relative" }}>
                    <input inputMode="numeric" placeholder="0" className="input" value={kmDisplay} onChange={e => handleKM(e.target.value)} />
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>km</span>
                  </div>
                </Field>
                <Field label="Cilindrada (cc)" error={errors.cilindrada?.message}>
                  <input type="number" placeholder="Ex: 300" className="input" {...register("cilindrada", { valueAsNumber: true })} />
                </Field>
                <div style={isMobile ? {} : { gridColumn: "span 2" }}>
                  <Field label="Tipo de Moto" error={errors.tipo_moto?.message}>
                    <Select
                      value={watch("tipo_moto") || ""}
                      onChange={(v) => setValue("tipo_moto", v, { shouldValidate: true })}
                      placeholder="Selecionar..."
                      options={[
                        { value: "", label: "Não informado" },
                        ...TIPOS_MOTO.map(t => ({ value: t, label: t }))
                      ]}
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* ?"--? Step 2: Documentação ?"--? */}
            {step === 1 && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: "16px" }}>
                <Field label="Placa" required error={errors.placa?.message}>
                  <div style={{ position: "relative" }}>
                    <input className="input" style={{ textTransform: "uppercase", letterSpacing: "0.12em", ...inputStyle("placa") }}
                      placeholder="ABC1D23" maxLength={8} value={watchPlaca}
                      onChange={e => setValue("placa", maskPlaca(e.target.value), { shouldValidate: true })} />
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: "10px", color: "var(--text-muted)" }}>
                      {(watchPlaca || "").replace(/[^A-Z0-9]/gi, "").length}/7
                    </span>
                  </div>
                </Field>
                <Field label="Chassi (17 caracteres)" required error={errors.chassi?.message}>
                  <div style={{ position: "relative" }}>
                    <input className="input" style={{ textTransform: "uppercase", fontFamily: "monospace", letterSpacing: "0.05em", paddingRight: 40, ...inputStyle("chassi") }}
                      placeholder="9BWZZZ377VT004251" maxLength={17} value={watchChassi}
                      onChange={e => setValue("chassi", maskChassi(e.target.value), { shouldValidate: true })} />
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: "10px",
                      color: (watchChassi || "").length === 17 ? "#10b981" : "var(--text-muted)", fontWeight: 600 }}>
                      {(watchChassi || "").length}/17
                    </span>
                  </div>
                </Field>
                <Field label="RENAVAM" error={errors.renavam?.message}>
                  <input className="input" placeholder="Opcional (9 ou 11 dígitos)" inputMode="numeric" maxLength={11}
                    {...register("renavam", { onChange: e => { e.target.value = maskRENAVAM(e.target.value); } })} />
                </Field>
                <Field label="Data de Compra" required error={errors.data_compra?.message}>
                  <input type="date" className="input" {...register("data_compra")} />
                </Field>
                <Field label="Nome do Antigo Dono" error={errors.vendedor_nome?.message}>
                  <input placeholder="Opcional" className="input" {...register("vendedor_nome")} />
                </Field>
                <Field label="Telefone do Antigo Dono" error={errors.vendedor_telefone?.message}>
                  <input className="input" placeholder="(00) 00000-0000" inputMode="tel" maxLength={15}
                    {...register("vendedor_telefone", { onChange: e => { e.target.value = maskPhone(e.target.value); } })} />
                </Field>
                <div style={isMobile ? {} : { gridColumn: "span 2" }}>
                  <Field label="Observações" error={errors.observacoes?.message}>
                    <textarea placeholder="Informações adicionais sobre a moto..." className="input" rows={3}
                      style={{ height: "auto", paddingTop: "10px", paddingBottom: "10px", resize: "vertical" }}
                      {...register("observacoes")} />
                  </Field>
                </div>
              </div>
            )}

            {/* ?"--? Step 3: Valores ?"--? */}
            {step === 2 && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: "16px" }}>
                <Field label="Valor de Compra (R$)" required error={errors.valor_compra?.message}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, pointerEvents: "none" }}>R$</span>
                    <input inputMode="numeric" placeholder="0,00" className="input" style={{ paddingLeft: 32 }}
                      value={valorCompraDisplay} onChange={e => handleMoney(e.target.value, setValorCompraDisplay, "valor_compra")} />
                  </div>
                </Field>
                <Field label="Multas no Documento (R$)" error={errors.valor_multas?.message}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, pointerEvents: "none" }}>R$</span>
                    <input inputMode="numeric" placeholder="0,00" className="input" style={{ paddingLeft: 32 }}
                      value={valorMultasDisplay} onChange={e => handleMoney(e.target.value, setValorMultasDisplay, "valor_multas")} />
                  </div>
                </Field>
                <Field label="Valor Anunciado (R$)" error={errors.valor_anunciado?.message}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, pointerEvents: "none" }}>R$</span>
                    <input inputMode="numeric" placeholder="0,00" className="input" style={{ paddingLeft: 32 }}
                      value={valorAnunciadoDisplay} onChange={e => handleMoney(e.target.value, setValorAnunciadoDisplay, "valor_anunciado")} />
                  </div>
                </Field>
                <Field label="Valor Mínimo (R$)" error={errors.valor_minimo?.message}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, pointerEvents: "none" }}>R$</span>
                    <input inputMode="numeric" placeholder="0,00" className="input" style={{ paddingLeft: 32 }}
                      value={valorMinimoDisplay} onChange={e => handleMoney(e.target.value, setValorMinimoDisplay, "valor_minimo")} />
                  </div>
                </Field>
                <div style={{ ...(isMobile ? {} : { gridColumn: "span 2" }), background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "var(--radius-md)", padding: "14px", fontSize: "12px", color: "#f97316", lineHeight: "1.6", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Lightbulb size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>O sistema calculará automaticamente o <strong>investimento total</strong> (compra + despesas) e o <strong>lucro</strong> após as despesas serem lançadas.</span>
                </div>
              </div>
            )}

            {/* ?"--? Step 4: Fotos ?"--? */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Upload zone */}
                <div onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                  style={{ border: `2px dashed ${dragOver ? "#f97316" : "var(--border)"}`, borderRadius: "14px", padding: "32px 24px", textAlign: "center", background: dragOver ? "rgba(249,115,22,0.05)" : "var(--surface-2)", transition: "all 0.2s", cursor: "pointer" }}
                  onClick={() => document.getElementById("moto-photo-input")?.click()}>
                  <input id="moto-photo-input" type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileInput} />
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    {uploadingPhoto ? <Loader2 size={24} color="#f97316" style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={24} color="#f97316" />}
                  </div>
                  <p style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {uploadingPhoto ? "Enviando..." : "Arraste fotos ou clique para selecionar"}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>JPG, PNG, WEBP - máx. 8MB por foto</p>
                </div>

                {/* Preview grid */}
                {uploadedPhotos.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
                    {uploadedPhotos.map(photo => (
                      <div key={photo.id} style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: photo.is_main ? "2px solid #f97316" : "1px solid var(--border)", aspectRatio: "4/3" }}>
                        <img src={`${photo.url}`} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {photo.is_main && (
                          <div style={{ position: "absolute", top: 6, left: 6, background: "#f97316", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#000", display: "flex", alignItems: "center", gap: 4 }}>
                            <Star size={9} fill="#000" /> Capa
                          </div>
                        )}
                        <div style={{ position: "absolute", bottom: 6, right: 6, display: "flex", gap: "4px" }}>
                          {!photo.is_main && (
                            <button onClick={() => handleSetMain(photo.id)} title="Definir como capa"
                              style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(249,115,22,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Star size={12} color="#000" />
                            </button>
                          )}
                          <button onClick={() => handleDeletePhoto(photo.id)} title="Remover"
                            style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(239,68,68,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Trash2 size={12} color="#fff" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {uploadedPhotos.length === 0 && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "12px 14px", borderRadius: "10px", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>
                    <AlertCircle size={14} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      Nenhuma foto adicionada ainda. Sem foto, o sistema usará a imagem padrão da moto.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="form-nav-row" style={{ display: "flex", justifyContent: "space-between", marginTop: "16px", gap: 10 }}>
          <button type="button" className="btn btn-secondary"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0 || step === 3}>
            <ChevronLeft size={16} /> Anterior
          </button>

          {step < 2 && (
            <motion.button type="button" className="btn btn-primary form-nav-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={nextStep} style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
              Próximo <ChevronRight size={16} />
            </motion.button>
          )}
          {step === 2 && (
            <motion.button type="button" className="btn btn-primary form-nav-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              disabled={mutation.isPending} onClick={onSubmitStep2}
              style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
              {mutation.isPending ? (<><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</>) : (<><Check size={16} /> Cadastrar Moto</>)}
            </motion.button>
          )}
          {step === 3 && (
            <motion.button type="button" className="btn btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}
              onClick={() => { queryClient.invalidateQueries({ queryKey: ["vehicles"] }); router.push("/dashboard/motos"); }}>
              <Check size={16} /> Finalizar
            </motion.button>
          )}
        </div>
      </form>
    </div>
  );
}
