from typing import Any, Optional
from app.core.config import settings


class _NoOpRedis:
    """Fallback Redis usado quando o servidor Redis não está disponível.
    Retorna valores seguros para que o login funcione normalmente."""

    async def ping(self) -> bool:
        return True

    async def exists(self, *keys: str) -> int:
        return 0  # chave nunca existe → conta nunca bloqueada

    async def ttl(self, key: str) -> int:
        return -2

    async def incr(self, key: str) -> int:
        return 1

    async def expire(self, key: str, seconds: int) -> bool:
        return True

    async def delete(self, *keys: str) -> int:
        return 0

    async def setex(self, key: str, ttl: int, value: Any) -> bool:
        return True

    async def get(self, key: str) -> Any:
        return None


_redis_client: Any = None


async def get_redis() -> Any:
    """Retorna o cliente Redis ou um NoOp se Redis não estiver disponível."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        import redis.asyncio as aioredis
        client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
        )
        await client.ping()
        _redis_client = client
    except Exception:
        _redis_client = _NoOpRedis()

    return _redis_client


async def close_redis() -> None:
    """Fecha a conexão Redis se for um cliente real."""
    global _redis_client
    if _redis_client is not None and not isinstance(_redis_client, _NoOpRedis):
        await _redis_client.close()
    _redis_client = None


class RedisKeys:
    """Centralized Redis key patterns to avoid typos and collisions."""

    @staticmethod
    def login_attempts(identifier: str) -> str:
        return f"login_attempts:{identifier}"

    @staticmethod
    def account_lockout(identifier: str) -> str:
        return f"account_lockout:{identifier}"

    @staticmethod
    def refresh_token_blacklist(jti: str) -> str:
        return f"blacklist:refresh:{jti}"

    @staticmethod
    def password_reset(email: str) -> str:
        return f"password_reset:{email}"

    @staticmethod
    def dashboard_cache(key: str) -> str:
        return f"dashboard:{key}"
