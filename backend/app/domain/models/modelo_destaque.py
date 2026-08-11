import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.domain.models.base import TimestampMixin


class ModeloDestaque(Base, TimestampMixin):
    """
    Modelos em destaque exibidos na seção 'Modelos mais buscados' do site.
    O admin gerencia quais modelos aparecem, sua imagem e ordem.
    """
    __tablename__ = "modelos_destaque"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Identificação do modelo
    marca: Mapped[str] = mapped_column(String(60), nullable=False)
    modelo: Mapped[str] = mapped_column(String(120), nullable=False)
    carroceria: Mapped[str] = mapped_column(String(30), nullable=False)  # suv, hatch, sedan, ...

    # Imagem: URL do upload (ou None para usar a do estoque como fallback)
    imagem_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Controle
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")
    ordem: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")

    def __repr__(self) -> str:
        return f"<ModeloDestaque {self.marca} {self.modelo} [{self.carroceria}]>"
