"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { VehiclePhoto } from "@/types";

const API_BASE = "";

interface PhotoLightboxProps {
  photos: VehiclePhoto[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function PhotoLightbox({ photos, currentIndex, onClose, onNavigate }: PhotoLightboxProps) {
  const current = photos[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, photos.length, onNavigate]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  if (!current) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.95)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 20, right: 20,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "50%", width: 44, height: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#fff", zIndex: 1,
            backdropFilter: "blur(8px)",
          }}
        >
          <X size={20} />
        </button>

        {/* Counter */}
        <div style={{
          position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 20, padding: "6px 16px",
          color: "#fff", fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {current.is_main && <Star size={12} fill="#f59e0b" color="#f59e0b" />}
          {currentIndex + 1} / {photos.length}
        </div>

        {/* Prev button */}
        {currentIndex > 0 && (
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            style={{
              position: "absolute", left: 20,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "50%", width: 52, height: 52,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff", backdropFilter: "blur(8px)",
            }}
          >
            <ChevronLeft size={24} />
          </motion.button>
        )}

        {/* Image */}
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "90vw", maxHeight: "85vh", position: "relative" }}
        >
          <img
            src={`${API_BASE}${current.url}`}
            alt={`Foto ${currentIndex + 1}`}
            style={{
              maxWidth: "90vw", maxHeight: "85vh",
              objectFit: "contain", borderRadius: 12,
              boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
            }}
          />
          {current.is_main && (
            <div style={{
              position: "absolute", bottom: 12, left: 12,
              background: "rgba(245,158,11,0.9)", backdropFilter: "blur(8px)",
              borderRadius: 20, padding: "4px 12px",
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 700, color: "#fff",
            }}>
              <Star size={12} fill="#fff" /> Foto Principal
            </div>
          )}
        </motion.div>

        {/* Next button */}
        {currentIndex < photos.length - 1 && (
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            style={{
              position: "absolute", right: 20,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "50%", width: 52, height: 52,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff", backdropFilter: "blur(8px)",
            }}
          >
            <ChevronRight size={24} />
          </motion.button>
        )}

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div style={{
            position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 8, padding: "10px 16px",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)",
            borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)",
            maxWidth: "90vw", overflowX: "auto",
          }}>
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                onClick={(e) => { e.stopPropagation(); onNavigate(idx); }}
                style={{
                  width: 52, height: 40, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                  border: idx === currentIndex
                    ? "2px solid #38bdf8"
                    : "2px solid transparent",
                  cursor: "pointer", padding: 0, background: "none",
                  opacity: idx === currentIndex ? 1 : 0.5,
                  transition: "all 0.15s ease",
                }}
              >
                <img
                  src={`${API_BASE}${photo.url}`}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
