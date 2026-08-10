"""
Settings API — Configurações da loja.

GET  /api/v1/settings        → admin only — retorna tudo
PUT  /api/v1/settings        → admin only — atualiza
GET  /api/v1/public/settings → público — retorna só campos do site
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.presentation.dependencies.auth import require_admin
from app.domain.models.store_settings import StoreSettings

router = APIRouter(prefix="/settings", tags=["Configurações"])


# ─── Schema ──────────────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    whatsapp:         Optional[str] = None
    telefone:         Optional[str] = None
    email_contato:    Optional[str] = None
    instagram:        Optional[str] = None
    facebook:         Optional[str] = None
    youtube:          Optional[str] = None
    nome_loja:        Optional[str] = None
    slogan:           Optional[str] = None
    endereco:         Optional[str] = None
    cidade:           Optional[str] = None
    estado:           Optional[str] = None
    cep:              Optional[str] = None
    cnpj:             Optional[str] = None
    horario:          Optional[str] = None
    hero_titulo:      Optional[str] = None
    hero_subtitulo:   Optional[str] = None
    stat_clientes:    Optional[int] = None
    stat_anos:        Optional[int] = None
    stat_satisfacao:  Optional[int] = None
    max_fotos_veiculo: Optional[int] = None
    modo_manutencao:  Optional[bool] = None


# ─── Helper: get or create singleton ────────────────────────────────────────

async def _get_or_create(db: AsyncSession) -> StoreSettings:
    result = await db.execute(select(StoreSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = StoreSettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


def _to_dict(s: StoreSettings) -> dict:
    return {
        "whatsapp":          s.whatsapp,
        "telefone":          s.telefone,
        "email_contato":     s.email_contato,
        "instagram":         s.instagram,
        "facebook":          s.facebook,
        "youtube":           s.youtube,
        "nome_loja":         s.nome_loja,
        "slogan":            s.slogan,
        "endereco":          s.endereco,
        "cidade":            s.cidade,
        "estado":            s.estado,
        "cep":               s.cep,
        "cnpj":              s.cnpj,
        "horario":           s.horario,
        "hero_titulo":       s.hero_titulo,
        "hero_subtitulo":    s.hero_subtitulo,
        "stat_clientes":     s.stat_clientes,
        "stat_anos":         s.stat_anos,
        "stat_satisfacao":   s.stat_satisfacao,
        "max_fotos_veiculo": s.max_fotos_veiculo,
        "modo_manutencao":   s.modo_manutencao,
        "updated_at":        s.updated_at.isoformat() if s.updated_at else None,
    }


# ─── GET /settings ────────────────────────────────────────────────────────────

@router.get("", summary="Retorna configurações da loja (admin)")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_admin),
):
    s = await _get_or_create(db)
    return _to_dict(s)


# ─── PUT /settings ────────────────────────────────────────────────────────────

@router.put("", summary="Atualiza configurações da loja (admin)")
async def update_settings(
    body: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_admin),
):
    s = await _get_or_create(db)

    update_data = body.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(s, field, value)

    s.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(s)
    return _to_dict(s)
