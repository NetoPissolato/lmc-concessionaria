from pydantic import BaseModel, Field, field_validator
from typing import Optional
from decimal import Decimal
from datetime import date, datetime
from app.domain.models.vehicle_expense import ExpenseCategory, PaymentMethod


class ExpenseCreate(BaseModel):
    data: date
    categoria: ExpenseCategory
    descricao: str = Field(max_length=255)
    valor: Decimal = Field(max_digits=10, decimal_places=2)  # Numeric(10,2) no banco
    forma_pagamento: PaymentMethod
    parcelas: Optional[int] = Field(None, ge=1, le=120)
    responsavel: Optional[str] = Field(None, max_length=120)
    fornecedor: Optional[str] = Field(None, max_length=120)
    observacoes: Optional[str] = Field(None, max_length=5000)
    km_atual: Optional[int] = Field(None, ge=0, le=3_000_000)

    @field_validator("valor")
    @classmethod
    def valor_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Valor deve ser maior que zero")
        return v

    @field_validator("descricao")
    @classmethod
    def descricao_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Descrição não pode ser vazia")
        return v.strip()


class ExpenseUpdate(BaseModel):
    data: Optional[date] = None
    categoria: Optional[ExpenseCategory] = None
    descricao: Optional[str] = Field(None, min_length=1, max_length=255)
    # Corrigir para zero ou negativo lançava uma "saída negativa" no caixa
    valor: Optional[Decimal] = Field(None, gt=0, max_digits=10, decimal_places=2)
    forma_pagamento: Optional[PaymentMethod] = None
    parcelas: Optional[int] = Field(None, ge=1, le=120)
    responsavel: Optional[str] = Field(None, max_length=120)
    fornecedor: Optional[str] = Field(None, max_length=120)
    observacoes: Optional[str] = Field(None, max_length=5000)
    km_atual: Optional[int] = Field(None, ge=0, le=3_000_000)


class ExpenseResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    vehicle_id: str
    data: date
    categoria: ExpenseCategory
    descricao: str
    valor: Decimal
    forma_pagamento: PaymentMethod
    parcelas: Optional[int]
    responsavel: Optional[str]
    fornecedor: Optional[str]
    nota_fiscal: Optional[str]
    observacoes: Optional[str]
    km_atual: Optional[int]
    created_at: datetime
