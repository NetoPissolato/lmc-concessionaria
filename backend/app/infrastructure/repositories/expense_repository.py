from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.infrastructure.repositories.base_repository import BaseRepository
from app.domain.models.vehicle_expense import VehicleExpense


class ExpenseRepository(BaseRepository[VehicleExpense]):
    def __init__(self, db: AsyncSession):
        # VehicleExpense doesn't have soft delete, override get_all
        self.model = VehicleExpense
        self.db = db

    async def get_all_by_vehicle(self, vehicle_id: str):
        result = await self.db.execute(
            select(VehicleExpense)
            .where(VehicleExpense.vehicle_id == vehicle_id)
            .order_by(VehicleExpense.data.desc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_vehicle(self, expense_id: str, vehicle_id: str):
        """Get expense by id ensuring it belongs to the vehicle."""
        result = await self.db.execute(
            select(VehicleExpense).where(
                VehicleExpense.id == expense_id,
                VehicleExpense.vehicle_id == vehicle_id,
            )
        )
        return result.scalar_one_or_none()

    async def update_expense(self, expense: VehicleExpense, **data) -> VehicleExpense:
        """Update expense fields. Only updates provided (non-None) fields."""
        for field, value in data.items():
            if value is not None:
                setattr(expense, field, value)
        self.db.add(expense)
        await self.db.flush()
        await self.db.refresh(expense)
        return expense

    async def delete_expense(self, expense: VehicleExpense) -> None:
        """Hard delete — expense has no soft-delete."""
        await self.db.delete(expense)
        await self.db.flush()
