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
from pydantic import BaseModel, Field, field_validator
from typing import Optional

from app.core.database import get_db
from app.presentation.dependencies.auth import require_admin
from app.domain.models.store_settings import StoreSettings

router = APIRouter(prefix="/settings", tags=["Configurações"])


# ─── Schema ──────────────────────────────────────────────────────────────────

# Limites = tamanho das colunas de store_settings (texto maior virava erro 500)
class SettingsUpdate(BaseModel):
    whatsapp:         Optional[str] = Field(None, max_length=20)
    telefone:         Optional[str] = Field(None, max_length=20)
    email_contato:    Optional[str] = Field(None, max_length=120)
    instagram:        Optional[str] = Field(None, max_length=200)
    facebook:         Optional[str] = Field(None, max_length=200)
    youtube:          Optional[str] = Field(None, max_length=200)
    nome_loja:        Optional[str] = Field(None, max_length=100)
    slogan:           Optional[str] = Field(None, max_length=200)
    endereco:         Optional[str] = Field(None, max_length=200)
    cidade:           Optional[str] = Field(None, max_length=100)
    estado:           Optional[str] = Field(None, max_length=2)
    cep:              Optional[str] = Field(None, max_length=10)
    cnpj:             Optional[str] = Field(None, max_length=20)
    horario:          Optional[str] = Field(None, max_length=300)
    hero_titulo:      Optional[str] = Field(None, max_length=200)
    hero_subtitulo:   Optional[str] = Field(None, max_length=300)
    stat_clientes:    Optional[int] = Field(None, ge=0, le=10_000_000)
    stat_anos:        Optional[int] = Field(None, ge=0, le=200)
    stat_satisfacao:  Optional[int] = Field(None, ge=0, le=100)
    max_fotos_veiculo: Optional[int] = Field(None, ge=1, le=40)
    modo_manutencao:  Optional[bool] = None
    ga_id:            Optional[str] = Field(None, max_length=50)
    pixel_id:         Optional[str] = Field(None, max_length=50)

    @field_validator("estado")
    @classmethod
    def uf_maiuscula(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if v else v


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
        "ga_id":             s.ga_id or "",
        "pixel_id":          s.pixel_id or "",
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
