"""
Rate limit da API (SlowAPI). Antes existia o Limiter mas nada o ativava.

- Limite padrão por IP em todas as rotas (RATE_LIMIT_PER_MINUTE).
- Limites específicos com @limiter.limit(...) no login e no refresh.
- O IP é o real porque o uvicorn roda com --proxy-headers atrás do nginx.
- Desligável com RATE_LIMIT_ENABLED=false (testes).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
    enabled=settings.RATE_LIMIT_ENABLED,
)
