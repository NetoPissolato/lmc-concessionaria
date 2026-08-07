import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AuditLog(Base):
    """
    Immutable audit trail — records every sensitive action in the system.

    How it works:
    - Every data modification triggers an audit entry
    - Contains before/after values for field-level tracking
    - Includes user, IP address, and timestamp
    - Records are NEVER deleted (no soft delete here)
    - Viewable only by ADMIN role
    """
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    usuario_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    acao: Mapped[str] = mapped_column(String(50), nullable=False, index=True)   # CREATE, UPDATE, DELETE, LOGIN, etc.
    entidade: Mapped[str] = mapped_column(String(60), nullable=False, index=True) # Table/entity name
    entidade_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    dados_antes: Mapped[dict | None] = mapped_column(JSON, nullable=True)        # Old values
    dados_depois: Mapped[dict | None] = mapped_column(JSON, nullable=True)       # New values
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)   # IPv4 or IPv6
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)           # Human-readable description
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Relationship
    usuario = relationship("User", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog {self.acao} on {self.entidade} by {self.usuario_id}>"
