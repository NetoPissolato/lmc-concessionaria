"""add_multa_to_financial_category

Revision ID: 2fb5ae2c8ba5
Revises: 32bb6ade415c
Create Date: 2026-08-05 03:52:14.590164

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2fb5ae2c8ba5'
down_revision: Union[str, None] = '32bb6ade415c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE financial_category ADD VALUE IF NOT EXISTS 'multa'")


def downgrade() -> None:
    pass
