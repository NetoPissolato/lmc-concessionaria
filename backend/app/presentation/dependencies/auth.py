from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.domain.models.user import User, UserRole

security = HTTPBearer()


async def get_current_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
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

    # Uma consulta por chave primária a cada requisição: é o preço de poder derrubar a
    # sessão de quem foi desativado, demitido ou trocou a senha — na hora, não daqui a um ano.
    row = (await db.execute(
        select(User.ativo, User.is_deleted, User.sessao_versao, User.role).where(User.id == payload.get("sub"))
    )).one_or_none()
    if (
        not row
        or not row.ativo
        or row.is_deleted
        or int(payload.get("sv", 0)) != (row.sessao_versao or 0)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão encerrada. Faça login novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # O papel vale o que está no banco agora (rebaixar um admin vale imediatamente)
    payload["role"] = row.role.value
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
