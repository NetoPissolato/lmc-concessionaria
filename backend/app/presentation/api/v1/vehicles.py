import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, Query, Path as FPath, UploadFile, File, HTTPException, Response
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.core.database import get_db
from app.core.config import settings
from app.presentation.dependencies.auth import get_current_user_payload, require_admin
from app.application.schemas.vehicle import (
    VehicleCreate,
    VehicleUpdate,
    VehicleResponse,
    VehicleListResponse,
)
from app.application.schemas.vehicle_photo import VehiclePhotoResponse
from app.application.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.application.services.vehicle_service import VehicleService, CATEGORIA_CAIXA
from app.application.services import financeiro_service
from app.application.services.upload_service import processar_foto_veiculo
from app.core.tempo import hoje_loja
from app.domain.models.vehicle import Vehicle, VehicleStatus, VehicleType
from app.domain.models.financial import FinancialEntry, EntryType, FinancialCategory
from app.domain.models.vehicle_expense import VehicleExpense, ExpenseCategory, PaymentMethod
from app.infrastructure.repositories.expense_repository import ExpenseRepository
from app.infrastructure.repositories.audit_repository import AuditRepository
from app.infrastructure.repositories.financial_repository import FinancialRepository
from app.infrastructure.repositories.vehicle_repository import VehicleRepository

router = APIRouter(prefix="/vehicles", tags=["Veículos"])



ORDENACOES = {
    "recentes": (Vehicle.created_at.desc(),),
    # "Parado há mais tempo" primeiro: data de compra mais antiga
    "dias_estoque_desc": (Vehicle.data_compra.asc(), Vehicle.created_at.asc()),
    "preco_asc": (Vehicle.valor_anunciado.asc().nulls_last(),),
    "preco_desc": (Vehicle.valor_anunciado.desc().nulls_last(),),
    "km_asc": (Vehicle.quilometragem.asc(),),
    "ano_desc": (Vehicle.ano.desc(), Vehicle.created_at.desc()),
}


