import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Enum as SAEnum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.core.database import Base
from app.domain.models.base import TimestampMixin, SoftDeleteMixin


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    FUNCIONARIO = "funcionario"


class User(Base, TimestampMixin, SoftDeleteMixin):
    """
    System users.
    - ADMIN: full access to all features including financial and user management
    - FUNCIONARIO: can register vehicles, customers, maintenance and sales
                   but CANNOT delete records or manage users
    """
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    # Optional username (login alternative to email). Must be unique when set.
    usuario: Mapped[str | None] = mapped_column(String(60), unique=True, nullable=True, index=True)
    senha_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Relative path to avatar stored under UPLOAD_DIR/avatars/
    foto: Mapped[str | None] = mapped_column(String(500), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role"),
        default=UserRole.FUNCIONARIO,
        nullable=False,
    )
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Recorded on every successful login
    ultimo_login: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    vendas = relationship("Sale", back_populates="vendedor", foreign_keys="Sale.vendedor_id")
    audit_logs = relationship("AuditLog", back_populates="usuario")

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"
