"""
Relatórios — endpoints que agregam dados reais para exportação PDF/Excel.
Filtro universal: data_inicio e data_fim (YYYY-MM-DD).
Retorna campos ricos: dados completos do veículo, cliente, vendedor e financeiro.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import date

from app.core.database import get_db
from app.presentation.dependencies.auth import get_current_user_payload
from app.domain.models.vehicle import Vehicle, VehicleType
from app.domain.models.vehicle_expense import VehicleExpense
from app.domain.models.sale import Sale
from app.infrastructure.repositories.sale_customer_repository import (
    SaleRepository, CustomerRepository,
)

router = APIRouter(prefix="/reports", tags=["Relatórios"])


def _m(v) -> float:
    if v is None: return 0.0
    try: return float(v)
    except Exception: return 0.0


def _fmt_date(d) -> str:
    if d is None: return ""
    if isinstance(d, str): return d[:10]
    try: return d.strftime("%d/%m/%Y")
    except Exception: return str(d)


def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s: return None
    try: return date.fromisoformat(s)
    except Exception: return None


def _in_period(dt, di: Optional[date], df: Optional[date]) -> bool:
    if isinstance(dt, str):
        try: dt = date.fromisoformat(dt[:10])
        except Exception: return True
    if di and dt < di: return False
    if df and dt > df: return False
    return True


def _resolve_period(data_inicio: Optional[str], data_fim: Optional[str]):
    di = _parse_date(data_inicio) if data_inicio else None
    df = _parse_date(data_fim)    if data_fim    else None
    return di, df


def _periodo_label(di, df):
    if di and df:
        return f"{_fmt_date(di)} a {_fmt_date(df)}"
    elif di:
        return f"A partir de {_fmt_date(di)}"
    elif df:
        return f"Até {_fmt_date(df)}"
    return "Todos os períodos"


# ─── 1. Relatório de Vendas (COMPLETO) ───────────────────────────────────────
@router.get("/vendas")
async def report_vendas(
    data_inicio: Optional[str] = Query(None),
    data_fim:    Optional[str] = Query(None),
    db:  AsyncSession  = Depends(get_db),
    _u:  dict          = Depends(get_current_user_payload),
):
    di, df = _resolve_period(data_inicio, data_fim)
    repo  = SaleRepository(db)
    sales = await repo.list_with_relations(skip=0, limit=5000)

    rows = []
    for s in sales:
        dt = s.data_venda
        if isinstance(dt, str):
            dt = date.fromisoformat(dt[:10])
        if not _in_period(dt, di, df): continue

        v  = s.vehicle
        cl = s.cliente
        vd = s.vendedor

        # Nome veículo completo
        if v:
            veiculo_nome  = f"{v.marca} {v.modelo} {v.versao or ''}".strip()
            veiculo_full  = f"{veiculo_nome} {v.ano}"
            quilometragem = v.quilometragem or 0
            cor           = v.cor or "—"
            placa         = v.placa or "—"
            tipo_v        = v.tipo.value if hasattr(v.tipo, "value") else str(v.tipo)
            veiculo_ano   = v.ano or ""
            # Cilindrada só para moto
            cilindrada    = f"{v.cilindrada} cc" if tipo_v == "moto" and v.cilindrada else ""
            tipo_moto     = v.tipo_moto or ""
        else:
            veiculo_nome = veiculo_full = "—"
            quilometragem = 0
            cor = placa = tipo_v = veiculo_ano = cilindrada = tipo_moto = "—"

        # Cliente completo
        cliente_nome   = cl.nome         if cl else "—"
        cliente_cpf    = cl.cpf_cnpj     if cl else "—"
        cliente_tel    = cl.telefone      if cl else "—"
        cliente_email  = cl.email         if cl else "—"
        cliente_cidade = cl.cidade        if cl else "—"
        cliente_uf     = cl.estado        if cl else "—"

        # Vendedor
        vendedor_nome  = vd.nome     if vd else "—"
        vendedor_email = vd.email    if vd else "—"

        # Pagamento
        forma = s.forma_pagamento.value if hasattr(s.forma_pagamento, "value") else str(s.forma_pagamento)
        if forma == "misto" and s.payment_methods:
            pms = " + ".join(pm.get("forma", "") for pm in s.payment_methods)
        else:
            pms = forma

        banco      = s.banco_financiamento or "—"
        parcelas   = s.parcelas or 0
        obs        = s.observacoes or ""
        dt_entrega = _fmt_date(s.data_entrega) if s.data_entrega else "—"

        # Financeiro
        val_venda     = _m(s.valor_venda)
        val_entrada   = _m(s.valor_entrada)
        val_financiado= _m(s.valor_financiado)
        com_pct       = _m(s.comissao_percentual)
        com_val       = _m(s.comissao_valor)
        lucro_bruto   = val_venda - val_entrada  # entrada = custo aproximado (se disponível)

        rows.append({
            # Veículo
            "veiculo":          veiculo_full,
            "veiculo_nome":     veiculo_nome,
            "veiculo_ano":      veiculo_ano,
            "placa":            placa,
            "cor":              cor,
            "tipo":             tipo_v,
            "quilometragem":    quilometragem,
            "cilindrada":       cilindrada,
            "tipo_moto":        tipo_moto,
            # Cliente
            "cliente":          cliente_nome,
            "cliente_cpf":      cliente_cpf,
            "cliente_tel":      cliente_tel,
            "cliente_email":    cliente_email,
            "cliente_cidade":   cliente_cidade,
            "cliente_uf":       cliente_uf,
            # Vendedor
            "vendedor":         vendedor_nome,
            "vendedor_email":   vendedor_email,
            # Venda
            "data_venda":       _fmt_date(dt),
            "data_entrega":     dt_entrega,
            "forma_pagamento":  pms,
            "parcelas":         parcelas,
            "banco":            banco,
            "observacoes":      obs,
            # Financeiro
            "valor_venda":      val_venda,
            "valor_entrada":    val_entrada,
            "valor_financiado": val_financiado,
            "comissao_pct":     com_pct,
            "comissao_valor":   com_val,
            "status":           s.status.value if hasattr(s.status, "value") else str(s.status),
        })

    concluidas = [r for r in rows if r["status"] == "concluida"]
    total      = sum(r["valor_venda"]    for r in concluidas)
    com_total  = sum(r["comissao_valor"] for r in concluidas)

    return {
        "periodo": {
            "data_inicio": str(di or ""),
            "data_fim":    str(df or ""),
            "label":       _periodo_label(di, df),
        },
        "resumo": {
            "total_vendas":    len(rows),
            "concluidas":      len(concluidas),
            "pendentes":       len([r for r in rows if r["status"] == "pendente"]),
            "canceladas":      len([r for r in rows if r["status"] == "cancelada"]),
            "receita_total":   round(total, 2),
            "ticket_medio":    round(total / len(concluidas), 2) if concluidas else 0,
            "comissao_total":  round(com_total, 2),
            "total_financiado":round(sum(r["valor_financiado"] for r in concluidas), 2),
        },
        "vendas": rows,
    }


# ─── 2. Relatório de Estoque (COMPLETO) ──────────────────────────────────────
@router.get("/estoque")
async def report_estoque(
    db: AsyncSession = Depends(get_db),
    _u: dict         = Depends(get_current_user_payload),
):
    result = await db.execute(
        select(Vehicle)
        .options(selectinload(Vehicle.expenses))
        .where(Vehicle.deleted_at.is_(None))
    )
    vehicles = result.scalars().all()

    carros, motos = [], []

    for v in vehicles:
        total_desp  = sum(_m(e.valor) for e in v.expenses)
        custo_total = _m(v.valor_compra) + _m(v.valor_multas) + total_desp
        anunciado   = _m(v.valor_anunciado)
        minimo      = _m(v.valor_minimo)
        margem_pct  = round((anunciado - custo_total) / anunciado * 100, 2) if anunciado > 0 else 0
        status_val  = v.status.value if hasattr(v.status, "value") else str(v.status)
        tipo_val    = v.tipo.value   if hasattr(v.tipo, "value")   else str(v.tipo)

        # Dias em estoque
        if v.data_compra:
            dc = v.data_compra if isinstance(v.data_compra, date) else date.fromisoformat(str(v.data_compra)[:10])
            dias_estoque = (date.today() - dc).days
        else:
            dias_estoque = 0

        row = {
            "marca":           v.marca or "—",
            "modelo":          v.modelo or "—",
            "versao":          v.versao or "—",
            "ano":             v.ano or 0,
            "cor":             v.cor or "—",
            "placa":           v.placa or "—",
            "quilometragem":   v.quilometragem or 0,
            "status":          status_val,
            "data_compra":     _fmt_date(v.data_compra),
            "dias_estoque":    dias_estoque,
            "valor_compra":    _m(v.valor_compra),
            "valor_multas":    _m(v.valor_multas),
            "total_despesas":  round(total_desp, 2),
            "qtd_despesas":    len(v.expenses),
            "custo_total":     round(custo_total, 2),
            "valor_anunciado": anunciado,
            "valor_minimo":    minimo,
            "valor_vendido":   _m(v.valor_vendido),
            "margem_pct":      margem_pct,
            "margem_reais":    round(anunciado - custo_total, 2),
            "observacoes":     v.observacoes or "",
        }

        if tipo_val == "moto":
            row["cilindrada"] = v.cilindrada or 0
            row["tipo_moto"]  = v.tipo_moto  or "—"
            motos.append(row)
        else:
            carros.append(row)

    todos = carros + motos
    def cnt(lst, s): return len([x for x in lst if x["status"] == s])

    return {
        "resumo": {
            "total_carros":         len(carros),
            "total_motos":          len(motos),
            "total_veiculos":       len(todos),
            "disponiveis":          cnt(todos, "disponivel"),
            "reservados":           cnt(todos, "reservado"),
            "em_preparacao":        cnt(todos, "em_preparacao"),
            "vendidos":             cnt(todos, "vendido"),
            "valor_total_estoque":  round(sum(r["valor_anunciado"] or r["custo_total"] for r in todos if r["status"] != "vendido"), 2),
            "custo_total_estoque":  round(sum(r["custo_total"]    for r in todos if r["status"] != "vendido"), 2),
            "media_dias_estoque":   round(sum(r["dias_estoque"]   for r in todos if r["status"] != "vendido") / max(cnt(todos, "disponivel") + cnt(todos, "reservado") + cnt(todos, "em_preparacao"), 1), 0),
        },
        "carros": carros,
        "motos":  motos,
    }


# ─── 3. Relatório Financeiro (COMPLETO) ──────────────────────────────────────
@router.get("/financeiro")
async def report_financeiro(
    data_inicio: Optional[str] = Query(None),
    data_fim:    Optional[str] = Query(None),
    db:  AsyncSession  = Depends(get_db),
    _u:  dict          = Depends(get_current_user_payload),
):
    di, df = _resolve_period(data_inicio, data_fim)
    from app.infrastructure.repositories.financial_repository import FinancialRepository
    repo    = FinancialRepository(db)
    entries = await repo.get_all(limit=10000)

    MESES_PT = ["","Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
    meses = {m: {"entradas": 0.0, "saidas": 0.0} for m in range(1, 13)}
    categorias: dict = {}
    rows = []

    for e in entries:
        dt = e.data
        if isinstance(dt, str):
            dt = date.fromisoformat(dt[:10])
        if not _in_period(dt, di, df):
            continue
        v        = _m(e.valor)
        m        = dt.month
        tipo_val = e.tipo if isinstance(e.tipo, str) else e.tipo.value
        cat      = e.categoria or "outros"

        if tipo_val == "entrada":
            meses[m]["entradas"] += v
        else:
            meses[m]["saidas"] += v

        categorias.setdefault(cat, {"entradas": 0.0, "saidas": 0.0, "total": 0})
        categorias[cat]["entradas" if tipo_val == "entrada" else "saidas"] += v
        categorias[cat]["total"] += 1

        rows.append({
            "data":      _fmt_date(dt),
            "mes":       m,
            "nome_mes":  MESES_PT[m],
            "ano":       dt.year,
            "tipo":      tipo_val,
            "categoria": cat,
            "descricao": e.descricao or "",
            "valor":     round(v, 2),
            "observacoes": getattr(e, "observacoes", "") or "",
        })

    mensal = [
        {
            "mes": m, "nome_mes": MESES_PT[m],
            "entradas": round(meses[m]["entradas"], 2),
            "saidas":   round(meses[m]["saidas"],   2),
            "lucro":    round(meses[m]["entradas"] - meses[m]["saidas"], 2),
        }
        for m in range(1, 13)
    ]
    total_e = sum(x["entradas"] for x in mensal)
    total_s = sum(x["saidas"]   for x in mensal)

    # Top categorias
    top_cats = sorted(
        [{"categoria": k, **v} for k, v in categorias.items()],
        key=lambda x: x["entradas"] + x["saidas"], reverse=True
    )

    return {
        "periodo": {
            "data_inicio": str(di or ""),
            "data_fim":    str(df or ""),
            "label":       _periodo_label(di, df),
        },
        "resumo": {
            "total_entradas":   round(total_e, 2),
            "total_saidas":     round(total_s, 2),
            "lucro_liquido":    round(total_e - total_s, 2),
            "total_lancamentos": len(rows),
            "margem_financeira": round((total_e - total_s) / total_e * 100, 2) if total_e > 0 else 0,
        },
        "mensal":      mensal,
        "lancamentos": rows,
        "por_categoria": top_cats,
    }


# ─── 4. Clientes (COMPLETO) ──────────────────────────────────────────────────
@router.get("/clientes")
async def report_clientes(
    db: AsyncSession = Depends(get_db),
    _u: dict         = Depends(get_current_user_payload),
):
    c_repo    = CustomerRepository(db)
    s_repo    = SaleRepository(db)
    customers = await c_repo.get_all(limit=5000)
    all_sales = await s_repo.list_with_relations(skip=0, limit=10000)

    rows = []
    for c in customers:
        c_sales  = [s for s in all_sales if str(s.cliente_id) == str(c.id) and s.status.value != "cancelada"]
        canceladas = [s for s in all_sales if str(s.cliente_id) == str(c.id) and s.status.value == "cancelada"]
        total_gasto = sum(_m(s.valor_venda) for s in c_sales)
        ultima  = max((s.data_venda for s in c_sales), default=None)
        primeira= min((s.data_venda for s in c_sales), default=None)

        veiculos_comprados = "; ".join(
            f"{s.vehicle.marca} {s.vehicle.modelo} {s.vehicle.ano}" if s.vehicle else "—"
            for s in c_sales
        )

        rows.append({
            "nome":           c.nome or "—",
            "cpf_cnpj":       c.cpf_cnpj  or "—",
            "rg":             getattr(c, "rg", "") or "—",
            "telefone":       c.telefone   or "—",
            "email":          c.email      or "—",
            "endereco":       getattr(c, "endereco", "") or "—",
            "bairro":         getattr(c, "bairro", "")  or "—",
            "cidade":         c.cidade     or "—",
            "estado":         c.estado     or "—",
            "cep":            getattr(c, "cep", "")     or "—",
            "data_nascimento":_fmt_date(getattr(c, "data_nascimento", None)),
            "profissao":      getattr(c, "profissao", "") or "—",
            "observacoes":    getattr(c, "observacoes", "") or "",
            "total_compras":  len(c_sales),
            "total_cancelamentos": len(canceladas),
            "total_gasto":    round(total_gasto, 2),
            "ticket_medio":   round(total_gasto / len(c_sales), 2) if c_sales else 0,
            "primeira_compra":_fmt_date(primeira),
            "ultima_compra":  _fmt_date(ultima),
            "veiculos":       veiculos_comprados,
            "cliente_desde":  _fmt_date(getattr(c, "created_at", None)),
        })

    rows.sort(key=lambda x: x["total_gasto"], reverse=True)
    com_compra = [r for r in rows if r["total_compras"] > 0]

    return {
        "resumo": {
            "total_clientes": len(rows),
            "com_compra":     len(com_compra),
            "recorrentes":    len([r for r in rows if r["total_compras"] > 1]),
            "ticket_medio":   round(sum(r["total_gasto"] for r in com_compra) / len(com_compra), 2) if com_compra else 0,
            "receita_total":  round(sum(r["total_gasto"] for r in rows), 2),
        },
        "clientes": rows,
    }


# ─── 5. Lucratividade (COMPLETO) ─────────────────────────────────────────────
@router.get("/lucratividade")
async def report_lucratividade(
    data_inicio: Optional[str] = Query(None),
    data_fim:    Optional[str] = Query(None),
    db:  AsyncSession  = Depends(get_db),
    _u:  dict          = Depends(get_current_user_payload),
):
    di, df = _resolve_period(data_inicio, data_fim)
    result = await db.execute(
        select(Vehicle)
        .options(
            selectinload(Vehicle.sale).selectinload(Sale.cliente),
            selectinload(Vehicle.sale).selectinload(Sale.vendedor),
            selectinload(Vehicle.expenses),
            selectinload(Vehicle.photos),
        )
        .where(Vehicle.deleted_at.is_(None), Vehicle.valor_vendido.isnot(None))
    )
    vehicles = result.scalars().all()

    rows = []
    for v in vehicles:
        sale_dt = v.sale.data_venda if v.sale else None
        if not _in_period(sale_dt, di, df):
            continue

        total_desp  = sum(_m(e.valor) for e in v.expenses)
        custo_total = _m(v.valor_compra) + _m(v.valor_multas) + total_desp
        vendido     = _m(v.valor_vendido)
        lucro       = vendido - custo_total
        margem_pct  = round(lucro / vendido * 100, 2) if vendido > 0 else 0
        tipo_val    = v.tipo.value if hasattr(v.tipo, "value") else str(v.tipo)

        # Dados do comprador/venda
        sale    = v.sale
        cliente_nome   = sale.cliente.nome     if sale and sale.cliente  else "—"
        cliente_tel    = sale.cliente.telefone if sale and sale.cliente  else "—"
        vendedor_nome  = sale.vendedor.nome    if sale and sale.vendedor else "—"
        forma_pag      = sale.forma_pagamento.value if sale and hasattr(sale.forma_pagamento, "value") else "—"
        banco_fin      = sale.banco_financiamento or "—"

        # Tempo em estoque
        if v.data_compra and sale_dt:
            dc = v.data_compra if isinstance(v.data_compra, date) else date.fromisoformat(str(v.data_compra)[:10])
            if isinstance(sale_dt, str): sale_dt = date.fromisoformat(sale_dt[:10])
            dias_estoque = (sale_dt - dc).days
        else:
            dias_estoque = 0

        # Foto principal
        main_photo = next((p for p in v.photos if p.is_main), None) or (v.photos[0] if v.photos else None)
        foto_url = main_photo.url if main_photo else None

        rows.append({
            "veiculo":        f"{v.marca} {v.modelo} {v.versao or ''} {v.ano}".strip(),
            "marca":          v.marca or "—",
            "modelo":         v.modelo or "—",
            "versao":         v.versao or "—",
            "ano":            v.ano or 0,
            "tipo":           tipo_val,
            "placa":          v.placa or "—",
            "cor":            v.cor or "—",
            "quilometragem":  v.quilometragem or 0,
            # Datas
            "data_compra":    _fmt_date(v.data_compra),
            "data_venda":     _fmt_date(sale_dt),
            "dias_estoque":   dias_estoque,
            # Custos
            "valor_compra":   _m(v.valor_compra),
            "valor_multas":   _m(v.valor_multas),
            "total_despesas": round(total_desp, 2),
            "custo_total":    round(custo_total, 2),
            # Venda
            "valor_vendido":  vendido,
            "lucro_bruto":    round(lucro, 2),
            "margem_pct":     margem_pct,
            "margem_reais":   round(lucro, 2),
            # Venda info
            "cliente":        cliente_nome,
            "cliente_tel":    cliente_tel,
            "vendedor":       vendedor_nome,
            "forma_pagamento":forma_pag,
            "banco":          banco_fin,
            "com_pct":        _m(sale.comissao_percentual) if sale else 0,
            "com_valor":      _m(sale.comissao_valor)      if sale else 0,
            # Foto
            "foto_url":       foto_url,
        })

    rows.sort(key=lambda x: x["lucro_bruto"], reverse=True)
    total_lucro = sum(r["lucro_bruto"] for r in rows)

    return {
        "periodo": {
            "data_inicio": str(di or ""),
            "data_fim":    str(df or ""),
            "label":       _periodo_label(di, df),
        },
        "resumo": {
            "total_vendidos":   len(rows),
            "lucro_total":      round(total_lucro, 2),
            "margem_media":     round(sum(r["margem_pct"] for r in rows) / len(rows), 2) if rows else 0,
            "melhor_margem":    max((r["margem_pct"] for r in rows), default=0),
            "melhor_veiculo":   rows[0]["veiculo"] if rows else "—",
            "media_dias_estoque": round(sum(r["dias_estoque"] for r in rows) / len(rows), 0) if rows else 0,
            "total_comissoes":  round(sum(r["com_valor"] for r in rows), 2),
        },
        "veiculos": rows,
    }


# ─── 6. Comissões (COMPLETO) ─────────────────────────────────────────────────
@router.get("/comissoes")
async def report_comissoes(
    data_inicio: Optional[str] = Query(None),
    data_fim:    Optional[str] = Query(None),
    db:  AsyncSession  = Depends(get_db),
    _u:  dict          = Depends(get_current_user_payload),
):
    di, df = _resolve_period(data_inicio, data_fim)
    repo  = SaleRepository(db)
    sales = await repo.list_with_relations(skip=0, limit=5000)

    vendedores: dict = {}
    rows = []

    for s in sales:
        if s.status.value == "cancelada":
            continue
        dt = s.data_venda
        if isinstance(dt, str):
            dt = date.fromisoformat(dt[:10])
        if not _in_period(dt, di, df): continue

        vendedor_id   = str(s.vendedor_id)
        vendedor_nome = s.vendedor.nome  if s.vendedor else "—"
        vendedor_email= s.vendedor.email if s.vendedor else "—"
        cliente_nome  = s.cliente.nome   if s.cliente  else "—"
        cliente_tel   = s.cliente.telefone if s.cliente else "—"
        valor         = _m(s.valor_venda)
        comissao_pct  = _m(s.comissao_percentual)
        comissao_val  = _m(s.comissao_valor)

        if s.vehicle:
            veiculo = f"{s.vehicle.marca} {s.vehicle.modelo} {s.vehicle.versao or ''} {s.vehicle.ano}".strip()
            placa   = s.vehicle.placa or "—"
            tipo_v  = s.vehicle.tipo.value if hasattr(s.vehicle.tipo, "value") else "—"
        else:
            veiculo = placa = tipo_v = "—"

        forma = s.forma_pagamento.value if hasattr(s.forma_pagamento, "value") else "—"

        if vendedor_id not in vendedores:
            vendedores[vendedor_id] = {
                "vendedor":       vendedor_nome,
                "vendedor_email": vendedor_email,
                "total_vendas":   0,
                "receita_total":  0.0,
                "comissao_total": 0.0,
            }
        vendedores[vendedor_id]["total_vendas"]   += 1
        vendedores[vendedor_id]["receita_total"]  += valor
        vendedores[vendedor_id]["comissao_total"] += comissao_val

        rows.append({
            "vendedor":      vendedor_nome,
            "vendedor_email":vendedor_email,
            "cliente":       cliente_nome,
            "cliente_tel":   cliente_tel,
            "veiculo":       veiculo,
            "tipo_veiculo":  tipo_v,
            "placa":         placa,
            "data_venda":    _fmt_date(dt),
            "valor_venda":   valor,
            "forma_pagamento": forma,
            "comissao_pct":  comissao_pct,
            "comissao":      round(comissao_val, 2),
            "status":        s.status.value if hasattr(s.status, "value") else str(s.status),
        })

    ranking = sorted(vendedores.values(), key=lambda x: x["receita_total"], reverse=True)
    for r in ranking:
        r["receita_total"]  = round(r["receita_total"], 2)
        r["comissao_total"] = round(r["comissao_total"], 2)
        r["ticket_medio"]   = round(r["receita_total"] / r["total_vendas"], 2) if r["total_vendas"] else 0

    return {
        "periodo": {
            "data_inicio": str(di or ""),
            "data_fim":    str(df or ""),
            "label":       _periodo_label(di, df),
        },
        "resumo": {
            "total_vendedores": len(vendedores),
            "total_vendas":     len(rows),
            "comissao_total":   round(sum(r["comissao"] for r in rows), 2),
            "receita_total":    round(sum(r["valor_venda"] for r in rows), 2),
        },
        "ranking":   ranking,
        "detalhado": rows,
    }
