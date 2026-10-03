from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshRequest,
)
from app.application.services.auth_service import AuthService
from app.core.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=dict)
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate and receive JWT tokens.

    Returns:
    - access_token: curto (30 min), vai no header Authorization
    - refresh_token: rotativo; cada uso devolve um novo (o antigo deixa de valer)
    """
    ip = request.client.host if request.client else "unknown"
    service = AuthService(db)
    result = await service.login(body, ip_address=ip)
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": "bearer",
        "expires_in": result["expires_in"],
        "user": {
            "id": result["user"].id,
            "nome": result["user"].nome,
            "email": result["user"].email,
            "role": result["user"].role.value,
        },
    }


@router.post("/refresh", response_model=dict)
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Troca o refresh por um par novo (access + refresh). O refresh enviado é queimado."""
    service = AuthService(db)
    return await service.refresh(body.refresh_token)


@router.post("/logout")
async def logout(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Invalidate the refresh token (blacklist in Redis)."""
    service = AuthService(db)
    await service.logout(body.refresh_token)
    return {"message": "Logout realizado com sucesso"}
