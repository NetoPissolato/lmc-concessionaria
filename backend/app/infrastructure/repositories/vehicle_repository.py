from typing import Optional, List
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.infrastructure.repositories.base_repository import BaseRepository
from app.domain.models.vehicle import Vehicle, VehicleStatus
from app.domain.models.vehicle_expense import VehicleExpense
from app.domain.models.vehicle_photo import VehiclePhoto


class VehicleRepository(BaseRepository[Vehicle]):
    def __init__(self, db: AsyncSession):
        super().__init__(Vehicle, db)

    async def get_by_placa(self, placa: str) -> Optional[Vehicle]:
        result = await self.db.execute(
            select(Vehicle).where(
                Vehicle.placa == placa.upper(),
                Vehicle.is_deleted == False,
                # Vendido não bloqueia: a loja pode recomprar o mesmo carro
                Vehicle.status != VehicleStatus.VENDIDO,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_chassi(self, chassi: str) -> Optional[Vehicle]:
        result = await self.db.execute(
            select(Vehicle).where(
                Vehicle.chassi == chassi.upper(),
                Vehicle.is_deleted == False,
                Vehicle.status != VehicleStatus.VENDIDO,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, id: str) -> Optional[Vehicle]:
        """Override to eagerly load photos and expenses relationships."""
        result = await self.db.execute(
            select(Vehicle)
            .options(selectinload(Vehicle.photos), selectinload(Vehicle.expenses))
            .where(Vehicle.id == id, Vehicle.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 50,
        **filters,
    ):
        """Override to eagerly load photos and expenses so card thumbnails and margins work."""
        query = (
            select(Vehicle)
            .options(selectinload(Vehicle.photos), selectinload(Vehicle.expenses))
            .where(Vehicle.is_deleted == False)
        )
        for field, value in filters.items():
            if value is not None:
                query = query.where(getattr(Vehicle, field) == value)
        query = query.offset(skip).limit(limit).order_by(Vehicle.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_with_expenses(self, vehicle_id: str) -> Optional[Vehicle]:
        """Load vehicle with all expenses eagerly to compute cost center."""
        result = await self.db.execute(
            select(Vehicle)
            .options(selectinload(Vehicle.expenses), selectinload(Vehicle.photos))
            .where(Vehicle.id == vehicle_id, Vehicle.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def search(
        self,
        query: str,
        status: Optional[VehicleStatus] = None,
        skip: int = 0,
        limit: int = 50,
        tipo=None,
    ) -> List[Vehicle]:
        """Full-text search across marca, modelo, placa and chassi — with photos and expenses eager loaded."""
        stmt = (
            select(Vehicle)
            .options(selectinload(Vehicle.photos), selectinload(Vehicle.expenses))
            .where(Vehicle.is_deleted == False)
        )

        if query:
            term = f"%{query.upper()}%"
            stmt = stmt.where(
                or_(
                    func.upper(Vehicle.marca).like(term),
                    func.upper(Vehicle.modelo).like(term),
                    Vehicle.placa.like(term),
                    Vehicle.chassi.like(term),
                )
            )

        if status:
            stmt = stmt.where(Vehicle.status == status)

        if tipo is not None:
            stmt = stmt.where(Vehicle.tipo == tipo)

        stmt = stmt.offset(skip).limit(limit).order_by(Vehicle.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_total_invested(self, vehicle_id: str) -> Decimal:
        """Sum of vehicle purchase price + all expenses."""
        vehicle = await self.get_by_id(vehicle_id)
        if not vehicle:
            return Decimal("0")

        expenses_sum = await self.db.execute(
            select(func.coalesce(func.sum(VehicleExpense.valor), 0))
            .where(VehicleExpense.vehicle_id == vehicle_id)
        )
        total_expenses = expenses_sum.scalar_one()
        return vehicle.valor_compra + Decimal(str(total_expenses))

    async def get_dashboard_stats(self) -> dict:
        """Aggregate stats for the main dashboard."""
        # Count by status
        status_counts = await self.db.execute(
            select(Vehicle.status, func.count(Vehicle.id))
            .where(Vehicle.is_deleted == False)
            .group_by(Vehicle.status)
        )
        counts = {row[0]: row[1] for row in status_counts.fetchall()}

        # Total stock value (sum of anunciado)
        stock_value = await self.db.execute(
            select(func.coalesce(func.sum(Vehicle.valor_anunciado), 0))
            .where(
                Vehicle.is_deleted == False,
                Vehicle.status == VehicleStatus.DISPONIVEL,
            )
        )

        return {
            "disponivel": counts.get(VehicleStatus.DISPONIVEL, 0),
            "reservado": counts.get(VehicleStatus.RESERVADO, 0),
            "em_preparacao": counts.get(VehicleStatus.EM_PREPARACAO, 0),
            "em_manutencao": counts.get(VehicleStatus.EM_MANUTENCAO, 0),
            "vendido": counts.get(VehicleStatus.VENDIDO, 0),
            "valor_estoque": Decimal(str(stock_value.scalar_one())),
        }
