import uuid
import enum
from decimal import Decimal
from datetime import date, datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, Numeric, Integer, Date, DateTime, Text, Enum as SAEnum, ForeignKey, Boolean, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from typing import Optional

from app.core.database import Base
from app.domain.models.base import TimestampMixin, SoftDeleteMixin


class VehicleType(str, enum.Enum):
    CARRO = "carro"
    MOTO  = "moto"


class VehicleStatus(str, enum.Enum):
    DISPONIVEL = "disponivel"
    RESERVADO = "reservado"
    EM_PREPARACAO = "em_preparacao"
    EM_MANUTENCAO = "em_manutencao"
    VENDIDO = "vendido"


class FuelType(str, enum.Enum):
    FLEX = "flex"
    GASOLINA = "gasolina"
    ETANOL = "etanol"
    DIESEL = "diesel"
    ELETRICO = "eletrico"
    HIBRIDO = "hibrido"
    GNV = "gnv"


class TransmissionType(str, enum.Enum):
    MANUAL = "manual"
    AUTOMATICO = "automatico"
    AUTOMATIZADO = "automatizado"
    CVT = "cvt"


class CarroceriaType(str, enum.Enum):
    SUV         = "suv"
    HATCH       = "hatch"
    SEDAN       = "sedan"
    PICAPE      = "picape"
    COUPE       = "coupe"
    MINIVAN     = "minivan"
    CONVERSIVEL = "conversivel"
    PERUA       = "perua"
    VAN         = "van"


class CondicaoType(str, enum.Enum):
    NOVO      = "novo"
    SEMINOVO  = "seminovo"
    USADO     = "usado"


class Vehicle(Base, TimestampMixin, SoftDeleteMixin):
    """
    Core vehicle entity — the heart of the system.

    Financial calculations (all auto-computed):
    - custo_total = valor_compra + valor_multas + sum(expenses)
    - lucro_bruto = valor_vendido - custo_total
    - margem = lucro_bruto / valor_vendido * 100
    """
    __tablename__ = "vehicles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Basic identification
    marca: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    modelo: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    versao: Mapped[str | None] = mapped_column(String(120), nullable=True)
    ano: Mapped[int] = mapped_column(Integer, nullable=False)
    cor: Mapped[str] = mapped_column(String(60), nullable=False)
    combustivel: Mapped[FuelType] = mapped_column(SAEnum(FuelType, name="fuel_type"), nullable=False)
    cambio: Mapped[TransmissionType] = mapped_column(SAEnum(TransmissionType, name="transmission_type"), nullable=False)
    quilometragem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Vehicle type (carro or moto)
    tipo: Mapped[VehicleType] = mapped_column(
        SAEnum(VehicleType, name="vehicle_type"),
        default=VehicleType.CARRO,
        nullable=False,
        index=True,
    )

    # Moto-specific fields
    cilindrada: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)   # cc
    tipo_moto: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)      # Sport, Naked, Trail...

    # Carroceria / condição / portas
    carroceria: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        index=True,
    )
    condicao: Mapped[str] = mapped_column(
        String(20),
        default="usado",
        nullable=False,
        server_default="usado",
    )
    portas: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)       # 2 ou 4
    opcionais: Mapped[Optional[str]] = mapped_column(Text, nullable=True)            # JSON list

    # Analytics
    visualizacoes: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    # Legal documents (UNIQUE constraints prevent duplicates)
    placa: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    chassi: Mapped[str] = mapped_column(String(17), unique=True, nullable=False, index=True)
    renavam: Mapped[str | None] = mapped_column(String(11), nullable=True)

    # Purchase information
    valor_compra: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    valor_multas: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    data_compra: Mapped[date] = mapped_column(Date, nullable=False)
    vendedor_nome: Mapped[str | None] = mapped_column(String(120), nullable=True)    # Previous owner name
    vendedor_telefone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    documento_compra: Mapped[str | None] = mapped_column(String(500), nullable=True) # File path

    # Pricing
    valor_anunciado: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    valor_minimo: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    valor_vendido: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    # Status
    status: Mapped[VehicleStatus] = mapped_column(
        SAEnum(VehicleStatus, name="vehicle_status"),
        default=VehicleStatus.DISPONIVEL,
        nullable=False,
        index=True,
    )

    # Meta
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    destaque: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="Link YouTube do video do veiculo")
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)


    # Relationships
    expenses = relationship("VehicleExpense", back_populates="vehicle", cascade="all, delete-orphan")
    photos = relationship("VehiclePhoto", back_populates="vehicle", cascade="all, delete-orphan", order_by="VehiclePhoto.ordem")
    sale = relationship(
        "Sale",
        back_populates="vehicle",
        uselist=True,
        order_by="Sale.created_at.desc()",  # mais recente primeiro
    )
    creator = relationship("User", foreign_keys=[created_by])

    # ─── Computed financial properties ───────────────────────────────────────────
    # These work correctly when expenses are eagerly loaded (selectinload).
    # When expenses are NOT loaded they silently return 0 for expenses portion.

    @property
    def custo_total(self) -> Decimal:
        """Total cost = valor_compra + valor_multas + sum(expenses)."""
        try:
            loaded = self.__class__.__dict__["expenses"].impl.key  # noqa — just check attr exists
            loaded_expenses = object.__getattribute__(self, "__dict__").get("expenses") or []
            if not isinstance(loaded_expenses, list):
                loaded_expenses = []
            exp_sum = Decimal(str(sum(float(e.valor) for e in loaded_expenses)))
        except Exception:
            exp_sum = Decimal("0")
        return self.valor_compra + (self.valor_multas or Decimal("0")) + exp_sum

    @property
    def lucro_bruto(self) -> "Decimal | None":
        """Gross profit = valor_ref - custo_total (None when no reference price)."""
        val_ref = self.valor_vendido or self.valor_anunciado
        if not val_ref or val_ref <= 0:
            return None
        return val_ref - self.custo_total

    @property
    def margem_percentual(self) -> "Decimal | None":
        """Margin % = lucro_bruto / valor_ref * 100 (None when no reference price)."""
        val_ref = self.valor_vendido or self.valor_anunciado
        if not val_ref or val_ref <= 0:
            return None
        lucro = val_ref - self.custo_total
        return Decimal(str(round(float(lucro / val_ref * 100), 2)))

    def __repr__(self) -> str:
        return f"<Vehicle {self.marca} {self.modelo} {self.ano} - {self.placa}>"
