from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.presentation.dependencies.auth import get_current_user_payload, require_admin

router = APIRouter(prefix="/financial", tags=["Financeiro"])


@router.get("")
async def list_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    tipo: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """List financial entries with optional tipo, year, month filters."""
    from sqlalchemy import select, extract
    from app.domain.models.financial import FinancialEntry, EntryType
    from app.domain.models.vehicle_photo import VehiclePhoto

    stmt = select(FinancialEntry).order_by(FinancialEntry.data.desc())

    if tipo in ("entrada", "saida"):
        stmt = stmt.where(FinancialEntry.tipo == EntryType(tipo))

    if year:
        stmt = stmt.where(extract("year", FinancialEntry.data) == year)

    if month:
        stmt = stmt.where(extract("month", FinancialEntry.data) == month)

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    entries = list(result.scalars().all())

    # Busca fotos principais dos veículos vinculados
    vehicle_ids = list({e.vehicle_id for e in entries if e.vehicle_id})
    foto_map: dict = {}
    if vehicle_ids:
        photos_result = await db.execute(
            select(VehiclePhoto)
            .where(VehiclePhoto.vehicle_id.in_(vehicle_ids), VehiclePhoto.is_main == True)  # noqa: E712
        )
        for photo in photos_result.scalars().all():
            foto_map[photo.vehicle_id] = photo.url
        # Para veículos sem foto principal, pega a primeira foto disponível
        missing = [vid for vid in vehicle_ids if vid not in foto_map]
        if missing:
            first_photos = await db.execute(
                select(VehiclePhoto).where(VehiclePhoto.vehicle_id.in_(missing))
            )
            for photo in first_photos.scalars().all():
                if photo.vehicle_id not in foto_map:
                    foto_map[photo.vehicle_id] = photo.url

    return [
        {
            "id":          e.id,
            "tipo":        e.tipo,
            "categoria":   e.categoria,
            "descricao":   e.descricao,
            "valor":       float(e.valor),
            "data":        e.data.isoformat(),
            "venda_id":    e.venda_id,
            "vehicle_id":  e.vehicle_id,
            "foto_url":    foto_map.get(e.vehicle_id) if e.vehicle_id else None,
            "expense_id":  e.expense_id,
            "observacoes": e.observacoes,
            "created_at":  e.created_at.isoformat(),
        }
        for e in entries
    ]


@router.get("/summary")
async def get_financial_summary(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_admin),
):
    """Monthly financial summary: total in, total out, net profit."""
    from sqlalchemy import select, func, extract
    from app.domain.models.financial import FinancialEntry, EntryType

    entradas_q = await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.valor), 0))
        .where(
            FinancialEntry.tipo == EntryType.ENTRADA,
            extract("year",  FinancialEntry.data) == year,
            extract("month", FinancialEntry.data) == month,
        )
    )
    saidas_q = await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.valor), 0))
        .where(
            FinancialEntry.tipo == EntryType.SAIDA,
            extract("year",  FinancialEntry.data) == year,
            extract("month", FinancialEntry.data) == month,
        )
    )

    total_entradas = float(entradas_q.scalar_one())
    total_saidas   = float(saidas_q.scalar_one())

    return {
        "year":           year,
        "month":          month,
        "total_entradas": total_entradas,
        "total_saidas":   total_saidas,
        "lucro_liquido":  total_entradas - total_saidas,
    }
