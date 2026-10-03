import uuid
import enum
from decimal import Decimal
from datetime import date
from sqlalchemy import String, Numeric, Integer, Date, Text, Enum as SAEnum, ForeignKey, Boolean, JSON, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from app.core.database import Base
from app.domain.models.base import TimestampMixin, SoftDeleteMixin


class SaleStatus(str, enum.Enum):
    PENDENTE = "pendente"
    CONCLUIDA = "concluida"
    CANCELADA = "cancelada"


class PaymentType(str, enum.Enum):
    DINHEIRO = "dinheiro"
    PIX = "pix"
    FINANCIAMENTO = "financiamento"
    CONSORCIO = "consorcio"
    CARTAO = "cartao"
    TRANSFERENCIA = "transferencia"
    PERMUTA = "permuta"
    MISTO = "misto"


class Sale(Base, TimestampMixin, SoftDeleteMixin):
    """
    Sale transaction.

    When a sale is saved:
    1. Vehicle status changes to VENDIDO automatically
    2. Dashboard KPIs are recalculated
    3. A financial entry (ENTRADA) is created automatically
    4. Commission is calculated based on vendedor's rate
    """
    __tablename__ = "sales"
    __table_args__ = (
        # Um veículo não pode ter duas vendas ativas ao mesmo tempo. A checagem no
        # service dá a mensagem amigável; o índice garante mesmo com duas requisições
        # simultâneas.
        Index("uq_sales_veiculo_ativa", "vehicle_id", unique=True,
              postgresql_where=text("is_deleted = false AND status IN ('PENDENTE', 'CONCLUIDA')")),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # References
    cliente_id: Mapped[str] = mapped_column(String(36), ForeignKey("customers.id"), nullable=False, index=True)
    vehicle_id: Mapped[str] = mapped_column(String(36), ForeignKey("vehicles.id"), nullable=False, index=True)
    vendedor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    # Financial
    valor_venda: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    valor_entrada: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    valor_financiado: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    parcelas: Mapped[int | None] = mapped_column(Integer, nullable=True)
    forma_pagamento: Mapped[PaymentType] = mapped_column(SAEnum(PaymentType, name="payment_type"), nullable=False)
    banco_financiamento: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Split payment — list of {forma, valor} dicts; populated when multiple methods used
    payment_methods: Mapped[Optional[List[dict]]] = mapped_column(JSON, nullable=True)

    # Commission
    comissao_percentual: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0"), nullable=False)
    comissao_valor: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"), nullable=False)

    # Dates
    data_venda: Mapped[date] = mapped_column(Date, nullable=False)
    data_entrega: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Status
    status: Mapped[SaleStatus] = mapped_column(
        SAEnum(SaleStatus, name="sale_status"),
        default=SaleStatus.CONCLUIDA,
        nullable=False,
        index=True,
    )

    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    cliente = relationship("Customer", back_populates="purchases", foreign_keys=[cliente_id])
    vehicle = relationship("Vehicle", back_populates="sale")
    vendedor = relationship("User", back_populates="vendas", foreign_keys=[vendedor_id])

    def __repr__(self) -> str:
        return f"<Sale R${self.valor_venda} - {self.data_venda}>"
