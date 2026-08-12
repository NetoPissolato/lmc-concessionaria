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

# ─── Normalização de marca e modelo ─────────────────────────────────────────────────
# Garante que "jeep", "JEEP", "Jeep" sejam sempre armazenados como "Jeep".
# Isso evita que o mesmo modelo/marca vire grupos separados no agrupamento.

# Mapa: entrada lowercase -> forma canônica de armazenamento
_CANONICAL_MARCA: dict[str, str] = {
    # Carros
    "fiat":           "Fiat",
    "chevrolet":      "Chevrolet",
    "gm":             "Chevrolet",
    "volkswagen":     "Volkswagen",
    "vw":             "Volkswagen",
    "toyota":         "Toyota",
    "hyundai":        "Hyundai",
    "honda":          "Honda",
    "renault":        "Renault",
    "jeep":           "Jeep",
    "ford":           "Ford",
    "bmw":            "BMW",
    "nissan":         "Nissan",
    "mitsubishi":     "Mitsubishi",
    "kia":            "Kia",
    "peugeot":        "Peugeot",
    "citroen":        "Citroën",
    "citroën":        "Citroën",
    "mercedes":       "Mercedes-Benz",
    "mercedes-benz":  "Mercedes-Benz",
    "mercedesbenz":   "Mercedes-Benz",
    "audi":           "Audi",
    "volvo":          "Volvo",
    "land rover":     "Land Rover",
    "landrover":      "Land Rover",
    "subaru":         "Subaru",
    "porsche":        "Porsche",
    "ferrari":        "Ferrari",
    "lamborghini":    "Lamborghini",
    "dodge":          "Dodge",
    "ram":            "Ram",
    "chery":          "Chery",
    "caoa chery":     "Caoa Chery",
    "byd":            "BYD",
    "jac":            "JAC",
    "effa":           "Effa",
    "troller":        "Troller",
    # Motos
    "yamaha":         "Yamaha",
    "kawasaki":       "Kawasaki",
    "suzuki":         "Suzuki",
    "ducati":         "Ducati",
    "harley":         "Harley-Davidson",
    "harley-davidson": "Harley-Davidson",
    "harleydavidson": "Harley-Davidson",
    "triumph":        "Triumph",
    "royalenfield":   "Royal Enfield",
    "royal enfield":  "Royal Enfield",
    "bmw moto":       "BMW",
    "honda moto":     "Honda",
    "dafra":          "Dafra",
    "shineray":       "Shineray",
}

# Siglas que devem ficar em CAPS mesmo no meio de modelo
_MODEL_CAPS = {"hb", "gla", "glb", "glc", "gle", "amg", "tdi", "gti", "sdrive", "xdrive", "suv", "4wd", "4x4", "cvt"}


def normalize_marca(value: str) -> str:
    """Retorna a forma canônica da marca. Ex: 'bmw' -> 'BMW', 'vw' -> 'Volkswagen'."""
    if not value:
        return value
    key = value.strip().lower()
    return _CANONICAL_MARCA.get(key, value.strip().title())


def normalize_modelo(value: str) -> str:
    """
    Title Case inteligente para modelo.
    Preserva siglas, números e hifens conhecidos.
    Ex: 'hb20 s' -> 'HB20 S', 't-cross' -> 'T-Cross', 'civic' -> 'Civic'.
    """
    if not value:
        return value
    parts = value.strip().split()
    result = []
    for part in parts:
        lower = part.lower()
        if lower in _MODEL_CAPS:
            result.append(part.upper())
        elif lower[:2] in _MODEL_CAPS and any(c.isdigit() for c in part):
            # Ex: "hb20" -> "HB20"
            result.append(part.upper())
        else:
            result.append(part.capitalize())
    return " ".join(result)



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

        # Normaliza marca e modelo antes de salvar (garante consistência no banco)
        data.marca  = normalize_marca(data.marca)
        data.modelo = normalize_modelo(data.modelo)

        vehicle = await self.vehicle_repo.create(
            **data.model_dump(),
            created_by=created_by,
            status=VehicleStatus.DISPONIVEL,
        )

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

        # Track changes for audit
        old_valor_compra = vehicle.valor_compra
        old_data = {
            k: str(getattr(vehicle, k)) if getattr(vehicle, k) is not None else None
            for k in data.model_dump(exclude_none=True).keys()
        }

        update_data = data.model_dump(exclude_none=True)
        # Normaliza marca/modelo se estiverem sendo atualizados
        if "marca" in update_data:
            update_data["marca"] = normalize_marca(update_data["marca"])
        if "modelo" in update_data:
            update_data["modelo"] = normalize_modelo(update_data["modelo"])
        updated = await self.vehicle_repo.update(vehicle, **update_data)

        # Sync financial entry if valor_compra changed
        if "valor_compra" in update_data:
            new_valor = update_data["valor_compra"]
            from sqlalchemy import select
            from app.domain.models.financial import FinancialEntry
            result = await self.db.execute(
                select(FinancialEntry).where(
                    FinancialEntry.vehicle_id == vehicle_id,
                    FinancialEntry.categoria == FinancialCategory.COMPRA_VEICULO,
                )
            )
            existing_entry = result.scalar_one_or_none()

            if existing_entry:
                if new_valor and new_valor > 0:
                    existing_entry.valor = new_valor
                else:
                    await self.db.delete(existing_entry)
            elif new_valor and new_valor > 0:
                await self.financial_repo.create(
                    tipo=EntryType.SAIDA,
                    categoria=FinancialCategory.COMPRA_VEICULO,
                    descricao=f"Compra de veículo — {vehicle.marca} {vehicle.modelo} {vehicle.ano} ({vehicle.placa})",
                    valor=new_valor,
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

        # Remove all financial entries linked to this vehicle (purchase, expenses, fines)
        from sqlalchemy import delete as sql_delete
        from app.domain.models.financial import FinancialEntry
        await self.db.execute(
            sql_delete(FinancialEntry).where(FinancialEntry.vehicle_id == vehicle_id)
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

        total_despesas = sum(e.valor for e in vehicle.expenses)
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

        # Map vehicle expense category -> financial category
        CATEGORY_MAP: dict[str, FinancialCategory] = {
            "mecanica":       FinancialCategory.MANUTENCAO,
            "funilaria":      FinancialCategory.MANUTENCAO,
            "pintura":        FinancialCategory.MANUTENCAO,
            "lavagem":        FinancialCategory.MANUTENCAO,
            "documentacao":   FinancialCategory.DOCUMENTACAO,
            "pneus":          FinancialCategory.MANUTENCAO,
            "eletrica":       FinancialCategory.MANUTENCAO,
            "combustivel":    FinancialCategory.OUTROS_SAIDA,
            "acessorios":     FinancialCategory.MANUTENCAO,
            "guincho":        FinancialCategory.GUINCHO,
            "ipva":           FinancialCategory.IPVA,
            "licenciamento":  FinancialCategory.LICENCIAMENTO,
            "comissao":       FinancialCategory.COMISSAO,
            "outros":         FinancialCategory.OUTROS_SAIDA,
        }
        fin_categoria = CATEGORY_MAP.get(str(data.categoria), FinancialCategory.OUTROS_SAIDA)

        # Create financial entry automatically
        await self.financial_repo.create(
            tipo=EntryType.SAIDA,
            categoria=fin_categoria,
            descricao=f"Despesa {data.categoria.value} — {vehicle.marca} {vehicle.modelo} ({vehicle.placa}): {data.descricao}",
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
            descricao=f"Despesa adicionada: {data.categoria} R${data.valor} em {vehicle.placa}",
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
