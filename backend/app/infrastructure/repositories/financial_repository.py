from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.models.financial import FinancialEntry


class FinancialRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **data) -> FinancialEntry:
        entry = FinancialEntry(**data)
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry

    async def get_all(self, skip: int = 0, limit: int = 100):
        from sqlalchemy import select
        result = await self.db.execute(
            select(FinancialEntry)
            .order_by(FinancialEntry.data.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def delete_by_venda_id(self, venda_id: str) -> int:
        """Remove todas as entradas financeiras vinculadas a uma venda (ex: ao cancelar)."""
        from sqlalchemy import delete as sql_delete
        result = await self.db.execute(
            sql_delete(FinancialEntry).where(FinancialEntry.venda_id == venda_id)
        )
        return result.rowcount
