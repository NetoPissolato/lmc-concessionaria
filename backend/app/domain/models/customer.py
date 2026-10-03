import uuid
from sqlalchemy import String, Text, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.domain.models.base import TimestampMixin, SoftDeleteMixin


class Customer(Base, TimestampMixin, SoftDeleteMixin):
    """
    Customer entity.

    Tracks both buyers (comprou veículo) and sellers (vendeu veículo para a loja).
    Full history is accessible through relationships.
    """
    __tablename__ = "customers"
    __table_args__ = (
        # Único só entre clientes ativos: excluir um cliente não pode travar o recadastro
        Index("uq_customers_cpf_cnpj_ativo", "cpf_cnpj", unique=True,
              postgresql_where=text("is_deleted = false AND cpf_cnpj IS NOT NULL")),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Personal data
    nome: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    cpf_cnpj: Mapped[str | None] = mapped_column(String(18), nullable=True, index=True)
    telefone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Address
    cep: Mapped[str | None] = mapped_column(String(9), nullable=True)
    endereco: Mapped[str | None] = mapped_column(String(255), nullable=True)
    numero: Mapped[str | None] = mapped_column(String(10), nullable=True)
    complemento: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bairro: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estado: Mapped[str | None] = mapped_column(String(2), nullable=True)

    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    purchases = relationship("Sale", back_populates="cliente", foreign_keys="Sale.cliente_id")

    def __repr__(self) -> str:
        return f"<Customer {self.nome}>"