@router.get("", response_model=List[VehicleListResponse])
async def list_vehicles(
    response: Response,
    q: Optional[str] = Query(None, description="Busca por marca, modelo, placa ou chassi"),
    status: Optional[str] = Query(None, description="Um status ou vários separados por vírgula"),
    tipo: Optional[VehicleType] = Query(None, description="Filtrar por tipo: carro ou moto"),
    marca: Optional[str] = Query(None),
    sort: str = Query("recentes", description=", ".join(ORDENACOES)),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """Lista veículos com filtros e ordenação no servidor. Total no cabeçalho X-Total-Count."""
    stmt = select(Vehicle).where(Vehicle.is_deleted == False)  # noqa: E712
    if q:
        termo = f"%{q.strip().upper()}%"
        stmt = stmt.where(or_(
            func.upper(Vehicle.marca).like(termo),
            func.upper(Vehicle.modelo).like(termo),
            func.upper(Vehicle.versao).like(termo),
            Vehicle.placa.like(termo),
            Vehicle.chassi.like(termo),
        ))
    if status:
        try:
            status_lista = [VehicleStatus(x.strip().lower()) for x in status.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(status_code=422, detail="Status inválido")
        stmt = stmt.where(Vehicle.status.in_(status_lista))
    if tipo is not None:
        stmt = stmt.where(Vehicle.tipo == tipo)
    if marca:
        stmt = stmt.where(func.lower(Vehicle.marca) == marca.strip().lower())

    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    response.headers["X-Total-Count"] = str(total or 0)

    ordem = ORDENACOES.get(sort)
    if ordem is None:
        raise HTTPException(status_code=422, detail=f"Ordenação inválida. Use: {', '.join(ORDENACOES)}")
    stmt = (
        stmt.options(selectinload(Vehicle.photos), selectinload(Vehicle.expenses))
        .order_by(*ordem)
        .offset(skip)
        .limit(limit)
    )
    return list((await db.execute(stmt)).scalars().all())


@router.get("/brands-models", summary="Marcas e modelos únicos do estoque (autocomplete)")
async def list_brands_models(
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """
    Retorna todos os pares marca+modelo únicos dos veículos ativos no estoque.
    Usado para autocomplete no cadastro de Modelos em Destaque.
    Inclui veículos de qualquer status (exceto deletados).
    """
    from app.domain.models.vehicle import Vehicle
    from sqlalchemy import distinct

    stmt = (
        select(
            Vehicle.marca,
            Vehicle.modelo,
            Vehicle.tipo,
            Vehicle.carroceria,
        )
        .where(Vehicle.deleted_at.is_(None))
        .distinct()
        .order_by(Vehicle.marca.asc(), Vehicle.modelo.asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "marca":     r.marca,
            "modelo":    r.modelo,
            "tipo":      r.tipo.value if r.tipo else "carro",
            "carroceria": r.carroceria,
        }
        for r in rows
    ]


@router.post("", response_model=VehicleResponse, status_code=201)
async def create_vehicle(
    body: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user_payload),
):
    """Register a new vehicle. Validates unique plate and chassi."""
    service = VehicleService(db)
    return await service.create_vehicle(body, created_by=user["sub"])


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: str = FPath(...),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    vehicle = await VehicleService(db).vehicle_repo.get_by_id(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    return vehicle


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: str,
    body: VehicleUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user_payload),
):
    """Update vehicle. Every change is recorded in the audit log."""
    service = VehicleService(db)
    return await service.update_vehicle(vehicle_id, body, updated_by=user["sub"])


@router.patch("/{vehicle_id}/destaque")
async def toggle_destaque(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """Toggle vehicle destaque (featured) flag. Returns {id, destaque}."""
    from app.domain.models.vehicle import Vehicle as VehicleModel
    from sqlalchemy import update as sql_update
    # Busca o veículo atual
    result = await db.execute(select(VehicleModel).where(VehicleModel.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    # Inverte o destaque
    new_destaque = not vehicle.destaque
    await db.execute(
        sql_update(VehicleModel)
        .where(VehicleModel.id == vehicle_id)
        .values(destaque=new_destaque)
    )
    await db.commit()
    # Retorna apenas os campos necessários (evita erro de carregamento de relacionamentos)
    return {"id": vehicle_id, "destaque": new_destaque}


@router.delete("/{vehicle_id}", status_code=204)
async def delete_vehicle(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_admin),  # ADMIN ONLY
):
    """Soft-delete vehicle. Only ADMIN can delete."""
    service = VehicleService(db)
    await service.delete_vehicle(vehicle_id, deleted_by=user["sub"])



@router.get("/{vehicle_id}/cost-center")
async def get_cost_center(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """Get complete cost center: purchase + all expenses + profit calculation."""
    service = VehicleService(db)
    data = await service.get_cost_center(vehicle_id)
    return {
        "vehicle_id": vehicle_id,
        "valor_compra": str(data["valor_compra"]),
        "valor_multas": str(data.get("valor_multas", "0")),
        "despesas": [
            {
                "id": e.id,
                "data": str(e.data),
                "categoria": e.categoria,
                "descricao": e.descricao,
                "valor": str(e.valor),
                "fornecedor": e.fornecedor,
            }
            for e in data["despesas"]
        ],
        "total_despesas": str(data["total_despesas"]),
        "custo_total": str(data["custo_total"]),
        "valor_anunciado": str(data["valor_anunciado"]) if data["valor_anunciado"] else None,
        "valor_minimo": str(data["valor_minimo"]) if data["valor_minimo"] else None,
        "valor_vendido": str(data["valor_vendido"]) if data["valor_vendido"] else None,
        "lucro_bruto": str(data["lucro_bruto"]) if data["lucro_bruto"] is not None else None,
        "margem_percentual": str(round(data["margem_percentual"], 2)) if data["margem_percentual"] is not None else None,
    }


@router.get("/{vehicle_id}/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    from app.infrastructure.repositories.expense_repository import ExpenseRepository
    repo = ExpenseRepository(db)
    return await repo.get_all_by_vehicle(vehicle_id)


@router.post("/{vehicle_id}/expenses", response_model=ExpenseResponse, status_code=201)
async def add_expense(
    vehicle_id: str,
    body: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user_payload),
):
    """Add expense to vehicle cost center."""
    service = VehicleService(db)
    return await service.add_expense(vehicle_id, body, created_by=user["sub"])


@router.put("/{vehicle_id}/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    vehicle_id: str,
    expense_id: str,
    body: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_admin),  # mexe no caixa: só administrador
):
    """
    Corrige uma despesa. O lançamento antigo no caixa é ESTORNADO e um novo é lançado
    com os valores corrigidos (o histórico mostra a correção).
    """
    repo = ExpenseRepository(db)
    expense = await repo.get_by_id_for_vehicle(expense_id, vehicle_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    antes = {k: str(getattr(expense, k)) for k in body.model_dump(exclude_none=True)}
    updated = await repo.update_expense(expense, **body.model_dump(exclude_none=True))

    tinha_lancamento = await db.scalar(
        select(func.count()).select_from(FinancialEntry).where(FinancialEntry.expense_id == expense_id)
    )
    if tinha_lancamento:
        await financeiro_service.estornar(
            db, FinancialEntry.expense_id == expense_id,
            motivo="despesa corrigida", usuario_id=user["sub"],
        )
        vehicle = await VehicleRepository(db).get_by_id(vehicle_id)
        db.add(FinancialEntry(
            tipo=EntryType.SAIDA,
            categoria=CATEGORIA_CAIXA.get(updated.categoria, FinancialCategory.OUTROS_SAIDA),
            descricao=f"Despesa {updated.categoria.value} — {vehicle.marca} {vehicle.modelo} ({vehicle.placa}): {updated.descricao}"[:255],
            valor=updated.valor,
            data=updated.data,
            vehicle_id=vehicle_id,
            expense_id=expense_id,
            created_by=user["sub"],
        ))

    await AuditRepository(db).log(
        usuario_id=user["sub"], acao="UPDATE", entidade="VehicleExpense", entidade_id=expense_id,
        dados_antes=antes, dados_depois=body.model_dump(mode="json", exclude_none=True),
        descricao=f"Despesa corrigida no veículo {vehicle_id}",
    )
    await db.commit()
    return updated


@router.delete("/{vehicle_id}/expenses/{expense_id}", status_code=204)
async def delete_expense(
    vehicle_id: str,
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_admin),  # mexe no caixa: só administrador
):
    """Remove a despesa do centro de custo e ESTORNA o lançamento no caixa (não apaga)."""
    repo = ExpenseRepository(db)
    expense = await repo.get_by_id_for_vehicle(expense_id, vehicle_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")

    await financeiro_service.estornar(
        db, FinancialEntry.expense_id == expense_id,
        motivo="despesa removida", usuario_id=user["sub"],
    )
    await AuditRepository(db).log(
        usuario_id=user["sub"], acao="DELETE", entidade="VehicleExpense", entidade_id=expense_id,
        dados_antes={"categoria": expense.categoria.value, "descricao": expense.descricao,
                     "valor": str(expense.valor), "data": str(expense.data)},
        descricao=f"Despesa removida do veículo {vehicle_id}",
    )
    await repo.delete_expense(expense)
    await db.commit()


@router.get("/{vehicle_id}/audit")
async def get_vehicle_audit(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_admin),  # ADMIN ONLY
):
    """Get complete audit trail for a vehicle. ADMIN only."""
    repo = AuditRepository(db)
    logs = await repo.get_by_entity("Vehicle", vehicle_id)
    return [
        {
            "id": log.id,
            "acao": log.acao,
            "descricao": log.descricao,
            "dados_antes": log.dados_antes,
            "dados_depois": log.dados_depois,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]


@router.post("/{vehicle_id}/pay-fines", status_code=200)
async def pay_vehicle_fines(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user_payload),
):
    """
    Mark vehicle fines as paid by the dealership.
    Creates a VehicleExpense (so total_despesas updates) + a FinancialEntry
    (global ledger), then clears valor_multas from the vehicle.
    """
    repo = VehicleRepository(db)
    vehicle = await repo.get_with_expenses(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    valor = vehicle.valor_multas
    if not valor or valor <= 0:
        raise HTTPException(status_code=400, detail="Veículo não possui multas pendentes")

    today = hoje_loja()
    expense_id = str(uuid.uuid4())

    # 1. VehicleExpense — appears in cost center total_despesas
    expense = VehicleExpense(
        id=expense_id,
        vehicle_id=vehicle_id,
        data=today,
        categoria=ExpenseCategory.DOCUMENTACAO,
        descricao="Pagamento de multas do documento",
        valor=valor,
        forma_pagamento=PaymentMethod.PIX,
        observacoes="Pago pela concessionaria via sistema",
    )
    db.add(expense)

    # 2. FinancialEntry — global ledger exit linked to this expense
    entry_id = str(uuid.uuid4())
    entry = FinancialEntry(
        id=entry_id,
        tipo=EntryType.SAIDA,
        categoria=FinancialCategory.MULTA,
        descricao=f"Pagamento de multas - {vehicle.marca} {vehicle.modelo} ({vehicle.placa})",
        valor=valor,
        data=today,
        vehicle_id=vehicle_id,
        expense_id=expense_id,
        created_by=user["sub"],
    )
    db.add(entry)

    # 3. Clear fines from vehicle
    vehicle.valor_multas = 0
    await db.commit()

    return {
        "message": "Multas pagas com sucesso",
        "valor_pago": str(valor),
        "expense_id": expense_id,
        "financial_entry_id": entry_id,
    }


# ─── Photo Gallery Endpoints ──────────────────────────────────────────────────

MAX_PHOTOS_PER_VEHICLE = 20
ALLOWED_PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@router.get("/{vehicle_id}/photos", response_model=List[VehiclePhotoResponse])
async def list_photos(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """List all photos for a vehicle, ordered by position."""
    from app.infrastructure.repositories.vehicle_photo_repository import VehiclePhotoRepository
    repo = VehiclePhotoRepository(db)
    return await repo.get_all_by_vehicle(vehicle_id)


@router.post("/{vehicle_id}/photos", response_model=VehiclePhotoResponse, status_code=201)
async def upload_photo(
    vehicle_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """
    Envia uma foto. Aceita JPG, PNG e WebP: o conteúdo é validado, o EXIF (GPS do
    celular) é descartado e a imagem é regravada em WebP em dois tamanhos.
    """
    from app.infrastructure.repositories.vehicle_photo_repository import VehiclePhotoRepository
    from app.domain.models.store_settings import StoreSettings

    vehicle = await VehicleRepository(db).get_by_id(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    repo = VehiclePhotoRepository(db)
    count = await repo.count_by_vehicle(vehicle_id)
    loja = (await db.execute(select(StoreSettings).limit(1))).scalar_one_or_none()
    limite = getattr(loja, "max_fotos_veiculo", None) or MAX_PHOTOS_PER_VEHICLE
    if count >= limite:
        raise HTTPException(status_code=400, detail=f"Limite de {limite} fotos por veículo atingido")

    grande, miniatura = processar_foto_veiculo(await file.read())

    pasta = Path(settings.UPLOAD_DIR) / "vehicles" / vehicle_id
    pasta.mkdir(parents=True, exist_ok=True)
    base = str(uuid.uuid4())
    (pasta / f"{base}.webp").write_bytes(grande)
    (pasta / f"{base}_thumb.webp").write_bytes(miniatura)

    photo = await repo.create(
        vehicle_id=vehicle_id,
        filename=f"{base}.webp",
        url=f"/uploads/vehicles/{vehicle_id}/{base}.webp",
        thumb_url=f"/uploads/vehicles/{vehicle_id}/{base}_thumb.webp",
        is_main=count == 0,  # a primeira foto vira a capa
        ordem=count,
    )
    await db.commit()
    await db.refresh(photo)
    return photo


@router.patch("/{vehicle_id}/photos/{photo_id}/main", response_model=VehiclePhotoResponse)
async def set_main_photo(
    vehicle_id: str,
    photo_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """Set a photo as the vehicle's main/cover photo."""
    from app.infrastructure.repositories.vehicle_photo_repository import VehiclePhotoRepository

    repo = VehiclePhotoRepository(db)
    photo = await repo.get_by_id_for_vehicle(photo_id, vehicle_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Foto não encontrada")

    updated = await repo.set_main(photo_id, vehicle_id)
    await db.commit()
    await db.refresh(updated)
    return updated


@router.delete("/{vehicle_id}/photos/{photo_id}", status_code=204)
async def delete_photo(
    vehicle_id: str,
    photo_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """Delete a photo from the vehicle gallery. Also removes the file from disk."""
    from app.infrastructure.repositories.vehicle_photo_repository import VehiclePhotoRepository

    repo = VehiclePhotoRepository(db)
    photo = await repo.get_by_id_for_vehicle(photo_id, vehicle_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Foto não encontrada")

    thumb_url = photo.thumb_url
    filename = await repo.delete(photo)
    await db.commit()

    # Remove os arquivos (grande e miniatura). Path(...).name impede sair da pasta do veículo.
    pasta = Path(settings.UPLOAD_DIR) / "vehicles" / vehicle_id
    for nome in filter(None, [filename, thumb_url and Path(thumb_url).name]):
        arquivo = pasta / Path(nome).name
        if arquivo.exists():
            arquivo.unlink()

