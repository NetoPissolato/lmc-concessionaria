"""
Instalação de um banco NOVO (primeiro deploy ou recriação do zero).

    docker compose -f docker-compose.prod.yml run --rm backend python scripts/instalar_banco.py

O que faz:
1. Cria as tabelas a partir dos models (o estado atual do sistema).
2. Marca o Alembic como atualizado (`stamp head`): as migrations antigas existem para
   levar bancos ANTIGOS até o estado atual; num banco novo não há o que migrar.
3. Cria o administrador. E-mail e senha vêm de ADMIN_EMAIL / ADMIN_SENHA; sem
   ADMIN_SENHA, gera uma senha aleatória e mostra UMA vez.

Recusa rodar se o banco já tiver tabelas — para atualizar um banco existente,
use `alembic upgrade head`.
"""
import asyncio
import os
import secrets
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from sqlalchemy import inspect, text  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402

from app.core.database import engine, AsyncSessionLocal, Base  # noqa: E402
from app.domain.models import *  # noqa: E402,F401,F403
from app.domain.models.user import User, UserRole  # noqa: E402
from app.core.security import hash_password  # noqa: E402

EXTENSOES = ("uuid-ossp", "pg_trgm", "unaccent")


async def _banco_vazio() -> bool:
    async with engine.connect() as conn:
        tabelas = await conn.run_sync(lambda c: inspect(c).get_table_names())
    return "users" not in tabelas


async def _criar_tabelas() -> None:
    async with engine.begin() as conn:
        for ext in EXTENSOES:
            try:
                async with conn.begin_nested():
                    await conn.execute(text(f'CREATE EXTENSION IF NOT EXISTS "{ext}"'))
            except Exception as e:  # sem permissão de superusuário: o init.sql do Postgres já cria
                print(f"  (extensão {ext} não criada aqui: {e.__class__.__name__})")
        await conn.run_sync(Base.metadata.create_all)


async def _criar_admin() -> None:
    email = os.environ.get("ADMIN_EMAIL", "admin@lmcveiculos.com").strip().lower()
    senha = os.environ.get("ADMIN_SENHA") or secrets.token_urlsafe(12)
    async with AsyncSessionLocal() as session:
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


async def _instalar() -> bool:
    if not await _banco_vazio():
        print("O banco já tem tabelas. Para atualizar um banco existente use: alembic upgrade head")
        return False
    print("→ Criando tabelas…")
    await _criar_tabelas()
    print("→ Criando administrador…")
    await _criar_admin()
    await engine.dispose()
    return True


def main() -> None:
    if not asyncio.run(_instalar()):
        sys.exit(1)
    # Fora do event loop: o env.py do Alembic abre o seu próprio com asyncio.run().
    print("→ Marcando migrations como aplicadas (alembic stamp head)…")
    cfg = Config(str(RAIZ / "alembic.ini"))
    cfg.set_main_option("script_location", str(RAIZ / "alembic"))
    command.stamp(cfg, "head")
    print("✓ Banco instalado.")


if __name__ == "__main__":
    main()
