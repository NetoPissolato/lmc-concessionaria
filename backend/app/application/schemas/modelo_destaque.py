from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ModeloDestaqueCreate(BaseModel):
    marca: str
    modelo: str
    carroceria: str  # suv, hatch, sedan, picape, coupe, minivan, conversivel, perua, van
    ativo: bool = True
    ordem: int = 0


class ModeloDestaqueUpdate(BaseModel):
    marca: Optional[str] = None
    modelo: Optional[str] = None
    carroceria: Optional[str] = None
    imagem_url: Optional[str] = None
    ativo: Optional[bool] = None
    ordem: Optional[int] = None


class ModeloDestaqueResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    marca: str
    modelo: str
    carroceria: str
    imagem_url: Optional[str] = None
    ativo: bool
    ordem: int
    created_at: datetime
