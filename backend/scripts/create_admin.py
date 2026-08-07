"""
Script para criar o primeiro usuário Administrador do sistema.
Execute APÓS rodar: alembic upgrade head

Uso:
    python scripts/create_admin.py
"""

import asyncio
import sys
import os

# Adiciona o diretório pai ao path para importar os módulos da app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, engine

# Import ALL models first so SQLAlchemy can resolve all relationships
from app.domain.models import (  # noqa: F401
    Base, User, Vehicle, VehicleExpense, Customer, Sale, FinancialEntry, AuditLog
)
from app.domain.models.user import UserRole
from app.core.security import hash_password


# ─── Dados do Admin Padrão ────────────────────────────────────────────────────
ADMIN_NOME = "Administrador"
ADMIN_EMAIL = "admin@lmcveiculos.com"
ADMIN_SENHA = "Admin@123"  # TROQUE após o primeiro login!


async def create_admin():
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select

        # Verifica se já existe
        result = await session.execute(
            select(User).where(User.email == ADMIN_EMAIL)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"✅ Usuário já existe: {ADMIN_EMAIL}")
            return

        # Cria o admin
        admin = User(
            nome=ADMIN_NOME,
            email=ADMIN_EMAIL,
            senha_hash=hash_password(ADMIN_SENHA),
            role=UserRole.ADMIN,
            ativo=True,
        )
        session.add(admin)
        await session.commit()

        print("=" * 50)
        print("✅ Usuário Administrador criado com sucesso!")
        print("=" * 50)
        print(f"  📧 Email: {ADMIN_EMAIL}")
        print(f"  🔑 Senha: {ADMIN_SENHA}")
        print("=" * 50)
        print("⚠️  TROQUE A SENHA após o primeiro login!")
        print("=" * 50)


if __name__ == "__main__":
    asyncio.run(create_admin())
