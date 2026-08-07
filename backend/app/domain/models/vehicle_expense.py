import uuid
import enum
from decimal import Decimal
from datetime import date
from sqlalchemy import String, Numeric, Date, Text, Enum as SAEnum, ForeignKey, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.domain.models.base import TimestampMixin


class ExpenseCategory(str, enum.Enum):
    MECANICA = "mecanica"
    FUNILARIA = "funilaria"
    PINTURA = "pintura"
    LAVAGEM = "lavagem"
    DOCUMENTACAO = "documentacao"
    PNEUS = "pneus"
    ELETRICA = "eletrica"
    COMBUSTIVEL = "combustivel"
    ACESSORIOS = "acessorios"
    GUINCHO = "guincho"
    IPVA = "ipva"
    LICENCIAMENTO = "licenciamento"
    COMISSAO = "comissao"
    OUTROS = "outros"


class PaymentMethod(str, enum.Enum):
    DINHEIRO = "dinheiro"
    PIX = "pix"
    CARTAO_CREDITO = "cartao_credito"
    CARTAO_DEBITO = "cartao_debito"
    TRANSFERENCIA = "transferencia"
    BOLETO = "boleto"


class VehicleExpense(Base, TimestampMixin):
    """
    Individual expense record for a vehicle (cost center).

    Every maintenance, document fee, or any cost is tracked here.
    The system automatically recalculates custo_total and expected profit
    whenever an expense is added, updated or removed.

    Rule: valor cannot be negative.
    """
    __tablename__ = "vehicle_expenses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vehicle_id: Mapped[str] = mapped_column(String(36), ForeignKey("vehicles.id"), nullable=False, index=True)

    data: Mapped[date] = mapped_column(Date, nullable=False)
    categoria: Mapped[ExpenseCategory] = mapped_column(
        SAEnum(ExpenseCategory, name="expense_category"), nullable=False, index=True
    )
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)
    valor: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    forma_pagamento: Mapped[PaymentMethod] = mapped_column(
        SAEnum(PaymentMethod, name="payment_method_expense"), nullable=False
    )
    parcelas: Mapped[int | None] = mapped_column(Integer, nullable=True)            # Installment count
    responsavel: Mapped[str | None] = mapped_column(String(120), nullable=True)   # Who paid/authorized
    fornecedor: Mapped[str | None] = mapped_column(String(120), nullable=True)    # Supplier name
    nota_fiscal: Mapped[str | None] = mapped_column(String(500), nullable=True)   # File path to invoice
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    km_atual: Mapped[int | None] = mapped_column(nullable=True)                   # Mileage at time of service

    # Relationship
    vehicle = relationship("Vehicle", back_populates="expenses")

    def __repr__(self) -> str:
        return f"<Expense {self.categoria} R${self.valor} - {self.data}>"
