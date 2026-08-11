"""add leads reviews availability_alerts video_url

Revision ID: b2c3d4e5f6a7
Revises: f1a2b3c4d5e6
Create Date: 2026-08-11 01:12:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'b2c3d4e5f6a7'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # lead_status enum
    lead_status = sa.Enum('novo', 'em_atendimento', 'proposta', 'fechado', 'perdido', name='lead_status')
    lead_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'leads',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('nome', sa.String(120), nullable=False),
        sa.Column('telefone', sa.String(30), nullable=False),
        sa.Column('email', sa.String(120), nullable=True),
        sa.Column('mensagem', sa.Text(), nullable=True),
        sa.Column('veiculo_id', postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('veiculo_descricao', sa.String(200), nullable=True),
        sa.Column('status', sa.Enum('novo', 'em_atendimento', 'proposta', 'fechado', 'perdido', name='lead_status', create_type=False), nullable=False, server_default='novo'),
        sa.Column('origem', sa.String(50), nullable=False, server_default='contato'),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['veiculo_id'], ['vehicles.id'], ondelete='SET NULL'),
    )

    op.create_table(
        'reviews',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('nome', sa.String(120), nullable=False),
        sa.Column('nota', sa.Integer(), nullable=False),
        sa.Column('texto', sa.Text(), nullable=False),
        sa.Column('foto_url', sa.String(500), nullable=True),
        sa.Column('cidade', sa.String(100), nullable=True),
        sa.Column('aprovado', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    op.create_table(
        'availability_alerts',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('email', sa.String(120), nullable=False),
        sa.Column('nome', sa.String(120), nullable=True),
        sa.Column('marca', sa.String(80), nullable=True),
        sa.Column('modelo', sa.String(80), nullable=True),
        sa.Column('tipo', sa.String(20), nullable=True),
        sa.Column('ano_min', sa.Integer(), nullable=True),
        sa.Column('ano_max', sa.Integer(), nullable=True),
        sa.Column('preco_max', sa.Numeric(12, 2), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notificacoes_enviadas', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_availability_alerts_email', 'availability_alerts', ['email'])

    op.add_column('vehicles', sa.Column('video_url', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('vehicles', 'video_url')
    op.drop_index('ix_availability_alerts_email', table_name='availability_alerts')
    op.drop_table('availability_alerts')
    op.drop_table('reviews')
    op.drop_table('leads')
    op.execute("DROP TYPE IF EXISTS lead_status")