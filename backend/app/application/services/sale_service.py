from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.infrastructure.repositories.sale_customer_repository import SaleRepository
from app.infrastructure.repositories.vehicle_repository import VehicleRepository
from app.infrastructure.repositories.financial_repository import FinancialRepository
from app.infrastructure.repositories.audit_repository import AuditRepository
from app.domain.models.sale import Sale, SaleStatus
from app.domain.models.vehicle import VehicleStatus
from app.domain.models.financial import EntryType, FinancialCategory
from app.application.schemas.sale_customer import SaleCreate


class SaleService:
    """
    Manages the complete sale flow.

    When a sale is saved, automatically:
    1. Vehicle status → VENDIDO
    2. vehicle.valor_vendido = sale.valor_venda
    3. Commission is calculated: valor * (percentual / 100)
    4. Financial entry (ENTRADA) is created
    5. Audit log is created
    6. Dashboard cache is invalidated
    """

    def __init__(self, db: AsyncSession):
        self.sale_repo = SaleRepository(db)
        self.vehicle_repo = VehicleRepository(db)
        self.financial_repo = FinancialRepository(db)
        self.audit_repo = AuditRepository(db)

    async def create_sale(self, data: SaleCreate, created_by: str) -> Sale:
        # Validate vehicle
        vehicle = await self.vehicle_repo.get_by_id(data.vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Veículo não encontrado")

        if vehicle.status == VehicleStatus.VENDIDO:
            raise HTTPException(
                status_code=400,
                detail="Este veículo já foi vendido.",
            )

        # Calculate commission
        comissao_valor = (data.valor_venda * data.comissao_percentual / 100).quantize(
            Decimal("0.01")
        )

        # Resolve forma_pagamento from payment_methods when split payment
        from app.domain.models.sale import PaymentType as PT
        resolved_forma = data.forma_pagamento
        serialized_methods = None
        if data.payment_methods and len(data.payment_methods) > 0:
            if len(data.payment_methods) == 1:
                # Single method — use its forma directly
                raw = data.payment_methods[0].forma.lower()
                try:
                    resolved_forma = PT(raw)
                except ValueError:
                    resolved_forma = PT.MISTO
            else:
                resolved_forma = PT.MISTO
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

        # Resolve status — default concluida if not provided
        sale_status = getattr(data, "status", SaleStatus.CONCLUIDA) or SaleStatus.CONCLUIDA

        # Create sale — exclude fields handled explicitly below
        sale = await self.sale_repo.create(
            **data.model_dump(exclude={"comissao_valor", "vendedor_id", "taxa_juros", "payment_methods", "forma_pagamento", "status"}),
            vendedor_id=data.vendedor_id,
            comissao_valor=comissao_valor,
            forma_pagamento=resolved_forma,
            payment_methods=serialized_methods,
            status=sale_status,
        )

        # Only apply vehicle/financial side-effects for concluded sales
        if sale_status == SaleStatus.CONCLUIDA:
            await self.vehicle_repo.update(
                vehicle,
                status=VehicleStatus.VENDIDO,
                valor_vendido=data.valor_venda,
            )
            await self.financial_repo.create(
                tipo=EntryType.ENTRADA,
                categoria=FinancialCategory.VENDA_VEICULO,
                descricao=f"Venda: {vehicle.marca} {vehicle.modelo} {vehicle.ano} - {vehicle.placa}",
                valor=data.valor_venda,
                data=data.data_venda,
                venda_id=sale.id,
                vehicle_id=vehicle.id,
                created_by=created_by,
            )
            # If commission exists, create SAIDA entry
            if comissao_valor > 0:
                await self.financial_repo.create(
                    tipo=EntryType.SAIDA,
                    categoria=FinancialCategory.COMISSAO,
                    descricao=f"Comissão vendedor - {vehicle.placa}",
                    valor=comissao_valor,
                    data=data.data_venda,
                    venda_id=sale.id,
                    created_by=created_by,
                )

        await self.audit_repo.log(
            usuario_id=created_by,
            acao="CREATE",
            entidade="Sale",
            entidade_id=sale.id,
            dados_depois=data.model_dump(mode="json"),
            descricao=f"Venda registrada ({sale_status}): {vehicle.placa} por R${data.valor_venda}",
        )

        return sale

    async def create_financial_for_sale(self, sale: Sale, created_by: str) -> None:
        """Create financial entries for a sale being concluded (used when changing status pendente→concluida)."""
        vehicle = await self.vehicle_repo.get_by_id(sale.vehicle_id)
        if not vehicle:
            return

        await self.financial_repo.create(
            tipo=EntryType.ENTRADA,
            categoria=FinancialCategory.VENDA_VEICULO,
            descricao=f"Venda: {vehicle.marca} {vehicle.modelo} {vehicle.ano} - {vehicle.placa}",
            valor=sale.valor_venda,
            data=sale.data_venda,
            venda_id=sale.id,
            vehicle_id=vehicle.id,
            created_by=created_by,
        )
        comissao_valor = sale.comissao_valor or Decimal("0")
        if comissao_valor > 0:
            await self.financial_repo.create(
                tipo=EntryType.SAIDA,
                categoria=FinancialCategory.COMISSAO,
                descricao=f"Comissão vendedor - {vehicle.placa}",
                valor=comissao_valor,
                data=sale.data_venda,
                venda_id=sale.id,
                created_by=created_by,
            )

    async def get_dashboard_stats(self, year: int, month: int) -> dict:
        from datetime import datetime
        today = datetime.now().date()

        vehicle_stats = await self.vehicle_repo.get_dashboard_stats()
        monthly_revenue = await self.sale_repo.get_monthly_revenue(year, month)
        monthly_sales = await self.sale_repo.get_monthly_sales(year, month)
        top_sellers = await self.sale_repo.get_top_sellers(year, month)
        annual_chart = await self.sale_repo.get_annual_chart(year)
        daily_chart  = await self.sale_repo.get_daily_chart(year, month)

        # Sales today
        today_sales = [s for s in monthly_sales if s.data_venda == today]

        # Calculate monthly profit (revenue - cost of sold vehicles)
        lucro_mes = Decimal("0")
        for sale in monthly_sales:
            vehicle = await self.vehicle_repo.get_with_expenses(sale.vehicle_id)
            if vehicle:
                total_expenses = sum(e.valor for e in vehicle.expenses)
                custo = vehicle.valor_compra + total_expenses
                lucro_mes += sale.valor_venda - custo

        # Build enriched ultimas_vendas with vehicle + cliente names (last 6 overall)
        recent_sales = await self.sale_repo.get_recent_sales(limit=6)
        ultimas_vendas_enriched = []
        for s in recent_sales:
            vehicle_info = None
            vehicle_tipo = None
            vehicle_photos = []
            if s.vehicle:
                vehicle_info = f"{s.vehicle.marca} {s.vehicle.modelo} {s.vehicle.ano}"
                vehicle_tipo = s.vehicle.tipo  # "carro" or "moto"
                if s.vehicle.photos:
                    vehicle_photos = [
                        {"url": p.url, "is_main": p.is_main}
                        for p in s.vehicle.photos
                    ]
            ultimas_vendas_enriched.append({
                "id": s.id,
                "vehicle_id": s.vehicle_id,
                "cliente_id": s.cliente_id,
                "valor_venda": float(s.valor_venda),
                "data_venda": s.data_venda.isoformat(),
                "forma_pagamento": s.forma_pagamento,
                "status": s.status,
                # Enriched
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
            "lucro_mes": lucro_mes,
            "top_sellers": top_sellers,
            "ultimas_vendas": ultimas_vendas_enriched,
            "annual_chart": annual_chart,
            "daily_chart":  daily_chart,
        }
