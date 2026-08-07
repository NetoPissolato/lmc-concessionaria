from pydantic import BaseModel, field_validator
from typing import Optional
from decimal import Decimal
from datetime import date, datetime
from app.domain.models.vehicle_expense import ExpenseCategory, PaymentMethod


class ExpenseCreate(BaseModel):
    data: date
    categoria: ExpenseCategory
    descricao: str
    valor: Decimal
    forma_pagamento: PaymentMethod
    parcelas: Optional[int] = None
    responsavel: Optional[str] = None
    fornecedor: Optional[str] = None
    observacoes: Optional[str] = None
    km_atual: Optional[int] = None

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
    descricao: Optional[str] = None
    valor: Optional[Decimal] = None
    forma_pagamento: Optional[PaymentMethod] = None
    parcelas: Optional[int] = None
    responsavel: Optional[str] = None
    fornecedor: Optional[str] = None
    observacoes: Optional[str] = None
    km_atual: Optional[int] = None


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
