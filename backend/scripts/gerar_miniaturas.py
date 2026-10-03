"""
Converte as fotos de veículos já existentes para o padrão novo:
versão grande em WebP (≤1600px, sem EXIF/GPS) + miniatura (≤640px).

    docker compose -f docker-compose.prod.yml exec backend python scripts/gerar_miniaturas.py

Idempotente: foto que já tem miniatura é pulada. O arquivo original só é apagado
depois que a versão nova foi gravada e o banco atualizado.
"""
import asyncio
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402
from fastapi import HTTPException  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import AsyncSessionLocal  # noqa: E402
from app.domain.models import *  # noqa: E402,F401,F403
from app.domain.models.vehicle_photo import VehiclePhoto  # noqa: E402
from app.application.services.upload_service import processar_foto_veiculo  # noqa: E402


async def main() -> None:
    raiz = Path(settings.UPLOAD_DIR)
    convertidas = puladas = falhas = 0
    async with AsyncSessionLocal() as db:
        fotos = (await db.execute(select(VehiclePhoto).where(VehiclePhoto.thumb_url.is_(None)))).scalars().all()
        for foto in fotos:
            pasta = raiz / "vehicles" / foto.vehicle_id
            original = pasta / Path(foto.filename).name
            if not original.exists():
                print(f"  sem arquivo: {original}")
                falhas += 1
                continue
            try:
                grande, miniatura = processar_foto_veiculo(original.read_bytes())
            except HTTPException as e:
                print(f"  imagem inválida ({e.detail}): {original}")
                falhas += 1
                continue
            base = str(uuid.uuid4())
            (pasta / f"{base}.webp").write_bytes(grande)
            (pasta / f"{base}_thumb.webp").write_bytes(miniatura)
            foto.filename = f"{base}.webp"
            foto.url = f"/uploads/vehicles/{foto.vehicle_id}/{base}.webp"
            foto.thumb_url = f"/uploads/vehicles/{foto.vehicle_id}/{base}_thumb.webp"
            await db.commit()
            antes = original.stat().st_size
            original.unlink()
            print(f"  {original.name}: {antes // 1024} KB → {len(grande) // 1024} KB (+ miniatura {len(miniatura) // 1024} KB)")
            convertidas += 1
        puladas = len(fotos) - convertidas - falhas
    print(f"Convertidas: {convertidas} · falhas: {falhas} · já no padrão: {puladas}")


if __name__ == "__main__":
    asyncio.run(main())
