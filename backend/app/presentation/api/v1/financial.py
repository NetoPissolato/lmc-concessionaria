from decimal import Decimal
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.presentation.dependencies.auth import require_admin
from app.domain.models.financial import FinancialEntry, EntryType
from app.domain.models.vehicle_photo import VehiclePhoto

# O financeiro inteiro é do administrador: entradas, saídas, custo e margem de cada carro.
router = APIRouter(prefix="/financial", tags=["Financeiro"])


@router.get("")
async def list_entries(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    tipo: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_admin),
):
    """Lançamentos do caixa (inclui estornos). Total sem paginação em X-Total-Count."""
    stmt = select(FinancialEntry)
    if tipo in ("entrada", "saida"):
        stmt = stmt.where(FinancialEntry.tipo == EntryType(tipo))
    if year:
        stmt = stmt.where(extract("year", FinancialEntry.data) == year)
    if month:
        stmt = stmt.where(extract("month", FinancialEntry.data) == month)

    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    response.headers["X-Total-Count"] = str(total or 0)

    stmt = stmt.order_by(
        FinancialEntry.data.desc(),
        FinancialEntry.created_at.desc(),  # desempate: mais recente primeiro
    ).offset(skip).limit(limit)
    entries = list((await db.execute(stmt)).scalars().all())

    # Foto do veículo vinculado (a principal; senão a primeira)
    vehicle_ids = list({e.vehicle_id for e in entries if e.vehicle_id})
    foto_map: dict = {}
    if vehicle_ids:
        fotos = (await db.execute(
            select(VehiclePhoto)
            .where(VehiclePhoto.vehicle_id.in_(vehicle_ids))
            .order_by(VehiclePhoto.is_main.desc(), VehiclePhoto.ordem.asc())
        )).scalars().all()
        for foto in fotos:
            foto_map.setdefault(foto.vehicle_id, foto.thumb_url or foto.url)

    return [
        {
            "id":            e.id,
            "tipo":          e.tipo,
            "categoria":     e.categoria,
            "descricao":     e.descricao,
            "valor":         float(e.valor),
            "data":          e.data.isoformat(),
            "venda_id":      e.venda_id,
            "vehicle_id":    e.vehicle_id,
            "foto_url":      foto_map.get(e.vehicle_id) if e.vehicle_id else None,
            "expense_id":    e.expense_id,
            "estorno_de_id": e.estorno_de_id,
            "observacoes":   e.observacoes,
            "created_at":    e.created_at.isoformat(),
        }
        for e in entries
    ]


@router.get("/summary")
async def get_financial_summary(
    year: int = Query(...),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_admin),
):
    """
    Com `month`: totais do mês. Sem `month`: série dos 12 meses do ano, agregada no
    banco (o gráfico anual não depende mais de baixar os lançamentos para o navegador).
    """
    linhas = (await db.execute(
        select(
            extract("month", FinancialEntry.data).label("mes"),
            FinancialEntry.tipo,
            func.coalesce(func.sum(FinancialEntry.valor), 0),
        )
        .where(extract("year", FinancialEntry.data) == year)
        .group_by(extract("month", FinancialEntry.data), FinancialEntry.tipo)
    )).all()

    meses = {m: {"entradas": Decimal("0"), "saidas": Decimal("0")} for m in range(1, 13)}
    for mes, tipo, valor in linhas:
        chave = "entradas" if tipo == EntryType.ENTRADA else "saidas"
        meses[int(mes)][chave] += Decimal(str(valor))

    if month:
        e, s = meses[month]["entradas"], meses[month]["saidas"]
        return {
            "year": year,
            "month": month,
            "total_entradas": float(e),
            "total_saidas": float(s),
            "saldo": float(e - s),
            # nome antigo mantido por compatibilidade: é saldo de caixa, não lucro
            "lucro_liquido": float(e - s),
        }

    serie = [
        {"mes": m, "entradas": float(v["entradas"]), "saidas": float(v["saidas"]),
         "saldo": float(v["entradas"] - v["saidas"])}
        for m, v in meses.items()
    ]
    total_e = sum(x["entradas"] for x in serie)
    total_s = sum(x["saidas"] for x in serie)
    return {"year": year, "meses": serie, "total_entradas": total_e, "total_saidas": total_s,
            "saldo": total_e - total_s}
