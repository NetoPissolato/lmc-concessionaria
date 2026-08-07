import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text(
            "SELECT nome, email, usuario, role, ativo FROM users WHERE is_deleted = false ORDER BY created_at DESC LIMIT 10"
        ))
        rows = result.fetchall()
        print("=== Usuarios ativos no banco ===")
        for r in rows:
            print(f"  nome={r[0]}  email={r[1]}  usuario={r[2]}  role={r[3]}  ativo={r[4]}")

asyncio.run(main())
