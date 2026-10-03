import uuid
import enum
from decimal import Decimal
from datetime import date
from sqlalchemy import String, Numeric, Date, Text, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.domain.models.base import TimestampMixin


class EntryType(str, enum.Enum):
    ENTRADA = "entrada"
    SAIDA = "saida"


class FinancialCategory(str, enum.Enum):
    # Entries
    VENDA_VEICULO = "venda_veiculo"
    OUTROS_ENTRADA = "outros_entrada"
    # Exits
    COMPRA_VEICULO = "compra_veiculo"
    MANUTENCAO = "manutencao"
    DOCUMENTACAO = "documentacao"
    COMISSAO = "comissao"
    SALARIO = "salario"
    ALUGUEL = "aluguel"
    UTILIDADES = "utilidades"
    MARKETING = "marketing"
    GUINCHO = "guincho"
    IPVA = "ipva"
    LICENCIAMENTO = "licenciamento"
    MULTA = "multa"
    OUTROS_SAIDA = "outros_saida"


class FinancialEntry(Base, TimestampMixin):
    """
    General financial ledger.

    Entries are created:
    - Automatically when a sale is completed (VENDA_VEICULO)
    - Automatically when a vehicle is purchased (COMPRA_VEICULO)
    - Manually by admin for other income/expenses

    This powers the cash flow report and P&L statements.
    """
    __tablename__ = "financial_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tipo: Mapped[EntryType] = mapped_column(SAEnum(EntryType, name="entry_type"), nullable=False, index=True)
    categoria: Mapped[FinancialCategory] = mapped_column(
        SAEnum(FinancialCategory, name="financial_category"), nullable=False, index=True
    )
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    data: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # References (optional — links to origin record)
    venda_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("sales.id"), nullable=True)
    vehicle_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("vehicles.id"), nullable=True)
    expense_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # Estorno: lançamento NEGATIVO com o mesmo tipo e categoria do original. Cancelar uma
    # venda ou apagar uma despesa não apaga o histórico do caixa: soma o estorno, e os
    # totais por categoria se anulam sozinhos.
    estorno_de_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("financial_entries.id"), nullable=True, index=True
    )

    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    def __repr__(self) -> str:
        return f"<FinancialEntry {self.tipo} R${self.valor} - {self.data}>"
