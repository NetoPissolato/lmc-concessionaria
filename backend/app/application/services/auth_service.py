from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
from fastapi import HTTPException, status
from starlette.concurrency import run_in_threadpool

from app.core.security import (
    verify_password_ou_falso,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    needs_rehash,
)
from app.core.redis import get_redis, RedisKeys
from app.core.config import settings
from app.infrastructure.repositories.user_repository import UserRepository
from app.domain.models.user import User
from app.application.schemas.auth import LoginRequest


def _ttl_restante(payload: dict) -> int:
    return max(1, int(payload.get("exp", 0)) - int(datetime.now(timezone.utc).timestamp()))


class AuthService:
    """
    Autenticação.

    1. Argon2id, calculado fora do event loop (um flood de login não trava a API).
    2. Access token de 30 min + refresh rotativo: cada refresh usado é queimado e troca
       por um novo. Um refresh roubado e reutilizado depois do dono é recusado.
    3. Versão de sessão (users.sessao_versao) dentro dos tokens: trocar senha, desativar,
       excluir ou mudar o papel invalida todas as sessões do usuário na hora.
    4. Bloqueio após N falhas por (usuário, IP). Por usuário+IP e não só por usuário: senão
       qualquer pessoa trancaria o admin fora do sistema errando a senha dele de propósito.
       Força bruta distribuída é barrada antes, no nginx (limite por IP).
    """

    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)

    def _tokens(self, user: User) -> dict:
        return {
            "access_token": create_access_token(
                user_id=user.id, email=user.email, role=user.role.value,
                sessao_versao=user.sessao_versao or 0,
            ),
            "refresh_token": create_refresh_token(user.id, user.sessao_versao or 0),
            "token_type": "bearer",
            "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    async def login(self, request: LoginRequest, ip_address: str = "") -> dict:
        redis = await get_redis()
        identifier = request.identifier.strip()
        # Minúsculas: "Admin@x.com" e "admin@x.com" contam como o mesmo alvo
        chave = f"{identifier.lower()}|{ip_address}"
        lockout_key = RedisKeys.account_lockout(chave)
        attempts_key = RedisKeys.login_attempts(chave)

        if await redis.exists(lockout_key):
            ttl = await redis.ttl(lockout_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Muitas tentativas. Tente novamente em {max(1, ttl // 60)} minutos.",
            )

        user = await self.user_repo.get_by_identifier(identifier)
        senha_ok = await run_in_threadpool(
            verify_password_ou_falso, request.senha, user.senha_hash if user else None
        )
        if not user or not senha_ok:
            await self._handle_failed_attempt(redis, attempts_key, lockout_key)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

        if not user.ativo:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Usuário desativado. Contate o administrador.")

        await redis.delete(attempts_key)
        await redis.delete(lockout_key)

        if needs_rehash(user.senha_hash):
            await self.user_repo.update(user, senha_hash=await run_in_threadpool(hash_password, request.senha))
        await self.user_repo.update(user, ultimo_login=datetime.now(timezone.utc))

        return {**self._tokens(user), "user": user}

    async def refresh(self, refresh_token: str) -> dict:
        try:
            payload = decode_token(refresh_token)
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Sessão expirada. Faça login novamente.")
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

        redis = await get_redis()
        jti = payload.get("jti") or refresh_token
        if await redis.exists(RedisKeys.refresh_token_blacklist(jti)):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Sessão encerrada. Faça login novamente.")

        user = await self.user_repo.get_by_id(payload.get("sub"))
        if not user or not user.ativo or getattr(user, "is_deleted", False):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Usuário não encontrado ou desativado")
        if int(payload.get("sv", 0)) != (user.sessao_versao or 0):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Sua sessão foi encerrada (senha ou permissão alterada). Entre de novo.")

        # Rotação: o refresh usado é queimado e o cliente recebe um novo
        await redis.setex(RedisKeys.refresh_token_blacklist(jti), _ttl_restante(payload), "usado")
        return self._tokens(user)

    async def logout(self, refresh_token: str) -> None:
        """Queima o refresh token. O access token vence sozinho em até 30 min."""
        try:
            payload = decode_token(refresh_token)
            redis = await get_redis()
            await redis.setex(
                RedisKeys.refresh_token_blacklist(payload.get("jti") or refresh_token),
                _ttl_restante(payload),
                "logout",
            )
        except JWTError:
            pass  # token inválido no logout: nada a revogar

    async def _handle_failed_attempt(self, redis, attempts_key: str, lockout_key: str) -> None:
        attempts = await redis.incr(attempts_key)
        await redis.expire(attempts_key, 3600)
        if attempts >= settings.MAX_LOGIN_ATTEMPTS:
            await redis.setex(lockout_key, settings.LOCKOUT_DURATION_MINUTES * 60, "locked")
            await redis.delete(attempts_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Muitas tentativas. Aguarde {settings.LOCKOUT_DURATION_MINUTES} minutos.",
            )
