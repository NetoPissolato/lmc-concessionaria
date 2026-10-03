"""
Cria um usuário Administrador num banco que já existe (ex.: perdeu o acesso).
Para banco novo use scripts/instalar_banco.py, que já cria o admin.

Uso:
    ADMIN_EMAIL=dono@loja.com python scripts/create_admin.py
    (ADMIN_SENHA opcional; sem ela, uma senha aleatória é gerada e mostrada uma vez)

Não existe senha padrão: uma senha fixa no código vira a senha de todo deploy.
"""

import asyncio
import os
import secrets
import sys

# Adiciona o diretório pai ao path para importar os módulos da app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402
from app.core.database import AsyncSessionLocal  # noqa: E402

# Import ALL models first so SQLAlchemy can resolve all relationships
from app.domain.models import *  # noqa: E402,F401,F403
from app.domain.models.user import User, UserRole  # noqa: E402
from app.core.security import hash_password  # noqa: E402


async def create_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@lmcveiculos.com").strip().lower()
    senha = os.environ.get("ADMIN_SENHA") or secrets.token_urlsafe(12)

    async with AsyncSessionLocal() as session:
        existing = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing:
            print(f"Usuário já existe: {email}")
            return

        session.add(User(
            nome="Administrador",
            email=email,
            senha_hash=hash_password(senha),
            role=UserRole.ADMIN,
            ativo=True,
        ))
        await session.commit()

    print("=" * 60)
    print(f"  Administrador criado: {email}")
    if "ADMIN_SENHA" not in os.environ:
        print(f"  Senha (anote agora, não será mostrada de novo): {senha}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(create_admin())
