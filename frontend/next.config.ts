import type { NextConfig } from "next";

// URL usada pelo servidor Next.js para o proxy de /uploads (dentro do Docker usa o nome do serviço)
// Em desenvolvimento local, cai no fallback de localhost:8000
const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ||
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace("/api/v1", "");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Permite um build separado (ex.: NEXT_DIST_DIR=.next-build) sem atrapalhar o `next dev` aberto
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Pula a checagem de tipos no servidor (já verificamos localmente com tsc --noEmit)
  // Economiza 10-15 min de build na VPS com pouca CPU
  typescript: { ignoreBuildErrors: true },
  // Aumenta o timeout de geração de páginas estáticas para VPS com recursos limitados
  // Padrão é 60s — VPS lenta pode demorar mais
  staticPageGenerationTimeout: 300,
  // As fotos já chegam otimizadas do backend (WebP 1600px + miniatura 640px)
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        // Proxy /uploads/* → backend, avoiding browser CORS on static files
        source: "/uploads/:path*",
        destination: `${BACKEND_INTERNAL_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
