import uuid
from typing import Optional
from decimal import Decimal
from sqlalchemy import String, Numeric, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.domain.models.base import TimestampMixin


class AvailabilityAlert(Base, TimestampMixin):
    """
    Alerta de disponibilidade — visitante quer ser notificado quando
    um veiculo com determinadas caracteristicas entrar no estoque.

    Fluxo:
    1. Visitante pesquisa e nao encontra resultado
    2. Preenche email + filtros desejados
    3. Quando admin cadastra veiculo que bate os filtros, envia email automaticamente
    """
    __tablename__ = "availability_alerts"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    email: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    nome: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    # Filtros do alerta (todos opcionais — quanto mais especifico, mais preciso)
    marca: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    modelo: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    tipo: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, comment="carro | moto")
    ano_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ano_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    preco_max: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )

    # Controle
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notificacoes_enviadas: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
        comment="Quantas notificacoes ja foram enviadas para este alerta"
    )

    def matches_vehicle(self, marca: str, modelo: str, tipo: str, ano: int, preco: Decimal) -> bool:
        """Verifica se um veiculo bate os filtros deste alerta."""
        if self.marca and self.marca.lower() not in marca.lower():
            return False
        if self.modelo and self.modelo.lower() not in modelo.lower():
            return False
        if self.tipo and self.tipo != tipo:
            return False
        if self.ano_min and ano < self.ano_min:
            return False
        if self.ano_max and ano > self.ano_max:
            return False
        if self.preco_max and preco > self.preco_max:
            return False
        return True

    def __repr__(self) -> str:
        return f"<AvailabilityAlert email={self.email!r} marca={self.marca!r}>"
