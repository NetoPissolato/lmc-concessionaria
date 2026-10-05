import re

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from app.domain.models.sale import SaleStatus, PaymentType


class PaymentMethodItem(BaseModel):
    """One entry in a split payment (e.g. PIX R$150k + Dinheiro R$100k)."""
    forma: str = Field(max_length=30)  # pix | dinheiro | cartao | financiamento | consorcio | permuta | transferencia
    valor: Decimal = Field(max_digits=12, decimal_places=2)
    parcelas: Optional[int] = Field(None, ge=1, le=600)
    banco: Optional[str] = Field(None, max_length=100)
    taxa: Optional[Decimal] = Field(None, ge=0, le=100)


class SaleCreate(BaseModel):
    cliente_id: str
    vehicle_id: str
    vendedor_id: Optional[str] = None   # auto-filled from JWT if not provided
    # Numeric(12,2) no banco: acima de 9.999.999.999,99 o Postgres recusava com erro 500
    valor_venda: Decimal = Field(max_digits=12, decimal_places=2)
    valor_entrada: Decimal = Field(Decimal("0"), max_digits=12, decimal_places=2)
    valor_financiado: Decimal = Field(Decimal("0"), max_digits=12, decimal_places=2)
    parcelas: Optional[int] = Field(None, ge=1, le=600)
    taxa_juros: Optional[Decimal] = None
    forma_pagamento: PaymentType
    banco_financiamento: Optional[str] = Field(None, max_length=100)
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

    @field_validator("data_venda")
    @classmethod
    def venda_nao_futura(cls, v: date) -> date:
        # Venda datada no futuro caía num mês futuro do caixa e do dashboard
        from datetime import timedelta
        from app.core.tempo import hoje_loja
        if v > hoje_loja() + timedelta(days=1):
            raise ValueError("A data da venda não pode estar no futuro")
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


# Limites = tamanho das colunas em customers (texto maior virava erro 500 do banco)
class CustomerCreate(BaseModel):
    nome: str = Field(max_length=120)
    cpf_cnpj: Optional[str] = Field(None, max_length=18)
    telefone: Optional[str] = Field(None, max_length=20)
    whatsapp: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    cep: Optional[str] = Field(None, max_length=9)
    endereco: Optional[str] = Field(None, max_length=255)
    numero: Optional[str] = Field(None, max_length=10)
    complemento: Optional[str] = Field(None, max_length=100)
    bairro: Optional[str] = Field(None, max_length=100)
    cidade: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, max_length=2)
    observacoes: Optional[str] = Field(None, max_length=5000)

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

    @field_validator("estado")
    @classmethod
    def uf_maiuscula(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() or None if v else v


class CustomerUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=120)
    cpf_cnpj: Optional[str] = Field(None, max_length=18)

    @field_validator("cpf_cnpj")
    @classmethod
    def cpf_cnpj_valido(cls, v: Optional[str]) -> Optional[str]:
        return normalizar_cpf_cnpj(v)

    @field_validator("estado")
    @classmethod
    def uf_maiuscula(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() or None if v else v

    telefone: Optional[str] = Field(None, max_length=20)
    whatsapp: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    cep: Optional[str] = Field(None, max_length=9)
    endereco: Optional[str] = Field(None, max_length=255)
    numero: Optional[str] = Field(None, max_length=10)
    complemento: Optional[str] = Field(None, max_length=100)
    bairro: Optional[str] = Field(None, max_length=100)
    cidade: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, max_length=2)
    observacoes: Optional[str] = Field(None, max_length=5000)


class CustomerResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    nome: str
    cpf_cnpj: Optional[str]
    telefone: Optional[str]
    whatsapp: Optional[str]
    email: Optional[str]
    # CEP, número, bairro e complemento eram gravados mas nunca devolvidos: a tela de
    # edição abria com esses campos vazios
    cep: Optional[str] = None
    endereco: Optional[str]
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str]
    estado: Optional[str]
    observacoes: Optional[str]
    created_at: datetime
    total_compras: Optional[int] = None
