"""
Rotas administrativas de Leads — requer autenticacao.
Gerenciamento do funil de vendas.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.presentation.dependencies.auth import get_current_user_payload
from app.domain.models.lead import Lead, LeadStatus

router = APIRouter(prefix="/leads", tags=["Leads"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class LeadUpdateSchema(BaseModel):
    status: Optional[LeadStatus] = None
    observacoes: Optional[str] = None


def _to_dict(lead: Lead) -> dict:
    return {
        "id": lead.id,
        "nome": lead.nome,
        "telefone": lead.telefone,
        "email": lead.email,
        "mensagem": lead.mensagem,
        "veiculo_id": lead.veiculo_id,
        "veiculo_descricao": lead.veiculo_descricao,
        "status": lead.status.value,
        "origem": lead.origem,
        "observacoes": lead.observacoes,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }


# ─── GET /leads ───────────────────────────────────────────────────────────────

@router.get("", summary="Listar leads")
async def list_leads(
    status: Optional[LeadStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload),
):
    stmt = select(Lead).order_by(desc(Lead.created_at))
    if status:
        stmt = stmt.where(Lead.status == status)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    leads = result.scalars().all()

    # Count by status
    count_stmt = select(Lead.status, func.count(Lead.id)).group_by(Lead.status)
    count_result = await db.execute(count_stmt)
    counts = {row[0].value: row[1] for row in count_result.all()}

    return {
        "items": [_to_dict(l) for l in leads],
        "counts": counts,
        "total": sum(counts.values()),
    }


# ─── PATCH /leads/{id} ────────────────────────────────────────────────────────

@router.patch("/{lead_id}", summary="Atualizar status / observacoes do lead")
async def update_lead(
    lead_id: str,
    body: LeadUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nao encontrado")

    if body.status is not None:
        lead.status = body.status
    if body.observacoes is not None:
        lead.observacoes = body.observacoes

    await db.commit()
    await db.refresh(lead)
    return _to_dict(lead)


# ─── DELETE /leads/{id} ───────────────────────────────────────────────────────

@router.delete("/{lead_id}", summary="Remover lead")
async def delete_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nao encontrado")

    await db.delete(lead)
    await db.commit()
    return {"ok": True}
