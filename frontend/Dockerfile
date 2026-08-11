# ─── Dependencies Stage ────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

RUN npm ci --frozen-lockfile

# ─── Builder Stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Receber as URLs como build args
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ARG BACKEND_INTERNAL_URL=http://backend:8000
ARG PORT=3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL

# Copiar dependências instaladas
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Build da aplicação — limite de memória para VPS com pouca RAM
ENV NODE_OPTIONS="--max-old-space-size=768"
RUN npm run build

# ─── Runtime Stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Re-declarar ARG para que ${PORT} seja resolvido nesta stage
ARG PORT=3000

# Criar usuário sem privilégios
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copiar arquivos necessários para produção
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE ${PORT}

ENV PORT=${PORT}
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:${PORT}/ || exit 1

CMD ["node", "server.js"]
