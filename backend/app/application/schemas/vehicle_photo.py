from pydantic import BaseModel
from datetime import datetime


class VehiclePhotoResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    vehicle_id: str
    url: str
    is_main: bool
    ordem: int
    created_at: datetime
