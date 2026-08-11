"""add ga_id pixel_id to store_settings

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-11 01:36:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('store_settings', sa.Column('ga_id',    sa.String(50), nullable=True, server_default=''))
    op.add_column('store_settings', sa.Column('pixel_id', sa.String(50), nullable=True, server_default=''))


def downgrade() -> None:
    op.drop_column('store_settings', 'ga_id')
    op.drop_column('store_settings', 'pixel_id')
