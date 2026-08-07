import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

engine = create_async_engine('postgresql+asyncpg://lmc_user:lmc_secure_pass_2024@localhost:5432/lmc_veiculos')

async def run():
    async with engine.connect() as conn:
        r = await conn.execute(text('SELECT count(*) FROM vehicles WHERE is_deleted = false'))
        print('Total veículos:', r.scalar())
        r2 = await conn.execute(text("SELECT tipo, status, marca, modelo FROM vehicles WHERE is_deleted = false LIMIT 10"))
        rows = r2.fetchall()
        if rows:
            for row in rows:
                print(f'  tipo={row[0]} status={row[1]} {row[2]} {row[3]}')
        else:
            print('  Nenhum veículo no banco!')
        
        # Check tipo nulls
        r3 = await conn.execute(text("SELECT count(*) FROM vehicles WHERE tipo IS NULL"))
        print('Veículos com tipo NULL:', r3.scalar())

asyncio.run(run())
