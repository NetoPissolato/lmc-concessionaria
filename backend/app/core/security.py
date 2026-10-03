import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from jose import JWTError, jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

from app.core.config import settings

# ─── Password Hashing (Argon2) ────────────────────────────────────────────────
_ph = PasswordHasher(
    time_cost=2,        # Number of iterations
    memory_cost=65536,  # 64 MB
    parallelism=2,      # Number of parallel threads
    hash_len=32,        # Hash output length
    salt_len=16,        # Salt length
)


def hash_password(plain_password: str) -> str:
    """Hash a password using Argon2id."""
    return _ph.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its Argon2 hash."""
    try:
        return _ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(hashed_password: str) -> bool:
    """Check if a password hash needs to be updated (e.g., after parameter changes)."""
    return _ph.check_needs_rehash(hashed_password)


# ─── JWT Token Management ─────────────────────────────────────────────────────
def _create_token(data: dict[str, Any], expires_delta: timedelta) -> str:
    """Internal function to create a JWT token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    })
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_access_token(
    user_id: str,
    email: str,
    role: str,
    extra_data: Optional[dict] = None,
    sessao_versao: int = 0,
) -> str:
    """
    Create a short-lived JWT access token.

    How it works:
    - Contains user_id, email, role and token type
    - Expires in ACCESS_TOKEN_EXPIRE_MINUTES (default: 30 min)
    - Signed with HS256 and JWT_SECRET_KEY
    - Used in Authorization: Bearer <token> header
    """
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "sv": sessao_versao,  # versão de sessão: muda quando a senha/papel/status muda
    }
    if extra_data:
        payload.update(extra_data)

    return _create_token(
        payload,
        timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str, sessao_versao: int = 0) -> str:
    """
    Create a long-lived JWT refresh token.

    How it works:
    - Contains only user_id and token type (minimal data for security)
    - Expires in REFRESH_TOKEN_EXPIRE_DAYS (default: 7 days)
    - Stored in HttpOnly cookie (not accessible via JavaScript)
    - Used ONLY to obtain a new access token
    - Invalidated on logout (stored in Redis blacklist)
    """
    return _create_token(
        # jti identifica ESTE refresh: ao ser usado, ele é queimado (rotação)
        {"sub": user_id, "type": "refresh", "sv": sessao_versao, "jti": uuid.uuid4().hex},
        timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT token.

    Raises JWTError if token is expired, tampered, or invalid.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError as e:
        raise JWTError(f"Token inválido ou expirado: {str(e)}")


def create_password_reset_token(email: str) -> str:
    """
    Create a one-time password reset token.

    - Expires in 1 hour
    - Contains email and special type 'password_reset'
    - Should be sent via email link
    """
    return _create_token(
        {"sub": email, "type": "password_reset"},
        timedelta(hours=1),
    )


# Hash de uma senha qualquer: quando o usuário não existe, o login verifica contra este
# hash para gastar o mesmo tempo. Sem isso, a resposta rápida denunciava quais e-mails
# existem no sistema.
_HASH_FALSO = _ph.hash("senha-que-nao-existe-" + uuid.uuid4().hex)


def verify_password_ou_falso(plain_password: str, hashed_password: Optional[str]) -> bool:
    if not hashed_password:
        verify_password(plain_password, _HASH_FALSO)
        return False
    return verify_password(plain_password, hashed_password)
