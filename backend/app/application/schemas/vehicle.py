from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from app.domain.models.vehicle import VehicleStatus, FuelType, TransmissionType, VehicleType, CarroceriaType, CondicaoType
from app.application.schemas.vehicle_photo import VehiclePhotoResponse


# ─── Normalização de marcas ───────────────────────────────────────────────────
# Garante que a mesma marca nunca apareça com grafias diferentes no sistema.
# Ex: "bmw", "BMW", "Bmw" → sempre "BMW"
# Ex: "vw", "volkswagen", "VW" → sempre "Volkswagen"

BRAND_CANONICAL: dict[str, str] = {
    # Europeias
    "bmw":                "BMW",
    "bmw motorrad":       "BMW Motorrad",
    "bmwmotorrad":        "BMW Motorrad",
    "audi":               "Audi",
    "mercedes":           "Mercedes-Benz",
    "mercedes-benz":      "Mercedes-Benz",
    "mercedesbenz":       "Mercedes-Benz",
    "volkswagen":         "Volkswagen",
    "vw":                 "Volkswagen",
    "volvo":              "Volvo",
    "peugeot":            "Peugeot",
    "citroen":            "Citroën",
    "citroën":            "Citroën",
    "renault":            "Renault",
    "fiat":               "Fiat",
    "mini":               "MINI",
    "porsche":            "Porsche",
    "ferrari":            "Ferrari",
    "lamborghini":        "Lamborghini",
    "land rover":         "Land Rover",
    "landrover":          "Land Rover",
    "jaguar":             "Jaguar",
    "alfa romeo":         "Alfa Romeo",
    "alfaromeo":          "Alfa Romeo",
    "triumph":            "Triumph",
    # Americanas
    "ford":               "Ford",
    "chevrolet":          "Chevrolet",
    "gm":                 "Chevrolet",
    "dodge":              "Dodge",
    "ram":                "RAM",
    "chrysler":           "Chrysler",
    "jeep":               "Jeep",
    "harley":             "Harley-Davidson",
    "harley davidson":    "Harley-Davidson",
    "harley-davidson":    "Harley-Davidson",
    "harleydavidson":     "Harley-Davidson",
    # Japonesas
    "toyota":             "Toyota",
    "honda":              "Honda",
    "nissan":             "Nissan",
    "mitsubishi":         "Mitsubishi",
    "subaru":             "Subaru",
    "yamaha":             "Yamaha",
    "kawasaki":           "Kawasaki",
    "suzuki":             "Suzuki",
    "ducati":             "Ducati",
    # Coreanas
    "hyundai":            "Hyundai",
    "kia":                "Kia",
    # Chinesas
    "byd":                "BYD",
    "jac":                "JAC",
    "chery":              "Chery",
    "caoa chery":         "CAOA Chery",
    "caoa":               "CAOA Chery",
    "great wall":         "Great Wall",
    "haval":              "Haval",
    "lifan":              "Lifan",
    # Brasileiras
    "agrale":             "Agrale",
    "troller":            "Troller",
}

# Palavras que devem manter maiúsculas especiais em cor/modelo
_UPPER_WORDS = {"cvt", "suv", "gts", "gt", "rs", "ls", "ltz", "lx", "lxs", "exl", "ex", "dx"}


def _normalize_brand(v: str) -> str:
    """Normaliza marca usando dicionário canônico. Fallback: Title Case."""
    if not v:
        return v
    cleaned = " ".join(v.strip().split())  # colapsa espaços extras
    key = cleaned.lower()
    return BRAND_CANONICAL.get(key, cleaned.title())


def _normalize_text(v: str) -> str:
    """Title Case com colapso de espaços. Ex: ' PRETO FOSCO  ' → 'Preto Fosco'."""
    if not v:
        return v
    return " ".join(w.title() for w in v.strip().split())



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
    destaque: bool = False
    video_url: Optional[str] = None
    carroceria: Optional[CarroceriaType] = None
    condicao: CondicaoType = CondicaoType.USADO
    portas: Optional[int] = None
    opcionais: Optional[str] = None  # JSON list serialized as string

    @field_validator("marca")
    @classmethod
    def normalize_marca(cls, v: str) -> str:
        return _normalize_brand(v)

    @field_validator("modelo", "versao", mode="before")
    @classmethod
    def normalize_modelo_versao(cls, v: str | None) -> str | None:
        return _normalize_text(v) if v else v

    @field_validator("cor")
    @classmethod
    def normalize_cor(cls, v: str) -> str:
        return _normalize_text(v)

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
    destaque: Optional[bool] = None
    video_url: Optional[str] = None
    carroceria: Optional[CarroceriaType] = None
    condicao: Optional[CondicaoType] = None
    portas: Optional[int] = None
    opcionais: Optional[str] = None  # JSON list serialized as string

    # Mesmos normalizadores do VehicleCreate
    @field_validator("marca", mode="before")
    @classmethod
    def normalize_marca(cls, v: str | None) -> str | None:
        return _normalize_brand(v) if v else v

    @field_validator("modelo", "versao", mode="before")
    @classmethod
    def normalize_modelo_versao(cls, v: str | None) -> str | None:
        return _normalize_text(v) if v else v

    @field_validator("cor", mode="before")
    @classmethod
    def normalize_cor(cls, v: str | None) -> str | None:
        return _normalize_text(v) if v else v


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
    destaque: bool = False
    video_url: Optional[str] = None
    carroceria: Optional[CarroceriaType] = None
    condicao: CondicaoType = CondicaoType.USADO
    portas: Optional[int] = None
    opcionais: Optional[str] = None
    visualizacoes: int = 0
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
    destaque: bool = False
    data_compra: date                           # used for sort
    created_at: datetime
    carroceria: Optional[CarroceriaType] = None
    condicao: CondicaoType = CondicaoType.USADO
    portas: Optional[int] = None
    visualizacoes: int = 0
    # Computed from model properties (populated when expenses are eager-loaded)
    custo_total: Optional[Decimal] = None
    lucro_bruto: Optional[Decimal] = None
    margem_percentual: Optional[Decimal] = None
    # Gallery — main photo for card display
    photos: List[VehiclePhotoResponse] = []
