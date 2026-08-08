from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional, List

from app.core.database import get_db
from app.presentation.dependencies.auth import get_current_user_payload, require_admin
from app.application.schemas.sale_customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    SaleCreate,
    SaleStatusUpdate,
    SaleResponse,
)
from app.infrastructure.repositories.sale_customer_repository import (
    CustomerRepository,
    SaleRepository,
)
from app.application.services.sale_service import SaleService
from app.domain.models.sale import Sale, SaleStatus
from app.domain.models.user import User as UserModel
from app.domain.models.vehicle import Vehicle, VehicleStatus
from app.domain.models.vehicle_photo import VehiclePhoto
from app.infrastructure.repositories.financial_repository import FinancialRepository
from app.infrastructure.ws_manager import ws_manager

# ─── Customers ────────────────────────────────────────────────────────────────
customers_router = APIRouter(prefix="/customers", tags=["Clientes"])


@customers_router.get("", response_model=List[CustomerResponse])
async def list_customers(
    q: Optional[str] = Query(None, description="Busca por nome, CPF, telefone ou email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    repo = CustomerRepository(db)
    if q:
        return await repo.search(q, skip=skip, limit=limit)
    return await repo.get_all(skip=skip, limit=limit)


@customers_router.post("", response_model=CustomerResponse, status_code=201)
async def create_customer(
    body: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user_payload),
):
    repo = CustomerRepository(db)
    if body.cpf_cnpj:
        existing = await repo.get_by_cpf(body.cpf_cnpj)
        if existing:
            raise HTTPException(status_code=409, detail="CPF/CNPJ já cadastrado")
    return await repo.create(**body.model_dump())


@customers_router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    repo = CustomerRepository(db)
    customer = await repo.get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return customer


@customers_router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    body: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    repo = CustomerRepository(db)
    customer = await repo.get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return await repo.update(customer, **body.model_dump(exclude_none=True))


@customers_router.delete("/{customer_id}", status_code=204)
async def delete_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_admin),
):
    repo = CustomerRepository(db)
    customer = await repo.get_by_id(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    await repo.soft_delete(customer, deleted_by=user["sub"])


# ─── Sales ─────────────────────────────────────────────────────────────────────
sales_router = APIRouter(prefix="/sales", tags=["Vendas"])


@sales_router.get("", response_model=list)
async def list_sales(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = Query(None, description="Filter by status: pendente, concluida, cancelada"),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    stmt = (
        select(Sale)
        .options(
            selectinload(Sale.vehicle).selectinload(Vehicle.photos),
            selectinload(Sale.cliente),
            selectinload(Sale.vendedor),
        )
        .where(Sale.is_deleted == False)
        .order_by(Sale.data_venda.desc())
    )

    if status and status in ("pendente", "concluida", "cancelada"):
        stmt = stmt.where(Sale.status == SaleStatus(status))

    if year:
        stmt = stmt.where(extract("year", Sale.data_venda) == year)

    if month:
        stmt = stmt.where(extract("month", Sale.data_venda) == month)

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    sales = list(result.scalars().all())

    out = []
    for s in sales:
        vehicle_info = None
        vehicle_tipo = "carro"
        if s.vehicle:
            vehicle_info = f"{s.vehicle.marca} {s.vehicle.modelo} {s.vehicle.ano}"
            if s.vehicle.tipo is None:
                vehicle_tipo = "carro"
            else:
                vehicle_tipo = str(s.vehicle.tipo).lower().replace("vehicletype.", "")

        out.append({
            "id": s.id,
            "cliente_id": s.cliente_id,
            "vehicle_id": s.vehicle_id,
            "vendedor_id": s.vendedor_id,
            "valor_venda": float(s.valor_venda),
            "valor_entrada": float(s.valor_entrada),
            "valor_financiado": float(s.valor_financiado),
            "parcelas": s.parcelas,
            "forma_pagamento": s.forma_pagamento,
            "banco_financiamento": s.banco_financiamento,
            "comissao_percentual": float(s.comissao_percentual),
            "comissao_valor": float(s.comissao_valor),
            "data_venda": s.data_venda.isoformat(),
            "data_entrega": s.data_entrega.isoformat() if s.data_entrega else None,
            "status": s.status,
            "observacoes": s.observacoes,
            "created_at": s.created_at.isoformat(),
            "cliente_nome": s.cliente.nome if s.cliente else None,
            "vehicle_info": vehicle_info,
            "vehicle_tipo": vehicle_tipo,
            "vendedor_nome": s.vendedor.nome if s.vendedor else None,
            "vehicle_placa": s.vehicle.placa if s.vehicle else None,
            "vehicle_cor": s.vehicle.cor if s.vehicle else None,
            "vehicle_photos": [
                {"url": p.url, "is_main": p.is_main}
                for p in (s.vehicle.photos or [])
            ] if s.vehicle else [],
            "payment_methods": s.payment_methods or None,
        })

    return out


@sales_router.post("", status_code=201)
async def create_sale(
    body: SaleCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user_payload),
):
    """
    Register a sale.
    Automatically:
    - Sets vehicle status to VENDIDO
    - Creates financial entry
    - Calculates commission
    """
    # Auto-fill vendedor_id from the authenticated user if not provided
    if not body.vendedor_id:
        body = SaleCreate(**{**body.model_dump(), "vendedor_id": user["sub"]})
    service = SaleService(db)
    return await service.create_sale(body, created_by=user["sub"])



@sales_router.get("/dashboard")
async def get_dashboard(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """Dashboard KPIs and charts."""
    service = SaleService(db)
    return await service.get_dashboard_stats(year, month)


@sales_router.get("/{sale_id}")
async def get_sale(
    sale_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    repo = SaleRepository(db)
    s = await repo.get_with_relations(sale_id)
    if not s:
        raise HTTPException(status_code=404, detail="Venda não encontrada")

    vehicle_info = f"{s.vehicle.marca} {s.vehicle.modelo} {s.vehicle.ano}" if s.vehicle else None

    # Fetch vehicle photos directly — more reliable than selectinload chain
    vehicle_photos = []
    if s.vehicle_id:
        photos_result = await db.execute(
            select(VehiclePhoto)
            .where(VehiclePhoto.vehicle_id == s.vehicle_id)
            .order_by(VehiclePhoto.is_main.desc(), VehiclePhoto.ordem.asc())
        )
        vehicle_photos = [
            {"url": p.url, "is_main": p.is_main}
            for p in photos_result.scalars().all()
        ]

    return {
        "id": s.id,
        "cliente_id": s.cliente_id,
        "vehicle_id": s.vehicle_id,
        "vendedor_id": s.vendedor_id,
        "valor_venda": float(s.valor_venda),
        "valor_entrada": float(s.valor_entrada),
        "valor_financiado": float(s.valor_financiado),
        "parcelas": s.parcelas,
        "forma_pagamento": s.forma_pagamento,
        "banco_financiamento": s.banco_financiamento,
        "comissao_percentual": float(s.comissao_percentual),
        "comissao_valor": float(s.comissao_valor),
        "data_venda": s.data_venda.isoformat(),
        "data_entrega": s.data_entrega.isoformat() if s.data_entrega else None,
        "status": s.status,
        "observacoes": s.observacoes,
        "created_at": s.created_at.isoformat(),
        "cliente_nome": s.cliente.nome if s.cliente else None,
        "vehicle_info": vehicle_info,
        "vehicle_tipo": str(s.vehicle.tipo).lower().replace("vehicletype.", "") if s.vehicle and s.vehicle.tipo else "carro",
        "vendedor_nome": s.vendedor.nome if s.vendedor else None,
        "vehicle_placa": s.vehicle.placa if s.vehicle else None,
        "vehicle_cor": s.vehicle.cor if s.vehicle else None,
        "vehicle_photos": vehicle_photos,
        "payment_methods": s.payment_methods or None,
    }



@sales_router.patch("/{sale_id}/status")
async def update_sale_status(
    sale_id: str,
    body: SaleStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user_payload),
):
    repo = SaleRepository(db)
    s = await repo.get_with_relations(sale_id)
    if not s:
        raise HTTPException(status_code=404, detail="Venda não encontrada")

    old_status = s.status.value if hasattr(s.status, "value") else str(s.status)
    new_status = body.status.value if hasattr(body.status, "value") else str(body.status)

    if old_status == new_status:
        raise HTTPException(status_code=400, detail="Status já é o mesmo")

    # Fetch vehicle
    vehicle = None
    if s.vehicle_id:
        veh_result = await db.execute(select(Vehicle).where(Vehicle.id == s.vehicle_id))
        vehicle = veh_result.scalar_one_or_none()

    # → concluida: mark vehicle as VENDIDO (from pendente OR cancelada)
    if new_status == "concluida":
        if vehicle:
            vehicle.status = VehicleStatus.VENDIDO
            vehicle.valor_vendido = s.valor_venda
        # Create financial entries only when coming from pendente (first conclusion)
        # When coming from cancelada, financial entries were deleted on cancel — recreate them
        if old_status in ("pendente", "cancelada"):
            svc = SaleService(db)
            await svc.create_financial_for_sale(s, user["sub"])

    # any → cancelada: revert vehicle to DISPONIVEL + apaga entradas financeiras
    elif new_status == "cancelada":
        if vehicle:
            veh_val = vehicle.status.value if hasattr(vehicle.status, "value") else str(vehicle.status)
            if veh_val == "vendido":
                vehicle.status = VehicleStatus.DISPONIVEL
            vehicle.valor_vendido = None  # apaga valor vendido — não aparece mais na lucratividade
        # Apaga todas as entradas financeiras desta venda
        fin_repo = FinancialRepository(db)
        await fin_repo.delete_by_venda_id(s.id)

    # concluida → pendente: revert vehicle to DISPONIVEL + apaga entradas financeiras
    elif old_status == "concluida" and new_status == "pendente":
        if vehicle:
            vehicle.status = VehicleStatus.DISPONIVEL
            vehicle.valor_vendido = None  # remove da lucratividade
        fin_repo = FinancialRepository(db)
        await fin_repo.delete_by_venda_id(s.id)

    s.status = SaleStatus(new_status)
    await db.commit()
    await db.refresh(s)

    # Broadcast real-time event to all connected browsers
    await ws_manager.broadcast("sale_updated", {
        "sale_id": s.id,
        "old_status": old_status,
        "new_status": new_status,
    })

    return {"id": s.id, "status": s.status.value}


# ─── Customer Purchases ────────────────────────────────────────────────────────
@customers_router.get("/{customer_id}/purchases")
async def get_customer_purchases(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user_payload),
):
    """Return all sales for a specific customer, with vehicle details."""
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.vehicle))
        .where(Sale.cliente_id == customer_id, Sale.is_deleted == False)
        .order_by(Sale.data_venda.desc())
    )
    sales = list(result.scalars().all())

    return [
        {
            "id":               s.id,
            "data_venda":       s.data_venda.isoformat() if s.data_venda else None,
            "data_entrega":     s.data_entrega.isoformat() if s.data_entrega else None,
            "valor_venda":      float(s.valor_venda),
            "valor_entrada":    float(s.valor_entrada) if s.valor_entrada else 0,
            "valor_financiado": float(s.valor_financiado) if s.valor_financiado else 0,
            "forma_pagamento":  s.forma_pagamento,
            "parcelas":         s.parcelas,
            "banco_financiamento": s.banco_financiamento,
            "status":           s.status,
            "observacoes":      s.observacoes,
            "vehicle": {
                "id":          s.vehicle.id,
                "marca":       s.vehicle.marca,
                "modelo":      s.vehicle.modelo,
                "versao":      s.vehicle.versao,
                "ano":         s.vehicle.ano,
                "cor":         s.vehicle.cor,
                "placa":       s.vehicle.placa,
                "quilometragem": s.vehicle.quilometragem,
            } if s.vehicle else None,
        }
        for s in sales
    ]

