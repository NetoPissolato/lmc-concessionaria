from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime, date
from app.domain.models.user import UserRole


class UserCreate(BaseModel):
    # Limites = tamanho das colunas: texto maior virava erro 500 do banco
    nome: str = Field(max_length=120)
    email: EmailStr = Field(max_length=200)
    senha: str = Field(max_length=128)
    usuario: Optional[str] = None
    telefone: Optional[str] = Field(None, max_length=20)
    role: UserRole = UserRole.FUNCIONARIO
    cargo: Optional[str] = Field(None, max_length=120)
    data_contratacao: Optional[date] = None

    @field_validator("email")
    @classmethod
    def email_minusculo(cls, v: str) -> str:
        # O login procura o e-mail em minúsculas. Gravado "Joao@loja.com", o usuário
        # nunca conseguia entrar pelo e-mail (só pelo nome de usuário).
        return v.strip().lower()

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
    nome: Optional[str] = Field(None, max_length=120)
    usuario: Optional[str] = None
    telefone: Optional[str] = Field(None, max_length=20)
    ativo: Optional[bool] = None
    cargo: Optional[str] = Field(None, max_length=120)
    data_contratacao: Optional[date] = None
    # NOTE: role change is allowed only via explicit admin endpoint — never via mass-assignment here

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
    cargo: Optional[str]
    data_contratacao: Optional[date]
    ultimo_login: Optional[datetime]
    created_at: datetime


class UserMe(UserResponse):
    """Current authenticated user — same as UserResponse."""
    pass


class ChangePasswordRequest(BaseModel):
    """User changes their own password (requires current password)."""
    senha_atual: str = Field(max_length=128)
    nova_senha: str = Field(max_length=128)
    confirmar_senha: str = Field(max_length=128)

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
    nova_senha: str = Field(max_length=128)

    @field_validator("nova_senha")
    @classmethod
    def senha_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")
        return v
