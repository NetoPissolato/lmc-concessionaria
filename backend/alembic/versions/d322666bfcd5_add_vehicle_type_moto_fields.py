"""add_vehicle_type_moto_fields

Revision ID: d322666bfcd5
Revises: 3ac7f1b9d204
Create Date: 2026-08-05 18:08:55.935376

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd322666bfcd5'
down_revision: Union[str, None] = '3ac7f1b9d204'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

vehicle_type_enum = sa.Enum('CARRO', 'MOTO', name='vehicle_type')


def upgrade() -> None:
    # Create the ENUM type first, then add column with a server default
    vehicle_type_enum.create(op.get_bind(), checkfirst=True)

    op.add_column('vehicles', sa.Column(
        'tipo',
        sa.Enum('CARRO', 'MOTO', name='vehicle_type'),
        nullable=False,
        server_default='CARRO',   # existing rows get 'CARRO'
    ))
    op.add_column('vehicles', sa.Column('cilindrada', sa.SmallInteger(), nullable=True))
    op.add_column('vehicles', sa.Column('tipo_moto', sa.String(length=60), nullable=True))
    op.create_index(op.f('ix_vehicles_tipo'), 'vehicles', ['tipo'], unique=False)

    # Remove the server default after backfill (keep Python-level default only)
    op.alter_column('vehicles', 'tipo', server_default=None)


def downgrade() -> None:
    op.drop_index(op.f('ix_vehicles_tipo'), table_name='vehicles')
    op.drop_column('vehicles', 'tipo_moto')
    op.drop_column('vehicles', 'cilindrada')
    op.drop_column('vehicles', 'tipo')
    vehicle_type_enum.drop(op.get_bind(), checkfirst=True)
