"""
Regras do caixa (financial_entries) compartilhadas por vendas, despesas e veículos.

Lançamento nunca é apagado: quando a origem é desfeita (venda cancelada, despesa
removida, veículo excluído), cria-se um ESTORNO — lançamento com o mesmo tipo e
categoria e valor NEGATIVO, apontando para o original em `estorno_de_id`. Assim:
- o histórico continua auditável (quem lançou, quando, quem estornou);
- os totais por categoria e por mês se anulam sozinhos, sem caso especial nos relatórios.

Data do estorno:
- CORREÇÃO de cadastro (valor de compra errado, despesa corrigida/removida, veículo
  excluído): na data do lançamento original. Foi um erro de digitação, então o mês certo
  é o do lançamento. Antes o estorno caía no mês atual: corrigir em outubro um carro
  comprado em setembro deixava setembro com a compra em dobro e outubro com uma
  "saída negativa".
- CANCELAMENTO de venda: hoje (o dinheiro volta agora; o mês fechado não muda).
"""
from decimal import Decimal
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tempo import hoje_loja
from app.domain.models.financial import FinancialEntry, FinancialCategory


async def _saldo_original(db: AsyncSession, original: FinancialEntry) -> Decimal:
    """Valor ainda em aberto do lançamento: original + estornos já feitos."""
    estornado = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.valor), 0)).where(
            FinancialEntry.estorno_de_id == original.id
        )
    )
    return Decimal(str(original.valor)) + Decimal(str(estornado or 0))


async def estornar(
    db: AsyncSession,
    *condicoes,
    motivo: str,
    usuario_id: Optional[str],
    na_data_original: bool = False,
) -> int:
    """
    Estorna os lançamentos ORIGINAIS que casam com `condicoes` e ainda têm saldo.
    Idempotente: estornar duas vezes não gera estorno duplicado.
    `na_data_original=True` para correções (ver docstring do módulo).
    Devolve quantos estornos foram criados.
    """
    originais = (await db.execute(
        select(FinancialEntry).where(FinancialEntry.estorno_de_id.is_(None), *condicoes)
    )).scalars().all()

    criados = 0
    for original in originais:
        saldo = await _saldo_original(db, original)
        if saldo == 0:
            continue
        db.add(FinancialEntry(
            tipo=original.tipo,
            categoria=original.categoria,
            descricao=f"Estorno ({motivo}): {original.descricao}"[:255],
            valor=-saldo,
            data=original.data if na_data_original else hoje_loja(),
            venda_id=original.venda_id,
            vehicle_id=original.vehicle_id,
            expense_id=original.expense_id,
            estorno_de_id=original.id,
            created_by=usuario_id,
        ))
        criados += 1
    if criados:
        await db.flush()
    return criados


async def saldo_categoria_veiculo(
    db: AsyncSession, vehicle_id: str, categoria: FinancialCategory
) -> Decimal:
    """Soma líquida (com estornos) de uma categoria para um veículo."""
    total = await db.scalar(
        select(func.coalesce(func.sum(FinancialEntry.valor), 0)).where(
            FinancialEntry.vehicle_id == vehicle_id,
            FinancialEntry.categoria == categoria,
        )
    )
    return Decimal(str(total or 0))
