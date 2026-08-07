from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
from fastapi import HTTPException, status

from app.core.security import (
    verify_password,
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
from app.application.schemas.auth import LoginRequest, TokenResponse


class AuthService:
    """
    Handles all authentication logic.

    Security mechanisms:
    1. Argon2id password hashing (memory-hard, resistant to GPU attacks)
    2. JWT access tokens (30 min) + refresh tokens (7 days)
    3. Account lockout after N failed attempts (tracked in Redis)
    4. Refresh token blacklisting on logout
    5. Automatic password rehash if Argon2 parameters change
    """

    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)

    async def login(self, request: LoginRequest, ip_address: str = "") -> dict:
        """
        Authenticate user and return tokens.

        Accepts email OR username in request.identifier.
        Flow:
        1. Check if account is locked (Redis)
        2. Find user by email or username
        3. Verify Argon2 password hash
        4. On failure: increment attempt counter, lock if exceeded
        5. On success: reset counter, update ultimo_login, return tokens
        """
        redis = await get_redis()
        identifier = request.identifier.strip()
        lockout_key = RedisKeys.account_lockout(identifier)
        attempts_key = RedisKeys.login_attempts(identifier)

        # Check if account is locked
        if await redis.exists(lockout_key):
            ttl = await redis.ttl(lockout_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Conta bloqueada. Tente novamente em {ttl // 60} minutos.",
            )

        # Find user by email OR username
        user = await self.user_repo.get_by_identifier(identifier)

        # Verify password (always run hash even if user not found, to prevent timing attacks)
        if not user or not verify_password(request.senha, user.senha_hash):
            await self._handle_failed_attempt(redis, identifier, attempts_key, lockout_key)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas",
            )

        if not user.ativo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário desativado. Contate o administrador.",
            )

        # Reset failed attempts on success
        await redis.delete(attempts_key)
        await redis.delete(lockout_key)

        # Rehash password if Argon2 parameters changed
        if needs_rehash(user.senha_hash):
            new_hash = hash_password(request.senha)
            await self.user_repo.update(user, senha_hash=new_hash)

        # Record last login timestamp
        now = datetime.now(timezone.utc)
        await self.user_repo.update(user, ultimo_login=now)

        # Generate tokens
        access_token = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role.value,
        )
        refresh_token = create_refresh_token(user_id=user.id)

        # Store refresh token in Redis (for blacklisting on logout)
        refresh_payload = decode_token(refresh_token)
        refresh_exp = refresh_payload.get("exp", 0)
        ttl_seconds = max(0, refresh_exp - int(datetime.now(timezone.utc).timestamp()))
        await redis.setex(
            f"refresh_token:{user.id}",
            ttl_seconds,
            refresh_token,
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user,
        }

    async def refresh(self, refresh_token: str) -> dict:
        """
        Exchange refresh token for a new access token.

        Flow:
        1. Decode and validate refresh token
        2. Check it's not blacklisted (Redis)
        3. Find user (must still be active)
        4. Issue new access token
        """
        try:
            payload = decode_token(refresh_token)
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido ou expirado",
            )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
            )

        redis = await get_redis()
        blacklist_key = RedisKeys.refresh_token_blacklist(refresh_token)
        if await redis.exists(blacklist_key):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token revogado. Faça login novamente.",
            )

        user_id = payload.get("sub")
        user = await self.user_repo.get_by_id(user_id)

        if not user or not user.ativo:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuário não encontrado ou desativado",
            )

        new_access_token = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role.value,
        )

        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    async def logout(self, refresh_token: str) -> None:
        """
        Blacklist the refresh token so it can't be reused.
        The access token will naturally expire after 30 minutes.
        """
        try:
            payload = decode_token(refresh_token)
            exp = payload.get("exp", 0)
            ttl = max(0, exp - int(datetime.now(timezone.utc).timestamp()))
            redis = await get_redis()
            await redis.setex(
                RedisKeys.refresh_token_blacklist(refresh_token),
                ttl,
                "blacklisted",
            )
        except JWTError:
            pass  # Invalid token on logout is acceptable

    async def _handle_failed_attempt(
        self, redis, identifier: str, attempts_key: str, lockout_key: str
    ) -> None:
        """Increment failed attempt counter and lock account if threshold reached."""
        attempts = await redis.incr(attempts_key)
        await redis.expire(attempts_key, 3600)  # Reset counter after 1 hour

        if attempts >= settings.MAX_LOGIN_ATTEMPTS:
            lockout_seconds = settings.LOCKOUT_DURATION_MINUTES * 60
            await redis.setex(lockout_key, lockout_seconds, "locked")
            await redis.delete(attempts_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Conta bloqueada por {settings.LOCKOUT_DURATION_MINUTES} minutos após {settings.MAX_LOGIN_ATTEMPTS} tentativas falhas.",
            )
