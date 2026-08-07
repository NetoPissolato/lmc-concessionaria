import asyncio
import redis.asyncio as aioredis

async def unlock():
    r = await aioredis.from_url("redis://localhost:6379")
    # Checar todas as keys de lockout e attempts
    all_keys = await r.keys("account_lockout:*")
    all_keys += await r.keys("login_attempts:*")
    print(f"Keys encontradas: {all_keys}")
    if all_keys:
        await r.delete(*all_keys)
    print("Conta desbloqueada!")
    await r.aclose()

asyncio.run(unlock())
