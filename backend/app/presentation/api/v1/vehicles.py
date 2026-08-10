import os
import uuid
import shutil
from pathlib import Path
from datetime import date as today_date
from fastapi import APIRouter, Depends, Query, Path as FPath, UploadFile, File, HTTPException
from sqlalchemy import select, delete as sql_delete
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
from app.application.services.vehicle_service import VehicleService
from app.domain.models.vehicle import VehicleStatus, VehicleType
from app.domain.models.financial import FinancialEntry, EntryType, FinancialCategory
from app.domain.models.vehicle_expense import VehicleExpense, ExpenseCategory, PaymentMethod
from app.infrastructure.repositories.expense_repository import ExpenseRepository
from app.infrastructure.repositories.audit_repository import AuditRepository
from app.infrastructure.repositories.financial_repository import FinancialRepository
from app.infrastructure.repositories.vehicle_repository import VehicleRepository

router = APIRouter(prefix="/vehicles", tags=["Veículos"])



@router.get("", response_model=List[VehicleListResponse])
async def list_vehicles(
    q: Optional[str] = Query(None, description="Busca por marca, modelo, placa ou chassi"),
    status: Optional[VehicleStatus] = Query(None),
    tipo: Optional[VehicleType] = Query(None, description="Filtrar por tipo: carro ou moto"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """List vehicles with optional search and filters."""
    service = VehicleService(db)
    vehicles = await service.list_vehicles(query=q, status=status, tipo=tipo, skip=skip, limit=limit)
    return vehicles


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
    service = VehicleService(db)
    return await service.vehicle_repo.get_by_id(vehicle_id)


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
    _user: dict = Depends(get_current_user_payload),
):
    """Update an existing expense and sync with financial ledger."""
    repo = ExpenseRepository(db)
    expense = await repo.get_by_id_for_vehicle(expense_id, vehicle_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    updated = await repo.update_expense(expense, **body.model_dump(exclude_none=True))

    # Sync financial entry if exists
    from sqlalchemy import select as sql_select
    result = await db.execute(
        sql_select(FinancialEntry).where(FinancialEntry.expense_id == expense_id)
    )
    fin_entry = result.scalar_one_or_none()
    if fin_entry:
        update_fields = body.model_dump(exclude_none=True)
        if "valor" in update_fields:
            fin_entry.valor = update_fields["valor"]
        if "data" in update_fields:
            fin_entry.data = update_fields["data"]
        if "descricao" in update_fields:
            fin_entry.descricao = f"{update_fields.get('descricao', fin_entry.descricao)}"

    await db.commit()
    return updated


@router.delete("/{vehicle_id}/expenses/{expense_id}", status_code=204)
async def delete_expense(
    vehicle_id: str,
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """Delete an expense from the vehicle cost center and remove from financial ledger."""
    repo = ExpenseRepository(db)
    expense = await repo.get_by_id_for_vehicle(expense_id, vehicle_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")

    # Remove matching financial entry (cascade)
    await db.execute(
        sql_delete(FinancialEntry).where(FinancialEntry.expense_id == expense_id)
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
        raise HTTPException(status_code=404, detail="Veiculo nao encontrado")

    valor = vehicle.valor_multas
    if not valor or valor <= 0:
        raise HTTPException(status_code=400, detail="Veiculo nao possui multas pendentes")

    today = today_date.today()
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
    """Upload a photo for a vehicle. Accepts jpg, jpeg, png, webp. Max 10MB."""
    from app.infrastructure.repositories.vehicle_photo_repository import VehiclePhotoRepository
    from app.infrastructure.repositories.vehicle_repository import VehicleRepository

    # Verify vehicle exists
    vehicle_repo = VehicleRepository(db)
    vehicle = await vehicle_repo.get_by_id(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    # Validate file extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_PHOTO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato inválido. Use: {', '.join(ALLOWED_PHOTO_EXTENSIONS)}"
        )

    # Validate file size
    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande. Máximo: {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    repo = VehiclePhotoRepository(db)

    # Check photo limit
    count = await repo.count_by_vehicle(vehicle_id)
    if count >= MAX_PHOTOS_PER_VEHICLE:
        raise HTTPException(
            status_code=400,
            detail=f"Limite de {MAX_PHOTOS_PER_VEHICLE} fotos por veículo atingido"
        )

    # Save file to disk
    vehicle_upload_dir = Path(settings.UPLOAD_DIR) / "vehicles" / vehicle_id
    vehicle_upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4()}{ext}"
    file_path = vehicle_upload_dir / filename
    with open(file_path, "wb") as f:
        f.write(content)

    url = f"/uploads/vehicles/{vehicle_id}/{filename}"
    is_main = count == 0  # First photo is automatically the main one

    photo = await repo.create(
        vehicle_id=vehicle_id,
        filename=filename,
        url=url,
        is_main=is_main,
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

    filename = await repo.delete(photo)
    await db.commit()

    # Remove file from disk
    file_path = Path(settings.UPLOAD_DIR) / "vehicles" / vehicle_id / filename
    if file_path.exists():
        file_path.unlink()

