from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ModeloDestaqueCreate(BaseModel):
    marca: str = Field(min_length=1, max_length=60)
    modelo: str = Field(min_length=1, max_length=120)
    carroceria: str = Field(min_length=1, max_length=30)  # suv, hatch, sedan, picape, coupe, minivan, conversivel, perua, van
    ativo: bool = True
    ordem: int = Field(0, ge=0, le=10_000)


class ModeloDestaqueUpdate(BaseModel):
    marca: Optional[str] = Field(None, min_length=1, max_length=60)
    modelo: Optional[str] = Field(None, min_length=1, max_length=120)
    carroceria: Optional[str] = Field(None, min_length=1, max_length=30)
    imagem_url: Optional[str] = Field(None, max_length=500)
    ativo: Optional[bool] = None
    ordem: Optional[int] = Field(None, ge=0, le=10_000)


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
