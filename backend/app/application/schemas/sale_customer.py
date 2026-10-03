import re

from pydantic import BaseModel, field_validator, model_validator
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

    @field_validator("valor_entrada", "valor_financiado")
    @classmethod
    def valores_nao_negativos(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Valores de entrada e financiamento não podem ser negativos")
        return v

    @field_validator("comissao_percentual")
    @classmethod
    def comissao_razoavel(cls, v: Decimal) -> Decimal:
        # A comissão vira saída no caixa: um valor digitado errado (ex.: 150 em vez de 1,5)
        # zeraria o lucro da venda sem ninguém perceber.
        if v < 0 or v > 20:
            raise ValueError("Comissão deve ficar entre 0% e 20%")
        return v

    @model_validator(mode="after")
    def pagamentos_somam_o_total(self):
        if self.payment_methods:
            total = sum((m.valor for m in self.payment_methods), Decimal("0"))
            if abs(total - self.valor_venda) > Decimal("0.01"):
                raise ValueError(
                    f"As formas de pagamento somam R$ {total:.2f}, mas a venda é de R$ {self.valor_venda:.2f}"
                )
            if any(m.valor <= 0 for m in self.payment_methods):
                raise ValueError("Cada forma de pagamento precisa ter valor maior que zero")
        if self.valor_entrada + self.valor_financiado > self.valor_venda + Decimal("0.01"):
            raise ValueError("Entrada + financiado não pode passar do valor da venda")
        return self


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


def _digitos(v: str) -> str:
    return re.sub(r"\D", "", v or "")


def _cpf_valido(d: str) -> bool:
    if len(d) != 11 or d == d[0] * 11:
        return False
    for n in (9, 10):
        soma = sum(int(d[i]) * (n + 1 - i) for i in range(n))
        if (soma * 10 % 11) % 10 != int(d[n]):
            return False
    return True


def _cnpj_valido(d: str) -> bool:
    if len(d) != 14 or d == d[0] * 14:
        return False
    for n, pesos in ((12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]), (13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])):
        soma = sum(int(d[i]) * pesos[i] for i in range(n))
        dv = 11 - soma % 11
        if (0 if dv >= 10 else dv) != int(d[n]):
            return False
    return True


def normalizar_cpf_cnpj(v: Optional[str]) -> Optional[str]:
    """Valida e devolve sempre no formato com máscara (assim a unicidade compara igual)."""
    if v is None or not v.strip():
        return None
    d = _digitos(v)
    if len(d) == 11 and _cpf_valido(d):
        return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"
    if len(d) == 14 and _cnpj_valido(d):
        return f"{d[:2]}.{d[2:5]}.{d[5:8]}/{d[8:12]}-{d[12:]}"
    raise ValueError("CPF/CNPJ inválido")


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

    @field_validator("cpf_cnpj")
    @classmethod
    def cpf_cnpj_valido(cls, v: Optional[str]) -> Optional[str]:
        return normalizar_cpf_cnpj(v)


class CustomerUpdate(BaseModel):
    nome: Optional[str] = None
    cpf_cnpj: Optional[str] = None

    @field_validator("cpf_cnpj")
    @classmethod
    def cpf_cnpj_valido(cls, v: Optional[str]) -> Optional[str]:
        return normalizar_cpf_cnpj(v)

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
