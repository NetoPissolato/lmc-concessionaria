"""add_carroceria_condicao_portas_opcionais_visualizacoes_and_modelos_destaque

Revision ID: g1h2i3j4k5l6
Revises: f5g6h7i8j9k0
Create Date: 2026-08-11 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, None] = 'f5g6h7i8j9k0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enums ─────────────────────────────────────────────────────────────────
    carroceria_enum = sa.Enum(
        'suv', 'hatch', 'sedan', 'picape', 'coupe', 'minivan', 'conversivel', 'perua', 'van',
        name='carroceria_type'
    )
    condicao_enum = sa.Enum(
        'novo', 'seminovo', 'usado',
        name='condicao_type'
    )

    # Cria os tipos antes de usá-los (PostgreSQL exige)
    carroceria_enum.create(op.get_bind(), checkfirst=True)
    condicao_enum.create(op.get_bind(), checkfirst=True)

    # ── Novos campos em vehicles ───────────────────────────────────────────────
    op.add_column('vehicles', sa.Column(
        'carroceria',
        sa.Enum('suv', 'hatch', 'sedan', 'picape', 'coupe', 'minivan', 'conversivel', 'perua', 'van',
                name='carroceria_type', create_type=False),
        nullable=True,
    ))
    op.add_column('vehicles', sa.Column(
        'condicao',
        sa.Enum('novo', 'seminovo', 'usado', name='condicao_type', create_type=False),
        nullable=False,
        server_default='usado',
    ))
    op.add_column('vehicles', sa.Column('portas', sa.SmallInteger(), nullable=True))
    op.add_column('vehicles', sa.Column('opcionais', sa.Text(), nullable=True))
    op.add_column('vehicles', sa.Column(
        'visualizacoes', sa.Integer(), nullable=False, server_default='0'
    ))

    # Índice em carroceria para filtros rápidos
    op.create_index('ix_vehicles_carroceria', 'vehicles', ['carroceria'], unique=False)

    # ── Tabela modelos_destaque ────────────────────────────────────────────────
    op.create_table(
        'modelos_destaque',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('marca', sa.String(60), nullable=False),
        sa.Column('modelo', sa.String(120), nullable=False),
        sa.Column('carroceria', sa.String(30), nullable=False),
        sa.Column('imagem_url', sa.String(500), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('ordem', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    # Drop tabela nova
    op.drop_table('modelos_destaque')

    # Drop índice e colunas
    op.drop_index('ix_vehicles_carroceria', table_name='vehicles')
    op.drop_column('vehicles', 'visualizacoes')
    op.drop_column('vehicles', 'opcionais')
    op.drop_column('vehicles', 'portas')
    op.drop_column('vehicles', 'condicao')
    op.drop_column('vehicles', 'carroceria')

    # Drop enums (PostgreSQL)
    sa.Enum(name='condicao_type').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='carroceria_type').drop(op.get_bind(), checkfirst=True)
