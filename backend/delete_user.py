import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        # Hard delete the soft-deleted user so email constraint is freed
        result = await db.execute(
            text("DELETE FROM users WHERE email = :email AND is_deleted = true"),
            {"email": "joseivan@gmail.com"}
        )
        await db.commit()
        print(f"Rows deleted: {result.rowcount}")
        if result.rowcount > 0:
            print("Usuario removido permanentemente. Email liberado.")
        else:
            print("Nenhum usuario encontrado.")

asyncio.run(main())
