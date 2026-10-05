from typing import Optional, List
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.infrastructure.repositories.vehicle_repository import VehicleRepository
from app.infrastructure.repositories.expense_repository import ExpenseRepository
from app.infrastructure.repositories.audit_repository import AuditRepository
from app.infrastructure.repositories.financial_repository import FinancialRepository
from app.domain.models.vehicle import Vehicle, VehicleStatus
from app.domain.models.vehicle_expense import VehicleExpense, ExpenseCategory
from app.domain.models.financial import EntryType, FinancialCategory
from app.application.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.application.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.application.services import financeiro_service
from app.domain.models.financial import FinancialEntry
from app.domain.models.sale import Sale, SaleStatus
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

# Nome da categoria como aparece no caixa e no painel
ROTULO_DESPESA: dict[ExpenseCategory, str] = {
    ExpenseCategory.MECANICA: "mecânica", ExpenseCategory.FUNILARIA: "funilaria",
    ExpenseCategory.PINTURA: "pintura", ExpenseCategory.LAVAGEM: "lavagem",
    ExpenseCategory.DOCUMENTACAO: "documentação", ExpenseCategory.PNEUS: "pneus",
    ExpenseCategory.ELETRICA: "elétrica", ExpenseCategory.COMBUSTIVEL: "combustível",
    ExpenseCategory.ACESSORIOS: "acessórios", ExpenseCategory.GUINCHO: "guincho",
    ExpenseCategory.IPVA: "IPVA", ExpenseCategory.LICENCIAMENTO: "licenciamento",
    ExpenseCategory.COMISSAO: "comissão", ExpenseCategory.OUTROS: "outros",
}

# Categoria da despesa do veículo → categoria no caixa.
# Chave é o ENUM (antes era str(enum), que no Python 3.12 vira "ExpenseCategory.MECANICA"
# e nunca casava: toda despesa caía em "outros").
CATEGORIA_CAIXA: dict[ExpenseCategory, FinancialCategory] = {
    ExpenseCategory.MECANICA:      FinancialCategory.MANUTENCAO,
    ExpenseCategory.FUNILARIA:     FinancialCategory.MANUTENCAO,
    ExpenseCategory.PINTURA:       FinancialCategory.MANUTENCAO,
    ExpenseCategory.LAVAGEM:       FinancialCategory.MANUTENCAO,
    ExpenseCategory.PNEUS:         FinancialCategory.MANUTENCAO,
    ExpenseCategory.ELETRICA:      FinancialCategory.MANUTENCAO,
    ExpenseCategory.ACESSORIOS:    FinancialCategory.MANUTENCAO,
    ExpenseCategory.DOCUMENTACAO:  FinancialCategory.DOCUMENTACAO,
    ExpenseCategory.GUINCHO:       FinancialCategory.GUINCHO,
    ExpenseCategory.IPVA:          FinancialCategory.IPVA,
    ExpenseCategory.LICENCIAMENTO: FinancialCategory.LICENCIAMENTO,
    ExpenseCategory.COMISSAO:      FinancialCategory.COMISSAO,
    ExpenseCategory.COMBUSTIVEL:   FinancialCategory.OUTROS_SAIDA,
    ExpenseCategory.OUTROS:        FinancialCategory.OUTROS_SAIDA,
}

