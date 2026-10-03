# ─── Build Stage ───────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Só as dependências de produção (pytest e afins ficam em requirements-dev.txt)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ─── Runtime Stage ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Usuário sem privilégios: uma falha na API não vira acesso root no container
RUN useradd --system --uid 1001 --home-dir /app lmc

COPY --chown=lmc:lmc . .

RUN mkdir -p /app/uploads && chown -R lmc:lmc /app/uploads

USER lmc

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# --proxy-headers: atrás do nginx, o IP real do cliente vem no X-Forwarded-For.
# Sem isso o rate limit e o audit log enxergam todo mundo como o IP do nginx.
# 1 worker de propósito: o gerenciador de WebSocket guarda as conexões em memória.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", \
     "--proxy-headers", "--forwarded-allow-ips", "*"]
