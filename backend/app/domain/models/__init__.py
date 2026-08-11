# Import all models in the correct order to resolve SQLAlchemy relationships
# Order matters: base first, then models without foreign dependencies, then dependents

from app.domain.models.base import Base  # noqa: F401
from app.domain.models.user import User  # noqa: F401
from app.domain.models.vehicle import Vehicle  # noqa: F401
from app.domain.models.vehicle_photo import VehiclePhoto  # noqa: F401
from app.domain.models.vehicle_expense import VehicleExpense  # noqa: F401
from app.domain.models.customer import Customer  # noqa: F401
from app.domain.models.sale import Sale  # noqa: F401
from app.domain.models.financial import FinancialEntry  # noqa: F401
from app.domain.models.audit_log import AuditLog  # noqa: F401
from app.domain.models.store_settings import StoreSettings  # noqa: F401
from app.domain.models.lead import Lead  # noqa: F401
from app.domain.models.review import Review  # noqa: F401
from app.domain.models.availability_alert import AvailabilityAlert  # noqa: F401

__all__ = [
    "Base",
    "User",
    "Vehicle",
    "VehiclePhoto",
    "VehicleExpense",
    "Customer",
    "Sale",
    "FinancialEntry",
    "AuditLog",
    "StoreSettings",
    "Lead",
    "Review",
    "AvailabilityAlert",
]