class VehicleService:
    """
    Business logic for vehicle management.
    Enforces all business rules before hitting the repository.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.vehicle_repo = VehicleRepository(db)
        self.expense_repo = ExpenseRepository(db)
        self.audit_repo = AuditRepository(db)
        self.financial_repo = FinancialRepository(db)

    async def create_vehicle(
        self, data: VehicleCreate, created_by: str
    ) -> Vehicle:
        """
        Register a new vehicle.
        Rules:
        - Placa must be unique
        - Chassi must be unique
        - Records creator for audit trail
        """
        # Check plate uniqueness
        existing_placa = await self.vehicle_repo.get_by_placa(data.placa)
        if existing_placa:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Placa '{data.placa}' já está cadastrada no sistema.",
            )

        # Check chassi uniqueness
        existing_chassi = await self.vehicle_repo.get_by_chassi(data.chassi)
        if existing_chassi:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Chassi '{data.chassi}' já está cadastrado no sistema.",
            )

        # (marca/modelo já chegam normalizados pelo schema)
        try:
            vehicle = await self.vehicle_repo.create(
                **data.model_dump(),
                created_by=created_by,
                status=VehicleStatus.DISPONIVEL,
            )
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=409, detail="Placa ou chassi já cadastrados em outro veículo do estoque.")

        # Create financial entry for vehicle purchase (SAIDA) — only if valor_compra > 0
        if vehicle.valor_compra and vehicle.valor_compra > 0:
            await self.financial_repo.create(
                tipo=EntryType.SAIDA,
                categoria=FinancialCategory.COMPRA_VEICULO,
                descricao=f"Compra de veículo — {vehicle.marca} {vehicle.modelo} {vehicle.ano} ({vehicle.placa})",
                valor=vehicle.valor_compra,
                data=vehicle.data_compra,
                vehicle_id=vehicle.id,
                created_by=created_by,
            )

        await self.audit_repo.log(
            usuario_id=created_by,
            acao="CREATE",
            entidade="Vehicle",
            entidade_id=vehicle.id,
            dados_depois=data.model_dump(mode="json"),
            descricao=f"Veículo cadastrado: {vehicle.marca} {vehicle.modelo} {vehicle.ano} - {vehicle.placa}",
        )

        # Re-fetch with eager-loaded photos to avoid MissingGreenlet on serialization
        return await self.vehicle_repo.get_by_id(vehicle.id)

    async def _venda_pendente(self, vehicle_id: str) -> Optional[Sale]:
        return (await self.db.execute(
            select(Sale).where(
                Sale.vehicle_id == vehicle_id,
                Sale.is_deleted == False,  # noqa: E712
                Sale.status == SaleStatus.PENDENTE,
            ).limit(1)
        )).scalar_one_or_none()

    async def update_vehicle(
        self, vehicle_id: str, data: VehicleUpdate, updated_by: str
    ) -> Vehicle:
        """
        Update vehicle. Every field change is recorded in the audit log
        with the old and new values.
        """
        vehicle = await self.vehicle_repo.get_by_id(vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Veículo não encontrado")

        if vehicle.status == VehicleStatus.VENDIDO:
            raise HTTPException(
                status_code=400,
                detail="Não é possível editar um veículo vendido.",
            )

        update_data = data.model_dump(exclude_none=True)

        # Com venda pendente o status é da venda: marcar "disponível" à mão punha no site
        # um carro já reservado. Para liberar, cancele a venda.
        if "status" in update_data and update_data["status"] != vehicle.status:
            if await self._venda_pendente(vehicle_id):
                raise HTTPException(
                    status_code=409,
                    detail="Este veículo tem uma venda pendente. Conclua ou cancele a venda em Vendas para mudar o status.",
                )

        # Preço mínimo acima do anunciado é erro de digitação (vale com o valor que já estava)
        minimo = update_data.get("valor_minimo", vehicle.valor_minimo)
        anunciado = update_data.get("valor_anunciado", vehicle.valor_anunciado)
        if minimo and anunciado and minimo > anunciado:
            raise HTTPException(status_code=422, detail="O preço mínimo não pode ser maior que o preço anunciado.")

        # Placa/chassi corrigidos não podem bater com outro veículo do estoque
        if "placa" in update_data and update_data["placa"] != vehicle.placa:
            outro = await self.vehicle_repo.get_by_placa(update_data["placa"])
            if outro and outro.id != vehicle_id:
                raise HTTPException(status_code=409, detail=f"Placa '{update_data['placa']}' já está cadastrada em outro veículo.")
        if "chassi" in update_data and update_data["chassi"] != vehicle.chassi:
            outro = await self.vehicle_repo.get_by_chassi(update_data["chassi"])
            if outro and outro.id != vehicle_id:
                raise HTTPException(status_code=409, detail=f"Chassi '{update_data['chassi']}' já está cadastrado em outro veículo.")

        # Track changes for audit
        old_valor_compra = vehicle.valor_compra
        old_data_compra = vehicle.data_compra
        old_data = {
            k: str(getattr(vehicle, k)) if getattr(vehicle, k) is not None else None
            for k in update_data.keys()
        }
        try:
            updated = await self.vehicle_repo.update(vehicle, **update_data)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=409, detail="Placa ou chassi já cadastrados em outro veículo do estoque.")

        # Valor ou data de compra mudou: estorna o lançamento antigo (na data dele) e lança o
        # novo (o caixa guarda o histórico da correção em vez de sobrescrever em silêncio).
        mudou_valor = "valor_compra" in update_data and update_data["valor_compra"] != old_valor_compra
        mudou_data = "data_compra" in update_data and update_data["data_compra"] != old_data_compra
        if mudou_valor or mudou_data:
            estornados = await financeiro_service.estornar(
                self.db,
                FinancialEntry.vehicle_id == vehicle_id,
                FinancialEntry.categoria == FinancialCategory.COMPRA_VEICULO,
                motivo="compra corrigida",
                usuario_id=updated_by,
                na_data_original=True,
            )
            # Relança se a compra estava no caixa (ou se o valor mudou para algo > 0)
            if (estornados or mudou_valor) and vehicle.valor_compra and vehicle.valor_compra > 0:
                await self.financial_repo.create(
                    tipo=EntryType.SAIDA,
                    categoria=FinancialCategory.COMPRA_VEICULO,
                    descricao=f"Compra de veículo — {vehicle.marca} {vehicle.modelo} {vehicle.ano} ({vehicle.placa})",
                    valor=vehicle.valor_compra,
                    data=vehicle.data_compra,
                    vehicle_id=vehicle_id,
                    created_by=updated_by,
                )

        await self.audit_repo.log(
            usuario_id=updated_by,
            acao="UPDATE",
            entidade="Vehicle",
            entidade_id=vehicle_id,
            dados_antes=old_data,
            dados_depois={k: str(v) if v is not None else None for k, v in update_data.items()},
            descricao=f"Veículo atualizado: {vehicle.placa}",
        )

        # Re-fetch with eager-loaded photos to avoid MissingGreenlet on serialization
        return await self.vehicle_repo.get_by_id(vehicle_id)

    async def delete_vehicle(self, vehicle_id: str, deleted_by: str) -> None:
        """
        Soft-delete vehicle.
        Only ADMIN can delete. Cannot delete if vehicle has active sale.
        """
        vehicle = await self.vehicle_repo.get_by_id(vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Veículo não encontrado")

        if vehicle.status == VehicleStatus.VENDIDO:
            raise HTTPException(
                status_code=400,
                detail="Não é possível excluir um veículo vendido.",
            )
        # Excluir com venda pendente deixava a venda apontando para um veículo apagado
        if await self._venda_pendente(vehicle_id):
            raise HTTPException(
                status_code=409,
                detail="Este veículo tem uma venda pendente. Cancele a venda antes de excluir o veículo.",
            )

        # Estorna (não apaga) os lançamentos do veículo: compra, despesas, multas.
        # Na data original: um cadastro excluído some dos meses em que tinha entrado.
        await financeiro_service.estornar(
            self.db,
            FinancialEntry.vehicle_id == vehicle_id,
            motivo="veículo excluído",
            usuario_id=deleted_by,
            na_data_original=True,
        )

        await self.vehicle_repo.soft_delete(vehicle, deleted_by)

        await self.audit_repo.log(
            usuario_id=deleted_by,
            acao="DELETE",
            entidade="Vehicle",
            entidade_id=vehicle_id,
            descricao=f"Veículo excluído (soft delete): {vehicle.placa}",
        )

    async def get_cost_center(self, vehicle_id: str) -> dict:
        """
        Calculate the complete cost center for a vehicle:
        - Purchase price
        - All expenses itemized
        - Total invested
        - Listed price
        - Sold price (if sold)
        - Expected or actual profit
        - Margin percentage
        """
        vehicle = await self.vehicle_repo.get_with_expenses(vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Veículo não encontrado")

        total_despesas = sum((e.valor for e in vehicle.expenses), Decimal("0"))
        custo_total = vehicle.valor_compra + (vehicle.valor_multas or 0) + total_despesas

        lucro_bruto = None
        margem = None
        valor_referencia = vehicle.valor_vendido or vehicle.valor_anunciado

        if valor_referencia and valor_referencia > 0:
            lucro_bruto = valor_referencia - custo_total
            margem = (lucro_bruto / valor_referencia) * 100

        return {
            "vehicle": vehicle,
            "valor_compra": vehicle.valor_compra,
            "valor_multas": vehicle.valor_multas,
            "despesas": vehicle.expenses,
            "total_despesas": total_despesas,
            "custo_total": custo_total,
            "valor_anunciado": vehicle.valor_anunciado,
            "valor_minimo": vehicle.valor_minimo,
            "valor_vendido": vehicle.valor_vendido,
            "lucro_bruto": lucro_bruto,
            "margem_percentual": margem,
        }

    async def add_expense(
        self, vehicle_id: str, data: ExpenseCreate, created_by: str
    ) -> VehicleExpense:
        """Add an expense to a vehicle's cost center and register in financial ledger."""
        vehicle = await self.vehicle_repo.get_by_id(vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Veículo não encontrado")

        expense = await self.expense_repo.create(
            vehicle_id=vehicle_id,
            **data.model_dump(),
        )

        fin_categoria = CATEGORIA_CAIXA.get(data.categoria, FinancialCategory.OUTROS_SAIDA)

        # Create financial entry automatically
        await self.financial_repo.create(
            tipo=EntryType.SAIDA,
            categoria=fin_categoria,
            descricao=f"Despesa de {ROTULO_DESPESA.get(data.categoria, data.categoria.value)}: {vehicle.marca} {vehicle.modelo} ({vehicle.placa}) - {data.descricao}"[:255],
            valor=data.valor,
            data=data.data,
            vehicle_id=vehicle_id,
            expense_id=expense.id,
            created_by=created_by,
        )

        await self.audit_repo.log(
            usuario_id=created_by,
            acao="CREATE",
            entidade="VehicleExpense",
            entidade_id=expense.id,
            dados_depois=data.model_dump(mode="json"),
            descricao=f"Despesa adicionada: {data.categoria.value} R$ {data.valor} em {vehicle.placa}",
        )

        return expense

    async def list_vehicles(
        self,
        query: Optional[str] = None,
        status: Optional[VehicleStatus] = None,
        tipo=None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Vehicle]:
        """List vehicles with optional search, status and tipo filters — all applied at SQL level."""
        if query:
            return await self.vehicle_repo.search(query, status, skip, limit, tipo=tipo)
        filters = {}
        if status:
            filters["status"] = status
        if tipo is not None:
            filters["tipo"] = tipo
        return await self.vehicle_repo.get_all(skip=skip, limit=limit, **filters)
