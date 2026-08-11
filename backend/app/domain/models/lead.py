import uuid
import enum
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.domain.models.base import TimestampMixin


class LeadStatus(str, enum.Enum):
    NOVO = "novo"
    EM_ATENDIMENTO = "em_atendimento"
    PROPOSTA = "proposta"
    FECHADO = "fechado"
    PERDIDO = "perdido"


class Lead(Base, TimestampMixin):
    """
    Lead de contato — gerado quando visitante envia formulario no site.

    Fluxo: Novo → Em Atendimento → Proposta → Fechado / Perdido
    """
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    telefone: Mapped[str] = mapped_column(String(30), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    mensagem: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Veiculo de interesse (opcional — preenchido quando lead vem da pagina do veiculo)
    veiculo_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True,
    )
    veiculo_descricao: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True,
        comment="Descricao textual do veiculo (marca, modelo, ano) salva no momento do lead"
    )

    status: Mapped[LeadStatus] = mapped_column(
        SAEnum(LeadStatus, name="lead_status", values_callable=lambda x: [e.value for e in x]),
        default=LeadStatus.NOVO,
        nullable=False,
    )

    # Origem do lead
    origem: Mapped[str] = mapped_column(
        String(50),
        default="contato",
        nullable=False,
        comment="contato | veiculo | comparador | whatsapp"
    )

    # Observacoes internas (anotacoes do vendedor)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<Lead {self.nome!r} status={self.status.value}>"
