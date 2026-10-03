from typing import Optional
from decimal import Decimal
from datetime import date, timedelta
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.core.tempo import hoje_loja
from app.infrastructure.repositories.sale_customer_repository import SaleRepository
from app.infrastructure.repositories.vehicle_repository import VehicleRepository
from app.infrastructure.repositories.financial_repository import FinancialRepository
from app.infrastructure.repositories.audit_repository import AuditRepository
from app.domain.models.sale import Sale, SaleStatus, PaymentType
from app.domain.models.user import User, UserRole
from app.domain.models.vehicle import Vehicle, VehicleStatus
from app.domain.models.financial import FinancialEntry, EntryType, FinancialCategory
from app.application.schemas.sale_customer import SaleCreate
from app.application.services import financeiro_service
from app.infrastructure.ws_manager import ws_manager

# Status de venda que "ocupam" o veículo: só pode existir uma por veículo.
STATUS_ATIVOS = (SaleStatus.PENDENTE, SaleStatus.CONCLUIDA)

# Dias sem vender a partir dos quais o veículo conta como "parado" no dashboard.
DIAS_ESTOQUE_PARADO = 60


class SaleService:
    """
    Ciclo de vida da venda e seus efeitos no veículo e no caixa.

    - pendente  → veículo RESERVADO (some do site e ninguém vende de novo)
    - concluida → veículo VENDIDO + lançamentos no caixa (receita, custo, comissão)
    - cancelada → estorna os lançamentos desta venda; o veículo volta a DISPONIVEL
                  somente se esta venda era a que o ocupava
    Um veículo nunca tem duas vendas ativas (pendente/concluída) ao mesmo tempo.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.sale_repo = SaleRepository(db)
        self.vehicle_repo = VehicleRepository(db)
        self.financial_repo = FinancialRepository(db)
        self.audit_repo = AuditRepository(db)

    # ── Auxiliares ────────────────────────────────────────────────────────────
    async def _veiculo_travado(self, vehicle_id: str) -> Vehicle:
        """Lê o veículo com FOR UPDATE: duas vendas simultâneas do mesmo carro esperam uma pela outra."""
        vehicle = (await self.db.execute(
            select(Vehicle)
            .where(Vehicle.id == vehicle_id, Vehicle.is_deleted == False)  # noqa: E712
            .with_for_update()
        )).scalar_one_or_none()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Veículo não encontrado")
        return vehicle

    async def _outra_venda_ativa(self, vehicle_id: str, exceto_id: Optional[str] = None) -> Optional[Sale]:
        stmt = select(Sale).where(
            Sale.vehicle_id == vehicle_id,
            Sale.is_deleted == False,  # noqa: E712
            Sale.status.in_(STATUS_ATIVOS),
        )
        if exceto_id:
            stmt = stmt.where(Sale.id != exceto_id)
        return (await self.db.execute(stmt.limit(1))).scalar_one_or_none()

    async def _garantir_veiculo_livre(self, vehicle: Vehicle, exceto_venda: Optional[str] = None) -> None:
        outra = await self._outra_venda_ativa(vehicle.id, exceto_venda)
        if outra:
            estado = "vendido" if outra.status == SaleStatus.CONCLUIDA else "reservado por outra venda pendente"
            raise HTTPException(
                status_code=409,
                detail=f"{vehicle.marca} {vehicle.modelo} ({vehicle.placa}) já está {estado}.",
            )
        if vehicle.status == VehicleStatus.VENDIDO:
            raise HTTPException(status_code=409, detail="Este veículo já foi vendido.")

    async def _flush_protegido(self) -> None:
        """O índice único parcial é a última barreira contra venda dupla simultânea."""
        try:
            await self.db.flush()
        except IntegrityError as e:
            await self.db.rollback()
            if "uq_sales_veiculo_ativa" in str(e.orig):
                raise HTTPException(status_code=409, detail="Este veículo já tem uma venda ativa.")
            raise

    @staticmethod
    def _descricao_veiculo(vehicle: Vehicle) -> str:
        return f"{vehicle.marca} {vehicle.modelo} {vehicle.ano} - {vehicle.placa}"

    # ── Criação ───────────────────────────────────────────────────────────────
    async def create_sale(self, data: SaleCreate, created_by: str) -> Sale:
        if data.status == SaleStatus.CANCELADA:
            raise HTTPException(status_code=422, detail="Uma venda nova não pode nascer cancelada.")

        vehicle = await self._veiculo_travado(data.vehicle_id)
        await self._garantir_veiculo_livre(vehicle)

        if data.vendedor_id:
            vendedor = await self.db.get(User, data.vendedor_id)
            if not vendedor or not vendedor.ativo or getattr(vendedor, "is_deleted", False):
                raise HTTPException(status_code=422, detail="Vendedor inválido ou inativo.")

        # Comissão sempre calculada no servidor (o valor enviado pelo navegador é ignorado)
        comissao_valor = (data.valor_venda * data.comissao_percentual / 100).quantize(Decimal("0.01"))

        resolved_forma = data.forma_pagamento
        serialized_methods = None
        if data.payment_methods:
            if len(data.payment_methods) == 1:
                try:
                    resolved_forma = PaymentType(data.payment_methods[0].forma.lower())
                except ValueError:
                    resolved_forma = PaymentType.MISTO
            else:
                resolved_forma = PaymentType.MISTO
            serialized_methods = [
                {
                    "forma": m.forma,
                    "valor": str(m.valor),
                    **({"parcelas": m.parcelas} if m.parcelas is not None else {}),
                    **({"banco": m.banco} if m.banco else {}),
                    **({"taxa": str(m.taxa)} if m.taxa is not None else {}),
                }
                for m in data.payment_methods
            ]

        sale = Sale(
            **data.model_dump(exclude={"comissao_valor", "vendedor_id", "taxa_juros", "payment_methods",
                                       "forma_pagamento", "status"}),
            vendedor_id=data.vendedor_id,
            comissao_valor=comissao_valor,
            forma_pagamento=resolved_forma,
            payment_methods=serialized_methods,
            status=data.status,
        )
        self.db.add(sale)
        await self._flush_protegido()

        if data.status == SaleStatus.CONCLUIDA:
            vehicle.status = VehicleStatus.VENDIDO
            vehicle.valor_vendido = data.valor_venda
            await self._lancar_no_caixa(sale, vehicle, created_by)
        else:
            vehicle.status = VehicleStatus.RESERVADO

        await self.audit_repo.log(
            usuario_id=created_by,
            acao="CREATE",
            entidade="Sale",
            entidade_id=sale.id,
            dados_depois=data.model_dump(mode="json"),
            descricao=f"Venda registrada ({data.status.value}): {vehicle.placa} por R$ {data.valor_venda}",
        )
        await self.db.commit()
        await self.db.refresh(sale)

        # Avisa os navegadores só depois do commit (antes, o dado ainda podia ser desfeito)
        await ws_manager.broadcast("sale_created", {
            "sale_id": sale.id,
            "vehicle_placa": vehicle.placa,
            "valor_venda": float(data.valor_venda),
            "status": data.status.value,
        })
        return sale

    async def _lancar_no_caixa(self, sale: Sale, vehicle: Vehicle, usuario_id: str) -> None:
        """Receita da venda, custo do veículo (se ainda não lançado) e comissão."""
        await self.financial_repo.create(
            tipo=EntryType.ENTRADA,
            categoria=FinancialCategory.VENDA_VEICULO,
            descricao=f"Venda: {self._descricao_veiculo(vehicle)}",
            valor=sale.valor_venda,
            data=sale.data_venda,
            venda_id=sale.id,
            vehicle_id=vehicle.id,
            created_by=usuario_id,
        )
        # O custo de compra normalmente já foi lançado no cadastro do veículo.
        # Compara pelo saldo líquido (com estornos), não pela contagem de linhas.
        custo_lancado = await financeiro_service.saldo_categoria_veiculo(
            self.db, vehicle.id, FinancialCategory.COMPRA_VEICULO
        )
        if custo_lancado <= 0:
            custo_veiculo = (vehicle.valor_compra or Decimal("0")) + (vehicle.valor_multas or Decimal("0"))
            if custo_veiculo > 0:
                await self.financial_repo.create(
                    tipo=EntryType.SAIDA,
                    categoria=FinancialCategory.COMPRA_VEICULO,
                    descricao=f"Custo: {self._descricao_veiculo(vehicle)}",
                    valor=custo_veiculo,
                    data=sale.data_venda,
                    venda_id=sale.id,
                    vehicle_id=vehicle.id,
                    created_by=usuario_id,
                )
        if sale.comissao_valor and sale.comissao_valor > 0:
            await self.financial_repo.create(
                tipo=EntryType.SAIDA,
                categoria=FinancialCategory.COMISSAO,
                descricao=f"Comissão vendedor - {vehicle.placa}",
                valor=sale.comissao_valor,
                data=sale.data_venda,
                venda_id=sale.id,
                vehicle_id=vehicle.id,
                created_by=usuario_id,
            )

    # ── Mudança de status ─────────────────────────────────────────────────────
    async def change_status(self, sale_id: str, novo: SaleStatus, usuario: dict) -> Sale:
        sale = (await self.db.execute(
            select(Sale).where(Sale.id == sale_id, Sale.is_deleted == False)  # noqa: E712
        )).scalar_one_or_none()
        if not sale:
            raise HTTPException(status_code=404, detail="Venda não encontrada")

        antigo = sale.status
        if antigo == novo:
            raise HTTPException(status_code=400, detail="A venda já está com esse status.")

        # Funcionário só mexe em venda pendente (concluir ou desistir). Desfazer uma venda
        # concluída mexe no caixa e no estoque: só o administrador.
        if usuario.get("role") != UserRole.ADMIN.value and antigo != SaleStatus.PENDENTE:
            raise HTTPException(
                status_code=403,
                detail="Somente o administrador pode alterar uma venda concluída ou cancelada.",
            )

        vehicle = await self._veiculo_travado(sale.vehicle_id)
        usuario_id = usuario["sub"]

        if novo in STATUS_ATIVOS and antigo == SaleStatus.CANCELADA:
            # Reativar uma venda cancelada: o carro pode ter sido vendido para outra pessoa
            await self._garantir_veiculo_livre(vehicle, exceto_venda=sale.id)

        if novo == SaleStatus.CONCLUIDA:
            vehicle.status = VehicleStatus.VENDIDO
            vehicle.valor_vendido = sale.valor_venda
            sale.status = novo
            await self._flush_protegido()
            await self._lancar_no_caixa(sale, vehicle, usuario_id)

        elif novo == SaleStatus.PENDENTE:
            if antigo == SaleStatus.CONCLUIDA:
                await financeiro_service.estornar(
                    self.db, FinancialEntry.venda_id == sale.id,
                    motivo="venda voltou para pendente", usuario_id=usuario_id,
                )
            vehicle.status = VehicleStatus.RESERVADO
            vehicle.valor_vendido = None
            sale.status = novo
            await self._flush_protegido()

        else:  # CANCELADA
            await financeiro_service.estornar(
                self.db, FinancialEntry.venda_id == sale.id,
                motivo="venda cancelada", usuario_id=usuario_id,
            )
            sale.status = novo
            await self.db.flush()
            # Só libera o veículo se nenhuma OUTRA venda ativa o ocupa
            if not await self._outra_venda_ativa(vehicle.id, exceto_id=sale.id):
                if vehicle.status in (VehicleStatus.RESERVADO, VehicleStatus.VENDIDO):
                    vehicle.status = VehicleStatus.DISPONIVEL
                vehicle.valor_vendido = None

        await self.audit_repo.log(
            usuario_id=usuario_id,
            acao="UPDATE",
            entidade="Sale",
            entidade_id=sale.id,
            dados_antes={"status": antigo.value},
            dados_depois={"status": novo.value},
            descricao=f"Venda {vehicle.placa}: {antigo.value} → {novo.value}",
        )
        await self.db.commit()
        await self.db.refresh(sale)

        await ws_manager.broadcast("sale_updated", {
            "sale_id": sale.id,
            "old_status": antigo.value,
            "new_status": novo.value,
        })
        return sale

    # ── Dashboard ─────────────────────────────────────────────────────────────
    async def get_dashboard_stats(self, year: int, month: int) -> dict:
        today = hoje_loja()

        vehicle_stats = await self.vehicle_repo.get_dashboard_stats()
        monthly_revenue = await self.sale_repo.get_monthly_revenue(year, month)
        monthly_sales = await self.sale_repo.get_monthly_sales(year, month)
        top_sellers = await self.sale_repo.get_top_sellers(year, month)
        annual_chart = await self.sale_repo.get_annual_chart(year)
        daily_chart = await self.sale_repo.get_daily_chart(year, month)

        today_sales = [s for s in monthly_sales if s.data_venda == today]

        first_day = date(year, month, 1)
        last_day = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)

        async def _soma(tipo: EntryType) -> Decimal:
            total = await self.db.scalar(
                select(func.coalesce(func.sum(FinancialEntry.valor), 0)).where(
                    FinancialEntry.tipo == tipo,
                    FinancialEntry.data >= first_day,
                    FinancialEntry.data < last_day,
                )
            )
            return Decimal(str(total or 0))

        saldo_caixa_mes = await _soma(EntryType.ENTRADA) - await _soma(EntryType.SAIDA)

        # Lucro de verdade: preço de venda − custo total do veículo (compra + multas + despesas)
        lucro_bruto_mes = Decimal("0")
        if monthly_sales:
            ids = [s.vehicle_id for s in monthly_sales]
            veiculos = {
                v.id: v for v in (await self.db.execute(
                    select(Vehicle).options(selectinload(Vehicle.expenses)).where(Vehicle.id.in_(ids))
                )).scalars().all()
            }
            for s in monthly_sales:
                v = veiculos.get(s.vehicle_id)
                if v:
                    lucro_bruto_mes += Decimal(str(s.valor_venda)) - v.custo_total
        margem_media_mes = (
            (lucro_bruto_mes / monthly_revenue * 100).quantize(Decimal("0.01")) if monthly_revenue > 0 else Decimal("0")
        )
        ticket_medio_mes = (
            (monthly_revenue / len(monthly_sales)).quantize(Decimal("0.01")) if monthly_sales else Decimal("0")
        )

        # Estoque: quanto dinheiro está parado e o que está encalhado
        nao_vendidos = (await self.db.execute(
            select(Vehicle).options(selectinload(Vehicle.expenses)).where(
                Vehicle.is_deleted == False,  # noqa: E712
                Vehicle.status != VehicleStatus.VENDIDO,
            )
        )).scalars().all()
        valor_estoque = sum((v.custo_total for v in nao_vendidos), Decimal("0"))
        limite = today - timedelta(days=DIAS_ESTOQUE_PARADO)
        parados = sorted(
            (v for v in nao_vendidos if v.status == VehicleStatus.DISPONIVEL and v.data_compra and v.data_compra <= limite),
            key=lambda v: v.data_compra,
        )

        recent_sales = await self.sale_repo.get_recent_sales(limit=6)
        ultimas_vendas_enriched = []
        for s in recent_sales:
            vehicle_info = vehicle_tipo = None
            vehicle_photos = []
            if s.vehicle:
                vehicle_info = f"{s.vehicle.marca} {s.vehicle.modelo} {s.vehicle.ano}"
                vehicle_tipo = s.vehicle.tipo.value if s.vehicle.tipo else "carro"
                vehicle_photos = [
                    {"url": p.url, "thumb_url": p.thumb_url, "is_main": p.is_main}
                    for p in (s.vehicle.photos or [])
                ]
            ultimas_vendas_enriched.append({
                "id": s.id,
                "vehicle_id": s.vehicle_id,
                "cliente_id": s.cliente_id,
                "valor_venda": float(s.valor_venda),
                "data_venda": s.data_venda.isoformat(),
                "forma_pagamento": s.forma_pagamento,
                "status": s.status,
                "vehicle_info": vehicle_info,
                "vehicle_placa": s.vehicle.placa if s.vehicle else None,
                "vehicle_cor": s.vehicle.cor if s.vehicle else None,
                "vehicle_tipo": vehicle_tipo,
                "vehicle_photos": vehicle_photos,
                "cliente_nome": s.cliente.nome if s.cliente else None,
            })

        return {
            **vehicle_stats,
            "vendidos_hoje": len(today_sales),
            "vendidos_mes": len(monthly_sales),
            "faturamento_mes": monthly_revenue,
            "lucro_bruto_mes": lucro_bruto_mes,
            "margem_media_mes": margem_media_mes,
            "ticket_medio_mes": ticket_medio_mes,
            "saldo_caixa_mes": saldo_caixa_mes,
            # Compatibilidade: era rotulado "lucro", mas é o saldo do caixa (entradas − saídas)
            "lucro_mes": saldo_caixa_mes,
            "custo_estoque": valor_estoque,
            "estoque_parado_total": len(parados),
            "estoque_parado": [
                {
                    "id": v.id,
                    "marca": v.marca,
                    "modelo": v.modelo,
                    "ano": v.ano,
                    "tipo": v.tipo.value if v.tipo else "carro",
                    "dias_em_estoque": (today - v.data_compra).days,
                    "valor_anunciado": v.valor_anunciado,
                }
                for v in parados[:10]
            ],
            "top_sellers": top_sellers,
            "ultimas_vendas": ultimas_vendas_enriched,
            "annual_chart": annual_chart,
            "daily_chart": daily_chart,
        }
