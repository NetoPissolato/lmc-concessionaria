from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from app.domain.models.vehicle import VehicleStatus, FuelType, TransmissionType, VehicleType, CarroceriaType, CondicaoType
from app.application.schemas.vehicle_photo import VehiclePhotoResponse


# Normalização de marca/modelo/versão/cor: um único módulo (app/domain/normalizacao.py),
# aplicado aqui na entrada. O service e as rotas públicas não normalizam de novo.
from app.domain.normalizacao import normalizar_marca, normalizar_modelo, normalizar_cor  # noqa: E402


# Valores em Numeric(12,2): até 9.999.999.999,99. Textos com o tamanho das colunas.
# Sem estes limites, texto/número grande demais chegava ao banco e virava erro 500.
DINHEIRO = dict(max_digits=12, decimal_places=2)


def _placa(v: str) -> str:
    v = (v or "").upper().replace("-", "").replace(" ", "")
    if not v or len(v) > 10 or not v.isalnum():
        raise ValueError("Placa inválida (use letras e números, ex.: ABC1D23)")
    return v


def _chassi(v: str) -> str:
    v = (v or "").upper().replace(" ", "")
    if not v or len(v) > 17 or not v.isalnum():
        raise ValueError("Chassi inválido (até 17 letras e números)")
    return v


def _data_compra(v: date) -> date:
    # Data no futuro quase sempre é erro de digitação (2062 em vez de 2026) e jogava a
    # compra num mês futuro do caixa. Um dia de folga cobre o fuso.
    from datetime import timedelta
    from app.core.tempo import hoje_loja
    if v > hoje_loja() + timedelta(days=1):
        raise ValueError("A data da compra não pode estar no futuro")
    return v


def _ano(v: int) -> int:
    from datetime import datetime
    atual = datetime.now().year
    if v < 1900 or v > atual + 1:
        raise ValueError(f"Ano inválido. Deve estar entre 1900 e {atual + 1}")
    return v


class VehicleCreate(BaseModel):
    marca: str = Field(max_length=60)
    modelo: str = Field(max_length=120)
    versao: Optional[str] = Field(None, max_length=120)
    ano: int
    cor: str = Field(max_length=60)
    combustivel: FuelType
    cambio: TransmissionType
    quilometragem: int = Field(0, ge=0, le=3_000_000)
    tipo: VehicleType = VehicleType.CARRO
    cilindrada: Optional[int] = Field(None, ge=1, le=10_000)
    tipo_moto: Optional[str] = Field(None, max_length=60)
    placa: str
    chassi: str
    renavam: Optional[str] = Field(None, max_length=11)
    valor_compra: Decimal = Field(Decimal("0"), ge=0, **DINHEIRO)
    valor_multas: Decimal = Field(Decimal("0"), ge=0, **DINHEIRO)
    data_compra: date
    vendedor_nome: Optional[str] = Field(None, max_length=120)
    vendedor_telefone: Optional[str] = Field(None, max_length=20)
    valor_anunciado: Optional[Decimal] = Field(None, gt=0, **DINHEIRO)
    valor_minimo: Optional[Decimal] = Field(None, ge=0, **DINHEIRO)
    observacoes: Optional[str] = Field(None, max_length=5000)
    destaque: bool = False
    video_url: Optional[str] = Field(None, max_length=500)
    carroceria: Optional[CarroceriaType] = None
    condicao: CondicaoType = CondicaoType.USADO
    portas: Optional[int] = Field(None, ge=1, le=9)
    opcionais: Optional[str] = Field(None, max_length=10_000)  # JSON list serialized as string

    @field_validator("marca")
    @classmethod
    def normalize_marca(cls, v: str) -> str:
        return normalizar_marca(v)

    @field_validator("modelo", "versao", mode="before")
    @classmethod
    def normalize_modelo_versao(cls, v: str | None) -> str | None:
        return normalizar_modelo(v) if v else v

    @field_validator("cor")
    @classmethod
    def normalize_cor(cls, v: str) -> str:
        return normalizar_cor(v)

    @field_validator("placa")
    @classmethod
    def normalize_placa(cls, v: str) -> str:
        return _placa(v)

    @field_validator("chassi")
    @classmethod
    def normalize_chassi(cls, v: str) -> str:
        return _chassi(v)

    @field_validator("ano")
    @classmethod
    def valid_year(cls, v: int) -> int:
        return _ano(v)

    @field_validator("data_compra")
    @classmethod
    def compra_nao_futura(cls, v: date) -> date:
        return _data_compra(v)

    @model_validator(mode="after")
    def minimo_ate_o_anunciado(self):
        if self.valor_minimo and self.valor_anunciado and self.valor_minimo > self.valor_anunciado:
            raise ValueError("O preço mínimo não pode ser maior que o preço anunciado")
        return self


