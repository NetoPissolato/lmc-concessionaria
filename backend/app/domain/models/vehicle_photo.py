import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VehiclePhoto(Base):
    """
    Stores photos for a vehicle gallery.

    - Each vehicle can have up to 20 photos.
    - One photo can be marked as `is_main` (used as cover/thumbnail).
    - `ordem` controls display order in the gallery.
    - Files are stored at: uploads/vehicles/{vehicle_id}/{filename}
    - Served at: /uploads/vehicles/{vehicle_id}/{filename}
    """
    __tablename__ = "vehicle_photos"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    vehicle_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    # Miniatura (~640px) para cards e listas; `url` é a versão grande (~1600px).
    # Fotos antigas, de antes do redimensionamento, podem não ter miniatura.
    thumb_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_main: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationship back to vehicle
    vehicle = relationship("Vehicle", back_populates="photos")

    def __repr__(self) -> str:
        return f"<VehiclePhoto {self.id} vehicle={self.vehicle_id} main={self.is_main}>"
