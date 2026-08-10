"""add_destaque_to_vehicles

Revision ID: a1b2c3d4e5f6
Revises: 3ac7f1b9d204
Create Date: 2026-08-10 06:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '3ac7f1b9d204'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adiciona coluna 'destaque' na tabela vehicles
    # server_default='false' garante que linhas existentes ficam como não-destaque
    op.add_column(
        'vehicles',
        sa.Column(
            'destaque',
            sa.Boolean(),
            nullable=False,
            server_default='false',
        )
    )


def downgrade() -> None:
    op.drop_column('vehicles', 'destaque')
