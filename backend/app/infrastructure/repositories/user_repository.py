from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from app.infrastructure.repositories.base_repository import BaseRepository
from app.domain.models.user import User


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(
                User.email == email.lower().strip(),
                User.is_deleted == False,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_username(self, usuario: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(
                User.usuario == usuario.lower().strip(),
                User.is_deleted == False,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_identifier(self, identifier: str) -> Optional[User]:
        """
        Accepts either an email address or a username.
        Detection: if '@' is present, treat as email; otherwise as username.
        """
        identifier = identifier.strip()
        if "@" in identifier:
            return await self.get_by_email(identifier)
        return await self.get_by_username(identifier)

    async def email_exists(self, email: str, exclude_id: str | None = None) -> bool:
        query = select(func.count(User.id)).where(
            User.email == email.lower().strip(),
            User.is_deleted == False,
        )
        if exclude_id:
            query = query.where(User.id != exclude_id)
        result = await self.db.execute(query)
        return result.scalar_one() > 0

    async def username_exists(self, usuario: str, exclude_id: str | None = None) -> bool:
        query = select(func.count(User.id)).where(
            User.usuario == usuario.lower().strip(),
            User.is_deleted == False,
        )
        if exclude_id:
            query = query.where(User.id != exclude_id)
        result = await self.db.execute(query)
        return result.scalar_one() > 0

    async def list_paginated(
        self,
        skip: int = 0,
        limit: int = 10,
        search: str = "",
        ativo: Optional[bool] = None,
    ) -> tuple[List[User], int]:
        """Returns (users, total_count) for pagination with optional search and status filter."""
        base = select(User).where(User.is_deleted == False)

        if ativo is not None:
            base = base.where(User.ativo == ativo)

        if search:
            q = f"%{search.lower()}%"
            base = base.where(
                or_(
                    func.lower(User.nome).like(q),
                    func.lower(User.email).like(q),
                    func.lower(User.usuario).like(q),
                )
            )

        count_q = select(func.count()).select_from(base.subquery())
        total_r = await self.db.execute(count_q)
        total = total_r.scalar_one()

        data_q = base.order_by(User.created_at.desc()).offset(skip).limit(limit)
        rows = await self.db.execute(data_q)
        users = list(rows.scalars().all())

        return users, total
