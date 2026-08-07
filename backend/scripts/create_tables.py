"""
Cria todas as tabelas do banco de dados diretamente usando SQLAlchemy create_all.
Mais confiável que Alembic autogenerate para setup inicial.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import all models FIRST to register them with Base.metadata
from app.domain.models import (  # noqa: F401
    Base, User, Vehicle, VehicleExpense, Customer, Sale, FinancialEntry, AuditLog
)
from app.core.database import engine


async def create_tables():
    print("Criando tabelas no banco de dados...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("OK - Todas as tabelas criadas com sucesso!")
    print("Tabelas: " + str(list(Base.metadata.tables.keys())))
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_tables())
