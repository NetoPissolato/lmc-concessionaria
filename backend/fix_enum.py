import asyncio
from sqlalchemy import text
from app.core.database import engine

async def fix():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TYPE financial_category ADD VALUE IF NOT EXISTS 'MULTA'"))
    print("Done — MULTA added to financial_category enum")

asyncio.run(fix())
