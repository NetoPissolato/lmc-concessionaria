import uuid
from typing import Optional
from sqlalchemy import String, Text, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.domain.models.base import TimestampMixin


class Review(Base, TimestampMixin):
    """
    Avaliacao de cliente exibida na pagina /sobre.
    Fica pendente de aprovacao ate o admin aprovar no dashboard.
    """
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    nota: Mapped[int] = mapped_column(
        Integer, nullable=False,
        comment="Nota de 1 a 5 estrelas"
    )
    texto: Mapped[str] = mapped_column(Text, nullable=False)

    # Opcional — URL de foto do cliente
    foto_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Cidade/estado do cliente (ex: "Sao Paulo - SP")
    cidade: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Aprovacao pelo admin
    aprovado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:
        return f"<Review {self.nome!r} nota={self.nota} aprovado={self.aprovado}>"
