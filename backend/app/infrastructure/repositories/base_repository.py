from typing import TypeVar, Generic, Type, Optional, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from datetime import datetime, timezone

from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Generic repository with CRUD operations.
    All queries automatically filter out soft-deleted records.
    """

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: str) -> Optional[ModelType]:
        result = await self.db.execute(
            select(self.model).where(
                self.model.id == id,
                self.model.is_deleted == False,
            )
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 50,
        **filters,
    ) -> List[ModelType]:
        query = select(self.model).where(self.model.is_deleted == False)
        for field, value in filters.items():
            if value is not None:
                query = query.where(getattr(self.model, field) == value)
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, **filters) -> int:
        query = select(func.count(self.model.id)).where(self.model.is_deleted == False)
        for field, value in filters.items():
            if value is not None:
                query = query.where(getattr(self.model, field) == value)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def create(self, **data) -> ModelType:
        instance = self.model(**data)
        self.db.add(instance)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def update(self, instance: ModelType, **data) -> ModelType:
        for field, value in data.items():
            setattr(instance, field, value)
        self.db.add(instance)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def soft_delete(self, instance: ModelType, deleted_by: str) -> ModelType:
        """Marks record as deleted without physically removing it from DB."""
        instance.is_deleted = True
        instance.deleted_at = datetime.now(timezone.utc)
        instance.deleted_by = deleted_by
        self.db.add(instance)
        await self.db.flush()
        return instance
