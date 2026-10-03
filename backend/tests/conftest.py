"""
Fixtures compartilhadas dos testes do backend.

Os testes rodam contra um PostgreSQL de verdade (o sistema usa recursos do
Postgres que o SQLite não tem). Aponte TEST_DATABASE_URL para um banco
descartável — o schema é recriado a cada sessão de testes:

    TEST_DATABASE_URL=postgresql+asyncpg://user:senha@127.0.0.1:5432/lmc_test pytest

Nunca aponte para o banco de produção: drop_all apaga tudo.
"""
import os
import uuid

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    raise RuntimeError("Defina TEST_DATABASE_URL apontando para um banco descartável.")

# Precisa vir antes de qualquer import de `app`: settings e engine leem o ambiente no import.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ.setdefault("JWT_SECRET_KEY", "teste-" + "x" * 64)
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:1/0")  # sem Redis nos testes
os.environ.setdefault("DEBUG", "false")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

import app.core.database as database
from app.core.database import Base
from app.domain.models import *  # noqa: F401,F403 — registra todos os models
from app.domain.models.user import User, UserRole
from app.core.security import hash_password

# NullPool: cada teste roda no seu próprio event loop; conexões em pool
# presas a um loop antigo quebram o asyncpg.
_engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
_Session = async_sessionmaker(bind=_engine, class_=AsyncSession, expire_on_commit=False)
database.engine = _engine
database.AsyncSessionLocal = _Session

from app.main import app  # noqa: E402
from app.core.database import get_db  # noqa: E402


async def _get_db_teste():
    async with _Session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = _get_db_teste

SENHA_TESTE = "Teste@12345"


@pytest_asyncio.fixture(autouse=True)
async def banco_limpo():
    """Schema recriado do zero a cada teste: nenhum teste enxerga dados de outro."""
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def db():
    async with _Session() as session:
        yield session


async def _criar_usuario(role: UserRole) -> User:
    async with _Session() as session:
        sufixo = uuid.uuid4().hex[:8]
        user = User(
            nome=f"{role.value} {sufixo}",
            email=f"{role.value}.{sufixo}@teste.com",
            senha_hash=hash_password(SENHA_TESTE),
            role=role,
            ativo=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://teste") as c:
        yield c


async def _login(client: AsyncClient, user: User) -> dict:
    r = await client.post("/api/v1/auth/login", json={"identifier": user.email, "senha": SENHA_TESTE})
    assert r.status_code == 200, r.text
    body = r.json()
    token = body.get("access_token") or body["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin(client):
    user = await _criar_usuario(UserRole.ADMIN)
    return {"user": user, "headers": await _login(client, user)}


@pytest_asyncio.fixture
async def funcionario(client):
    user = await _criar_usuario(UserRole.FUNCIONARIO)
    return {"user": user, "headers": await _login(client, user)}
