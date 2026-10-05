"""
Rate limit da API (SlowAPI).

- Limite padrão em todas as rotas (RATE_LIMIT_PER_MINUTE), contado POR USUÁRIO quando a
  requisição traz um token válido e por IP quando é anônima. Antes era só por IP: os
  funcionários da loja saem pela mesma internet (mesmo IP), dividiam 60 req/min e o painel
  começava a responder "429" com duas pessoas usando — uma tela do painel sozinha já faz
  5 a 10 chamadas.
- Chamadas internas (o próprio site renderizando páginas no servidor, sem passar pelo
  nginx) não entram no limite: senão todos os visitantes do site dividiam uma cota só.
  Chamadas de fora sempre chegam pelo nginx, que manda X-Forwarded-For.
- Limites específicos com @limiter.limit(...) no login e no refresh (esses continuam por IP).
- O nginx ainda limita por IP antes (30 req/s na API, 10/min no login).
- Desligável com RATE_LIMIT_ENABLED=false (testes).
"""
import ipaddress

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.wrappers import LimitGroup
from starlette.requests import Request

from app.core.config import settings


def chave_usuario_ou_ip(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth[:7].lower() == "bearer ":
        try:
            from app.core.security import decode_token
            sub = decode_token(auth[7:]).get("sub")  # assinatura conferida: não dá para forjar
            if sub:
                return f"u:{sub}"
        except Exception:
            pass
    return f"ip:{get_remote_address(request)}"


def chamada_interna(request: Request) -> bool:
    if request.headers.get("x-forwarded-for"):
        return False
    try:
        ip = ipaddress.ip_address(get_remote_address(request))
    except ValueError:
        return False
    return ip.is_private or ip.is_loopback


limiter = Limiter(
    key_func=get_remote_address,  # usado pelos limites específicos (login, refresh)
    enabled=settings.RATE_LIMIT_ENABLED,
)
limiter._default_limits.append(
    LimitGroup(f"{settings.RATE_LIMIT_PER_MINUTE}/minute", chave_usuario_ou_ip,
               None, False, None, None, chamada_interna, 1, False)
)
