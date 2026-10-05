"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Upload, Trash2, Star, ImagePlus, AlertTriangle, X, Loader2, Crop as CropIcon, CheckCircle
} from "lucide-react";
import { vehiclesApi, settingsApi } from "@/lib/api";
import { reduzirFoto } from "@/lib/imagem";
import { mensagemErro } from "@/lib/erros";
import { VehiclePhoto } from "@/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
// Arquivo original até 25 MB: a foto é reduzida no navegador antes de subir (ver lib/imagem)
const MAX_MB = 25;

interface PhotoUploaderProps { vehicleId: string; }

function CropModal({ src, onSave, onClose }: { src: string; onSave: (blob: Blob) => void; onClose: () => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [aspect, setAspect] = useState<number | undefined>(16 / 9);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    if (aspect) {
      const c = centerCrop(makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height), width, height);
      setCrop(c);
    }
  };

  const handleSave = () => {
    const img = imgRef.current;
    if (!img || !crop) return;
    const canvas = document.createElement("canvas");
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const pw = (crop.width / 100) * img.width * scaleX;
    const ph = (crop.height / 100) * img.height * scaleY;
    const px = (crop.x / 100) * img.width * scaleX;
    const py = (crop.y / 100) * img.height * scaleY;
    canvas.width = pw; canvas.height = ph;
    canvas.getContext("2d")!.drawImage(img, px, py, pw, ph, 0, 0, pw, ph);
    canvas.toBlob(blob => { if (blob) onSave(blob); }, "image/jpeg", 0.92);
  };

  const ASPECTS = [
    { label: "Livre", value: undefined },
    { label: "16:9",  value: 16 / 9 },
    { label: "4:3",   value: 4 / 3 },
    { label: "1:1",   value: 1 },
    { label: "3:4",   value: 3 / 4 },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: "min(92vw, 860px)" }}>
        <CropIcon size={18} color="#38bdf8" />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Recortar Foto</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {ASPECTS.map(a => (
            <button key={a.label} onClick={() => setAspect(a.value)}
              style={{ padding: "4px 11px", borderRadius: 7, border: "1px solid", borderColor: aspect === a.value ? "#38bdf8" : "rgba(255,255,255,0.12)", background: aspect === a.value ? "rgba(56,189,248,0.15)" : "transparent", color: aspect === a.value ? "#38bdf8" : "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {a.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <X size={15} />
        </button>
      </div>
      <div style={{ maxWidth: "min(92vw, 860px)", maxHeight: "65vh", overflow: "auto" }}>
        <ReactCrop crop={crop} onChange={c => setCrop(c)} aspect={aspect} style={{ borderRadius: 8 }}>
          <img ref={imgRef} src={src} onLoad={onImageLoad} style={{ maxWidth: "min(92vw, 860px)", maxHeight: "65vh", display: "block" }} alt="crop" />
        </ReactCrop>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ padding: "10px 22px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
        <button onClick={handleSave} style={{ padding: "10px 26px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#38bdf8,#0ea5e9)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={14} /> Salvar Recorte
        </button>
      </div>
    </div>
  );
}

export function PhotoUploader({ vehicleId }: PhotoUploaderProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; previewUrl: string }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [cropSrc, setCropSrc] = useState<{ url: string; idx: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: photos = [], isLoading } = useQuery<VehiclePhoto[]>({
    queryKey: ["vehicle-photos", vehicleId],
    queryFn: () => vehiclesApi.getPhotos(vehicleId),
  });
  // Limite configurado na loja (antes a tela dizia 20 e o servidor cortava em 10)
  const { data: cfg } = useQuery({ queryKey: ["config-publica"], queryFn: settingsApi.publicas, staleTime: 5 * 60_000 });
  const limite = cfg?.max_fotos_veiculo ?? 20;

  const enviadasRef = useRef(0);
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      enviadasRef.current = 0;
      for (const file of files) {
        await vehiclesApi.uploadPhoto(vehicleId, await reduzirFoto(file));
        enviadasRef.current++;
      }
    },
    onSuccess: () => {
      setPreviews([]); setUploadError(null); setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
      queryClient.invalidateQueries({ queryKey: ["vehicle-photos", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
    },
    onError: (err: unknown) => {
      // As que já subiram saem da fila: tentar de novo não pode duplicar foto
      const n = enviadasRef.current;
      if (n > 0) {
        setPreviews(prev => { prev.slice(0, n).forEach(p => URL.revokeObjectURL(p.previewUrl)); return prev.slice(n); });
        queryClient.invalidateQueries({ queryKey: ["vehicle-photos", vehicleId] });
        queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
      }
      setUploadError(mensagemErro(err, "Erro ao enviar foto") + (n ? ` (${n} foto${n > 1 ? "s" : ""} já enviada${n > 1 ? "s" : ""})` : ""));
    },
  });

  const setMainMutation = useMutation({
    mutationFn: (photoId: string) => vehiclesApi.setMainPhoto(vehicleId, photoId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vehicle-photos", vehicleId] }); queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => vehiclesApi.deletePhoto(vehicleId, photoId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vehicle-photos", vehicleId] }); queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] }); },
  });

  const processFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const remaining = limite - photos.length;
    const valid: { file: File; previewUrl: string }[] = [];
    let err: string | null = null; let count = 0;
    Array.from(files).forEach(file => {
      if (count >= remaining) { err = `Limite de ${remaining} foto(s) restante(s)`; return; }
      if (!ACCEPTED.includes(file.type)) { err = `"${file.name}" invalido (jpg, png, webp)`; return; }
      if (file.size > MAX_MB * 1024 * 1024) { err = `"${file.name}" excede ${MAX_MB}MB`; return; }
      valid.push({ file, previewUrl: URL.createObjectURL(file) }); count++;
    });
    if (err) setUploadError(err); else setUploadError(null);
    setPreviews(prev => [...prev, ...valid]);
  }, [photos.length, limite]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const removePreview = (idx: number) => setPreviews(prev => { URL.revokeObjectURL(prev[idx].previewUrl); return prev.filter((_, i) => i !== idx); });

  const handleCropSave = (blob: Blob) => {
    if (!cropSrc) return;
    const newFile = new File([blob], previews[cropSrc.idx].file.name, { type: "image/jpeg" });
    const newUrl = URL.createObjectURL(newFile);
    setPreviews(prev => { URL.revokeObjectURL(prev[cropSrc.idx].previewUrl); const n = [...prev]; n[cropSrc.idx] = { file: newFile, previewUrl: newUrl }; return n; });
    setCropSrc(null);
  };

  const remaining = limite - photos.length;
  const canUpload = previews.length > 0 && !uploadMutation.isPending;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <motion.div
        animate={{ borderColor: dragOver ? "#38bdf8" : "rgba(148,163,184,0.18)", background: dragOver ? "rgba(56,189,248,0.04)" : "rgba(0,0,0,0)" }}
        onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        onClick={() => remaining > 0 && fileInputRef.current?.click()}
        style={{ border: `2px dashed ${dragOver ? "#38bdf8" : "rgba(148,163,184,0.18)"}`, borderRadius: 14, padding: "20px 18px", display: "flex", alignItems: "center", gap: 14, cursor: remaining > 0 ? "pointer" : "not-allowed", opacity: remaining <= 0 ? 0.5 : 1, transition: "all 0.2s" }}
      >
        <div style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(56,189,248,0.1)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ImagePlus size={20} color="#38bdf8" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>
            {remaining > 0 ? "Clique ou arraste fotos aqui" : `Limite de ${limite} fotos atingido`}
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>JPG, PNG ou WebP — a foto é reduzida antes de enviar</p>
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: remaining > 5 ? "#22c55e" : remaining > 0 ? "#f59e0b" : "#ef4444", lineHeight: 1 }}>
            {photos.length}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>/{limite}</span>
          </p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{remaining} vaga{remaining !== 1 ? "s" : ""}</p>
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: "none" }} onChange={e => processFiles(e.target.files)} disabled={remaining <= 0} />
      </motion.div>

      <AnimatePresence>
        {uploadError && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontSize: 13 }}>
            <AlertTriangle size={14} />{uploadError}
            <button onClick={() => setUploadError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><X size={14} /></button>
          </motion.div>
        )}
        {uploadSuccess && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", fontSize: 13 }}>
            <CheckCircle size={14} /> Fotos enviadas com sucesso!
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previews.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Para enviar ({previews.length})</p>
              <button onClick={() => { previews.forEach(p => URL.revokeObjectURL(p.previewUrl)); setPreviews([]); }}
                style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>Limpar tudo</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
              {previews.map((p, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "4/3", border: "1px solid rgba(56,189,248,0.3)" }}
                  className="upld-prev"
                >
                  <img src={p.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div className="upld-actions" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.82) 0%,transparent 55%)", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, padding: 8, opacity: 0, transition: "opacity 0.15s" }}>
                    <button onClick={() => setCropSrc({ url: p.previewUrl, idx })} title="Recortar"
                      style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "rgba(56,189,248,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><CropIcon size={13} /></button>
                    <button onClick={() => removePreview(idx)} title="Remover"
                      style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "rgba(239,68,68,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><X size={13} /></button>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={!canUpload}
              onClick={() => uploadMutation.mutate(previews.map(p => p.file))}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: canUpload ? "pointer" : "not-allowed", background: canUpload ? "linear-gradient(135deg,#38bdf8,#0ea5e9)" : "var(--border)", color: "#fff", border: "none", opacity: canUpload ? 1 : 0.6 }}>
              {uploadMutation.isPending
                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />Enviando...</>
                : <><Upload size={14} />Enviar {previews.length} foto{previews.length !== 1 ? "s" : ""}</>}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ aspectRatio: "4/3", borderRadius: 12 }} />)}
        </div>
      ) : photos.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Fotos salvas ({photos.length}/{limite})</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {photos.map(photo => (
              <motion.div key={photo.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "4/3", border: photo.is_main ? "2px solid #f59e0b" : "1px solid var(--border)", boxShadow: photo.is_main ? "0 0 0 1px #f59e0b40,0 4px 20px rgba(245,158,11,0.15)" : "none", transition: "all 0.2s" }}
                className="photo-card"
              >
                <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }} className="photo-img" />
                {photo.is_main && (
                  <div style={{ position: "absolute", top: 7, left: 7, background: "rgba(245,158,11,0.92)", backdropFilter: "blur(4px)", borderRadius: 6, padding: "2px 8px", fontSize: 11.5, fontWeight: 800, color: "#fff" }}>CAPA</div>
                )}
                <div className="photo-overlay" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.15) 60%,transparent 100%)", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, padding: 10, opacity: 0, transition: "opacity 0.18s" }}>
                  {!photo.is_main && (
                    <button onClick={() => setMainMutation.mutate(photo.id)} disabled={setMainMutation.isPending} title="Definir como capa"
                      style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "rgba(245,158,11,0.92)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Star size={15} /></button>
                  )}
                  <button onClick={() => setDeleteTarget(photo.id)} disabled={deleteMutation.isPending} title="Excluir"
                    style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "rgba(239,68,68,0.92)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Trash2 size={15} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}

      {cropSrc && <CropModal src={cropSrc.url} onSave={handleCropSave} onClose={() => setCropSrc(null)} />}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir foto?"
        description="Esta ação não pode ser desfeita. A foto será removida permanentemente."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget); setDeleteTarget(null); } }}
        onCancel={() => setDeleteTarget(null)}
      />

      <style>{`
        .upld-prev:hover .upld-actions { opacity: 1 !important; }
        /* Celular/tablet não tem "passar o mouse": botões de capa, recorte e excluir sempre visíveis */
        @media (hover: none) { .upld-actions, .photo-overlay { opacity: 1 !important; } }
        .photo-card:hover .photo-overlay { opacity: 1 !important; }
        .photo-card:hover .photo-img { transform: scale(1.05); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