class VehicleUpdate(BaseModel):
    marca: Optional[str] = Field(None, max_length=60)
    modelo: Optional[str] = Field(None, max_length=120)
    versao: Optional[str] = Field(None, max_length=120)
    ano: Optional[int] = None
    cor: Optional[str] = Field(None, max_length=60)
    combustivel: Optional[FuelType] = None
    cambio: Optional[TransmissionType] = None
    quilometragem: Optional[int] = Field(None, ge=0, le=3_000_000)
    tipo: Optional[VehicleType] = None
    cilindrada: Optional[int] = Field(None, ge=1, le=10_000)
    tipo_moto: Optional[str] = Field(None, max_length=60)
    # Placa e chassi digitados errado agora podem ser corrigidos (antes não havia como)
    placa: Optional[str] = None
    chassi: Optional[str] = None
    renavam: Optional[str] = Field(None, max_length=11)
    valor_compra: Optional[Decimal] = Field(None, ge=0, **DINHEIRO)
    valor_multas: Optional[Decimal] = Field(None, ge=0, **DINHEIRO)
    data_compra: Optional[date] = None
    vendedor_nome: Optional[str] = Field(None, max_length=120)
    vendedor_telefone: Optional[str] = Field(None, max_length=20)
    valor_anunciado: Optional[Decimal] = Field(None, gt=0, **DINHEIRO)
    valor_minimo: Optional[Decimal] = Field(None, ge=0, **DINHEIRO)
    status: Optional[VehicleStatus] = None
    observacoes: Optional[str] = Field(None, max_length=5000)
    destaque: Optional[bool] = None
    video_url: Optional[str] = Field(None, max_length=500)
    carroceria: Optional[CarroceriaType] = None
    condicao: Optional[CondicaoType] = None
    portas: Optional[int] = Field(None, ge=1, le=9)
    opcionais: Optional[str] = Field(None, max_length=10_000)  # JSON list serialized as string

    # Mesmos normalizadores do VehicleCreate
    @field_validator("marca", mode="before")
    @classmethod
    def normalize_marca(cls, v: str | None) -> str | None:
        return normalizar_marca(v) if v else v

    @field_validator("modelo", "versao", mode="before")
    @classmethod
    def normalize_modelo_versao(cls, v: str | None) -> str | None:
        return normalizar_modelo(v) if v else v

    @field_validator("cor", mode="before")
    @classmethod
    def normalize_cor(cls, v: str | None) -> str | None:
        return normalizar_cor(v) if v else v

    @field_validator("placa")
    @classmethod
    def normalize_placa(cls, v: str | None) -> str | None:
        return _placa(v) if v is not None else v

    @field_validator("chassi")
    @classmethod
    def normalize_chassi(cls, v: str | None) -> str | None:
        return _chassi(v) if v is not None else v

    @field_validator("ano")
    @classmethod
    def valid_year(cls, v: int | None) -> int | None:
        return _ano(v) if v is not None else v

    @field_validator("data_compra")
    @classmethod
    def compra_nao_futura(cls, v: date | None) -> date | None:
        return _data_compra(v) if v is not None else v

    @field_validator("status")
    @classmethod
    def status_vendido_so_por_venda(cls, v: VehicleStatus | None) -> VehicleStatus | None:
        # "Vendido" sem venda registrada trava o veículo e some do caixa/relatórios.
        if v == VehicleStatus.VENDIDO:
            raise ValueError("Para marcar como vendido, registre a venda em Vendas → Nova venda")
        return v


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
