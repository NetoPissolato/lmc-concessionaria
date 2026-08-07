"""Create all tables from SQLAlchemy models and seed admin user."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, Base
from app.domain.models import *  # noqa: F401,F403 – import all models to register them
from app.core.security import get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def setup():
    print("🔧 Criando tabelas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tabelas criadas!")

    # Seed admin user
    async with AsyncSession(engine) as session:
        result = await session.execute(
            text("SELECT id FROM users WHERE email = 'admin@lmcveiculos.com' LIMIT 1")
        )
        existing = result.fetchone()
        if existing:
            print("ℹ️  Admin já existe — pulando seed.")
            return

        from app.domain.models.user import User, UserRole
        import uuid
        from datetime import datetime, timezone

        admin = User(
            id=str(uuid.uuid4()),
            nome="Administrador",
            email="admin@lmcveiculos.com",
            senha_hash=get_password_hash("Admin@123"),
            role=UserRole.ADMIN,
            ativo=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(admin)
        await session.commit()
        print("✅ Admin criado: admin@lmcveiculos.com / Admin@123")


if __name__ == "__main__":
    asyncio.run(setup())
