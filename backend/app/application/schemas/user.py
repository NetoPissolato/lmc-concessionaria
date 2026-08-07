from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.domain.models.user import UserRole


class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    usuario: Optional[str] = None
    telefone: Optional[str] = None
    role: UserRole = UserRole.FUNCIONARIO

    @field_validator("senha")
    @classmethod
    def senha_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")
        return v

    @field_validator("nome")
    @classmethod
    def nome_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Nome não pode ser vazio")
        return v.strip()

    @field_validator("usuario")
    @classmethod
    def usuario_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().lower()
        if len(v) < 3:
            raise ValueError("Usuário deve ter no mínimo 3 caracteres")
        if len(v) > 60:
            raise ValueError("Usuário deve ter no máximo 60 caracteres")
        import re
        if not re.match(r"^[a-z0-9._-]+$", v):
            raise ValueError("Usuário só pode conter letras, números, ponto, traço e sublinhado")
        return v


class UserUpdate(BaseModel):
    nome: Optional[str] = None
    usuario: Optional[str] = None
    telefone: Optional[str] = None
    ativo: Optional[bool] = None
    # NOTE: role change is allowed only via explicit admin endpoint — never via mass-assignment here

    @field_validator("usuario")
    @classmethod
    def usuario_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().lower()
        if len(v) < 3:
            raise ValueError("Usuário deve ter no mínimo 3 caracteres")
        import re
        if not re.match(r"^[a-z0-9._-]+$", v):
            raise ValueError("Usuário inválido")
        return v


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    nome: str
    email: str
    usuario: Optional[str]
    telefone: Optional[str]
    foto: Optional[str]
    role: UserRole
    ativo: bool
    ultimo_login: Optional[datetime]
    created_at: datetime


class UserMe(UserResponse):
    """Current authenticated user — same as UserResponse."""
    pass


class ChangePasswordRequest(BaseModel):
    """User changes their own password (requires current password)."""
    senha_atual: str
    nova_senha: str
    confirmar_senha: str

    @field_validator("nova_senha")
    @classmethod
    def senha_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Nova senha deve ter no mínimo 8 caracteres")
        return v

    @field_validator("confirmar_senha")
    @classmethod
    def senhas_match(cls, v: str, info) -> str:
        if "nova_senha" in info.data and v != info.data["nova_senha"]:
            raise ValueError("Senhas não conferem")
        return v


class AdminChangePasswordRequest(BaseModel):
    """Admin sets a new password for any user (no current password required)."""
    nova_senha: str

    @field_validator("nova_senha")
    @classmethod
    def senha_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")
        return v
