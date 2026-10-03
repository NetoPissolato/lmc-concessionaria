import uuid
import os
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.domain.models.vehicle_photo import VehiclePhoto


class VehiclePhotoRepository:
    """Repository for managing vehicle photos."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_by_vehicle(self, vehicle_id: str) -> List[VehiclePhoto]:
        """Return all photos for a vehicle, ordered by `ordem` then `created_at`."""
        result = await self.db.execute(
            select(VehiclePhoto)
            .where(VehiclePhoto.vehicle_id == vehicle_id)
            .order_by(VehiclePhoto.ordem, VehiclePhoto.created_at)
        )
        return list(result.scalars().all())

    async def count_by_vehicle(self, vehicle_id: str) -> int:
        """Return total number of photos for a vehicle."""
        photos = await self.get_all_by_vehicle(vehicle_id)
        return len(photos)

    async def create(
        self,
        vehicle_id: str,
        filename: str,
        url: str,
        is_main: bool = False,
        ordem: Optional[int] = None,
        thumb_url: Optional[str] = None,
    ) -> VehiclePhoto:
        """Create a new photo record."""
        if ordem is None:
            current_count = await self.count_by_vehicle(vehicle_id)
            ordem = current_count

        photo = VehiclePhoto(
            id=str(uuid.uuid4()),
            vehicle_id=vehicle_id,
            filename=filename,
            url=url,
            thumb_url=thumb_url,
            is_main=is_main,
            ordem=ordem,
        )
        self.db.add(photo)
        await self.db.flush()
        await self.db.refresh(photo)
        return photo

    async def get_by_id(self, photo_id: str) -> Optional[VehiclePhoto]:
        """Get a single photo by ID."""
        result = await self.db.execute(
            select(VehiclePhoto).where(VehiclePhoto.id == photo_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_for_vehicle(
        self, photo_id: str, vehicle_id: str
    ) -> Optional[VehiclePhoto]:
        """Get a photo belonging to a specific vehicle."""
        result = await self.db.execute(
            select(VehiclePhoto).where(
                VehiclePhoto.id == photo_id,
                VehiclePhoto.vehicle_id == vehicle_id,
            )
        )
        return result.scalar_one_or_none()

    async def set_main(self, photo_id: str, vehicle_id: str) -> Optional[VehiclePhoto]:
        """Mark a photo as the main/cover photo, unmark all others."""
        # Unmark all photos for this vehicle
        await self.db.execute(
            update(VehiclePhoto)
            .where(VehiclePhoto.vehicle_id == vehicle_id)
            .values(is_main=False)
        )
        # Mark the selected one
        await self.db.execute(
            update(VehiclePhoto)
            .where(VehiclePhoto.id == photo_id, VehiclePhoto.vehicle_id == vehicle_id)
            .values(is_main=True)
        )
        await self.db.flush()
        return await self.get_by_id(photo_id)

    async def delete(self, photo: VehiclePhoto) -> str:
        """Delete a photo record and return its filename for file cleanup."""
        filename = photo.filename
        vehicle_id = photo.vehicle_id
        await self.db.delete(photo)
        await self.db.flush()

        # If deleted was main, promote the first remaining photo
        remaining = await self.get_all_by_vehicle(vehicle_id)
        if remaining and not any(p.is_main for p in remaining):
            remaining[0].is_main = True
            await self.db.flush()

        return filename
