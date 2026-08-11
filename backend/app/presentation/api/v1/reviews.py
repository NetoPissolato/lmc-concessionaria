"""
Rotas administrativas de Reviews — requer autenticacao.
Moderacao de avaliacoes de clientes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional

from app.core.database import get_db
from app.presentation.dependencies.auth import get_current_user_payload
from app.domain.models.review import Review

router = APIRouter(prefix="/reviews", tags=["Reviews"])


def _to_dict(r: Review) -> dict:
    return {
        "id": r.id,
        "nome": r.nome,
        "nota": r.nota,
        "texto": r.texto,
        "foto_url": r.foto_url,
        "cidade": r.cidade,
        "aprovado": r.aprovado,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


# ─── GET /reviews ─────────────────────────────────────────────────────────────

@router.get("", summary="Listar reviews (admin)")
async def list_reviews(
    aprovado: Optional[bool] = Query(None, description="Filtrar por status de aprovacao"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload),
):
    stmt = select(Review).order_by(desc(Review.created_at))
    if aprovado is not None:
        stmt = stmt.where(Review.aprovado == aprovado)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    reviews = result.scalars().all()
    return [_to_dict(r) for r in reviews]


# ─── PATCH /reviews/{id} — Aprovar ou reprovar ────────────────────────────────

@router.patch("/{review_id}", summary="Aprovar ou reprovar review")
async def update_review(
    review_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review nao encontrada")

    if "aprovado" in body:
        review.aprovado = bool(body["aprovado"])

    await db.commit()
    await db.refresh(review)
    return _to_dict(review)


# ─── DELETE /reviews/{id} ─────────────────────────────────────────────────────

@router.delete("/{review_id}", summary="Remover review")
async def delete_review(
    review_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review nao encontrada")

    await db.delete(review)
    await db.commit()
    return {"ok": True}
