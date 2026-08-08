from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from app.domain.models.vehicle import VehicleStatus, FuelType, TransmissionType, VehicleType
from app.application.schemas.vehicle_photo import VehiclePhotoResponse


class VehicleCreate(BaseModel):
    marca: str
    modelo: str
    versao: Optional[str] = None
    ano: int
    cor: str
    combustivel: FuelType
    cambio: TransmissionType
    quilometragem: int = 0
    tipo: VehicleType = VehicleType.CARRO
    cilindrada: Optional[int] = None
    tipo_moto: Optional[str] = None
    placa: str
    chassi: str
    renavam: Optional[str] = None
    valor_compra: Decimal = Decimal("0")
    valor_multas: Decimal = Decimal("0")
    data_compra: date
    vendedor_nome: Optional[str] = None
    vendedor_telefone: Optional[str] = None
    valor_anunciado: Optional[Decimal] = None
    valor_minimo: Optional[Decimal] = None
    observacoes: Optional[str] = None

    @field_validator("placa")
    @classmethod
    def normalize_placa(cls, v: str) -> str:
        return v.upper().replace("-", "").replace(" ", "")

    @field_validator("chassi")
    @classmethod
    def normalize_chassi(cls, v: str) -> str:
        return v.upper().replace(" ", "")

    @field_validator("ano")
    @classmethod
    def valid_year(cls, v: int) -> int:
        from datetime import datetime
        current_year = datetime.now().year
        if v < 1900 or v > current_year + 1:
            raise ValueError(f"Ano inválido. Deve estar entre 1900 e {current_year + 1}")
        return v

    @field_validator("quilometragem")
    @classmethod
    def valid_km(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Quilometragem não pode ser negativa")
        return v

    @field_validator("valor_compra")
    @classmethod
    def valid_price(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Valor de compra não pode ser negativo")
        return v


class VehicleUpdate(BaseModel):
    marca: Optional[str] = None
    modelo: Optional[str] = None
    versao: Optional[str] = None
    ano: Optional[int] = None
    cor: Optional[str] = None
    combustivel: Optional[FuelType] = None
    cambio: Optional[TransmissionType] = None
    quilometragem: Optional[int] = None
    tipo: Optional[VehicleType] = None
    cilindrada: Optional[int] = None
    tipo_moto: Optional[str] = None
    renavam: Optional[str] = None
    valor_compra: Optional[Decimal] = None
    valor_multas: Optional[Decimal] = None
    data_compra: Optional[date] = None
    vendedor_nome: Optional[str] = None
    vendedor_telefone: Optional[str] = None
    valor_anunciado: Optional[Decimal] = None
    valor_minimo: Optional[Decimal] = None
    status: Optional[VehicleStatus] = None
    observacoes: Optional[str] = None


class VehicleResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    marca: str
    modelo: str
    versao: Optional[str]
    ano: int
    cor: str
    combustivel: FuelType
    cambio: TransmissionType
    quilometragem: int
    tipo: VehicleType
    cilindrada: Optional[int] = None
    tipo_moto: Optional[str] = None
    placa: str
    chassi: str
    renavam: Optional[str]
    valor_compra: Decimal
    valor_multas: Decimal
    data_compra: date
    vendedor_nome: Optional[str]
    vendedor_telefone: Optional[str]
    valor_anunciado: Optional[Decimal]
    valor_minimo: Optional[Decimal]
    valor_vendido: Optional[Decimal]
    status: VehicleStatus
    observacoes: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Computed fields
    total_despesas: Optional[Decimal] = None
    custo_total: Optional[Decimal] = None
    lucro_bruto: Optional[Decimal] = None
    margem_percentual: Optional[Decimal] = None
    # Gallery
    photos: List[VehiclePhotoResponse] = []


class VehicleListResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    marca: str
    modelo: str
    versao: Optional[str]
    ano: int
    cor: str
    quilometragem: int
    tipo: Optional[VehicleType] = VehicleType.CARRO
    cilindrada: Optional[int] = None
    tipo_moto: Optional[str] = None
    placa: str
    valor_compra: Decimal
    valor_multas: Decimal = Decimal("0")
    valor_anunciado: Optional[Decimal]
    status: VehicleStatus
    data_compra: date                           # used for sort
    created_at: datetime
    # Computed from model properties (populated when expenses are eager-loaded)
    custo_total: Optional[Decimal] = None
    lucro_bruto: Optional[Decimal] = None
    margem_percentual: Optional[Decimal] = None
    # Gallery — main photo for card display
    photos: List[VehiclePhotoResponse] = []
