from pydantic import BaseModel, field_validator
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from app.domain.models.sale import SaleStatus, PaymentType


class PaymentMethodItem(BaseModel):
    """One entry in a split payment (e.g. PIX R$150k + Dinheiro R$100k)."""
    forma: str      # pix | dinheiro | cartao | financiamento | consorcio | permuta | transferencia
    valor: Decimal
    parcelas: Optional[int] = None
    banco: Optional[str] = None
    taxa: Optional[Decimal] = None


class SaleCreate(BaseModel):
    cliente_id: str
    vehicle_id: str
    vendedor_id: Optional[str] = None   # auto-filled from JWT if not provided
    valor_venda: Decimal
    valor_entrada: Decimal = Decimal("0")
    valor_financiado: Decimal = Decimal("0")
    parcelas: Optional[int] = None
    taxa_juros: Optional[Decimal] = None
    forma_pagamento: PaymentType
    banco_financiamento: Optional[str] = None
    comissao_percentual: Decimal = Decimal("0")
    comissao_valor: Optional[Decimal] = None
    data_venda: date
    data_entrega: Optional[date] = None
    observacoes: Optional[str] = None
    status: SaleStatus = SaleStatus.CONCLUIDA   # PENDENTE | CONCLUIDA
    # Split payment — if provided, forma_pagamento auto-set to 'misto' when len > 1
    payment_methods: Optional[List[PaymentMethodItem]] = None

    @field_validator("valor_venda")
    @classmethod
    def valor_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Valor de venda deve ser maior que zero")
        return v


class SaleStatusUpdate(BaseModel):
    status: SaleStatus


class SaleResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    cliente_id: str
    vehicle_id: str
    vendedor_id: str
    valor_venda: Decimal
    valor_entrada: Decimal
    valor_financiado: Decimal
    parcelas: Optional[int]
    forma_pagamento: PaymentType
    banco_financiamento: Optional[str]
    comissao_percentual: Decimal
    comissao_valor: Decimal
    data_venda: date
    data_entrega: Optional[date]
    status: SaleStatus
    observacoes: Optional[str]
    created_at: datetime
    payment_methods: Optional[List[PaymentMethodItem]] = None
    # Nested data
    cliente_nome: Optional[str] = None
    vehicle_info: Optional[str] = None
    vendedor_nome: Optional[str] = None


class CustomerCreate(BaseModel):
    nome: str
    cpf_cnpj: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    cep: Optional[str] = None
    endereco: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    observacoes: Optional[str] = None

    @field_validator("nome")
    @classmethod
    def nome_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Nome não pode ser vazio")
        return v.strip()


class CustomerUpdate(BaseModel):
    nome: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    cep: Optional[str] = None
    endereco: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    observacoes: Optional[str] = None


class CustomerResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    nome: str
    cpf_cnpj: Optional[str]
    telefone: Optional[str]
    whatsapp: Optional[str]
    email: Optional[str]
    endereco: Optional[str]
    cidade: Optional[str]
    estado: Optional[str]
    observacoes: Optional[str]
    created_at: datetime
    total_compras: Optional[int] = None
