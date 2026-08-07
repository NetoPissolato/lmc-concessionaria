import type { NextConfig } from "next";

// URL usada pelo servidor Next.js para o proxy de /uploads (dentro do Docker usa o nome do serviço)
// Em desenvolvimento local, cai no fallback de localhost:8000
const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ||
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace("/api/v1", "");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
