from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract, or_
from sqlalchemy.orm import selectinload

from app.infrastructure.repositories.base_repository import BaseRepository
from app.domain.models.sale import Sale, SaleStatus
from app.domain.models.user import User
from app.domain.models.customer import Customer
from app.domain.models.vehicle import Vehicle
from app.domain.models.vehicle_photo import VehiclePhoto  # noqa: F401 – needed for selectinload(Vehicle.photos)


class SaleRepository(BaseRepository[Sale]):
    def __init__(self, db: AsyncSession):
        super().__init__(Sale, db)

    async def list_with_relations(self, skip: int = 0, limit: int = 50) -> list:
        """List sales with all related entities loaded in one query."""
        result = await self.db.execute(
            select(Sale)
            .options(
                selectinload(Sale.cliente),
                selectinload(Sale.vehicle),
                selectinload(Sale.vendedor),
            )
            .where(Sale.is_deleted == False)
            .order_by(Sale.data_venda.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_with_relations(self, sale_id: str) -> Optional[Sale]:
        result = await self.db.execute(
            select(Sale)
            .options(
                selectinload(Sale.cliente),
                selectinload(Sale.vehicle).selectinload(Vehicle.photos),
                selectinload(Sale.vendedor),
            )
            .where(Sale.id == sale_id, Sale.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def get_monthly_sales(self, year: int, month: int) -> List[Sale]:
        result = await self.db.execute(
            select(Sale)
            .options(selectinload(Sale.cliente), selectinload(Sale.vehicle))
            .where(
                Sale.is_deleted == False,
                Sale.status == SaleStatus.CONCLUIDA,
                extract("year", Sale.data_venda) == year,
                extract("month", Sale.data_venda) == month,
            )
            .order_by(Sale.data_venda.desc())
        )
        return list(result.scalars().all())

    async def get_recent_sales(self, limit: int = 5) -> List[Sale]:
        """Returns the N most recent completed sales across all time."""
        from app.domain.models.vehicle import Vehicle
        result = await self.db.execute(
            select(Sale)
            .options(
                selectinload(Sale.cliente),
                selectinload(Sale.vehicle).selectinload(Vehicle.photos),
            )
            .where(
                Sale.is_deleted == False,
                Sale.status == SaleStatus.CONCLUIDA,
            )
            .order_by(Sale.data_venda.desc(), Sale.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_monthly_revenue(self, year: int, month: int) -> Decimal:
        result = await self.db.execute(
            select(func.coalesce(func.sum(Sale.valor_venda), 0))
            .where(
                Sale.is_deleted == False,
                Sale.status == SaleStatus.CONCLUIDA,
                extract("year", Sale.data_venda) == year,
                extract("month", Sale.data_venda) == month,
            )
        )
        return Decimal(str(result.scalar_one()))

    async def get_sales_by_period(
        self, start_date: date, end_date: date
    ) -> List[Sale]:
        result = await self.db.execute(
            select(Sale)
            .options(
                selectinload(Sale.cliente),
                selectinload(Sale.vehicle),
                selectinload(Sale.vendedor),
            )
            .where(
                Sale.is_deleted == False,
                Sale.status == SaleStatus.CONCLUIDA,
                Sale.data_venda >= start_date,
                Sale.data_venda <= end_date,
            )
            .order_by(Sale.data_venda.desc())
        )
        return list(result.scalars().all())

    async def get_top_sellers(self, year: int, month: int, limit: int = 5) -> List[dict]:
        """Returns top selling employees for the period."""
        result = await self.db.execute(
            select(
                Sale.vendedor_id,
                User.nome,
                func.count(Sale.id).label("total_vendas"),
                func.sum(Sale.valor_venda).label("total_valor"),
            )
            .join(User, Sale.vendedor_id == User.id)
            .where(
                Sale.is_deleted == False,
                Sale.status == SaleStatus.CONCLUIDA,
                extract("year", Sale.data_venda) == year,
                extract("month", Sale.data_venda) == month,
            )
            .group_by(Sale.vendedor_id, User.nome)
            .order_by(func.count(Sale.id).desc())
            .limit(limit)
        )
        return [
            {
                "vendedor_id": row[0],
                "nome": row[1],
                "total_vendas": row[2],
                "total_valor": Decimal(str(row[3] or 0)),
            }
            for row in result.fetchall()
        ]

    async def get_annual_chart(self, year: int) -> List[dict]:
        """Monthly totals for the annual chart (sales + saídas)."""
        from app.domain.models.financial import FinancialEntry, EntryType

        # ── Sales por mês ──────────────────────────────────────────────────────
        sales_result = await self.db.execute(
            select(
                extract("month", Sale.data_venda).label("mes"),
                func.count(Sale.id).label("total_vendas"),
                func.sum(Sale.valor_venda).label("faturamento"),
            )
            .where(
                Sale.is_deleted == False,
                Sale.status == SaleStatus.CONCLUIDA,
                extract("year", Sale.data_venda) == year,
            )
            .group_by(extract("month", Sale.data_venda))
            .order_by(extract("month", Sale.data_venda))
        )
        sales_rows = sales_result.fetchall()
        sales_by_month = {
            int(row[0]): {"total_vendas": row[1], "faturamento": Decimal(str(row[2] or 0))}
            for row in sales_rows
        }

        # ── Saídas por mês (FinancialEntry) ───────────────────────────────────
        saidas_result = await self.db.execute(
            select(
                extract("month", FinancialEntry.data).label("mes"),
                func.sum(FinancialEntry.valor).label("saidas"),
            )
            .where(
                FinancialEntry.tipo == EntryType.SAIDA,
                extract("year", FinancialEntry.data) == year,
            )
            .group_by(extract("month", FinancialEntry.data))
        )
        saidas_by_month = {
            int(row[0]): Decimal(str(row[1] or 0))
            for row in saidas_result.fetchall()
        }

        # ── Merge: todos os meses com algum dado ───────────────────────────────
        all_months = sorted(set(list(sales_by_month.keys()) + list(saidas_by_month.keys())))
        return [
            {
                "mes": m,
                "total_vendas": sales_by_month.get(m, {}).get("total_vendas", 0),
                "faturamento": sales_by_month.get(m, {}).get("faturamento", Decimal("0")),
                "saidas": saidas_by_month.get(m, Decimal("0")),
            }
            for m in all_months
        ]

    async def get_daily_chart(self, year: int, month: int) -> List[dict]:
        """Daily totals for a given month (sales + saídas)."""
        from app.domain.models.financial import FinancialEntry, EntryType

        # ── Vendas por dia ─────────────────────────────────────────────────────
        sales_result = await self.db.execute(
            select(
                extract("day", Sale.data_venda).label("dia"),
                func.count(Sale.id).label("total_vendas"),
                func.sum(Sale.valor_venda).label("faturamento"),
            )
            .where(
                Sale.is_deleted == False,
                Sale.status == SaleStatus.CONCLUIDA,
                extract("year", Sale.data_venda) == year,
                extract("month", Sale.data_venda) == month,
            )
            .group_by(extract("day", Sale.data_venda))
            .order_by(extract("day", Sale.data_venda))
        )
        sales_by_day = {
            int(row[0]): {"total_vendas": row[1], "faturamento": Decimal(str(row[2] or 0))}
            for row in sales_result.fetchall()
        }

        # ── Saídas por dia ─────────────────────────────────────────────────────
        saidas_result = await self.db.execute(
            select(
                extract("day", FinancialEntry.data).label("dia"),
                func.sum(FinancialEntry.valor).label("saidas"),
            )
            .where(
                FinancialEntry.tipo == EntryType.SAIDA,
                extract("year", FinancialEntry.data) == year,
                extract("month", FinancialEntry.data) == month,
            )
            .group_by(extract("day", FinancialEntry.data))
        )
        saidas_by_day = {
            int(row[0]): Decimal(str(row[1] or 0))
            for row in saidas_result.fetchall()
        }

        all_days = sorted(set(list(sales_by_day.keys()) + list(saidas_by_day.keys())))
        return [
            {
                "dia": d,
                "total_vendas": sales_by_day.get(d, {}).get("total_vendas", 0),
                "faturamento": sales_by_day.get(d, {}).get("faturamento", Decimal("0")),
                "saidas": saidas_by_day.get(d, Decimal("0")),
            }
            for d in all_days
        ]



class CustomerRepository(BaseRepository[Customer]):
    def __init__(self, db: AsyncSession):
        super().__init__(Customer, db)

    async def get_by_cpf(self, cpf_cnpj: str) -> Optional[Customer]:
        result = await self.db.execute(
            select(Customer).where(
                Customer.cpf_cnpj == cpf_cnpj,
                Customer.is_deleted == False,
            )
        )
        return result.scalar_one_or_none()

    async def search(self, query: str, skip: int = 0, limit: int = 50) -> List[Customer]:
        """Search customers by name, CPF, phone or email."""
        term = f"%{query}%"
        result = await self.db.execute(
            select(Customer)
            .where(
                Customer.is_deleted == False,
                or_(
                    func.upper(Customer.nome).like(term.upper()),
                    Customer.cpf_cnpj.like(term),
                    Customer.telefone.like(term),
                    Customer.whatsapp.like(term),
                    Customer.email.like(term),
                ),
            )
            .offset(skip)
            .limit(limit)
            .order_by(Customer.nome)
        )
        return list(result.scalars().all())
