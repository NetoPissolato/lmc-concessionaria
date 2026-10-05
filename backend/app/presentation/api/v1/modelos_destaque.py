"""
Router admin para gerenciar Modelos em Destaque (seção da home).
Requer autenticação de admin.
"""
import uuid
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.presentation.dependencies.auth import require_admin
from app.domain.models.modelo_destaque import ModeloDestaque
from app.application.schemas.modelo_destaque import (
    ModeloDestaqueCreate,
    ModeloDestaqueUpdate,
    ModeloDestaqueResponse,
)

router = APIRouter(prefix="/modelos-destaque", tags=["Modelos Destaque"])


@router.get("", response_model=List[ModeloDestaqueResponse])
async def list_modelos_destaque(
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """Lista todos os modelos em destaque (ativos e inativos)."""
    result = await db.execute(
        select(ModeloDestaque)
        .order_by(ModeloDestaque.ordem.asc(), ModeloDestaque.created_at.asc())
    )
    return result.scalars().all()


@router.post("", response_model=ModeloDestaqueResponse, status_code=201)
async def create_modelo_destaque(
    body: ModeloDestaqueCreate,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """Cria um novo modelo em destaque."""
    modelo = ModeloDestaque(
        id=str(uuid.uuid4()),
        marca=body.marca.strip(),
        modelo=body.modelo.strip(),
        carroceria=body.carroceria.lower(),
        ativo=body.ativo,
        ordem=body.ordem,
    )
    db.add(modelo)
    await db.commit()
    await db.refresh(modelo)
    return modelo


@router.put("/{modelo_id}", response_model=ModeloDestaqueResponse)
async def update_modelo_destaque(
    modelo_id: str,
    body: ModeloDestaqueUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """Atualiza um modelo em destaque."""
    result = await db.execute(
        select(ModeloDestaque).where(ModeloDestaque.id == modelo_id)
    )
    modelo = result.scalar_one_or_none()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(modelo, field, value)

    await db.commit()
    await db.refresh(modelo)
    return modelo


@router.delete("/{modelo_id}", status_code=204)
async def delete_modelo_destaque(
    modelo_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """Remove um modelo em destaque."""
    result = await db.execute(
        select(ModeloDestaque).where(ModeloDestaque.id == modelo_id)
    )
    modelo = result.scalar_one_or_none()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    await db.delete(modelo)
    await db.commit()


@router.post("/{modelo_id}/imagem", response_model=ModeloDestaqueResponse)
async def upload_modelo_imagem(
    modelo_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """Faz upload da imagem de um modelo em destaque."""
    import io
    from pathlib import Path
    from app.core.config import settings

    result = await db.execute(
        select(ModeloDestaque).where(ModeloDestaque.id == modelo_id)
    )
    modelo = result.scalar_one_or_none()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="Apenas imagens são permitidas")

    content = await file.read()
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Imagem muito grande (máx. 8MB)")

    # Valida o conteúdo, descarta EXIF e grava em WebP (fora do event loop)
    def _converter(dados: bytes) -> bytes:
        from PIL import Image, ImageOps
        Image.open(io.BytesIO(dados)).verify()
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(dados))).convert("RGB")
        img.thumbnail((1200, 800), Image.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=84, method=5)
        return out.getvalue()

    try:
        from starlette.concurrency import run_in_threadpool
        final_bytes = await run_in_threadpool(_converter, content)
    except Exception:
        raise HTTPException(status_code=422, detail="Imagem inválida ou corrompida")

    # Nome novo a cada envio: o nginx cacheia /uploads por 30 dias, então reaproveitar
    # o mesmo nome fazia a imagem trocada nunca aparecer para quem já tinha visitado.
    modelos_dir = Path(settings.UPLOAD_DIR) / "modelos"
    modelos_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{modelo_id}-{uuid.uuid4().hex[:8]}.webp"
    (modelos_dir / filename).write_bytes(final_bytes)
    if modelo.imagem_url and modelo.imagem_url.startswith("/uploads/modelos/"):
        antigo = modelos_dir / Path(modelo.imagem_url).name
        if antigo.exists():
            antigo.unlink()

    modelo.imagem_url = f"/uploads/modelos/{filename}"
    await db.commit()
    await db.refresh(modelo)
    return modelo


@router.delete("/{modelo_id}/imagem", response_model=ModeloDestaqueResponse)
async def remove_modelo_imagem(
    modelo_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """Remove a imagem de um modelo (vai usar o fallback do estoque)."""
    result = await db.execute(
        select(ModeloDestaque).where(ModeloDestaque.id == modelo_id)
    )
    modelo = result.scalar_one_or_none()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    modelo.imagem_url = None
    await db.commit()
    await db.refresh(modelo)
    return modelo
