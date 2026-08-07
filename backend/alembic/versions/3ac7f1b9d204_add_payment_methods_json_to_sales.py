"""add payment_methods json to sales

Revision ID: 3ac7f1b9d204
Revises: 2fb5ae2c8ba5
Create Date: 2026-08-05
"""
from alembic import op
import sqlalchemy as sa

revision = '3ac7f1b9d204'
down_revision = '2fb5ae2c8ba5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sales', sa.Column('payment_methods', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('sales', 'payment_methods')
