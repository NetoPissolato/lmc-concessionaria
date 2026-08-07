from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from typing import Optional

from app.core.security import decode_token
from app.core.redis import get_redis, RedisKeys
from app.domain.models.user import UserRole

security = HTTPBearer()


async def get_current_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    JWT Authentication dependency.

    How JWT works:
    1. Client sends: Authorization: Bearer <access_token>
    2. We decode and verify the signature using JWT_SECRET_KEY
    3. We check the token is not expired
    4. We return the payload (user_id, email, role)

    The access token is STATELESS — no DB lookup needed on every request.
    This makes authentication fast and scalable.
    """
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    return payload


def require_role(*roles: UserRole):
    """
    Permission control dependency factory.

    How permissions work:
    - ADMIN: can do everything
    - FUNCIONARIO: restricted access (no delete, no user management,
                   limited financial visibility)

    Usage: Depends(require_role(UserRole.ADMIN))
    """
    async def check_role(
        payload: dict = Depends(get_current_user_payload),
    ) -> dict:
        user_role = payload.get("role")
        if user_role not in [r.value for r in roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para realizar esta ação.",
            )
        return payload
    return check_role


# Convenience dependencies
require_admin = require_role(UserRole.ADMIN)
require_any = get_current_user_payload  # Any authenticated user
