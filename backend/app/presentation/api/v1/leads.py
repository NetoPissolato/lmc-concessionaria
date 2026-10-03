"""
Rotas administrativas de Leads — requer autenticacao.
Gerenciamento do funil de vendas.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.presentation.dependencies.auth import get_current_user_payload, require_admin
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
        raise HTTPException(status_code=404, detail="Lead não encontrado")

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
    current_user: dict = Depends(require_admin),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    await db.delete(lead)
    await db.commit()
    return {"ok": True}


# ─── Alertas "me avise quando chegar" ─────────────────────────────────────────
# Antes eram gravados pelo site e ninguém via. Agora o painel lista cada pedido com os
# veículos do estoque que já atendem ao que o cliente procura (para o vendedor ligar).

alerts_router = APIRouter(prefix="/availability-alerts", tags=["Leads"])


class AlertUpdateSchema(BaseModel):
    status: str  # "pendente" | "atendido"


async def _compativeis(db: AsyncSession, alerta) -> list[dict]:
    from app.domain.models.vehicle import Vehicle, VehicleStatus, VehicleType
    stmt = select(Vehicle).where(
        Vehicle.status == VehicleStatus.DISPONIVEL,
        Vehicle.is_deleted == False,  # noqa: E712
    )
    if alerta.marca:
        stmt = stmt.where(Vehicle.marca.ilike(f"%{alerta.marca.strip()}%"))
    if alerta.modelo:
        stmt = stmt.where(Vehicle.modelo.ilike(f"%{alerta.modelo.strip()}%"))
    if alerta.tipo in ("carro", "moto"):
        stmt = stmt.where(Vehicle.tipo == VehicleType(alerta.tipo))
    if alerta.ano_min:
        stmt = stmt.where(Vehicle.ano >= alerta.ano_min)
    if alerta.ano_max:
        stmt = stmt.where(Vehicle.ano <= alerta.ano_max)
    if alerta.preco_max:
        stmt = stmt.where(Vehicle.valor_anunciado <= alerta.preco_max)
    veiculos = (await db.execute(stmt.order_by(Vehicle.created_at.desc()).limit(5))).scalars().all()
    return [
        {"id": v.id, "marca": v.marca, "modelo": v.modelo, "ano": v.ano,
         "valor_anunciado": float(v.valor_anunciado) if v.valor_anunciado else None}
        for v in veiculos
    ]


@alerts_router.get("", summary="Listar pedidos de aviso de disponibilidade")
async def list_alerts(
    response: Response,
    status: str = Query("pendente", description="pendente | atendido | todos"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload),
):
    from app.domain.models.availability_alert import AvailabilityAlert
    stmt = select(AvailabilityAlert)
    if status == "pendente":
        stmt = stmt.where(AvailabilityAlert.ativo == True)  # noqa: E712
    elif status == "atendido":
        stmt = stmt.where(AvailabilityAlert.ativo == False)  # noqa: E712
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    response.headers["X-Total-Count"] = str(total or 0)
    alertas = (await db.execute(
        stmt.order_by(desc(AvailabilityAlert.created_at)).offset(skip).limit(limit)
    )).scalars().all()
    return [
        {
            "id": a.id,
            "nome": a.nome,
            "email": a.email,
            "marca": a.marca,
            "modelo": a.modelo,
            "tipo": a.tipo,
            "ano_min": a.ano_min,
            "ano_max": a.ano_max,
            "preco_max": float(a.preco_max) if a.preco_max else None,
            "status": "pendente" if a.ativo else "atendido",
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "veiculos_compativeis": await _compativeis(db, a) if a.ativo else [],
        }
        for a in alertas
    ]


@alerts_router.patch("/{alert_id}", summary="Marcar pedido como atendido/pendente")
async def update_alert(
    alert_id: str,
    body: AlertUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload),
):
    from app.domain.models.availability_alert import AvailabilityAlert
    alerta = await db.get(AvailabilityAlert, alert_id)
    if not alerta:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if body.status not in ("pendente", "atendido"):
        raise HTTPException(status_code=422, detail="Status deve ser 'pendente' ou 'atendido'")
    alerta.ativo = body.status == "pendente"
    await db.commit()
    return {"id": alerta.id, "status": body.status}


@alerts_router.delete("/{alert_id}", summary="Remover pedido de aviso")
async def delete_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    from app.domain.models.availability_alert import AvailabilityAlert
    alerta = await db.get(AvailabilityAlert, alert_id)
    if not alerta:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    await db.delete(alerta)
    await db.commit()
    return {"ok": True}
