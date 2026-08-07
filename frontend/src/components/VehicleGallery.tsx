"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon, Star, ZoomIn } from "lucide-react";
import { VehiclePhoto } from "@/types";
import { PhotoLightbox } from "./PhotoLightbox";

const API_BASE = ""; // proxy via Next.js rewrites (/uploads/* → backend)

interface VehicleGalleryProps {
  photos: VehiclePhoto[];
  vehicleName?: string;
}

export function VehicleGallery({ photos, vehicleName }: VehicleGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 12,
        padding: "48px 24px",
        background: "var(--surface)", border: "1px dashed var(--border)",
        borderRadius: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(148,163,184,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <ImageIcon size={24} color="var(--text-muted)" strokeWidth={1.5} />
        </div>
        <p style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
          Nenhuma foto cadastrada
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", opacity: 0.7 }}>
          Adicione fotos do veículo usando o painel abaixo
        </p>
      </div>
    );
  }

  const mainPhoto = photos.find((p) => p.is_main) || photos[0];
  const otherPhotos = photos.filter((p) => p.id !== mainPhoto.id);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Main photo - large */}
        <motion.div
          whileHover={{ scale: 1.005 }}
          onClick={() => setLightboxIndex(photos.findIndex((p) => p.id === mainPhoto.id))}
          style={{
            position: "relative", borderRadius: 16, overflow: "hidden",
            aspectRatio: "16/9", cursor: "zoom-in",
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <img
            src={`${API_BASE}${mainPhoto.url}`}
            alt={vehicleName || "Foto principal"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* Overlay on hover */}
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s",
          }}
            className="gallery-main-overlay"
          >
            <ZoomIn size={32} color="rgba(255,255,255,0)" style={{ transition: "color 0.2s" }} />
          </div>
          {/* Main badge */}
          <div style={{
            position: "absolute", top: 12, left: 12,
            background: "rgba(245,158,11,0.85)", backdropFilter: "blur(8px)",
            borderRadius: 20, padding: "4px 12px",
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.04em",
          }}>
            <Star size={11} fill="#fff" /> PRINCIPAL
          </div>
          {/* Photo count badge */}
          <div style={{
            position: "absolute", bottom: 12, right: 12,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
            borderRadius: 20, padding: "4px 12px",
            fontSize: 11, fontWeight: 600, color: "#fff",
          }}>
            {photos.length} foto{photos.length !== 1 ? "s" : ""}
          </div>
        </motion.div>

        {/* Thumbnail strip */}
        {otherPhotos.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(otherPhotos.length, 5)}, 1fr)`,
            gap: 8,
          }}>
            {otherPhotos.slice(0, 5).map((photo, idx) => {
              const globalIdx = photos.findIndex((p) => p.id === photo.id);
              const isLast = idx === 4 && otherPhotos.length > 5;
              return (
                <motion.div
                  key={photo.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setLightboxIndex(globalIdx)}
                  style={{
                    position: "relative", borderRadius: 10, overflow: "hidden",
                    aspectRatio: "1/1", cursor: "pointer",
                    border: "1px solid var(--border)",
                    background: "var(--surface-elevated)",
                  }}
                >
                  <img
                    src={`${API_BASE}${photo.url}`}
                    alt={`Foto ${idx + 2}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {isLast && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 18, fontWeight: 800,
                    }}>
                      +{otherPhotos.length - 4}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      <style>{`
        .gallery-main-overlay:hover {
          background: rgba(0,0,0,0.3) !important;
        }
        .gallery-main-overlay:hover svg {
          color: rgba(255,255,255,0.9) !important;
        }
      `}</style>
    </>
  );
}
