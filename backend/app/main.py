"""
LMC Veículos — ERP API
Backend FastAPI com Clean Architecture
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import engine
from app.core.redis import get_redis, close_redis
from app.domain.models import *  # Import all models so Alembic can discover them
from app.presentation.api.v1 import auth, vehicles, customers_sales, financial, users, reports, ws, public
from app.presentation.api.v1 import settings as settings_router_module

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("lmc-erp")


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info(f"🚗 LMC Veículos ERP v{settings.APP_VERSION} iniciando...")

    # Ensure upload directories exist
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.UPLOAD_DIR, "avatars").mkdir(parents=True, exist_ok=True)
    Path(settings.UPLOAD_DIR, "vehicles").mkdir(parents=True, exist_ok=True)
    logger.info(f"✅ Diretório de uploads: {settings.UPLOAD_DIR}")

    # Test Redis connection
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("✅ Redis conectado")
    except Exception as e:
        logger.warning(f"⚠️  Redis não disponível: {e}")

    # Create database tables if they don't exist
    from app.core.database import Base
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Tabelas do banco criadas/verificadas")

    logger.info("✅ Backend pronto!")
    yield

    # Shutdown
    await close_redis()
    await engine.dispose()
    logger.info("👋 Backend encerrado")


# ─── Rate Limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])


# ─── Application ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="LMC Veículos ERP",
    description="Sistema ERP completo para concessionária de veículos",
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ─── Middleware ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Add security headers to every response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests for monitoring."""
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"{request.method} {request.url.path} → {response.status_code}")
    return response


# ─── Exception Handlers ───────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor. Tente novamente."},
    )


# ─── Routers ──────────────────────────────────────────────────────────────────
PREFIX = settings.API_PREFIX

app.include_router(auth.router, prefix=PREFIX)
app.include_router(vehicles.router, prefix=PREFIX)
app.include_router(customers_sales.customers_router, prefix=PREFIX)
app.include_router(customers_sales.sales_router, prefix=PREFIX)
app.include_router(financial.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
app.include_router(reports.router, prefix=PREFIX)
app.include_router(ws.router)  # WebSocket — sem prefix, rota fica em /ws
app.include_router(public.router, prefix=PREFIX)  # Rotas públicas — sem JWT
app.include_router(settings_router_module.router, prefix=PREFIX)  # Configurações da loja

# Static files for uploaded avatars — served at /uploads/avatars/<filename>
_upload_path = Path(settings.UPLOAD_DIR)
_upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_upload_path)), name="uploads")


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Sistema"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["Sistema"])
async def root():
    return {"message": f"🚗 {settings.APP_NAME} API", "docs": "/docs"}
